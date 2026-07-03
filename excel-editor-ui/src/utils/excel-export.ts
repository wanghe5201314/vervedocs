import ExcelJS from 'exceljs'
import type { BorderStyle } from 'exceljs'
import type { ICellMeta, ICellStyle, IWorkbook } from '../types'

type ExportI18nOptions = {
  defaultSheetName?: (index: number) => string
}

function parseCellKey(key: string): { row: number; col: number } | null {
  const [rowText, colText] = String(key || '').split(':')
  const row = Number(rowText)
  const col = Number(colText)
  if (!Number.isFinite(row) || !Number.isFinite(col) || row < 0 || col < 0) return null
  return { row, col }
}

function toExcelBorder(cssBorder?: string): { style: BorderStyle; color?: { argb: string } } | undefined {
  const text = String(cssBorder || '').trim()
  if (!text) return
  const parts = text.split(/\s+/)
  if (parts.length < 2) return
  const lineStyle = parts[1].toLowerCase()
  const colorPart = parts.find(part => part.startsWith('#')) || '#000000'
  const hex = colorPart.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return
  let style: BorderStyle = 'thin'
  if (lineStyle === 'dotted') style = 'dotted'
  else if (lineStyle === 'dashed') style = 'dashed'
  else if (lineStyle === 'double') style = 'double'
  return {
    style,
    color: { argb: `FF${hex.toUpperCase()}` }
  }
}

function toExcelAlignment(style: ICellStyle): ExcelJS.Alignment | undefined {
  const alignMap: Record<string, ExcelJS.Alignment['horizontal']> = {
    left: 'left',
    center: 'center',
    right: 'right'
  }
  const verticalMap: Record<string, ExcelJS.Alignment['vertical']> = {
    top: 'top',
    middle: 'middle',
    bottom: 'bottom'
  }
  const horizontal = alignMap[String(style.align || '')]
  const vertical = verticalMap[String(style.verticalAlign || '')]
  const wrapText = style.wrap === 'wrap'
  const rawRotation = Number.isFinite(style.rotation) ? Number(style.rotation) : undefined
  const textRotation = rawRotation !== undefined && rawRotation >= -90 && rawRotation <= 90 ? rawRotation : undefined
  if (!horizontal && !vertical && !wrapText && textRotation === undefined) return
  const alignment: Partial<ExcelJS.Alignment> = {}
  if (horizontal) alignment.horizontal = horizontal
  if (vertical) alignment.vertical = vertical
  if (wrapText) alignment.wrapText = true
  if (textRotation !== undefined) alignment.textRotation = textRotation
  return alignment as ExcelJS.Alignment
}

function toExcelNumFmt(style: ICellStyle): string | undefined {
  const dp = Math.max(0, Math.min(10, Number(style.decimalPlaces ?? 2)))
  if (style.numberFormat === 'percent') {
    return `0${dp > 0 ? `.${'0'.repeat(dp)}` : ''}%`
  }
  if (style.numberFormat === 'currency') {
    return `¥#,##0${dp > 0 ? `.${'0'.repeat(dp)}` : ''}`
  }
  if (style.numberFormat === 'number') {
    return `0${dp > 0 ? `.${'0'.repeat(dp)}` : ''}`
  }
  if (style.numberFormat === 'date') {
    return 'yyyy-mm-dd'
  }
  return
}

