/**
 * CaretNavigation —— 光标导航 Controller
 *
 * 提供双击选词、三击选段、方向键移动、Home/End、词移动、文档首尾、全选等光标导航功能。
 */

import type { DocumentLayout, InlineBox, LineBox, ParagraphBlock } from './layout-types'
import type { RangeManager } from '@vervedoc/docx-editor-state'
import type { IPosition } from '@vervedoc/docx-editor-schema'
import { locateCaret } from './caret-rect'
import { hitTest } from './hit-test'
import type { Zone } from './widgets/header-footer-widget'

/**
 * CaretNavigation 的依赖注入接口
 *
 * 由外部宿主提供，用于获取布局、选区、区域信息以及布局查询方法等。
 */
export interface CaretNavigationDeps {
  /** 获取当前文档布局，可能为 null */
  getLayout: () => DocumentLayout | null
  /** 获取当前选区管理器，可能为 null */
  getRange: () => RangeManager | null
  /** 获取当前编辑区域 */
  getZone: () => Zone
  /** 按 position 查找所属 inline */
  findInlineByPos: (pos: IPosition) => InlineBox | null
  /** 按 position 查找所属段落块 */
  findParagraphByPos: (pos: IPosition) => ParagraphBlock | null
  /** 按 position 查找所属行盒 */
  findLineByPos: (pos: IPosition) => LineBox | null
  /** 查找文档首个 inline */
  findFirstInline: () => InlineBox | null
  /** 查找文档末个 inline */
  findLastInline: () => InlineBox | null
  /** 设置光标可见性 */
  setCaretVisible: (visible: boolean) => void
  /** 重绘光标 overlay */
  renderCaretIfAny: () => void
}

/**
 * 光标导航 Controller
 *
 * 封装光标移动、选词、选段、全选等导航操作。
 */
export class CaretNavigation {
  /**
   * 构造 CaretNavigation 实例
   *
   * @param deps 依赖注入对象
   */
  constructor(private deps: CaretNavigationDeps) {}

  /**
   * 双击选词：在命中 inline 内按 word char 边界扩展选区；非 word char 选当前单字。
   * @param pos 命中位置
   */
  selectWordAt(pos: IPosition): void {
    const range = this.deps.getRange()
    const layout = this.deps.getLayout()
    if (!range || !layout) return
    const inl = this.deps.findInlineByPos(pos)
    if (!inl) { range.setCaret(pos); return }
    const text = inl.text
    const localOff = pos.offset - inl.startOffset
    const isWord = (ch: string) => /[A-Za-z0-9_]/.test(ch)
    let left = localOff
    let right = localOff
    while (left > 0 && isWord(text[left - 1])) left--
    while (right < text.length && isWord(text[right])) right++
    // 非 word char（CJK / 标点 / 空格）：选当前单字
    if (left === right) {
      if (localOff < text.length) right = localOff + 1
      else left = Math.max(0, localOff - 1)
    }
    range.setRange({
      anchor: { path: inl.path, offset: inl.startOffset + left },
      focus: { path: inl.path, offset: inl.startOffset + right }
    })
  }

  /**
   * 三击选段：把选区扩展到命中段落的首 inline 起点到末 inline 终点。
   * @param pos 命中位置
   */
  selectParagraphAt(pos: IPosition): void {
    const range = this.deps.getRange()
    const layout = this.deps.getLayout()
    if (!range || !layout) return
    const para = this.deps.findParagraphByPos(pos)
    if (!para) { range.setCaret(pos); return }
    let first: InlineBox | undefined
    let last: InlineBox | undefined
    for (const line of para.lines) {
      for (const inl of line.inlines) {
        if (!first) first = inl
        last = inl
      }
    }
    if (!first || !last) { range.setCaret(pos); return }
    range.setRange({
      anchor: { path: first.path, offset: first.startOffset },
      focus: { path: last.path, offset: last.endOffset }
    })
  }

  /** 光标上移：基于当前光标矩形，用 hitTest 命中上一行同 x 最近字符 */
  moveCaretUp(): void {
    this.moveCaretVertical(-1)
  }

  /** 光标下移 */
  moveCaretDown(): void {
    this.moveCaretVertical(1)
  }

