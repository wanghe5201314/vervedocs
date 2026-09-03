import type { IWorkbook } from '../types'

/**
 * TODO: 与 @vervedoc/excel 的导入结果类型双份维护，后续抽到独立 types 包统一。
 */

export interface IExcelImportResult {
  success: boolean
  workbook?: IWorkbook
  error?: string
}

export interface IExcelParseOptions {
  defaultSheetName?: (index: number) => string
}
