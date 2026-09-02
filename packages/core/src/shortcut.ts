/**
 * VerveDocs Core —— 快捷键处理
 *
 * 从 docx-editor.ts 抽离的键盘快捷键逻辑，分四组：
 *  - 编辑键：复制/剪切/粘贴/全选/删除/Enter/Tab/Escape
 *  - 光标键：方向键/Home/End/PageUp/PageDown（含 Ctrl 词移动/文档首尾）
 *  - 格式键：加粗/斜体/下划线/删除线/字号/对齐/列表/标题/清除格式
 *  - 历史键：撤销/重做/分页
 */

import type { Draw } from '@vervedoc/docx-editor-view'
import type { Command, CommandAdapt } from '@vervedoc/docx-editor-transform'
import type { RangeManager } from '@vervedoc/docx-editor-state'
import { ROW_FLEX, LIST_TYPE, LIST_STYLE, TITLE_LEVEL } from '@vervedoc/docx-editor-schema'

export interface ShortcutDeps {
  getDraw: () => Draw
  getCommand: () => Command
  getRange: () => RangeManager
  getAdapt: () => CommandAdapt | null
}

export class ShortcutHandler {
  private deps: ShortcutDeps

  constructor(deps: ShortcutDeps) {
    this.deps = deps
  }

  handle = (e: KeyboardEvent): void => {
    const adapt = this.deps.getAdapt()
    if (!adapt) return
    const draw = this.deps.getDraw()
    const command = this.deps.getCommand()
    const range = this.deps.getRange()

    if (this.handleEditKeys(e, adapt, draw)) return
    if (this.handleCursorKeys(e, adapt, draw, range)) return
    if (this.handleFormatKeys(e, command)) return
    if (this.handleHistoryKeys(e, command)) return
  }

  private handleEditKeys(e: KeyboardEvent, adapt: CommandAdapt, draw: Draw): boolean {
    const mod = e.ctrlKey || e.metaKey

    if (mod && e.key === 'c') {
      e.preventDefault()
      const text = adapt.extractSelectionText()
      if (text && navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {})
      return true
    }
    if (mod && e.key === 'x') {
      e.preventDefault()
      const text = adapt.extractSelectionText()
      if (text && navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {})
      adapt.deleteSelection()
      return true
    }
    if (mod && e.key === 'v') {
      e.preventDefault()
      if (navigator.clipboard) {
        navigator.clipboard.readText().then(t => { if (t) adapt.insertText(t) }).catch(() => {})
      }
      return true
    }
    if (mod && e.key === 'a') {
      e.preventDefault()
      draw.selectAll()
      return true
    }
    if (e.key === 'Backspace') { e.preventDefault(); adapt.deleteBackward(); return true }
    if (e.key === 'Delete')    { e.preventDefault(); adapt.deleteForward(); return true }
    if (e.key === 'Enter')     { e.preventDefault(); adapt.splitParagraph(); return true }
    if (e.key === 'Tab')       { e.preventDefault(); adapt.insertText('\t'); return true }
    if (e.key === 'Escape')    { e.preventDefault(); this.deps.getRange().collapseToStart(); return true }

    return false
  }

  private handleCursorKeys(e: KeyboardEvent, adapt: CommandAdapt, draw: Draw, _range: RangeManager): boolean {
    const mod = e.ctrlKey || e.metaKey

    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      if (mod) draw.moveCaretWordLeft()
      else adapt.moveCaretLeft()
      return true
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      if (mod) draw.moveCaretWordRight()
      else adapt.moveCaretRight()
      return true
    }
    if (e.key === 'ArrowUp')   { e.preventDefault(); draw.moveCaretUp(); return true }
    if (e.key === 'ArrowDown') { e.preventDefault(); draw.moveCaretDown(); return true }
    if (e.key === 'Home') {
      e.preventDefault()
      if (mod) draw.moveCaretToDocStart()
      else draw.moveCaretToLineStart()
      return true
    }
    if (e.key === 'End') {
      e.preventDefault()
      if (mod) draw.moveCaretToDocEnd()
      else draw.moveCaretToLineEnd()
      return true
    }
    if (e.key === 'PageUp')   { e.preventDefault(); for (let i = 0; i < 10; i++) draw.moveCaretUp(); return true }
    if (e.key === 'PageDown') { e.preventDefault(); for (let i = 0; i < 10; i++) draw.moveCaretDown(); return true }

    return false
  }

  private handleFormatKeys(e: KeyboardEvent, command: Command): boolean {
    const mod = e.ctrlKey || e.metaKey
    if (!mod) return false
    const k = e.key.toLowerCase()

    if (!e.shiftKey && !e.altKey) {
      if (k === 'b') { e.preventDefault(); command.executeBold(); return true }
      if (k === 'i') { e.preventDefault(); command.executeItalic(); return true }
      if (k === 'u') { e.preventDefault(); command.executeUnderline(); return true }
      if (k === '\\') { e.preventDefault(); command.executeFormat(); return true }
      if (k === '[') { e.preventDefault(); command.executeSizeMinus(); return true }
      if (k === ']') { e.preventDefault(); command.executeSizeAdd(); return true }
      if (k === 'l') { e.preventDefault(); command.executeRowFlex(ROW_FLEX.LEFT); return true }
      if (k === 'e') { e.preventDefault(); command.executeRowFlex(ROW_FLEX.CENTER); return true }
      if (k === 'r') { e.preventDefault(); command.executeRowFlex(ROW_FLEX.RIGHT); return true }
      if (k === 'j') { e.preventDefault(); command.executeRowFlex(ROW_FLEX.ALIGNMENT); return true }
    }

    if (e.shiftKey && !e.altKey) {
      if (k === 'x') { e.preventDefault(); command.executeStrikeout(); return true }
      if (k === 'j') { e.preventDefault(); command.executeRowFlex(ROW_FLEX.JUSTIFY); return true }
      if (k === 'i') { e.preventDefault(); command.executeList(LIST_TYPE.UL, LIST_STYLE.DISC); return true }
      if (k === 'u') { e.preventDefault(); command.executeList(LIST_TYPE.OL, LIST_STYLE.DECIMAL); return true }
    }

    if (e.altKey && !e.shiftKey) {
      if (k === '0') { e.preventDefault(); command.executeTitle(null); return true }
      if (k === '1') { e.preventDefault(); command.executeTitle(TITLE_LEVEL.FIRST); return true }
      if (k === '2') { e.preventDefault(); command.executeTitle(TITLE_LEVEL.SECOND); return true }
      if (k === '3') { e.preventDefault(); command.executeTitle(TITLE_LEVEL.THIRD); return true }
      if (k === '4') { e.preventDefault(); command.executeTitle(TITLE_LEVEL.FOURTH); return true }
      if (k === '5') { e.preventDefault(); command.executeTitle(TITLE_LEVEL.FIFTH); return true }
      if (k === '6') { e.preventDefault(); command.executeTitle(TITLE_LEVEL.SIXTH); return true }
    }

    return false
  }

  private handleHistoryKeys(e: KeyboardEvent, command: Command): boolean {
    const mod = e.ctrlKey || e.metaKey
    if (!mod) return false
    const k = e.key.toLowerCase()

    if (!e.shiftKey && k === 'z') { e.preventDefault(); command.executeUndo(); return true }
    if ((e.shiftKey && k === 'z') || (!e.shiftKey && k === 'y')) { e.preventDefault(); command.executeRedo(); return true }
    if (k === 'enter') { e.preventDefault(); command.executePageBreak(); return true }

    return false
  }
}