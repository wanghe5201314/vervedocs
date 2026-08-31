export type {
  Align,
  VerticalAlign,
  WrapMode,
  ICellStyle,
  ICellRichTextRun,
  ICellMeta,
  IUiSheet,
  IWorkbook,
} from '@vervedoc/excel-parser'

export interface UndoEntry {
  sheetIndex: number
  cells: Record<string, string>
  styles: Record<string, import('@vervedoc/excel-parser').ICellStyle>
  cellMeta?: Record<string, import('@vervedoc/excel-parser').ICellMeta>
}

/** @deprecated 使用 IExcelParseOptions */
export type SheetI18nOptions = {
  defaultSheetName?: (index: number) => string
}
