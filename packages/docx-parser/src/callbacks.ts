import type { DocxExportCallback, DocxImportCallback, IDocxExportOptions } from './contract'
import type { IDocxParseOptions } from './parser/types'
import { parseDocx } from './parser'
import { writeDocx } from './writer/docx.writer'

/**
 * 创建导入回调（docx → IElement JSON）
 * 可直接注入 WordEditor.importCallback
 */
export function createDocxImportCallback(
  defaultOptions?: IDocxParseOptions
): DocxImportCallback {
  return async (data, options) => {
    return parseDocx(data, { ...defaultOptions, ...options })
  }
}

/**
 * 创建导出回调（IElement JSON → docx）
 * 可直接注入 WordEditor.exportCallback
 */
export function createDocxExportCallback(
  defaultOptions?: IDocxExportOptions
): DocxExportCallback {
  return async (data, options) => {
    return writeDocx(data, { ...defaultOptions, ...options })
  }
}
