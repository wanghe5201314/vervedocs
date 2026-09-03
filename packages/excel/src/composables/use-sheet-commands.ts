import { message } from 'ant-design-vue'
import { BorderStyleTypes, BorderType } from '@univerjs/core'
import {
  AddWorksheetMergeAllCommand,
  ClearSelectionContentCommand,
  ClearSelectionFormatCommand,
  InsertColCommand,
  InsertRowCommand,
  RemoveColCommand,
  RemoveRowCommand,
  RemoveWorksheetMergeCommand,
  SetBorderBasicCommand,
  SetColHiddenCommand,
  SetRowHiddenCommand,
  SetSpecificColsVisibleCommand,
  SetSpecificRowsVisibleCommand,
} from '@univerjs/sheets'
import { Direction } from '@univerjs/core'
import { cellKey } from '@vervedoc/excel-parser'
import type { SheetCoreContext } from './sheet-editor-context'

export const UNIVER_COMMANDS = {
  addNote: 'sheet.operation.add-note-popup',
  addThreadComment: 'sheet.operation.show-comment-modal',
  dataValidation: 'data-validation.operation.open-validation-panel',
  find: 'ui.operation.open-find-dialog',
  hyperlink: 'sheet.operation.insert-hyper-link',
  replace: 'ui.operation.open-replace-dialog',
  sortRange: 'sheet.command.sort-range',
  toggleFilter: 'sheet.command.smart-toggle-filter',
} as const

/**
 * 表格操作命令集合：Univer 官方命令封装（排序/筛选/链接/批注/查找替换）、
 * 行列插删与显隐、合并、冻结、边框、清除、缩放、行高列宽、剪贴板、去重。
 */
