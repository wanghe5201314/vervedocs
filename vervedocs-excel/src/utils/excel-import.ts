import ExcelJS from 'exceljs'
import type { Align, ICellMeta, ICellStyle, IUiSheet, IWorkbook, VerticalAlign } from '../types'

type ImportI18nOptions = {
  defaultSheetName?: (index: number) => string
}

function normalizeArgbToHex(argb: unknown): string | undefined {
  const text = String(argb || '').trim()
  if (!text) return
  const normalized = text.length === 8 ? text.slice(2) : text
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return
  return `#${normalized.toUpperCase()}`
}

function toHexColor(input: unknown): string | undefined {
  if (!input || typeof input !== 'object') return
  const color = input as { argb?: string }
  return normalizeArgbToHex(color.argb)
}

function borderLineStyleToCss(style: unknown): string {
  const value = String(style || '').toLowerCase()
  if (!value || value === 'none') return ''
  if (
    value === 'dashed' ||
    value === 'mediumdashed' ||
    value === 'slantdashdot' ||
    value === 'dashdot' ||
    value === 'dashdotdot' ||
    value === 'mediumdashdot' ||
    value === 'mediumdashdotdot'
  ) {
    return 'dashed'
  }
  if (value === 'dotted') {
    return 'dotted'
  }
  if (value === 'double') {
    return 'double'
  }
  return 'solid'
}

function borderLineWidthToCss(style: unknown): string {
  const value = String(style || '').toLowerCase()
  if (!value || value === 'none') return '0'
  if (value.includes('thick')) return '2px'
  if (value.includes('medium')) return '1.5px'
  if (value === 'hair') return '0.5px'
  return '1px'
}

function toCssBorder(borderPart: unknown): string | undefined {
  if (!borderPart || typeof borderPart !== 'object') return
  const part = borderPart as { style?: string; color?: unknown }
  const lineStyle = borderLineStyleToCss(part.style)
  if (!lineStyle) return
  const lineWidth = borderLineWidthToCss(part.style)
  const color = toHexColor(part.color) || '#000000'
  return `${lineWidth} ${lineStyle} ${color}`
}

function toAlign(horizontal: unknown): Align | undefined {
  const value = String(horizontal || '').toLowerCase()
  if (value === 'left' || value === 'center' || value === 'right') return value
  return
}

function toVerticalAlign(vertical: unknown): VerticalAlign | undefined {
  const value = String(vertical || '').toLowerCase()
  if (value === 'top' || value === 'center' || value === 'bottom') {
    return value === 'center' ? 'middle' : (value as VerticalAlign)
  }
  return
}

function inferNumberFormat(formatCode: unknown): Pick<ICellStyle, 'numberFormat' | 'decimalPlaces'> {
  const formatText = String(formatCode || '').toLowerCase()
  if (!formatText) return {}
  const decimalsMatch = formatText.match(/\.(0+)/)
  const decimalPlaces = decimalsMatch?.[1]?.length
  if (formatText.includes('%')) {
    return { numberFormat: 'percent', decimalPlaces: decimalPlaces ?? 2 }
  }
  if (/[¥$€£]/.test(formatText)) {
    return { numberFormat: 'currency', decimalPlaces: decimalPlaces ?? 2 }
  }
  if (/[ymdhss]/.test(formatText)) {
    return { numberFormat: 'date' }
  }
  if (formatText.includes('0') || formatText.includes('#')) {
    return { numberFormat: 'number', decimalPlaces: decimalPlaces ?? 2 }
  }
  return {}
}

