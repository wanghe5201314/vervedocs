/**
 * VerveDocs History —— HistoryManager
 *
 * 基于整树快照的撤销/重做管理器。
 * 使用 rfdc（经 schema cloneTree）深拷贝文档树，配合 coalescing 合并连续同类编辑。
 */

import type { IDocxDocumentMeta, IRange } from '@vervedoc/docx-editor-schema'
import { cloneTree } from '@vervedoc/docx-editor-schema'

export interface HistorySnapshot {
  doc: IDocxDocumentMeta
  range: IRange | null
}

const DEFAULT_MAX_RECORD_COUNT = 50
const DEFAULT_COALESCE_MS = 300

export class HistoryManager {
  private _undoStack: HistorySnapshot[] = []
  private _redoStack: HistorySnapshot[] = []
  private _maxRecordCount: number
  private _coalesceMs: number
  private _lastPushTime = 0
  private _lastCoalesceKey: string | undefined = undefined
  private _isExecuting = false

  constructor(options?: { maxRecordCount?: number; coalesceMs?: number }) {
    this._maxRecordCount = options?.maxRecordCount ?? DEFAULT_MAX_RECORD_COUNT
    this._coalesceMs = options?.coalesceMs ?? DEFAULT_COALESCE_MS
  }

  /** 初始化首快照（编辑器就绪后调用一次） */
  pushInitial(snapshot: HistorySnapshot): void {
    this._undoStack = [snapshot]
    this._redoStack = []
    this._lastPushTime = Date.now()
    this._lastCoalesceKey = undefined
  }

  /**
   * 提交一次编辑后的快照。
   * coalesceKey 传入时：若与上次相同且在时间窗内，则替换栈顶（合并连续同类编辑）。
   */
  push(snapshot: HistorySnapshot, coalesceKey?: string): void {
    if (this._isExecuting) return
    const now = Date.now()
    if (
      coalesceKey !== undefined &&
      coalesceKey === this._lastCoalesceKey &&
      now - this._lastPushTime < this._coalesceMs &&
      this._undoStack.length > 0
    ) {
      this._undoStack[this._undoStack.length - 1] = snapshot
      this._redoStack = []
      this._lastPushTime = now
      return
    }
    this._undoStack.push(snapshot)
    this._redoStack = []
    this._lastPushTime = now
    this._lastCoalesceKey = coalesceKey
    while (this._undoStack.length > this._maxRecordCount) {
      this._undoStack.shift()
    }
  }

  /** 撤销：返回要恢复的快照，current 被压入 redo 栈 */
  undo(current: HistorySnapshot): HistorySnapshot | null {
    if (this._isExecuting) return null
    if (this._undoStack.length <= 1) return null
    this._isExecuting = true
    try {
      this._redoStack.push(current)
      this._undoStack.pop()
      return this._undoStack[this._undoStack.length - 1] ?? null
    } finally {
      this._isExecuting = false
    }
  }

  /** 重做：返回要恢复的快照，current 被压入 undo 栈 */
  redo(current: HistorySnapshot): HistorySnapshot | null {
    if (this._isExecuting) return null
    if (this._redoStack.length === 0) return null
    this._isExecuting = true
    try {
      const next = this._redoStack.pop()!
      this._undoStack.push(current)
      this._lastPushTime = Date.now()
      this._lastCoalesceKey = undefined
      return next
    } finally {
      this._isExecuting = false
    }
  }

  canUndo(): boolean { return this._undoStack.length > 1 }
  canRedo(): boolean { return this._redoStack.length > 0 }

  isStackEmpty(): boolean { return this._undoStack.length <= 1 && this._redoStack.length === 0 }

  clear(): void {
    this._undoStack = []
    this._redoStack = []
    this._lastCoalesceKey = undefined
  }

  destroy(): void { this.clear() }
}

/** 工具：从文档 + range 创建快照（深拷贝 doc，浅拷贝 range） */
export function createSnapshot(doc: IDocxDocumentMeta, range: IRange | null): HistorySnapshot {
  return {
    doc: cloneTree(doc),
    range: range ? { anchor: range.anchor, focus: range.focus } : null
  }
}
