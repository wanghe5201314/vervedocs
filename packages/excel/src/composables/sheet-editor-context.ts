import type { Ref } from 'vue'
import type { FRange, FWorkbook, FWorksheet } from '@univerjs/sheets/facade'
import type { FUniver } from '@univerjs/core/facade'
import type { IUiSheet } from '../types'

export interface SheetCommandRange {
  startRow: number
  endRow: number
  startColumn: number
  endColumn: number
}

export interface SheetCommandContext {
  unitId: string
  subUnitId: string
  range: SheetCommandRange
  rowRange: SheetCommandRange
  colRange: SheetCommandRange
}

export interface SelectionBounds {
  r1: number
  r2: number
  c1: number
  c2: number
}

/**
 * SheetEditor 与样式/命令 composable 之间的共享上下文。
 * 组件持有 Univer 编排层与可变状态，composable 只通过该上下文读写，避免相互 import 造成循环。
 * 其中 syncToolbarAndFormula / saveUndoState 由对应 composable 在初始化后回填（延迟绑定）。
 */
export interface SheetCoreContext {
  readOnly: () => boolean

  getUiSheet: () => IUiSheet | undefined
  getUniverSheet: () => FWorksheet | null
  getUniverWorkbook: () => FWorkbook | null
  getUniverAPI: () => FUniver | null

  selected: { row: number; col: number }
  selectionRange: () => SelectionBounds

  editingCell: Ref<{ row: number; col: number } | null>
  pendingStyleTargetCell: Ref<{ row: number; col: number } | null>

  getSelectionRange: () => FRange | null
  getPreparedSelectionRange: () => Promise<FRange | null>
  commitActiveCellEdit: (target?: { row: number; col: number } | null) => Promise<void>

  executeUniverCommand: (commandId: string, params?: Record<string, any>) => Promise<boolean>
  executeSheetCommand: (commandId: string, params?: Record<string, any>) => Promise<boolean>
  getActiveSheetCommandContext: () => SheetCommandContext | null
  finishRangeStyleMutation: () => Promise<void>

  syncToolbarAndFormula: () => void
  saveUndoState: () => void

  zoomLevel: Ref<number>
  frozenRows: Ref<number>
  frozenCols: Ref<number>
  rowHeightValue: Ref<number>
  colWidthValue: Ref<number>
  showRowHeightDialog: Ref<boolean>
  showColWidthDialog: Ref<boolean>
  syncDimensionStateToActiveSheet: () => void
}
