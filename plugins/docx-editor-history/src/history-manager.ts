/**
 * VerveDocs History —— HistoryManager
 *
 * 基于整树快照的撤销/重做管理器。
 * 使用 rfdc（经 schema cloneTree）深拷贝文档树，配合 coalescing 合并连续同类编辑。
 */

import type { IDocxDocumentMeta, IRange, HistorySnapshot } from '@vervedoc/docx-editor-schema'
import { cloneTree } from '@vervedoc/docx-editor-schema'

// 重新导出迁移至 schema 的跨包共享类型，保持 history 包 API 兼容
export type { HistorySnapshot } from '@vervedoc/docx-editor-schema'

/** 默认最大历史记录数 */
const DEFAULT_MAX_RECORD_COUNT = 50
/** 默认合并时间窗（毫秒） */
const DEFAULT_COALESCE_MS = 300

/** 基于整树快照的撤销/重做管理器 */
export class HistoryManager {
  /** 撤销栈 */
  private _undoStack: HistorySnapshot[] = []
  /** 重做栈 */
  private _redoStack: HistorySnapshot[] = []
  /** 最大记录数 */
  private _maxRecordCount: number
  /** 合并时间窗（毫秒） */
  private _coalesceMs: number
  /** 上次提交时间戳 */
  private _lastPushTime = 0
  /** 上次合并键 */
  private _lastCoalesceKey: string | undefined = undefined
  /** 是否正在执行撤销/重做 */
  private _isExecuting = false

  /**
   * 构造历史管理器
   * @param options 配置选项，包含最大记录数与合并时间窗
   */
  constructor(options?: { maxRecordCount?: number; coalesceMs?: number }) {
    this._maxRecordCount = options?.maxRecordCount ?? DEFAULT_MAX_RECORD_COUNT
    this._coalesceMs = options?.coalesceMs ?? DEFAULT_COALESCE_MS
  }

  /**
   * 初始化首快照（编辑器就绪后调用一次）
   * @param snapshot 初始快照
   * @returns 无返回值
   */
  pushInitial(snapshot: HistorySnapshot): void {
    this._undoStack = [snapshot]
    this._redoStack = []
    this._lastPushTime = Date.now()
    this._lastCoalesceKey = undefined
  }

  /**
   * 提交一次编辑后的快照。
   * coalesceKey 传入时：若与上次相同且在时间窗内，则替换栈顶（合并连续同类编辑）。
   * @param snapshot 编辑后的快照
   * @param coalesceKey 合并键，用于合并连续同类编辑
   * @returns 无返回值
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

  /**
   * 撤销：返回要恢复的快照，current 被压入 redo 栈
   * @param current 当前快照
   * @returns 要恢复的快照，无法撤销时返回 null
   */
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

  /**
   * 重做：返回要恢复的快照，current 被压入 undo 栈
   * @param current 当前快照
   * @returns 要恢复的快照，无法重做时返回 null
   */
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

  /**
   * 是否可撤销
   * @returns 可撤销时返回 true
   */
  canUndo(): boolean { return this._undoStack.length > 1 }

  /**
   * 是否可重做
   * @returns 可重做时返回 true
   */
  canRedo(): boolean { return this._redoStack.length > 0 }

  /**
   * 历史栈是否为空
   * @returns 撤销栈与重做栈均空时返回 true
   */
  isStackEmpty(): boolean { return this._undoStack.length <= 1 && this._redoStack.length === 0 }

  /**
   * 清空所有历史记录
   * @returns 无返回值
   */
  clear(): void {
    this._undoStack = []
    this._redoStack = []
    this._lastCoalesceKey = undefined
  }

  /**
   * 销毁管理器，清空历史记录
   * @returns 无返回值
   */
  destroy(): void { this.clear() }
}

/**
 * 工具：从文档 + range 创建快照（深拷贝 doc，浅拷贝 range）
 * @param doc 文档元数据
 * @param range 选区范围
 * @returns 创建的快照
 */
export function createSnapshot(doc: IDocxDocumentMeta, range: IRange | null): HistorySnapshot {
  return {
    doc: cloneTree(doc),
    range: range ? { anchor: range.anchor, focus: range.focus } : null
  }
}
