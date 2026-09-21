/**
 * docx-editor 编辑器入口
 * 重导出核心包的所有内容 + UI 组件
 *
 * DOCX 导入/导出契约（实现由宿主注入，本包不内置）：
 * - DocxImportCallback / DocxExportCallback
 * - 参考实现：@vervedoc/docx-parser（本地 JS）
 * - 也可自行实现任意引擎，只要满足同一回调接口
 */
export * from '@vervedoc/core'

// 导出对象式接入入口
export { WordEditor } from './word-editor'
export type { Options } from './word-editor'

// 明确再导出导入/导出契约，便于宿主与实现方对齐
export type {
  DocxImportCallback,
  DocxExportCallback
} from '@vervedoc/core'

// 导出版本号
/** docx-editor UI 版本号，取自构建期注入的 __APP_VERSION__ */
export const DOCX_EDITOR_UI_VERSION = __APP_VERSION__

// 导出文档 API 类型与默认实现（供接入方 / playground 注入）
export type {
  DocumentApi,
  DocumentRequestConfig,
  DocumentRequestEndpoints,
  DocumentMeta,
  SaveDocumentRequest,
  SaveDocumentResult,
  SetStatusRequest
} from '../api/document.api'
export {
  setDocumentApi,
  createDefaultDocumentApi
} from '../api/document.api'

export type {
  CollaborationOptions,
  DocxEditorUiInitialDocument
} from './types'
