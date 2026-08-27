import type { IEditorData, IElement } from '@vervedoc/docx-editor-schema'
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
export type DocxExportCallback = (
  data: IEditorData | IElement[],
  options?: IDocxExportOptions
) => Promise<IDocxExportResult>

export type { IDocxParseOptions, IDocxParseResult, DocxCommentMeta, IEditorData, IElement }