  /**
   * 光标垂直移动：基于当前光标矩形，用 hitTest 命中上一/下一行同 x 最近字符。
   * @param dir 移动方向，1=下移，-1=上移
   */
  private moveCaretVertical(dir: 1 | -1): void {
    const layout = this.deps.getLayout()
    const range = this.deps.getRange()
    if (!layout || !range) return
    const pos = range.getFocus()
    if (!pos) return
    const rect = locateCaret(layout, pos, this.deps.getZone())
    if (!rect) return
    // 目标 y = 当前光标 y ± 行高（估算上一/下一行中部）
    const targetY = rect.y + dir * rect.height
    const newPos = hitTest(layout, rect.x, targetY, this.deps.getZone())
    if (newPos) {
      range.setCaret(newPos)
      this.deps.setCaretVisible(true)
      this.deps.renderCaretIfAny()
    }
  }

  /** 当前行首 */
  moveCaretToLineStart(): void {
    const layout = this.deps.getLayout()
    const range = this.deps.getRange()
    if (!layout || !range) return
    const pos = range.getFocus()
    if (!pos) return
    const line = this.deps.findLineByPos(pos)
    if (!line) return
    const first = line.inlines[0]
    if (first) {
      range.setCaret({ path: first.path, offset: first.startOffset })
      this.deps.setCaretVisible(true)
      this.deps.renderCaretIfAny()
    }
  }

  /** 当前行尾 */
  moveCaretToLineEnd(): void {
    const layout = this.deps.getLayout()
    const range = this.deps.getRange()
    if (!layout || !range) return
    const pos = range.getFocus()
    if (!pos) return
    const line = this.deps.findLineByPos(pos)
    if (!line) return
    const last = line.inlines[line.inlines.length - 1]
    if (last) {
      range.setCaret({ path: last.path, offset: last.endOffset })
      this.deps.setCaretVisible(true)
      this.deps.renderCaretIfAny()
    }
  }

  /** 按词左移 */
  moveCaretWordLeft(): void {
    const layout = this.deps.getLayout()
    const range = this.deps.getRange()
    if (!layout || !range) return
    const pos = range.getFocus()
    if (!pos) return
    const inl = this.deps.findInlineByPos(pos)
    if (!inl) return
    const text = inl.text
    const localOff = pos.offset - inl.startOffset
    const isWord = (ch: string) => /[A-Za-z0-9_]/.test(ch)
    let off = localOff
    // 先跳过非 word char（空格/标点），再跳过 word char
    while (off > 0 && !isWord(text[off - 1])) off--
    while (off > 0 && isWord(text[off - 1])) off--
    if (off === localOff && off > 0) off = localOff - 1
    range.setCaret({ path: inl.path, offset: inl.startOffset + off })
    this.deps.setCaretVisible(true)
    this.deps.renderCaretIfAny()
  }

  /** 按词右移 */
  moveCaretWordRight(): void {
    const layout = this.deps.getLayout()
    const range = this.deps.getRange()
    if (!layout || !range) return
    const pos = range.getFocus()
    if (!pos) return
    const inl = this.deps.findInlineByPos(pos)
    if (!inl) return
    const text = inl.text
    const localOff = pos.offset - inl.startOffset
    const isWord = (ch: string) => /[A-Za-z0-9_]/.test(ch)
    let off = localOff
    while (off < text.length && !isWord(text[off])) off++
    while (off < text.length && isWord(text[off])) off++
    if (off === localOff && off < text.length) off = localOff + 1
    range.setCaret({ path: inl.path, offset: inl.startOffset + off })
    this.deps.setCaretVisible(true)
    this.deps.renderCaretIfAny()
  }

  /** 文档首 */
  moveCaretToDocStart(): void {
    const layout = this.deps.getLayout()
    const range = this.deps.getRange()
    if (!layout || !range) return
    const first = this.deps.findFirstInline()
    if (first) {
      range.setCaret({ path: first.path, offset: first.startOffset })
      this.deps.setCaretVisible(true)
      this.deps.renderCaretIfAny()
    }
  }

  /** 文档尾 */
  moveCaretToDocEnd(): void {
    const layout = this.deps.getLayout()
    const range = this.deps.getRange()
    if (!layout || !range) return
    const last = this.deps.findLastInline()
    if (last) {
      range.setCaret({ path: last.path, offset: last.endOffset })
      this.deps.setCaretVisible(true)
      this.deps.renderCaretIfAny()
    }
  }

  /** 全选：从文档首到文档尾 */
  selectAll(): void {
    const layout = this.deps.getLayout()
    const range = this.deps.getRange()
    if (!layout || !range) return
    const first = this.deps.findFirstInline()
    const last = this.deps.findLastInline()
    if (!first || !last) return
    range.setRange({
      anchor: { path: first.path, offset: first.startOffset },
      focus: { path: last.path, offset: last.endOffset }
    })
    this.deps.setCaretVisible(false)
    this.deps.renderCaretIfAny()
  }
}