function parseCellStyle(cell: any): ICellStyle | undefined {
  const style = cell?.style || {}
  const result: ICellStyle = {}
  const font = style?.font
  if (font) {
    if (font.bold) result.bold = true
    if (font.italic) result.italic = true
    if (font.underline) result.underline = true
    if (font.strike) result.strikethrough = true
    if (font.name) result.fontFamily = String(font.name)
    if (Number.isFinite(font.sz)) result.fontSize = Number(font.sz)
    const fontColor = toHexColor(font.color)
    if (fontColor) result.fontColor = fontColor
  }
  const fill = style?.fill
  const fillType = String(fill?.type || '').toLowerCase()
  const fillPattern = String(fill?.pattern || '').toLowerCase()
  const bgColor = fillType === 'pattern' && fillPattern !== 'none'
    ? (toHexColor(fill?.fgColor) || toHexColor(fill?.bgColor))
    : undefined
  if (bgColor) result.bgColor = bgColor
  const border = style?.border
  const borderTop = toCssBorder(border?.top)
  const borderBottom = toCssBorder(border?.bottom)
  const borderLeft = toCssBorder(border?.left)
  const borderRight = toCssBorder(border?.right)
  if (borderTop) result.borderTop = borderTop
  if (borderBottom) result.borderBottom = borderBottom
  if (borderLeft) result.borderLeft = borderLeft
  if (borderRight) result.borderRight = borderRight
  const alignment = style?.alignment
  const align = toAlign(alignment?.horizontal)
  if (align) result.align = align
  const verticalAlign = toVerticalAlign(alignment?.vertical)
  if (verticalAlign) result.verticalAlign = verticalAlign
  if (alignment?.wrapText === true) result.wrap = 'wrap'
  if (Number.isFinite(alignment?.textRotation)) result.rotation = Number(alignment.textRotation)
  const numberFormat = inferNumberFormat(cell?.numFmt)
  Object.assign(result, numberFormat)
  return Object.keys(result).length ? result : undefined
}

function parseCellValue(cell: any): string {
  const value = cell?.value
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') {
    if (typeof value.formula === 'string' && value.formula.trim()) {
      return `=${value.formula}`
    }
    if (value.richText && Array.isArray(value.richText)) {
      return value.richText.map((part: any) => String(part?.text || '')).join('')
    }
    if (value.text !== undefined && value.text !== null) {
      return String(value.text)
    }
    if (value.result !== undefined && value.result !== null) {
      return String(value.result)
    }
    return ''
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  return String(value)
}

function parseCellMeta(cell: any): ICellMeta | undefined {
  const value = cell?.value
  const result: ICellMeta = {}
  if (value && typeof value === 'object' && typeof value.hyperlink === 'string' && value.hyperlink.trim()) {
    result.hyperlink = String(value.hyperlink).trim()
  }
  const note = cell?.note
  if (typeof note === 'string' && note.trim()) {
    result.comment = note.trim()
  } else if (note && typeof note === 'object' && Array.isArray(note.texts)) {
    const text = note.texts.map((part: any) => String(part?.text || '')).join('').trim()
    if (text) result.comment = text
  }
  return Object.keys(result).length ? result : undefined
}

function normalizeColWidth(col: unknown): number | undefined {
  if (!col || typeof col !== 'object') return
  const part = col as { width?: number; hidden?: boolean }
  if (part.hidden) return
  if (Number.isFinite(part.width)) return Math.max(30, Math.round(Number(part.width) * 8 + 8))
  return
}

function normalizeRowHeight(row: unknown): number | undefined {
  if (!row || typeof row !== 'object') return
  const part = row as { height?: number; hidden?: boolean }
  if (part.hidden) return
  if (Number.isFinite(part.height)) return Math.max(20, Math.round(Number(part.height) * 96 / 72))
  return
}

function parseRangeAddress(address: string): { r: number; c: number } | null {
  const match = String(address || '').match(/^([A-Z]+)(\d+)$/i)
  if (!match) return null
  const colText = match[1].toUpperCase()
  const row = Number(match[2]) - 1
  if (!Number.isFinite(row) || row < 0) return null
  let col = 0
  for (let i = 0; i < colText.length; i++) {
    col = col * 26 + (colText.charCodeAt(i) - 64)
  }
  col -= 1
  if (col < 0) return null
  return { r: row, c: col }
}

function parseMergeAddress(range: string): string | null {
  const [start, end] = String(range || '').split(':')
  const startCell = parseRangeAddress(start || '')
  const endCell = parseRangeAddress(end || start || '')
  if (!startCell || !endCell) return null
  return `${startCell.r}:${startCell.c}:${endCell.r}:${endCell.c}`
}

