import {
  BooleanNumber,
  BorderStyleTypes,
  CellValueType,
  HorizontalAlign,
  LocaleType,
  WrapStrategy,
  type IRange,
  type IStyleData,
  type IWorkbookData,
  type IWorksheetData,
  VerticalAlign,
} from '@univerjs/core'
import type { ICellMeta, ICellStyle, IUiSheet, IWorkbook } from '../types'
import { buildSheetDrawingResources, mergeWorkbookResources } from './sheet-drawing-resources'

const DEFAULT_WORKBOOK_ID = 'vervedocs-excel'
const DEFAULT_SHEET_ROWS = 50
const DEFAULT_SHEET_COLS = 26
const DEFAULT_COL_WIDTH = 73
const DEFAULT_ROW_HEIGHT = 19

function normalizeLocale(locale?: string): LocaleType {
  return locale === 'enUS' ? LocaleType.EN_US : LocaleType.ZH_CN
}

function toCssColor(color?: { rgb?: string | null | void } | null | void): string | undefined {
  const value = String(color?.rgb || '').trim()
  return value || undefined
}

function toColorStyle(color?: string) {
  const value = String(color || '').trim()
  return value ? { rgb: value } : undefined
}

function toBooleanNumber(value?: boolean): BooleanNumber | undefined {
  if (value === undefined) return undefined
  return value ? BooleanNumber.TRUE : BooleanNumber.FALSE
}

function toTextDecoration(enabled?: boolean) {
  if (!enabled) return undefined
  return {
    s: BooleanNumber.TRUE,
  }
}

function fromTextDecoration(value?: { s?: BooleanNumber } | null): boolean | undefined {
  if (!value) return undefined
  return value.s === BooleanNumber.TRUE
}

function toHorizontalAlign(value?: string): HorizontalAlign | undefined {
  if (value === 'left') return HorizontalAlign.LEFT
  if (value === 'center') return HorizontalAlign.CENTER
  if (value === 'right') return HorizontalAlign.RIGHT
  return undefined
}

function fromHorizontalAlign(value?: HorizontalAlign | null | void): ICellStyle['align'] | undefined {
  if (value === HorizontalAlign.LEFT) return 'left'
  if (value === HorizontalAlign.CENTER) return 'center'
  if (value === HorizontalAlign.RIGHT) return 'right'
  return undefined
}

function toVerticalAlign(value?: string): VerticalAlign | undefined {
  if (value === 'top') return VerticalAlign.TOP
  if (value === 'middle') return VerticalAlign.MIDDLE
  if (value === 'bottom') return VerticalAlign.BOTTOM
  return undefined
}

function fromVerticalAlign(value?: VerticalAlign | null | void): ICellStyle['verticalAlign'] | undefined {
  if (value === VerticalAlign.TOP) return 'top'
  if (value === VerticalAlign.MIDDLE) return 'middle'
  if (value === VerticalAlign.BOTTOM) return 'bottom'
  return undefined
}

function toWrapStrategy(value?: string): WrapStrategy | undefined {
  if (value === 'overflow') return WrapStrategy.OVERFLOW
  if (value === 'wrap') return WrapStrategy.WRAP
  if (value === 'clip') return WrapStrategy.CLIP
  return undefined
}

function fromWrapStrategy(value?: WrapStrategy | null | void): ICellStyle['wrap'] | undefined {
  if (value === WrapStrategy.OVERFLOW) return 'overflow'
  if (value === WrapStrategy.WRAP) return 'wrap'
  if (value === WrapStrategy.CLIP) return 'clip'
  return undefined
}

function cssBorderToUniver(value?: string) {
  const text = String(value || '').trim()
  if (!text) return undefined
  const parts = text.split(/\s+/)
  const styleText = parts[1]?.toLowerCase() || 'solid'
  const colorText = parts.find((part) => part.startsWith('#')) || '#000000'
  let style = BorderStyleTypes.THIN
  if (styleText === 'double') style = BorderStyleTypes.DOUBLE
  else if (styleText === 'dashed') style = BorderStyleTypes.DASHED
  else if (styleText === 'dotted') style = BorderStyleTypes.DOTTED
  return {
    s: style,
    cl: { rgb: colorText },
  }
}

