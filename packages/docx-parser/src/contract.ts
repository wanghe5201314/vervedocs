import type { IElement } from '@vervedoc/docx-editor-schema'

export interface IEditorData {
  main: IElement[]
  header?: IElement[]
  footer?: IElement[]
}
import type { IDocxParseOptions, IDocxParseResult, DocxCommentMeta } from './parser/types'

/** 与 @vervedoc/core DocxImportCallback 同构 */
export type DocxImportCallback = (
  data: ArrayBuffer | File,
  options?: IDocxParseOptions
) => Promise<IDocxParseResult>

export interface IDocxExportResult {
  success: boolean
  data?: ArrayBuffer
  error?: string
}

export interface IDocxExportOptions {
  defaultFont?: string
  defaultSize?: number
}

/** 与 @vervedoc/core DocxExportCallback 同构 */
export type { DocxExportCallback } from '@vervedoc/docx-editor-schema'

export type { IDocxParseOptions, IDocxParseResult, DocxCommentMeta, IElement }
