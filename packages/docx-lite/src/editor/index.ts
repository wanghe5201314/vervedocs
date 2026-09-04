/**
 * docx-lite 编辑器入口
 *
 * DOCX 导入/导出契约（实现由宿主注入，本包不内置、不依赖 parser）：
 * - DocxImportCallback / DocxExportCallback
 * - 参考实现：独立包 @vervedoc/docx-parser（本地 JS）
 * - 也可自行实现任意引擎，只要满足同一回调接口
 */
export * from '@vervedoc/core'

export { WordEditor } from '../object/word-editor'
export type { WordEditorOptions } from '../object/word-editor'

export type {
  DocxImportCallback,
  DocxExportCallback,
  IDocxImportResult,
  IDocxExportResult,
  IDocxImportOptions,
  IDocxExportOptions
} from '@vervedoc/core'
