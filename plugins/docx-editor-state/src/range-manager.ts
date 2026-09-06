/**
 * VerveDocs State —— RangeManager
 *
 * 基于树路径的选区/光标模型。
 * anchor / focus 均为 IPosition = { path, offset }。
 */

import type { IPosition, IRange, Path } from '@vervedoc/docx-editor-schema'
import { comparePosition, isSamePath } from '@vervedoc/docx-editor-schema'
import type { Listener } from './listener'

/**
 * 选区/光标管理器
 *
 * 维护编辑器当前选区（anchor/focus 双点模型），
 * 并在选区变更时通过 Listener 派发 range-change 与 position-change 事件。
 */
export class RangeManager {
  /** 当前选区，未选中时为 null */
  private _range: IRange | null = null

  /**
   * 构造选区管理器
   * @param listener 可选的事件监听器，用于在选区变更时派发事件
   */
  constructor(private listener?: Listener) {}

  /**
   * 获取当前选区
   * @returns 当前选区对象，未选中时返回 null
   */
  getRange(): IRange | null { return this._range }

  /**
   * 获取选区起点（anchor）
   * @returns anchor 位置，未选中时返回 null
   */
  getAnchor(): IPosition | null { return this._range?.anchor ?? null }

  /**
   * 获取选区终点（focus，即光标位置）
   * @returns focus 位置，未选中时返回 null
   */
  getFocus(): IPosition | null { return this._range?.focus ?? null }

  /** 获取按文档顺序排序后的 [start, end] */
  getOrdered(): { start: IPosition; end: IPosition } | null {
    if (!this._range) return null
    const { anchor, focus } = this._range
    return comparePosition(anchor, focus) <= 0
      ? { start: anchor, end: focus }
      : { start: focus, end: anchor }
  }

  /**
   * 判断选区是否折叠（anchor 与 focus 重合）
   * @returns 折叠（光标状态）返回 true，无选区或存在范围选区时返回 true/false
   */
  isCollapsed(): boolean {
    if (!this._range) return true
    const { anchor, focus } = this._range
    return isSamePath(anchor.path, focus.path) && anchor.offset === focus.offset
  }

  /**
   * 设置光标位置（折叠选区，anchor = focus）
   * @param pos 光标位置，传 null 清除选区
   */
  setCaret(pos: IPosition | null): void {
    this._range = pos ? { anchor: { ...pos }, focus: { ...pos } } : null
    this.emitChange()
  }

  /**
   * 设置选区范围
   * @param range 选区对象，传 null 清除选区
   */
  setRange(range: IRange | null): void {
    this._range = range ? { anchor: { ...range.anchor }, focus: { ...range.focus } } : null
    this.emitChange()
  }

  /**
   * 将选区折叠到起点
   */
  collapseToStart(): void {
    const ordered = this.getOrdered()
    if (!ordered) return
    this.setCaret(ordered.start)
  }

  /**
   * 将选区折叠到终点
   */
  collapseToEnd(): void {
    const ordered = this.getOrdered()
    if (!ordered) return
    this.setCaret(ordered.end)
  }

  /**
   * 清除当前选区
   */
  clear(): void {
    this._range = null
    this.emitChange()
  }

  /**
   * 派发选区变更事件
   * 同时触发 range-change 与 position-change 事件
   */
  private emitChange(): void {
    this.listener?.emit('range-change', this._range)
    this.listener?.emit('position-change', this._range?.focus ?? null)
  }

  /** 用同一 path 移动 offset */
  moveOffset(delta: number): void {
    if (!this._range) return
    const focus = this._range.focus
    const newOffset = Math.max(0, focus.offset + delta)
    this.setCaret({ path: focus.path.slice() as Path, offset: newOffset })
  }
}
