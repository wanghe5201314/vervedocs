import { reactive, ref } from 'vue'
import { BooleanNumber } from '@univerjs/core'
import type { FRange } from '@univerjs/sheets/facade'
import { SetNumfmtCommand } from '@univerjs/sheets-numfmt'
import { SetStyleCommand } from '@univerjs/sheets'
import { cellKey } from '@vervedoc/excel-parser'
import type { Align, ICellStyle, VerticalAlign, WrapMode } from '../types'
import {
  DEFAULT_FONT_FAMILY,
  readFontFamilyFromSheetState,
  readFontFamilyFromUniverCellData,
  toUniverFontFamily,
} from '../utils/font-family'
import { resolveToolbarFont } from '../constants/toolbar-options'
import type { SheetCoreContext } from './sheet-editor-context'

export type ToolbarState = ICellStyle & {
  numberFormat: string
  decimalPlaces: number
  rotation: number
  verticalAlign: VerticalAlign
}

function readRangeCellStyleData(range: FRange, type: 'cell' | 'row' = 'cell') {
  return (range as any).getCellStyleData?.(type) as Record<string, any> | null | undefined
}

/** Univer 的 right 对齐在不同接口下表现为 normal，统一转成 facade 值 */
function toFacadeHorizontalAlignment(align: Align): 'left' | 'center' | 'normal' {
  return align === 'center' ? 'center' : align === 'right' ? 'normal' : 'left'
}

function toWrapStrategy(wrap: WrapMode): number {
  return wrap === 'wrap' ? 2 : wrap === 'overflow' ? 1 : 0
}

/**
 * 工具栏样式状态：从 Univer 单元格/内部 sheet 状态读取当前样式，
 * 并把工具栏操作写回选区。数字格式（quickFormat/changeDecimal）也归口于此。
 */
