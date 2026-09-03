/**
 * @vervedoc/excel-parser
 *
 * 本地 JS 实现的 Excel 导入/导出：
 * - ExcelImportCallback: ArrayBuffer|File → IExcelImportResult
 * - ExcelExportCallback: IWorkbook → IExcelExportResult
 *
 * 与其他实现平级，由宿主自行注入到 ExcelEditor。
 */

export type {
  Align,
  VerticalAlign,
  WrapMode,
  ICellStyle,
  ICellRichTextRun,
  ICellMeta,
  ISheetImageAnchor,
  ISheetFloatingImage,
  IUiSheet,
  IWorkbook,
} from './types'

export type {
  IExcelImportResult,
  IExcelParseOptions,
} from './parser/types'

export type {
  ExcelImportCallback,
  ExcelExportCallback,
  IExcelExportResult,
  IExcelExportOptions,
} from './contract'

export { parseExcel, readExcelFileToWorkbook } from './parser/excel.parser'
export { writeExcel, writeWorkbookToExcelBuffer } from './writer/excel.writer'
export { createExcelImportCallback, createExcelExportCallback } from './callbacks'
export { normalizeFontFamily } from './utils/font-family'
export { cellKey, columnLabel } from './utils/cell'
export {
  DEFAULT_SHEET_ROWS,
  DEFAULT_SHEET_COLS,
  hasUsableWorkbookContent,
  normalizeWorkbook,
  fromInternalSheet,
  fromFortuneSheetRecord,
  createDefaultSheet,
} from './utils/workbook-state'
export type { IWorkbookStateOptions } from './utils/workbook-state'
