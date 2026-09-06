/**
 * VerveDocs Schema —— AI 层跨包共享接口
 *
 * 从 docx-editor-ai 包迁移的跨包共享类型。
 */

/** AI 服务配置 */
export interface AIServiceConfig {
  /** API 端点 */
  apiEndpoint: string
  /** 请求超时（毫秒） */
  timeout?: number
  /** 自定义请求头 */
  headers?: Record<string, string>
  /** 是否启用流式响应 */
  streaming?: boolean
}