export function useCellStyle(ctx: SheetCoreContext) {
  const toolbarState = reactive<ToolbarState>({
    fontFamily: DEFAULT_FONT_FAMILY,
    fontSize: 12,
    align: 'left',
    verticalAlign: 'bottom',
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    fontColor: '#000000',
    bgColor: '',
    wrap: 'clip',
    numberFormat: 'auto',
    decimalPlaces: 2,
    rotation: 0,
  })

  const formulaValue = ref('')

  function readRangeFontFamily(range: FRange, row: number, col: number): string | undefined {
    const cellFont = (range as any).getFontFamily?.('cell')
    if (cellFont) return String(cellFont)
    const styleData = readRangeCellStyleData(range, 'cell')
    if (styleData?.ff) return String(styleData.ff)
    const cellDataFont = readFontFamilyFromUniverCellData((range as any).getCellData?.())
    if (cellDataFont) return cellDataFont
    const key = cellKey(row, col)
    const sheetFont = readFontFamilyFromSheetState(
      ctx.getUiSheet()?.styles,
      ctx.getUiSheet()?.cellRichTexts,
      key,
    )
    if (sheetFont) return sheetFont
    return undefined
  }

  function readRangeBooleanStyle(
    range: FRange,
    styleKey: 'bl' | 'it',
    sheetKey: string,
    sheetField: 'bold' | 'italic',
  ): boolean {
    const cellStyle = readRangeCellStyleData(range, 'cell')
    if (cellStyle?.[styleKey] !== undefined) {
      return cellStyle[styleKey] === BooleanNumber.TRUE
    }
    const composed = readRangeCellStyleData(range, 'row')
    if (composed?.[styleKey] !== undefined) {
      return composed[styleKey] === BooleanNumber.TRUE
    }
    return !!ctx.getUiSheet()?.styles?.[sheetKey]?.[sheetField]
  }

  function readRangeTextDecoration(
    range: FRange,
    styleKey: 'ul' | 'st',
    sheetKey: string,
    sheetField: 'underline' | 'strikethrough',
  ): boolean {
    const cellStyle = readRangeCellStyleData(range, 'cell')
    if (cellStyle?.[styleKey]?.s !== undefined) {
      return cellStyle[styleKey].s === BooleanNumber.TRUE
    }
    const composed = readRangeCellStyleData(range, 'row')
    if (composed?.[styleKey]?.s !== undefined) {
      return composed[styleKey].s === BooleanNumber.TRUE
    }
    return !!ctx.getUiSheet()?.styles?.[sheetKey]?.[sheetField]
  }

  function getToolbarCellRange(row: number, col: number): FRange | null {
    const sheet = ctx.getUniverSheet()
    if (!sheet) return null
    return sheet.getRange(row, col, 1, 1)
  }

  function readRangeFontSize(range: FRange, row: number, col: number): number {
    const key = cellKey(row, col)
    const sheetSize = ctx.getUiSheet()?.styles?.[key]?.fontSize
    if (Number.isFinite(sheetSize)) return Number(sheetSize)
    const richTextSize = ctx.getUiSheet()?.cellRichTexts?.[key]?.find(run => Number.isFinite(run.fontSize))?.fontSize
    if (Number.isFinite(richTextSize)) return Number(richTextSize)
    const cellStyle = readRangeCellStyleData(range, 'cell')
    if (cellStyle && Number.isFinite(cellStyle.fs)) return Number(cellStyle.fs)
    const cellData = (range as any).getCellData?.()
    const textRuns = cellData?.p?.body?.textRuns
    if (Array.isArray(textRuns)) {
      for (const run of textRuns) {
        if (Number.isFinite(run?.ts?.fs)) return Number(run.ts.fs)
      }
    }
    const cellSize = (range as any).getFontSize?.('cell')
    if (Number.isFinite(cellSize)) return Number(cellSize)
    const composedSize = (range as any).getFontSize?.()
    if (Number.isFinite(composedSize)) return Number(composedSize)
    return 12
  }

  function getRangeFormulaBarValue(range: FRange): string {
    const formula = String((range as any).getFormula?.() || '').trim()
    if (formula) return formula.startsWith('=') ? formula : `=${formula}`
    const cellFormula = String((range as any).getCellData?.()?.f || '').trim()
    if (cellFormula) return cellFormula.startsWith('=') ? cellFormula : `=${cellFormula}`
    const value = range.getValue()
    if (value !== null && value !== undefined && value !== '') return String(value)
    return ''
  }

  function syncToolbarAndFormula() {
    const sheet = ctx.getUniverSheet()
    const activeRange = sheet?.getActiveRange?.() || null
    const range = activeRange || ctx.getSelectionRange()
    const row = activeRange?.getRow?.() ?? ctx.selected.row
    const col = activeRange?.getColumn?.() ?? ctx.selected.col
    const cellRange = getToolbarCellRange(row, col) || range
    const uiSheet = ctx.getUiSheet()
    if (cellRange) {
      const key = cellKey(row, col)
      formulaValue.value = getRangeFormulaBarValue(cellRange) || uiSheet?.cells[key] || ''
      toolbarState.bold = readRangeBooleanStyle(cellRange, 'bl', key, 'bold')
      toolbarState.italic = readRangeBooleanStyle(cellRange, 'it', key, 'italic')
      toolbarState.underline = readRangeTextDecoration(cellRange, 'ul', key, 'underline')
      toolbarState.strikethrough = readRangeTextDecoration(cellRange, 'st', key, 'strikethrough')
      const hAlign = String((cellRange as any).getHorizontalAlignment?.() || 'left')
      toolbarState.align = (hAlign === 'center' ? 'center' : hAlign === 'right' || hAlign === 'normal' ? 'right' : 'left') as Align
      const vAlign = String((cellRange as any).getVerticalAlignment?.() || 'bottom')
      toolbarState.verticalAlign = (vAlign === 'top' ? 'top' : vAlign === 'middle' ? 'middle' : 'bottom') as VerticalAlign
      toolbarState.fontFamily = resolveToolbarFont(
        readRangeFontFamily(cellRange, row, col)
        || readFontFamilyFromSheetState(uiSheet?.styles, uiSheet?.cellRichTexts, key)
        || DEFAULT_FONT_FAMILY,
      )
      toolbarState.fontSize = readRangeFontSize(cellRange, row, col)
      const fontColor = String((cellRange as any).getFontColor?.() || '#000000')
      toolbarState.fontColor = fontColor === 'null' ? '#000000' : fontColor
      const bgColor = String((cellRange as any).getBackground?.() || '')
      toolbarState.bgColor = bgColor === 'null' ? '' : bgColor
      const wrapStrategy = Number((cellRange as any).getWrapStrategy?.() ?? 0)
      toolbarState.wrap = (wrapStrategy === 2 ? 'wrap' : wrapStrategy === 1 ? 'overflow' : 'clip') as WrapMode
      const textRotation = Number((cellRange as any).getTextRotation?.() ?? 0)
      toolbarState.rotation = textRotation
    } else {
      const key = cellKey(ctx.selected.row, ctx.selected.col)
      formulaValue.value = uiSheet?.cells[key] || ''
      const style = uiSheet?.styles[key] || {}
      toolbarState.bold = !!style.bold
      toolbarState.italic = !!style.italic
      toolbarState.underline = !!style.underline
      toolbarState.strikethrough = !!style.strikethrough
      toolbarState.align = (style.align || 'left') as Align
      toolbarState.fontFamily = resolveToolbarFont(style.fontFamily || DEFAULT_FONT_FAMILY)
      toolbarState.fontSize = Number(style.fontSize || 12)
      toolbarState.fontColor = style.fontColor || '#000000'
      toolbarState.bgColor = style.bgColor || ''
      toolbarState.wrap = style.wrap || 'clip'
      toolbarState.numberFormat = style.numberFormat || 'auto'
      toolbarState.verticalAlign = (style.verticalAlign || 'bottom') as VerticalAlign
      toolbarState.decimalPlaces = Number(style.decimalPlaces ?? 2)
      toolbarState.rotation = Number(style.rotation ?? 0)
    }
  }

  async function applyRangeStyleType(range: FRange, type: string, value: unknown) {
    const sheet = ctx.getUniverSheet()
    const workbook = ctx.getUniverWorkbook()
    if (!sheet || !workbook) return false
    return ctx.executeUniverCommand(SetStyleCommand.id, {
      unitId: workbook.getId(),
      subUnitId: sheet.getSheetId(),
      range: range.getRange(),
      style: { type, value },
    })
  }

  async function updateCellStyle() {
    if (ctx.readOnly()) return
    const range = await ctx.getPreparedSelectionRange()
    if (!range) return
    ctx.saveUndoState()

    range.setFontWeight(toolbarState.bold ? 'bold' : null)
    range.setFontStyle(toolbarState.italic ? 'italic' : null)
    await applyRangeStyleType(range, 'ul', toolbarState.underline ? { s: BooleanNumber.TRUE } : null)
    await applyRangeStyleType(range, 'st', toolbarState.strikethrough ? { s: BooleanNumber.TRUE } : null)
    range.setHorizontalAlignment(toFacadeHorizontalAlignment(toolbarState.align || 'left'))
    range.setVerticalAlignment(toolbarState.verticalAlign)
    range.setFontFamily(toUniverFontFamily(toolbarState.fontFamily))
    range.setFontSize(Number(toolbarState.fontSize || 12))
    if (toolbarState.fontColor) {
      range.setFontColor(toolbarState.fontColor)
    } else {
      await applyRangeStyleType(range, 'cl', null)
    }
    if (toolbarState.bgColor) {
      range.setBackgroundColor(toolbarState.bgColor)
    } else {
      await applyRangeStyleType(range, 'bg', null)
    }
    range.setWrapStrategy(toWrapStrategy(toolbarState.wrap || 'clip'))
    range.setTextRotation(Number(toolbarState.rotation ?? 0))
    await ctx.finishRangeStyleMutation()
  }

  async function toggleStyle(style: 'bold' | 'italic' | 'underline' | 'strikethrough') {
    if (ctx.readOnly()) return
    toolbarState[style] = !toolbarState[style]
    const range = await ctx.getPreparedSelectionRange()
    if (!range) return
    ctx.saveUndoState()
    if (style === 'bold') {
      range.setFontWeight(toolbarState.bold ? 'bold' : null)
    } else if (style === 'italic') {
      range.setFontStyle(toolbarState.italic ? 'italic' : null)
    } else if (style === 'underline') {
      await applyRangeStyleType(range, 'ul', toolbarState.underline ? { s: BooleanNumber.TRUE } : null)
    } else if (style === 'strikethrough') {
      await applyRangeStyleType(range, 'st', toolbarState.strikethrough ? { s: BooleanNumber.TRUE } : null)
    }
    await ctx.finishRangeStyleMutation()
  }

  async function setAlign(align: Align) {
    if (ctx.readOnly()) return
    toolbarState.align = align
    const range = await ctx.getPreparedSelectionRange()
    if (!range) return
    ctx.saveUndoState()
    range.setHorizontalAlignment(toFacadeHorizontalAlignment(align))
    await ctx.finishRangeStyleMutation()
  }

  async function setVerticalAlign(va: VerticalAlign) {
    if (ctx.readOnly()) return
    toolbarState.verticalAlign = va
    const range = await ctx.getPreparedSelectionRange()
    if (!range) return
    ctx.saveUndoState()
    range.setVerticalAlignment(va)
    await ctx.finishRangeStyleMutation()
  }

  async function setWrap(wrap: WrapMode) {
    if (ctx.readOnly()) return
    toolbarState.wrap = wrap
    const range = await ctx.getPreparedSelectionRange()
    if (!range) return
    ctx.saveUndoState()
    range.setWrapStrategy(toWrapStrategy(wrap))
    await ctx.finishRangeStyleMutation()
  }

  function toggleWrap() {
    setWrap(toolbarState.wrap === 'wrap' ? 'clip' : 'wrap')
  }

  async function setFontColor(color: string) {
    if (ctx.readOnly()) return
    toolbarState.fontColor = color
    const range = await ctx.getPreparedSelectionRange()
    if (!range) return
    ctx.saveUndoState()
    range.setFontColor(color || '#000000')
    await ctx.finishRangeStyleMutation()
  }

  async function setBgColor(color: string) {
    if (ctx.readOnly()) return
    toolbarState.bgColor = color
    const range = await ctx.getPreparedSelectionRange()
    if (!range) return
    ctx.saveUndoState()
    if (color) {
      range.setBackgroundColor(color)
    } else {
      await applyRangeStyleType(range, 'bg', null)
    }
    await ctx.finishRangeStyleMutation()
  }

  async function setRotation(deg: number) {
    if (ctx.readOnly()) return
    toolbarState.rotation = deg
    const range = await ctx.getPreparedSelectionRange()
    if (!range) return
    ctx.saveUndoState()
    range.setTextRotation(deg)
    await ctx.finishRangeStyleMutation()
  }

  async function handleFontSelectMouseDown() {
    if (ctx.readOnly()) return
    const workbook = ctx.getUniverWorkbook()
    if (!workbook?.isCellEditing?.()) return
    const target = ctx.pendingStyleTargetCell.value || ctx.editingCell.value || { row: ctx.selected.row, col: ctx.selected.col }
    ctx.pendingStyleTargetCell.value = target
    await ctx.commitActiveCellEdit(target)
  }

  async function handleFontFamilyChange() {
    await updateCellStyle()
  }

  // ===== 数字格式 =====
  async function applyNumberFormat(pattern: string) {
    const context = ctx.getActiveSheetCommandContext()
    if (!context || !pattern) return
    ctx.saveUndoState()
    const values: Array<{ row: number; col: number; pattern: string }> = []
    for (let row = context.range.startRow; row <= context.range.endRow; row++) {
      for (let col = context.range.startColumn; col <= context.range.endColumn; col++) {
        values.push({ row, col, pattern })
      }
    }
    await ctx.executeSheetCommand(SetNumfmtCommand.id, {
      unitId: context.unitId,
      subUnitId: context.subUnitId,
      values,
    })
  }

  function decimalPattern(fmt: string, decimalPlaces: number): string {
    if (fmt === 'currency') return `¥#,##0.${'#'.repeat(decimalPlaces)}`
    if (fmt === 'percent') return `0.${'#'.repeat(decimalPlaces)}%`
    return ''
  }

  async function quickFormat(fmt: 'currency' | 'percent') {
    if (ctx.readOnly()) return
    toolbarState.numberFormat = fmt
    await applyNumberFormat(fmt === 'currency' ? '¥#,##0.00' : '0.00%')
  }

  async function changeDecimal(delta: number) {
    if (ctx.readOnly()) return
    toolbarState.decimalPlaces = Math.max(0, Math.min(10, (toolbarState.decimalPlaces ?? 2) + delta))
    await applyNumberFormat(decimalPattern(toolbarState.numberFormat || 'auto', toolbarState.decimalPlaces))
  }

  return {
    toolbarState,
    formulaValue,
    syncToolbarAndFormula,
    getRangeFormulaBarValue,
    updateCellStyle,
    toggleStyle,
    setAlign,
    setVerticalAlign,
    setWrap,
    toggleWrap,
    setFontColor,
    setBgColor,
    setRotation,
    handleFontSelectMouseDown,
    handleFontFamilyChange,
    quickFormat,
    changeDecimal,
  }
}
