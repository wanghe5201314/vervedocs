/**
 * VerveDocs Schema —— Transform 层跨包共享接口
 *
 * 从 docx-editor-transform 包迁移的跨包共享类型。
 * HistorySnapshot 合并了 transform 和 history 两处重复定义。
 */

import type { IDocxDocumentMeta, IRange } from '../types'

/** 历史快照，用于撤销/重做时保存文档与选区状态的某一时刻快照 */
export interface HistorySnapshot {
  /** 快照时的文档元数据 */
  doc: IDocxDocumentMeta
  /** 快照时的选区范围，无选区时为 null */
  range: IRange | null
  zone?: 'main' | 'header' | 'footer'
}

/** 历史管理器抽象接口，维护编辑历史的快照栈 */
export interface IHistoryManager {
  /** 推入初始快照（编辑器就绪时调用一次） */
  pushInitial(snapshot: HistorySnapshot): void
  /** 推入新快照，可指定合并键以合并连续同类操作 */
  push(snapshot: HistorySnapshot, coalesceKey?: string): void
  /** 撤销操作，返回上一快照；无可撤销时返回 null */
  undo(current: HistorySnapshot): HistorySnapshot | null
  /** 重做操作，返回下一快照；无可重做时返回 null */
  redo(current: HistorySnapshot): HistorySnapshot | null
  /** 是否可执行撤销 */
  canUndo(): boolean
  /** 是否可执行重做 */
  canRedo(): boolean
  /** 清空所有历史记录 */
  clear(): void
  /** 销毁历史管理器，释放资源 */
  destroy(): void
}