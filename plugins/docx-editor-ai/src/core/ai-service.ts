/**
 * AI 服务调用
 */

import type {
  AIServiceConfig,
  AIRequest,
  AIResponse,
  StreamCallbacks
} from '../types'

/**
 * AI 服务类
 *
 * 封装与 AI 后端的 HTTP 通信，支持普通请求与流式响应，
 * 提供超时控制、请求取消与配置更新能力。
 */
export class AIService {
  /** AI 服务配置（已合并默认值） */
  private config: AIServiceConfig
  /** 当前请求的 AbortController，用于支持取消与超时 */
  private abortController: AbortController | null = null

  /**
   * 创建 AI 服务实例，合并默认超时与流式配置
   *
   * @param config AI 服务配置
   */
  constructor(config: AIServiceConfig) {
    this.config = {
      timeout: 60000,
      streaming: true,
      ...config
    }
  }

  /**
   * 发送 AI 请求
   */
  async sendAIRequest(request: AIRequest): Promise<AIResponse> {
    try {
      const response = await this.fetchWithTimeout(request)
      
      if (!response.ok) {
        const error = await response.text()
        return {
          success: false,
          error: `请求失败: ${response.status} ${error}`
        }
      }

      const data = await response.json().catch(() => null)

      if (data && typeof data === 'object' && 'success' in data && 'code' in data && 'data' in data) {
        if ((data as any).success === false) {
          return { success: false, error: String((data as any).message || '服务处理失败') }
        }
        const inner = (data as any).data
        if (inner && typeof inner === 'object' && inner.success === false) {
          return { success: false, error: String(inner.error || '服务处理失败') }
        }
        return { success: true, result: inner?.result || inner?.content || inner?.text }
      }

      if (data && typeof data === 'object' && (data as any).success === false) {
        return { success: false, error: (data as any).error || '服务处理失败' }
      }

      return { success: true, result: (data as any)?.result || (data as any)?.content || (data as any)?.text }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: '请求已取消'
        }
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 发送流式 AI 请求
   */
  async requestStream(
    request: AIRequest,
    callbacks: StreamCallbacks
  ): Promise<void> {
    this.abortController = new AbortController()

    try {
      const response = await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers
        },
        body: JSON.stringify({
          ...request,
          stream: true
        }),
        signal: this.abortController.signal
      })

      if (!response.ok) {
        const error = await response.text()
        callbacks.onError?.(new Error(`请求失败: ${response.status} ${error}`))
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        callbacks.onError?.(new Error('无法读取响应流'))
        return
      }

      const decoder = new TextDecoder()
      let fullContent = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          callbacks.onComplete?.(fullContent)
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        // 保留最后一个可能不完整的行
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine) continue

          // 兼容 "data:" 和 "data: " 两种格式
          if (trimmedLine.startsWith('data:')) {
            const data = trimmedLine.slice(5).trim()
            if (data === '[DONE]') {
              callbacks.onComplete?.(fullContent)
              return
            }
            try {
              const parsed = JSON.parse(data)
              // 检查后端返回的错误事件
              if (parsed.error) {
                callbacks.onError?.(new Error(parsed.error))
                return
              }
              const content = parsed.content || parsed.delta?.content || parsed.text || ''
              if (content) {
                fullContent += content
                callbacks.onChunk?.(content)
              }
            } catch {
              // 非 JSON 格式，直接作为内容
              if (data) {
                fullContent += data
                callbacks.onChunk?.(data)
              }
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        callbacks.onError?.(new Error('请求已取消'))
      } else {
        callbacks.onError?.(error instanceof Error ? error : new Error('未知错误'))
      }
    }
  }

  /**
   * 取消当前请求
   */
  cancelCurrentRequest(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }

  /**
   * 带超时的 fetch
   */
  private async fetchWithTimeout(request: AIRequest): Promise<Response> {
    this.abortController = new AbortController()
    const timeoutId = setTimeout(() => {
      this.abortController?.abort()
    }, this.config.timeout)

    try {
      const response = await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers
        },
        body: JSON.stringify(request),
        signal: this.abortController.signal
      })
      return response
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<AIServiceConfig>): void {
    this.config = { ...this.config, ...config }
  }
}