function univerBorderToCss(value?: { s: BorderStyleTypes; cl?: { rgb?: string | null | void } | null | void } | null | void): string | undefined {
  if (!value) return undefined
  let style = 'solid'
  if (value.s === BorderStyleTypes.DOUBLE) style = 'double'
  else if (value.s === BorderStyleTypes.DASHED || value.s === BorderStyleTypes.MEDIUM_DASHED) style = 'dashed'
  else if (value.s === BorderStyleTypes.DOTTED) style = 'dotted'
  return `1px ${style} ${String(value.cl?.rgb || '#000000')}`
}

function cellMetaToCustom(meta?: ICellMeta) {
  if (!meta || Object.keys(meta).length === 0) return undefined
  return {
    verveMeta: meta,
  }
}

function customToCellMeta(custom?: Record<string, any> | null): ICellMeta | undefined {
  const meta = custom?.verveMeta
  if (!meta || typeof meta !== 'object') return undefined
  const next: ICellMeta = {}
  if (typeof meta.hyperlink === 'string' && meta.hyperlink.trim()) {
    next.hyperlink = meta.hyperlink.trim()
  }
  if (typeof meta.comment === 'string' && meta.comment.trim()) {
    next.comment = meta.comment.trim()
  }
  return Object.keys(next).length ? next : undefined
}

function internalStyleToUniver(style?: ICellStyle): IStyleData | undefined {
  if (!style) return undefined
  const next: IStyleData = {}
  if (style.fontFamily) next.ff = style.fontFamily
  if (Number.isFinite(style.fontSize)) next.fs = Number(style.fontSize)
  if (style.bold !== undefined) next.bl = toBooleanNumber(style.bold)
  if (style.italic !== undefined) next.it = toBooleanNumber(style.italic)
  if (style.underline) next.ul = toTextDecoration(true)
  if (style.strikethrough) next.st = toTextDecoration(true)
  if (style.bgColor) next.bg = toColorStyle(style.bgColor)
  if (style.fontColor) next.cl = toColorStyle(style.fontColor)
  if (style.numberFormat && style.numberFormat !== 'auto' && style.numberFormat !== 'text') {
    if (style.numberFormat === 'percent') {
      const decimals = Math.max(0, Math.min(10, Number(style.decimalPlaces ?? 2)))
      next.n = { pattern: `0${decimals ? `.${'0'.repeat(decimals)}` : ''}%` }
    } else if (style.numberFormat === 'currency') {
      const decimals = Math.max(0, Math.min(10, Number(style.decimalPlaces ?? 2)))
      next.n = { pattern: `¥#,##0${decimals ? `.${'0'.repeat(decimals)}` : ''}` }
    } else if (style.numberFormat === 'number') {
      const decimals = Math.max(0, Math.min(10, Number(style.decimalPlaces ?? 2)))
      next.n = { pattern: `0${decimals ? `.${'0'.repeat(decimals)}` : ''}` }
    } else if (style.numberFormat === 'date') {
      next.n = { pattern: 'yyyy-mm-dd' }
    }
  }
  if (Number.isFinite(style.rotation)) {
    const rotation = Number(style.rotation)
    next.tr = rotation === 90
      ? { a: 0, v: BooleanNumber.TRUE }
      : { a: rotation, v: BooleanNumber.FALSE }
  }
  if (style.align) next.ht = toHorizontalAlign(style.align)
  if (style.verticalAlign) next.vt = toVerticalAlign(style.verticalAlign)
  if (style.wrap) next.tb = toWrapStrategy(style.wrap)

  const bd: NonNullable<IStyleData['bd']> = {}
  const top = cssBorderToUniver(style.borderTop)
  const right = cssBorderToUniver(style.borderRight)
  const bottom = cssBorderToUniver(style.borderBottom)
  const left = cssBorderToUniver(style.borderLeft)
  if (top) bd.t = top
  if (right) bd.r = right
  if (bottom) bd.b = bottom
  if (left) bd.l = left
  if (Object.keys(bd).length) next.bd = bd

  return Object.keys(next).length ? next : undefined
}

