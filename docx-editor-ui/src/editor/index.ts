/**
 * docx-editor 编辑器入口
 * 重导出核心包的所有内容 + UI 组件
 */
export * from '@wanghe1995/docx-editor-core'

// 导出对象式接入入口
export { WordEditor } from '../object/WordEditor'
export type { Options } from '../object/WordEditor'

// 导出版本号
export const DOCX_EDITOR_UI_VERSION = __APP_VERSION__

// 导出 API 相关类型
export type {
  DocumentApi,
  DocumentRequestConfig,
  DocumentRequestEndpoints,
  DocumentMeta,
  SaveDocumentRequest,
  SaveDocumentResult,
  SetStatusRequest
} from '../api/document.api'

export type {
  CollaborationOptions,
  DocxEditorUiInitialDocument
} from '../ui/index'