function applyStyle(cell: ExcelJS.Cell, style: ICellStyle) {
  const color = String(style.fontColor || '').replace('#', '')
  const fillColor = String(style.bgColor || '').replace('#', '')
  const fontName = String(style.fontFamily || '').split(',')[0]?.trim()
  if (style.bold || style.italic || style.underline || style.strikethrough || style.fontFamily || style.fontSize || color) {
    cell.font = {
      bold: !!style.bold,
      italic: !!style.italic,
      underline: style.underline ? 'single' : undefined,
      strike: !!style.strikethrough,
      name: fontName || undefined,
      size: Number.isFinite(style.fontSize) ? Number(style.fontSize) : undefined,
      color: /^[0-9a-fA-F]{6}$/.test(color) ? { argb: `FF${color.toUpperCase()}` } : undefined
    }
  }
  if (/^[0-9a-fA-F]{6}$/.test(fillColor)) {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${fillColor.toUpperCase()}` }
    }
  }
  const top = toExcelBorder(style.borderTop)
  const bottom = toExcelBorder(style.borderBottom)
  const left = toExcelBorder(style.borderLeft)
  const right = toExcelBorder(style.borderRight)
  if (top || bottom || left || right) {
    cell.border = { top, bottom, left, right }
  }
  const alignment = toExcelAlignment(style)
  if (alignment) cell.alignment = alignment
  const numFmt = toExcelNumFmt(style)
  if (numFmt) cell.numFmt = numFmt
}

function normalizeHyperlink(url: string): string {
  const text = String(url || '').trim()
  if (!text) return ''
  if (/^(https?:\/\/|mailto:|tel:)/i.test(text)) return text
  return `https://${text}`
}

function writeCellValue(cell: ExcelJS.Cell, value: string, meta?: ICellMeta) {
  const text = String(value ?? '')
  const hyperlink = normalizeHyperlink(String(meta?.hyperlink || ''))
  const comment = String(meta?.comment || '').trim()
  if (text.startsWith('=') && text.length > 1) {
    cell.value = { formula: text.slice(1) }
    if (comment) cell.note = comment
    return
  }
  if (hyperlink) {
    cell.value = { text: text || hyperlink, hyperlink }
    if (comment) cell.note = comment
    return
  }
  const numeric = Number(text)
  if (text.trim() !== '' && Number.isFinite(numeric) && !/^0\d+/.test(text.trim())) {
    cell.value = numeric
    if (comment) cell.note = comment
    return
  }
  cell.value = text
  if (comment) cell.note = comment
}

export async function writeWorkbookToExcelBuffer(data: IWorkbook, options?: ExportI18nOptions): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook()
  const sheets = Array.isArray(data?.sheets) ? data.sheets : []
  sheets.forEach((sheet, index) => {
    const worksheet = workbook.addWorksheet(sheet?.name || `工作表${index + 1}`)
    const rowCount = Math.max(1, Number(sheet?.rowCount || 50))
    const colCount = Math.max(1, Number(sheet?.colCount || 26))
    worksheet.views = [{
      state: (sheet?.frozenRows || sheet?.frozenCols) ? 'frozen' : 'normal',
      ySplit: Math.max(0, Number(sheet?.frozenRows || 0)),
      xSplit: Math.max(0, Number(sheet?.frozenCols || 0))
    }]
    for (let col = 0; col < colCount; col++) {
      const widthPx = sheet?.colWidths?.[col]
      if (Number.isFinite(widthPx)) {
        worksheet.getColumn(col + 1).width = Math.max(4, (Number(widthPx) - 8) / 8)
      }
      if (sheet?.hiddenCols?.[col]) worksheet.getColumn(col + 1).hidden = true
    }
    for (let row = 0; row < rowCount; row++) {
      const rowHeightPx = sheet?.rowHeights?.[row]
      if (Number.isFinite(rowHeightPx)) {
        worksheet.getRow(row + 1).height = Math.max(10, Number(rowHeightPx) * 72 / 96)
      }
      if (sheet?.hiddenRows?.[row]) worksheet.getRow(row + 1).hidden = true
    }
    Object.entries(sheet?.cells || {}).forEach(([key, value]) => {
      const pos = parseCellKey(key)
      if (!pos) return
      const cell = worksheet.getCell(pos.row + 1, pos.col + 1)
      writeCellValue(cell, value, sheet?.cellMeta?.[key])
    })
    Object.entries(sheet?.cellMeta || {}).forEach(([key, meta]) => {
      if (sheet?.cells?.[key] !== undefined) return
      const pos = parseCellKey(key)
      if (!pos) return
      const cell = worksheet.getCell(pos.row + 1, pos.col + 1)
      writeCellValue(cell, '', meta)
    })
    Object.entries(sheet?.styles || {}).forEach(([key, style]) => {
      const pos = parseCellKey(key)
      if (!pos) return
      const cell = worksheet.getCell(pos.row + 1, pos.col + 1)
      applyStyle(cell, style || {})
    })
    const merges = Array.isArray(sheet?.merges) ? sheet.merges : []
    merges.forEach((merge: string) => {
      const [r1, c1, r2, c2] = String(merge || '').split(':').map(Number)
      if (![r1, c1, r2, c2].every(Number.isFinite)) return
      worksheet.mergeCells(r1 + 1, c1 + 1, r2 + 1, c2 + 1)
    })
  })
  if (!workbook.worksheets.length) {
    workbook.addWorksheet(options?.defaultSheetName?.(0) || '工作表1')
  }
  const raw = await workbook.xlsx.writeBuffer()
  const dataView = raw instanceof Uint8Array ? raw : new Uint8Array(raw)
  return dataView.buffer.slice(dataView.byteOffset, dataView.byteOffset + dataView.byteLength)
}
