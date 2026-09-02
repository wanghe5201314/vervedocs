/**
 * VerveDocs State —— RangeManager
 *
 * 基于树路径的选区/光标模型。
 * anchor / focus 均为 IPosition = { path, offset }。
 */

import type { IPosition, IRange, Path } from '@vervedoc/docx-editor-schema'
import { comparePosition, isSamePath } from '@vervedoc/docx-editor-schema'
import type { Listener } from './listener'

export class RangeManager {
  private _range: IRange | null = null

  constructor(private listener?: Listener) {}

  getRange(): IRange | null { return this._range }

  getAnchor(): IPosition | null { return this._range?.anchor ?? null }
  getFocus(): IPosition | null { return this._range?.focus ?? null }

  /** 获取按文档顺序排序后的 [start, end] */
  getOrdered(): { start: IPosition; end: IPosition } | null {
    if (!this._range) return null
    const { anchor, focus } = this._range
    return comparePosition(anchor, focus) <= 0
      ? { start: anchor, end: focus }
      : { start: focus, end: anchor }
  }

  isCollapsed(): boolean {
    if (!this._range) return true
    const { anchor, focus } = this._range
    return isSamePath(anchor.path, focus.path) && anchor.offset === focus.offset
  }

  setCaret(pos: IPosition | null): void {
    this._range = pos ? { anchor: { ...pos }, focus: { ...pos } } : null
    this.emitChange()
  }

  setRange(range: IRange | null): void {
    this._range = range ? { anchor: { ...range.anchor }, focus: { ...range.focus } } : null
    this.emitChange()
  }

  collapseToStart(): void {
    const ordered = this.getOrdered()
    if (!ordered) return
    this.setCaret(ordered.start)
  }

  collapseToEnd(): void {
    const ordered = this.getOrdered()
    if (!ordered) return
    this.setCaret(ordered.end)
  }

  clear(): void {
    this._range = null
    this.emitChange()
  }

  private emitChange(): void {
    this.listener?.emit('rangeChange', this._range)
    this.listener?.emit('positionChange', this._range?.focus ?? null)
  }

  /** 用同一 path 移动 offset */
  moveOffset(delta: number): void {
    if (!this._range) return
    const focus = this._range.focus
    const newOffset = Math.max(0, focus.offset + delta)
    this.setCaret({ path: focus.path.slice() as Path, offset: newOffset })
  }
}