export function useSheetCommands(ctx: SheetCoreContext) {
  // ===== Univer 官方弹窗/命令 =====
  async function openUniverSort(order: 'asc' | 'desc') {
    if (ctx.readOnly()) return false
    const sheet = ctx.getUniverSheet()
    const workbook = ctx.getUniverWorkbook()
    if (!sheet || !workbook) {
      message.warning('表格尚未初始化')
      return false
    }

    const uiSheet = ctx.getUiSheet()
    const { r1, r2, c1, c2 } = ctx.selectionRange()
    const sortWholeSheet = r1 === r2 && c1 === c2
    const startRow = sortWholeSheet ? 0 : r1
    const endRow = sortWholeSheet ? Math.max(0, (uiSheet?.rowCount || 1) - 1) : r2
    const startColumn = sortWholeSheet ? 0 : c1
    const endColumn = sortWholeSheet ? Math.max(0, (uiSheet?.colCount || 1) - 1) : c2
    const colIndex = ctx.selected.col

    return ctx.executeUniverCommand(UNIVER_COMMANDS.sortRange, {
      unitId: workbook.getId(),
      subUnitId: sheet.getSheetId(),
      range: { startRow, endRow, startColumn, endColumn },
      orderRules: [{ colIndex, type: order }],
      hasTitle: false,
    })
  }

  function guardNotReadOnly() {
    if (ctx.readOnly()) return false
    return true
  }

  async function openUniverDataValidation() {
    if (!guardNotReadOnly()) return false
    return ctx.executeUniverCommand(UNIVER_COMMANDS.dataValidation)
  }

  async function toggleUniverFilter() {
    if (!guardNotReadOnly()) return false
    return ctx.executeUniverCommand(UNIVER_COMMANDS.toggleFilter)
  }

  async function openUniverHyperlink() {
    if (!guardNotReadOnly()) return false
    return ctx.executeUniverCommand(UNIVER_COMMANDS.hyperlink)
  }

  async function openUniverNote() {
    if (!guardNotReadOnly()) return false
    return ctx.executeUniverCommand(UNIVER_COMMANDS.addNote)
  }

  async function openUniverThreadComment() {
    if (!guardNotReadOnly()) return false
    return ctx.executeUniverCommand(UNIVER_COMMANDS.addThreadComment)
  }

  function openUniverFindDialog() {
    return ctx.executeUniverCommand(UNIVER_COMMANDS.find)
  }

  function openUniverReplaceDialog() {
    return ctx.executeUniverCommand(UNIVER_COMMANDS.replace)
  }

  // ===== 边框 / 清除 =====
  async function setBorders(type: string) {
    if (ctx.readOnly()) return
    ctx.saveUndoState()
    const borderTypeMap: Record<string, BorderType> = {
      all: BorderType.ALL,
      outer: BorderType.OUTSIDE,
      none: BorderType.NONE,
      top: BorderType.TOP,
      bottom: BorderType.BOTTOM,
      left: BorderType.LEFT,
      right: BorderType.RIGHT,
    }
    const borderInfo = {
      type: borderTypeMap[type] ?? BorderType.ALL,
      color: type === 'none' ? undefined : '#000000',
      style: type === 'none' ? BorderStyleTypes.NONE : BorderStyleTypes.THIN,
      activeBorderType: type !== 'none',
    }
    await ctx.executeSheetCommand(SetBorderBasicCommand.id, {
      value: borderInfo,
    })
  }

  async function clearSelectedFormat() {
    if (ctx.readOnly()) return
    const context = ctx.getActiveSheetCommandContext()
    if (!context) return
    ctx.saveUndoState()
    await ctx.executeSheetCommand(ClearSelectionFormatCommand.id, {
      unitId: context.unitId,
      subUnitId: context.subUnitId,
      ranges: [context.range],
    })
  }

  async function deleteSelectedContent() {
    if (ctx.readOnly()) return
    const context = ctx.getActiveSheetCommandContext()
    if (!context) return
    ctx.saveUndoState()
    await ctx.executeSheetCommand(ClearSelectionContentCommand.id, {
      unitId: context.unitId,
      subUnitId: context.subUnitId,
      ranges: [context.range],
    })
  }

  // ===== 行列入阶操作 =====
  async function insertRow(position: 'above' | 'below') {
    if (ctx.readOnly()) return
    ctx.saveUndoState()
    const context = ctx.getActiveSheetCommandContext()
    if (!context) return
    const insertAt = position === 'above' ? ctx.selected.row : ctx.selected.row + 1
    await ctx.executeSheetCommand(InsertRowCommand.id, {
      unitId: context.unitId,
      subUnitId: context.subUnitId,
      direction: position === 'above' ? Direction.UP : Direction.DOWN,
      range: {
        startRow: insertAt,
        endRow: insertAt,
        startColumn: 0,
        endColumn: Math.max(0, (ctx.getUiSheet()?.colCount || 1) - 1),
      },
    })
  }

  async function insertCol(position: 'left' | 'right') {
    if (ctx.readOnly()) return
    ctx.saveUndoState()
    const context = ctx.getActiveSheetCommandContext()
    if (!context) return
    const insertAt = position === 'left' ? ctx.selected.col : ctx.selected.col + 1
    await ctx.executeSheetCommand(InsertColCommand.id, {
      unitId: context.unitId,
      subUnitId: context.subUnitId,
      direction: position === 'left' ? Direction.LEFT : Direction.RIGHT,
      range: {
        startRow: 0,
        endRow: Math.max(0, (ctx.getUiSheet()?.rowCount || 1) - 1),
        startColumn: insertAt,
        endColumn: insertAt,
      },
    })
  }

  async function deleteRow() {
    if (ctx.readOnly()) return
    ctx.saveUndoState()
    const context = ctx.getActiveSheetCommandContext()
    if (!context) return
    await ctx.executeSheetCommand(RemoveRowCommand.id, {
      unitId: context.unitId,
      subUnitId: context.subUnitId,
      range: context.rowRange,
    })
  }

  async function deleteCol() {
    if (ctx.readOnly()) return
    ctx.saveUndoState()
    const context = ctx.getActiveSheetCommandContext()
    if (!context) return
    await ctx.executeSheetCommand(RemoveColCommand.id, {
      unitId: context.unitId,
      subUnitId: context.subUnitId,
      range: context.colRange,
    })
  }

  async function toggleRowHidden(hidden: boolean) {
    if (ctx.readOnly()) return
    ctx.saveUndoState()
    const context = ctx.getActiveSheetCommandContext()
    if (!context) return
    await ctx.executeSheetCommand(
      hidden ? SetRowHiddenCommand.id : SetSpecificRowsVisibleCommand.id,
      {
        unitId: context.unitId,
        subUnitId: context.subUnitId,
        ranges: [context.rowRange],
      },
    )
  }

  async function toggleColHidden(hidden: boolean) {
    if (ctx.readOnly()) return
    ctx.saveUndoState()
    const context = ctx.getActiveSheetCommandContext()
    if (!context) return
    await ctx.executeSheetCommand(
      hidden ? SetColHiddenCommand.id : SetSpecificColsVisibleCommand.id,
      {
        unitId: context.unitId,
        subUnitId: context.subUnitId,
        ranges: [context.colRange],
      },
    )
  }

  const hideRow = () => toggleRowHidden(true)
  const unhideRow = () => toggleRowHidden(false)
  const hideCol = () => toggleColHidden(true)
  const unhideCol = () => toggleColHidden(false)

  // ===== 自适应 / 行高列宽 / 缩放 =====
  function autoFitRowHeight() {
    if (ctx.readOnly()) return
    const sheet = ctx.getUniverSheet()
    if (!sheet) return
    const { r1, r2 } = ctx.selectionRange()
    for (let r = r1; r <= r2; r++) {
      ;(sheet as any).autoFitRowHeight?.(r)
    }
  }

  function autoFitColWidth() {
    if (ctx.readOnly()) return
    const sheet = ctx.getUniverSheet()
    if (!sheet) return
    const { c1, c2 } = ctx.selectionRange()
    for (let c = c1; c <= c2; c++) {
      ;(sheet as any).autoFitColumnWidth?.(c)
    }
  }

  function applyRowHeight() {
    if (ctx.readOnly()) return
    ctx.saveUndoState()
    const sheet = ctx.getUniverSheet()
    if (!sheet) return
    const { r1, r2 } = ctx.selectionRange()
    for (let r = r1; r <= r2; r++) {
      ;(sheet as any).setRowHeight?.(r, ctx.rowHeightValue.value)
    }
    ctx.showRowHeightDialog.value = false
  }

  function applyColWidth() {
    if (ctx.readOnly()) return
    ctx.saveUndoState()
    const sheet = ctx.getUniverSheet()
    if (!sheet) return
    const { c1, c2 } = ctx.selectionRange()
    for (let c = c1; c <= c2; c++) {
      ;(sheet as any).setColumnWidth?.(c, ctx.colWidthValue.value)
    }
    ctx.showColWidthDialog.value = false
  }

  function applyZoom() {
    ;(ctx.getUniverWorkbook() as any)?.setZoomRatio?.(ctx.zoomLevel.value / 100)
  }

  function setZoom(level: number) {
    ctx.zoomLevel.value = level
    applyZoom()
  }

  // ===== 合并 / 冻结 =====
  async function handleMergeCells() {
    if (ctx.readOnly()) return
    const { r1, r2, c1, c2 } = ctx.selectionRange()
    if (r1 === r2 && c1 === c2) return
    ctx.saveUndoState()
    await ctx.executeSheetCommand(AddWorksheetMergeAllCommand.id)
  }

  async function handleUnmergeCells() {
    if (ctx.readOnly()) return
    ctx.saveUndoState()
    await ctx.executeSheetCommand(RemoveWorksheetMergeCommand.id)
  }

  async function toggleFreeze(axis: 'row' | 'col') {
    const target = ctx.getUniverAPI()?.getActiveSheet?.()
    const worksheet = target?.worksheet
    if (!worksheet) return
    if (axis === 'row') {
      ctx.frozenRows.value = ctx.frozenRows.value > 0 ? 0 : 1
    } else {
      ctx.frozenCols.value = ctx.frozenCols.value > 0 ? 0 : 1
    }
    ctx.syncDimensionStateToActiveSheet()
    if (ctx.frozenRows.value === 0 && ctx.frozenCols.value === 0) {
      worksheet.cancelFreeze()
      return
    }
    worksheet.setFreeze({
      startRow: ctx.frozenRows.value,
      startColumn: ctx.frozenCols.value,
      ySplit: ctx.frozenRows.value,
      xSplit: ctx.frozenCols.value,
    })
  }

  const toggleFreezeRow = () => toggleFreeze('row')
  const toggleFreezeCol = () => toggleFreeze('col')

  // ===== 剪贴板 =====
  function cellValue(row: number, col: number): string {
    return ctx.getUiSheet()?.cells[cellKey(row, col)] || ''
  }

  function handleCopy() {
    const { r1, r2, c1, c2 } = ctx.selectionRange()
    const rows: string[] = []
    for (let r = r1; r <= r2; r++) {
      const cols: string[] = []
      for (let c = c1; c <= c2; c++) {
        cols.push(cellValue(r, c))
      }
      rows.push(cols.join('\t'))
    }
    navigator.clipboard?.writeText(rows.join('\n')).catch(() => {})
  }

  function handleCut() {
    if (ctx.readOnly()) return
    handleCopy()
    deleteSelectedContent()
  }

  async function handlePaste() {
    if (ctx.readOnly()) return
    try {
      const text = await navigator.clipboard?.readText()
      if (!text) return
      const range = ctx.getSelectionRange()
      if (!range) return
      ctx.saveUndoState()
      const rows = text.split('\n')
      for (let ri = 0; ri < rows.length; ri++) {
        const cols = rows[ri].split('\t')
        for (let ci = 0; ci < cols.length; ci++) {
          const r = ctx.selected.row + ri
          const c = ctx.selected.col + ci
          const sheet = ctx.getUniverSheet()
          if (sheet) {
            const cell = sheet.getRange(r, c, 1, 1)
            if (cell) {
              cell.setValue(cols[ci])
            }
          }
        }
      }
    } catch { /* clipboard access denied */ }
  }

  // ===== 删除重复值 =====
  function removeDuplicates() {
    if (ctx.readOnly()) return
    const { r1, r2, c1, c2 } = ctx.selectionRange()
    if (r1 === r2 && c1 === c2) {
      message.warning('请选择包含数据的区域')
      return
    }
    ctx.saveUndoState()
    const sheet = ctx.getUniverSheet()
    if (!sheet) return

    const seen = new Set<string>()
    const rowsToDelete: number[] = []

    for (let r = r1; r <= r2; r++) {
      const rowData: string[] = []
      for (let c = c1; c <= c2; c++) {
        const value = String(sheet.getRange(r, c, 1, 1).getValue() || '')
        rowData.push(value)
      }
      const rowKey = rowData.join('\t')
      if (seen.has(rowKey)) {
        rowsToDelete.push(r)
      } else {
        seen.add(rowKey)
      }
    }

    if (rowsToDelete.length === 0) {
      message.info('未找到重复值')
      return
    }

    rowsToDelete.sort((a, b) => b - a)
    for (const r of rowsToDelete) {
      sheet.deleteRows(r, 1)
    }

    message.success(`已删除 ${rowsToDelete.length} 个重复行`)
  }

  return {
    UNIVER_COMMANDS,
    openUniverSort,
    openUniverDataValidation,
    toggleUniverFilter,
    openUniverHyperlink,
    openUniverNote,
    openUniverThreadComment,
    openUniverFindDialog,
    openUniverReplaceDialog,
    setBorders,
    clearSelectedFormat,
    deleteSelectedContent,
    insertRow,
    insertCol,
    deleteRow,
    deleteCol,
    hideRow,
    unhideRow,
    hideCol,
    unhideCol,
    autoFitRowHeight,
    autoFitColWidth,
    applyRowHeight,
    applyColWidth,
    setZoom,
    applyZoom,
    handleMergeCells,
    handleUnmergeCells,
    toggleFreezeRow,
    toggleFreezeCol,
    handleCopy,
    handleCut,
    handlePaste,
    removeDuplicates,
  }
}
