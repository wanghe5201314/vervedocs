import { ref } from 'vue'
import { IUndoRedoService } from '@univerjs/core'
import type { Univer } from '@univerjs/core'
import type { FUniver } from '@univerjs/core/facade'

export interface SheetHistoryOptions {
  readOnly: () => boolean
  getUniverAPI: () => FUniver | null
}

/**
 * 撤销/重做交给 Univer 原生历史栈。
 * 单元格编辑、样式命令等都由 Univer 记录；自定义 cells 快照无法覆盖格子内输入。
 */
export function useSheetHistory(options: SheetHistoryOptions) {
  const { readOnly, getUniverAPI } = options

  const canUndo = ref(false)
  const canRedo = ref(false)
  let statusSubscription: { unsubscribe: () => void } | null = null

  function unbindUndoRedoStatus() {
    statusSubscription?.unsubscribe()
    statusSubscription = null
  }

  function bindUndoRedoStatus(univer: Univer | null) {
    unbindUndoRedoStatus()
    if (!univer) {
      canUndo.value = false
      canRedo.value = false
      return
    }
    const service = univer.__getInjector().get(IUndoRedoService)
    statusSubscription = service.undoRedoStatus$.subscribe(status => {
      canUndo.value = status.undos > 0
      canRedo.value = status.redos > 0
    })
  }

  async function handleUndo() {
    if (readOnly()) return
    await getUniverAPI()?.undo()
  }

  async function handleRedo() {
    if (readOnly()) return
    await getUniverAPI()?.redo()
  }

  /** 兼容旧调用点：历史已由 Univer 记录，无需再拍内部 workbook 快照 */
  function saveUndoState() {}

  function clearHistory() {
    canUndo.value = false
    canRedo.value = false
  }

  return {
    canUndo,
    canRedo,
    saveUndoState,
    clearHistory,
    handleUndo,
    handleRedo,
    bindUndoRedoStatus,
    unbindUndoRedoStatus,
  }
}
