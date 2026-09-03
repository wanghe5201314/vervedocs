/**
 * TODO: 与 @vervedoc/excel-parser 的 IWorkbook 等交换类型双份维护，后续抽到独立 types 包统一。
 */

export type Align = 'left' | 'center' | 'right'
export type VerticalAlign = 'top' | 'middle' | 'bottom'
export type WrapMode = 'clip' | 'overflow' | 'wrap'

export interface ICellRichTextRun {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  fontFamily?: string
  fontSize?: number
  fontColor?: string
}

export interface ICellStyle {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  align?: Align
  verticalAlign?: VerticalAlign
  fontFamily?: string
  fontSize?: number
  fontColor?: string
  bgColor?: string
  wrap?: WrapMode
  numberFormat?: string
  decimalPlaces?: number
  rotation?: number
  borderTop?: string
  borderBottom?: string
  borderLeft?: string
  borderRight?: string
}

export interface ICellMeta {
  hyperlink?: string
  comment?: string
  /** xlsx 导入时的公式缓存结果，用于初始化 Univer 单元格显示值 */
  formulaResult?: string | number | boolean
}

export interface ISheetImageAnchor {
  col: number
  row: number
  /** Excel 原生偏移（EMU） */
  colOff: number
  rowOff: number
}

export interface ISheetFloatingImage {
  id: string
  name?: string
  mimeType: string
  /** data:image/...;base64,... */
  dataUrl: string
  from: ISheetImageAnchor
  to: ISheetImageAnchor
  /** Excel editAs: oneCell | twoCell | absolute */
  anchorType?: string
}

export interface IUiSheet {
  id: string
  name: string
  rowCount: number
  colCount: number
  cells: Record<string, string>
  styles: Record<string, ICellStyle>
  cellRichTexts?: Record<string, ICellRichTextRun[]>
  cellMeta?: Record<string, ICellMeta>
  merges?: string[]
  colWidths?: Record<number, number>
  rowHeights?: Record<number, number>
  hiddenCols?: Record<number, boolean>
  hiddenRows?: Record<number, boolean>
  frozenCols?: number
  frozenRows?: number
  filterColumn?: number | null
  filterKeyword?: string
  filterSelectedValues?: Record<string, boolean>
  filterActive?: boolean
  images?: ISheetFloatingImage[]
}

export interface IWorkbook {
  version: number
  resources?: Record<string, any>
  sheets: IUiSheet[]
}

export interface IExcelImportResult {
  success: boolean
  workbook?: IWorkbook
  error?: string
}

export interface IExcelParseOptions {
  defaultSheetName?: (index: number) => string
}

export interface IExcelExportResult {
  success: boolean
  data?: ArrayBuffer
  error?: string
}

export interface IExcelExportOptions {
  defaultSheetName?: (index: number) => string
}

export type ExcelImportCallback = (
  data: ArrayBuffer | File,
  options?: IExcelParseOptions
) => Promise<IExcelImportResult>

export type ExcelExportCallback = (
  workbook: IWorkbook,
  options?: IExcelExportOptions
) => Promise<IExcelExportResult>

export interface UndoEntry {
  sheetIndex: number
  cells: Record<string, string>
  styles: Record<string, ICellStyle>
  cellMeta?: Record<string, ICellMeta>
}

/** @deprecated 使用 IExcelParseOptions */
export type SheetI18nOptions = {
  defaultSheetName?: (index: number) => string
}
