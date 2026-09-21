/**
 * @vervedoc/docx-parser
 *
 * 本地 JS 实现的 DOCX 导入/导出，与 @vervedoc/core 钩子契约同构：
 * - DocxImportCallback: ArrayBuffer|File → IDocxImportResult
 * - DocxExportCallback: IEditorData|IElement[] → IDocxExportResult
 *
 * 与其他实现平级，由宿主自行注入到 WordEditor。
 */

export type {
  IDocxParseResult,
  IDocxParseOptions,
  IChartRenderer
} from './parser'

export type {
  DocxImportCallback,
  DocxExportCallback,
  IDocxExportResult,
  IDocxExportOptions
} from './contract'

export { DocxParser, createDocxParser, parseDocx } from './parser'
export { writeDocx } from './writer/docx.writer'
export { createDocxImportCallback, createDocxExportCallback } from './callbacks'
