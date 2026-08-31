import type { IWorkbook } from '../types'

export interface IExcelImportResult {
  success: boolean
  workbook?: IWorkbook
  error?: string
}

export interface IExcelParseOptions {
  defaultSheetName?: (index: number) => string
}
