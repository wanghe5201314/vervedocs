import type { ExcelExportCallback, ExcelImportCallback, IExcelExportOptions } from './contract'
import type { IExcelParseOptions } from './parser/types'
import { parseExcel } from './parser/excel.parser'
import { writeExcel } from './writer/excel.writer'

/**
 * 创建导入回调（xlsx → IWorkbook JSON）
 * 可直接注入 ExcelEditor.importCallback
 */
export function createExcelImportCallback(
  defaultOptions?: IExcelParseOptions
): ExcelImportCallback {
  return async (data, options) => {
    return parseExcel(data, { ...defaultOptions, ...options })
  }
}

/**
 * 创建导出回调（IWorkbook JSON → xlsx）
 * 可直接注入 ExcelEditor.exportCallback
 */
export function createExcelExportCallback(
  defaultOptions?: IExcelExportOptions
): ExcelExportCallback {
  return async (workbook, options) => {
    return writeExcel(workbook, { ...defaultOptions, ...options })
  }
}
