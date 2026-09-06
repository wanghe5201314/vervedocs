/**
 * AI 功能 Composable
 * 封装与 AI 服务的交互逻辑，供侧边栏和菜单使用
 */

import { AIAction, AIService, TranslateLanguage, buildPrompt } from '@vervedoc/docx-editor-ai'
import type { AIServiceConfig } from '@vervedoc/docx-editor-ai'
import { aiStateStore } from '@/stores/ai-state'
import { getAuthToken } from '@/api/document.api'

/** AI 服务实例（单例，首次调用时按环境变量配置创建） */
let aiService: AIService | null = null
/** 当前 AI 请求的 AbortController 实例，用于取消请求 */
let currentAbortController: AbortController | null = null

/**
 * 获取 AI 服务实例（单例，首次调用时按环境变量配置创建）
 * @returns AI 服务实例
 */
function getService(): AIService {
  if (!aiService) {
    const config: AIServiceConfig = {
      apiEndpoint: import.meta.env.VITE_AI_API_ENDPOINT || '/api/ai',
      streaming: import.meta.env.VITE_AI_STREAMING !== 'false',
      timeout: Number(import.meta.env.VITE_AI_TIMEOUT) || 60000
    }
    aiService = new AIService(config)
  }
  return aiService
}

/**
 * AI 请求参数
 */
export interface AIRequestParams {
  /** AI 操作类型 */
  action: AIAction
  /** 输入文本 */
  text: string
  /** 翻译目标语言（action=translate 时有效） */
  targetLanguage?: TranslateLanguage
  /** 自定义提示词（action=custom 时有效） */
  customPrompt?: string
  /** 上下文（前后文文本） */
  context?: { before?: string; after?: string }
}

/**
 * 直接使用 fetch 处理 SSE 流式请求，解决包缓存导致的解析问题
 * @param request AI 请求参数对象
 * @param onChunk 接收流式分块的回调函数
 * @param onComplete 请求完成时的回调函数
 * @param onError 请求出错时的回调函数
 * @returns 无返回值
 */
async function fetchSSEStream(
  request: Record<string, unknown>,
  onChunk: (chunk: string) => void,
  onComplete: (result: string) => void,
  onError: (error: Error) => void
): Promise<void> {
  const apiEndpoint = import.meta.env.VITE_AI_API_ENDPOINT || '/api/ai'
  currentAbortController = new AbortController()

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream'
    }
    const token = getAuthToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...request, stream: true }),
      signal: currentAbortController.signal
    })

    if (!response.ok) {
      const errorText = await response.text()
      onError(new Error(`请求失败: ${response.status} ${errorText}`))
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      onError(new Error('无法读取响应流'))
      return
    }

    const decoder = new TextDecoder()
    let fullContent = ''
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        onComplete(fullContent)
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      // 保留最后一个可能不完整的行
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine) continue

        // 兼容 "data:" 和 "data: " 两种 SSE 格式
        if (trimmedLine.startsWith('data:')) {
          const data = trimmedLine.slice(5).trim()
          if (data === '[DONE]') {
            onComplete(fullContent)
            return
          }
          try {
            const parsed = JSON.parse(data)
            if (parsed.error) {
              onError(new Error(parsed.error))
              return
            }
            const content = parsed.content || parsed.delta?.content || parsed.text || ''
            if (content) {
              fullContent += content
              onChunk(content)
            }
          } catch {
            // 非 JSON 格式，直接作为内容
            if (data) {
              fullContent += data
              onChunk(data)
            }
          }
        }
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      onError(new Error('请求已取消'))
    } else {
      onError(error instanceof Error ? error : new Error('未知错误'))
    }
  }
}

/**
 * 执行 AI 请求（自动选择流式/普通模式）
 * @param params AI 请求参数
 * @returns 无返回值
 */
export async function executeAIRequest(params: AIRequestParams): Promise<void> {
  const service = getService()
  const streaming = import.meta.env.VITE_AI_STREAMING !== 'false'

  aiStateStore.startOperation(params.action, params.text)

  // 构建提示词
  const prompt = buildPrompt(params.action, params.text, {
    targetLanguage: params.targetLanguage,
    customPrompt: params.customPrompt,
    context: params.context
  })

  const request = {
    action: params.action,
    text: params.text,
    targetLanguage: params.targetLanguage,
    customPrompt: params.customPrompt,
    prompt
  }

  if (streaming) {
    await fetchSSEStream(
      request,
      (chunk: string) => {
        aiStateStore.appendStreamContent(chunk)
      },
      (result: string) => {
        aiStateStore.completeOperation(result)
      },
      (error: Error) => {
        aiStateStore.failOperation(error.message)
      }
    )
  } else {
    const response = await service.sendAIRequest(request)
    if (response.success && response.result) {
      aiStateStore.completeOperation(response.result)
    } else {
      aiStateStore.failOperation(response.error || '未知错误')
    }
  }
}

/**
 * 更新 AI 服务配置
 * @param config 部分配置项
 */
export function updateAIServiceConfig(config: Partial<AIServiceConfig>): void {
  getService().updateConfig(config)
}