function univerStyleToInternal(style?: IStyleData | null): ICellStyle | undefined {
  if (!style) return undefined
  const next: ICellStyle = {}
  if (style.ff) next.fontFamily = style.ff
  if (Number.isFinite(style.fs)) next.fontSize = Number(style.fs)
  if (style.bl !== undefined) next.bold = style.bl === BooleanNumber.TRUE
  if (style.it !== undefined) next.italic = style.it === BooleanNumber.TRUE
  if (fromTextDecoration(style.ul) !== undefined) next.underline = fromTextDecoration(style.ul)
  if (fromTextDecoration(style.st) !== undefined) next.strikethrough = fromTextDecoration(style.st)
  const bg = toCssColor(style.bg)
  if (bg) next.bgColor = bg
  const fg = toCssColor(style.cl)
  if (fg) next.fontColor = fg
  const align = fromHorizontalAlign(style.ht)
  if (align) next.align = align
  const vertical = fromVerticalAlign(style.vt)
  if (vertical) next.verticalAlign = vertical
  const wrap = fromWrapStrategy(style.tb)
  if (wrap) next.wrap = wrap
  if (style.tr) {
    next.rotation = style.tr.v === BooleanNumber.TRUE ? 90 : Number(style.tr.a || 0)
  }
  const pattern = String(style.n?.pattern || '').trim()
  if (pattern) {
    if (pattern.includes('%')) {
      next.numberFormat = 'percent'
      next.decimalPlaces = (pattern.match(/\.(0+)/)?.[1] || '').length || 0
    } else if (/[¥$€£]/.test(pattern)) {
      next.numberFormat = 'currency'
      next.decimalPlaces = (pattern.match(/\.(0+)/)?.[1] || '').length || 2
    } else if (/[ymdhis]/i.test(pattern)) {
      next.numberFormat = 'date'
    } else if (/[0#]/.test(pattern)) {
      next.numberFormat = 'number'
      next.decimalPlaces = (pattern.match(/\.(0+)/)?.[1] || '').length || 0
    }
  }
  next.borderTop = univerBorderToCss(style.bd?.t)
  next.borderRight = univerBorderToCss(style.bd?.r)
  next.borderBottom = univerBorderToCss(style.bd?.b)
  next.borderLeft = univerBorderToCss(style.bd?.l)
  return Object.keys(next).length ? next : undefined
}

function toRange(merge: string): IRange | null {
  const [r1, c1, r2, c2] = String(merge || '').split(':').map(Number)
  if (![r1, c1, r2, c2].every(Number.isFinite)) return null
  return {
    startRow: r1,
    startColumn: c1,
    endRow: r2,
    endColumn: c2,
  }
}

function fromRange(range: IRange): string {
  return `${range.startRow}:${range.startColumn}:${range.endRow}:${range.endColumn}`
}

function toUiSheet(sheet: Partial<IWorksheetData>, index: number): IUiSheet {
  const cells: Record<string, string> = {}
  const styles: Record<string, ICellStyle> = {}
  const cellMeta: Record<string, ICellMeta> = {}
  const rawCellData = sheet.cellData || {}
  for (const [rowText, rowData] of Object.entries(rawCellData)) {
    const row = Number(rowText)
    if (!Number.isFinite(row) || !rowData || typeof rowData !== 'object') continue
    for (const [colText, rawCell] of Object.entries(rowData as Record<string, any>)) {
      const col = Number(colText)
      if (!Number.isFinite(col) || !rawCell || typeof rawCell !== 'object') continue
      const key = `${row}:${col}`
      const cell = rawCell as Record<string, any>
      if (typeof cell.f === 'string' && cell.f.trim()) {
        cells[key] = `=${cell.f}`
      } else if (cell.v !== null && cell.v !== undefined && cell.v !== '') {
        cells[key] = String(cell.v)
      }
      const style = univerStyleToInternal(cell.s as IStyleData | undefined)
      if (style) styles[key] = style
      const meta = customToCellMeta(cell.custom)
      if (meta) cellMeta[key] = meta
    }
  }

  const colWidths: Record<number, number> = {}
  const rowHeights: Record<number, number> = {}
  const hiddenCols: Record<number, boolean> = {}
  const hiddenRows: Record<number, boolean> = {}

  for (const [indexText, columnData] of Object.entries(sheet.columnData || {})) {
    const col = Number(indexText)
    if (!Number.isFinite(col) || !columnData || typeof columnData !== 'object') continue
    const width = (columnData as Record<string, any>).w
    if (Number.isFinite(width)) colWidths[col] = Number(width)
    const hidden = (columnData as Record<string, any>).hd
    if (hidden === BooleanNumber.TRUE) hiddenCols[col] = true
  }

  for (const [indexText, rowData] of Object.entries(sheet.rowData || {})) {
    const row = Number(indexText)
    if (!Number.isFinite(row) || !rowData || typeof rowData !== 'object') continue
    const height = (rowData as Record<string, any>).h
    if (Number.isFinite(height)) rowHeights[row] = Number(height)
    const hidden = (rowData as Record<string, any>).hd
    if (hidden === BooleanNumber.TRUE) hiddenRows[row] = true
  }

  return {
    id: String(sheet.id || `sheet-${index}`),
    name: String(sheet.name || `Sheet${index + 1}`),
    rowCount: Math.max(DEFAULT_SHEET_ROWS, Number(sheet.rowCount || DEFAULT_SHEET_ROWS)),
    colCount: Math.max(DEFAULT_SHEET_COLS, Number(sheet.columnCount || DEFAULT_SHEET_COLS)),
    cells,
    styles,
    cellMeta,
    merges: Array.isArray(sheet.mergeData) ? sheet.mergeData.map(fromRange) : [],
    colWidths,
    rowHeights,
    hiddenCols,
    hiddenRows,
    frozenCols: Math.max(0, Number(sheet.freeze?.xSplit || 0)),
    frozenRows: Math.max(0, Number(sheet.freeze?.ySplit || 0)),
    filterColumn: null,
    filterKeyword: '',
    filterSelectedValues: {},
    filterActive: false,
    images: Array.isArray((sheet as any).images) ? JSON.parse(JSON.stringify((sheet as any).images)) : undefined,
  }
}

function toWorksheetData(sheet: IUiSheet): Partial<IWorksheetData> {
  const cellData: Record<number, Record<number, Record<string, any>>> = {}
  for (const [key, value] of Object.entries(sheet.cells || {})) {
    const [rowText, colText] = key.split(':')
    const row = Number(rowText)
    const col = Number(colText)
    if (!Number.isFinite(row) || !Number.isFinite(col)) continue
    if (!cellData[row]) cellData[row] = {}
    const style = internalStyleToUniver(sheet.styles?.[key])
    const meta = cellMetaToCustom(sheet.cellMeta?.[key])
    const raw = String(value ?? '')
    const next: Record<string, any> = {}
    if (raw.startsWith('=') && raw.length > 1) {
      next.f = raw.slice(1)
    } else if (raw !== '') {
      const numeric = Number(raw)
      if (raw.trim() !== '' && Number.isFinite(numeric) && !/^0\d+/.test(raw.trim())) {
        next.v = numeric
        next.t = CellValueType.NUMBER
      } else {
        next.v = raw
        next.t = CellValueType.STRING
      }
    }
    if (style) next.s = style
    if (meta) next.custom = meta
    cellData[row][col] = next
  }

  for (const [key, meta] of Object.entries(sheet.cellMeta || {})) {
    const [rowText, colText] = key.split(':')
    const row = Number(rowText)
    const col = Number(colText)
    if (!Number.isFinite(row) || !Number.isFinite(col)) continue
    if (!cellData[row]) cellData[row] = {}
    if (!cellData[row][col]) cellData[row][col] = {}
    const custom = cellMetaToCustom(meta)
    if (custom) cellData[row][col].custom = custom
  }

  const rowData: Record<number, Record<string, any>> = {}
  const columnData: Record<number, Record<string, any>> = {}

  for (let row = 0; row < sheet.rowCount; row++) {
    const next: Record<string, any> = {}
    const height = sheet.rowHeights?.[row]
    if (Number.isFinite(height)) next.h = Number(height)
    if (sheet.hiddenRows?.[row]) next.hd = BooleanNumber.TRUE
    if (Object.keys(next).length) rowData[row] = next
  }

  for (let col = 0; col < sheet.colCount; col++) {
    const next: Record<string, any> = {}
    const width = sheet.colWidths?.[col]
    if (Number.isFinite(width)) next.w = Number(width)
    if (sheet.hiddenCols?.[col]) next.hd = BooleanNumber.TRUE
    if (Object.keys(next).length) columnData[col] = next
  }

  return {
    id: sheet.id,
    name: sheet.name,
    tabColor: '',
    hidden: BooleanNumber.FALSE,
    freeze: {
      xSplit: Math.max(0, Number(sheet.frozenCols || 0)),
      ySplit: Math.max(0, Number(sheet.frozenRows || 0)),
      startColumn: Math.max(0, Number(sheet.frozenCols || 0)),
      startRow: Math.max(0, Number(sheet.frozenRows || 0)),
    },
    rowCount: Math.max(DEFAULT_SHEET_ROWS, Number(sheet.rowCount || DEFAULT_SHEET_ROWS)),
    columnCount: Math.max(DEFAULT_SHEET_COLS, Number(sheet.colCount || DEFAULT_SHEET_COLS)),
    zoomRatio: 1,
    scrollTop: 0,
    scrollLeft: 0,
    defaultColumnWidth: DEFAULT_COL_WIDTH,
    defaultRowHeight: DEFAULT_ROW_HEIGHT,
    mergeData: Array.isArray(sheet.merges) ? sheet.merges.map(toRange).filter((item): item is IRange => !!item) : [],
    cellData,
    rowData,
    columnData,
    rowHeader: {
      width: 46,
    },
    columnHeader: {
      height: 24,
    },
    showGridlines: sheet.filterActive === false ? BooleanNumber.TRUE : BooleanNumber.TRUE,
    rightToLeft: BooleanNumber.FALSE,
  }
}

export function internalWorkbookToUniver(workbook: IWorkbook, locale?: string): IWorkbookData {
  const sheets = Array.isArray(workbook?.sheets) ? workbook.sheets : []
  const sheetOrder = sheets.map((sheet, index) => String(sheet.id || `sheet-${index}`))
  const sheetMap = Object.fromEntries(
    sheets.map((sheet, index) => [sheetOrder[index], toWorksheetData({ ...sheet, id: sheetOrder[index] })]),
  )
  const drawingResources = buildSheetDrawingResources(workbook, DEFAULT_WORKBOOK_ID)
  const resources = drawingResources.length
    ? mergeWorkbookResources(workbook?.resources, drawingResources)
    : (workbook?.resources && typeof workbook.resources === 'object'
      ? JSON.parse(JSON.stringify(workbook.resources))
      : undefined)

  return {
    id: DEFAULT_WORKBOOK_ID,
    name: DEFAULT_WORKBOOK_ID,
    appVersion: '1.0.0',
    locale: normalizeLocale(locale),
    styles: {},
    sheetOrder,
    sheets: sheetMap,
    resources,
  }
}

export function univerWorkbookToInternal(workbook: Partial<IWorkbookData>): IWorkbook {
  const order = Array.isArray(workbook.sheetOrder) ? workbook.sheetOrder : Object.keys(workbook.sheets || {})
  const sheets = order
    .map((sheetId, index) => {
      const sheet = workbook.sheets?.[sheetId]
      if (!sheet) return null
      return toUiSheet({ ...sheet, id: sheetId }, index)
    })
    .filter((sheet): sheet is IUiSheet => !!sheet)

  return {
    version: 1,
    resources: workbook.resources && typeof workbook.resources === 'object'
      ? JSON.parse(JSON.stringify(workbook.resources))
      : undefined,
    sheets: sheets.length
      ? sheets
      : [{
        id: 'sheet-0',
        name: 'Sheet1',
        rowCount: DEFAULT_SHEET_ROWS,
        colCount: DEFAULT_SHEET_COLS,
        cells: {},
        styles: {},
        cellMeta: {},
        merges: [],
        colWidths: {},
        rowHeights: {},
        hiddenCols: {},
        hiddenRows: {},
        frozenCols: 0,
        frozenRows: 0,
        filterColumn: null,
        filterKeyword: '',
        filterSelectedValues: {},
        filterActive: false,
      }],
  }
}
