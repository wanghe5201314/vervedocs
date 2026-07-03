/**
 * AI 功能 Composable
 * 封装与 AI 服务的交互逻辑，供侧边栏和菜单使用
 */

import { AIAction, AIService, TranslateLanguage, buildPrompt } from '@wanghe1995/docx-editor-ai'
import type { AIServiceConfig } from '@wanghe1995/docx-editor-ai'
import { aiStateStore } from '@/stores/ai-state'
import { getAuthToken } from '@/api/document.api'

let aiService: AIService | null = null
let currentAbortController: AbortController | null = null

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

export interface AIRequestParams {
  action: AIAction
  text: string
  targetLanguage?: TranslateLanguage
  customPrompt?: string
  context?: { before?: string; after?: string }
}

/**
 * 直接使用 fetch 处理 SSE 流式请求，解决包缓存导致的解析问题
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
 * 取消当前 AI 请求
 */
export function cancelAIRequest(): void {
  if (currentAbortController) {
    currentAbortController.abort()
    currentAbortController = null
  }
  getService().cancelCurrentRequest()
  aiStateStore.resetOperation()
}

/**
 * 更新 AI 服务配置
 */
export function updateAIServiceConfig(config: Partial<AIServiceConfig>): void {
  getService().updateConfig(config)
}

/**
 * 重置 AI 服务实例（用于配置变更后）
 */
export function resetAIService(): void {
  aiService = null
}