function toUiSheet(worksheet: any, index: number, options?: ImportI18nOptions): IUiSheet {
  const cells: Record<string, string> = {}
  const styles: Record<string, ICellStyle> = {}
  const cellMeta: Record<string, ICellMeta> = {}
  const colWidths: Record<number, number> = {}
  const rowHeights: Record<number, number> = {}
  const hiddenCols: Record<number, boolean> = {}
  const hiddenRows: Record<number, boolean> = {}

  const maxRowFromCells = Number.isFinite(worksheet?.actualRowCount) ? Number(worksheet.actualRowCount) : 0
  const maxColFromCells = Number.isFinite(worksheet?.actualColumnCount) ? Number(worksheet.actualColumnCount) : 0

  worksheet?.eachRow?.({ includeEmpty: false }, (row: any, rowNumber: number) => {
    row?.eachCell?.({ includeEmpty: false }, (cell: any, colNumber: number) => {
      const rowIndex = Number(rowNumber) - 1
      const colIndex = Number(colNumber) - 1
      if (rowIndex < 0 || colIndex < 0) return
      const key = `${rowIndex}:${colIndex}`
      const value = parseCellValue(cell)
      if (value !== '') cells[key] = value
      const style = parseCellStyle(cell)
      if (style) styles[key] = style
      const meta = parseCellMeta(cell)
      if (meta) cellMeta[key] = meta
    })
  })

  const cols = Array.isArray(worksheet?.columns) ? worksheet.columns : []
  cols.forEach((col: unknown, colIndex: number) => {
    if (col && typeof col === 'object' && (col as { hidden?: boolean }).hidden) {
      hiddenCols[colIndex] = true
    }
    const width = normalizeColWidth(col)
    if (width) colWidths[colIndex] = width
  })
  const rows = Array.isArray(worksheet?._rows) ? worksheet._rows : []
  rows.forEach((row: unknown, rowIndex: number) => {
    if (row && typeof row === 'object' && (row as { hidden?: boolean }).hidden) {
      hiddenRows[rowIndex] = true
    }
    const height = normalizeRowHeight(row)
    if (height) rowHeights[rowIndex] = height
  })

  const mergeRanges = worksheet?.model?.merges
  const merges = Array.isArray(mergeRanges)
    ? mergeRanges
      .map((range: unknown) => parseMergeAddress(String(range || '')))
      .filter((range: string | null): range is string => !!range)
    : []

  let maxRow = maxRowFromCells
  let maxCol = maxColFromCells
  for (const merge of merges) {
    const [r1, c1, r2, c2] = merge.split(':').map(Number)
    maxRow = Math.max(maxRow, r1 + 1, r2 + 1)
    maxCol = Math.max(maxCol, c1 + 1, c2 + 1)
  }
  for (const key of Object.keys(colWidths)) {
    maxCol = Math.max(maxCol, Number(key) + 1)
  }
  for (const key of Object.keys(rowHeights)) {
    maxRow = Math.max(maxRow, Number(key) + 1)
  }
  const rowCount = Math.max(maxRow, 50)
  const colCount = Math.max(maxCol, 26)
  const view = Array.isArray(worksheet?.views) ? worksheet.views[0] : undefined
  const frozenRows = Number.isFinite(view?.ySplit) ? Math.max(0, Number(view.ySplit)) : 0
  const frozenCols = Number.isFinite(view?.xSplit) ? Math.max(0, Number(view.xSplit)) : 0

  return {
    id: String(index),
    name: String(worksheet?.name || options?.defaultSheetName?.(index) || `工作表${index + 1}`),
    rowCount,
    colCount,
    cells,
    styles,
    cellMeta,
    merges,
    colWidths,
    rowHeights,
    hiddenCols,
    hiddenRows,
    frozenCols,
    frozenRows
  }
}

export async function readExcelFileToWorkbook(file: File, options?: ImportI18nOptions): Promise<IWorkbook> {
  const workbook = new ExcelJS.Workbook()
  const buffer = await file.arrayBuffer()
  await workbook.xlsx.load(buffer)
  const worksheetList = Array.isArray(workbook.worksheets) ? workbook.worksheets : []
  const sheets = worksheetList.map((worksheet: any, index: number) => toUiSheet(worksheet, index, options))
  return {
    version: 1,
    sheets: sheets.length ? sheets : [{
      id: '0',
      name: options?.defaultSheetName?.(0) || '工作表1',
      rowCount: 50,
      colCount: 26,
      cells: {},
      styles: {},
      cellMeta: {},
      merges: [],
      colWidths: {},
      rowHeights: {},
      hiddenCols: {},
      hiddenRows: {},
      frozenCols: 0,
      frozenRows: 0
    }]
  }
}
