/**
 * DocxEditor AI 智能编辑插件
 * 
 * 提供选中内容智能修改、润色、翻译等 AI 功能
 * 
 * @example
 * ```typescript
 * import { createAIPlugin } from '@wanghe1995/docx-editor-ai'
 * 
 * const editor = new DocxEditor(container, data, options)
 * 
 * // 注入 AI 插件后才会显示悬浮工具栏
 * editor.use(createAIPlugin({
 *   service: {
 *     apiEndpoint: '/api/ai',
 *     streaming: true
 *   }
 * }))
 * ```
 */

// 插件
export { createAIPlugin, AIPlugin } from './plugin/AIPlugin'

// 核心服务
export { AIService } from './core/AIService'
export { buildPrompt, PROMPT_TEMPLATES } from './core/PromptTemplates'

// UI 组件（高级用法）
export { FloatingToolbar } from './ui/FloatingToolbar'
export { ResultPanel } from './ui/ResultPanel'

// 类型导出
export {
  // 枚举
  AIAction,
  TranslateLanguage,
  // 接口
  type AIRequest,
  type AIResponse,
  type StreamCallbacks,
  type AIServiceConfig,
  type AIPluginConfig,
  type CustomAction,
  type I18nConfig,
  type EditorInterface,
  type AIPluginEvents,
  // 常量
  DEFAULT_I18N_ZH
} from './types'

// UI 类型
export type { FloatingToolbarConfig, FloatingToolbarCallbacks } from './ui/FloatingToolbar'
export type { ResultPanelConfig, ResultPanelCallbacks } from './ui/ResultPanel'
