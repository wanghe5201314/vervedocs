import type { IWorkbook } from './types'
import type { IExcelImportResult, IExcelParseOptions } from './parser/types'

export interface IExcelExportResult {
  success: boolean
  data?: ArrayBuffer
  error?: string
}

export interface IExcelExportOptions {
  defaultSheetName?: (index: number) => string
}

/** Excel 导入回调 */
export type ExcelImportCallback = (
  data: ArrayBuffer | File,
  options?: IExcelParseOptions
) => Promise<IExcelImportResult>

/** Excel 导出回调 */
export type ExcelExportCallback = (
  workbook: IWorkbook,
  options?: IExcelExportOptions
) => Promise<IExcelExportResult>

export type { IExcelImportResult, IExcelParseOptions, IWorkbook }
