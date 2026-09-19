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

/** 快捷键处理器依赖注入接口 */
export interface ShortcutDeps {
  /** 获取 Draw 视图实例 */
  getDraw: () => Draw
  /** 获取 Command 命令实例 */
  getCommand: () => Command
  /** 获取 RangeManager 选区管理器 */
  getRange: () => RangeManager
  /** 获取 CommandAdapt 适配器（可能未初始化） */
  getAdapt: () => CommandAdapt | null
}

/** 键盘快捷键处理器，分编辑/光标/格式/历史四组 */
export class ShortcutHandler {
  /** 依赖注入 */
  private deps: ShortcutDeps

  /**
   * 构造快捷键处理器
   * @param deps 依赖注入对象
   */
  constructor(deps: ShortcutDeps) {
    this.deps = deps
  }

  /**
   * 处理键盘事件，依次尝试编辑/光标/格式/历史四组快捷键
   * @param e 键盘事件
   */
  handle = (e: KeyboardEvent): void => {
    const adapt = this.deps.getAdapt()
    if (!adapt) return
    const draw = this.deps.getDraw()
    const command = this.deps.getCommand()

    if (this.handleEditKeys(e, adapt, draw)) return
    if (this.handleCursorKeys(e, adapt, draw)) return
    if (this.handleFormatKeys(e, command)) return
    if (this.handleHistoryKeys(e, command)) return
  }

  /**
   * 处理编辑类快捷键（复制/剪切/粘贴/全选/删除/Enter/Tab/Escape）
   * @param e 键盘事件
   * @param adapt 命令适配器
   * @param draw 视图实例
   * @returns 是否已处理该事件
   */
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

  /**
   * 处理光标移动快捷键（方向键/Home/End/PageUp/PageDown，含 Ctrl 词移动/文档首尾）
   * @param e 键盘事件
   * @param adapt 命令适配器
   * @param draw 视图实例
   * @returns 是否已处理该事件
   */
  private handleCursorKeys(e: KeyboardEvent, adapt: CommandAdapt, draw: Draw): boolean {
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

  /**
   * 处理格式快捷键（加粗/斜体/下划线/删除线/字号/对齐/列表/标题/清除格式）
   * @param e 键盘事件
   * @param command 命令实例
   * @returns 是否已处理该事件
   */
  private handleFormatKeys(e: KeyboardEvent, command: Command): boolean {
    const mod = e.ctrlKey || e.metaKey
    if (!mod) return false
    const k = e.key.toLowerCase()

    if (!e.shiftKey && !e.altKey) {
      if (k === 'b') { e.preventDefault(); command.executeSetBold(); return true }
      if (k === 'i') { e.preventDefault(); command.executeSetItalic(); return true }
      if (k === 'u') { e.preventDefault(); command.executeSetUnderline(); return true }
      if (k === '\\') { e.preventDefault(); command.executeClearFormat(); return true }
      if (k === '[') { e.preventDefault(); command.executeSizeMinus(); return true }
      if (k === ']') { e.preventDefault(); command.executeSizeAdd(); return true }
      if (k === 'l') { e.preventDefault(); command.executeSetRowFlex(ROW_FLEX.LEFT); return true }
      if (k === 'e') { e.preventDefault(); command.executeSetRowFlex(ROW_FLEX.CENTER); return true }
      if (k === 'r') { e.preventDefault(); command.executeSetRowFlex(ROW_FLEX.RIGHT); return true }
      if (k === 'j') { e.preventDefault(); command.executeSetRowFlex(ROW_FLEX.JUSTIFY); return true }
    }

    if (e.shiftKey && !e.altKey) {
      if (k === 'x') { e.preventDefault(); command.executeSetStrikeout(); return true }
      if (k === 'j') { e.preventDefault(); command.executeSetRowFlex(ROW_FLEX.DISTRIBUTE); return true }
      if (k === 'i') { e.preventDefault(); command.executeSetList(LIST_TYPE.UL, LIST_STYLE.DISC); return true }
      if (k === 'u') { e.preventDefault(); command.executeSetList(LIST_TYPE.OL, LIST_STYLE.DECIMAL); return true }
    }

    if (e.altKey && !e.shiftKey) {
      if (k === '0') { e.preventDefault(); command.executeSetTitle(null); return true }
      if (k === '1') { e.preventDefault(); command.executeSetTitle(TITLE_LEVEL.FIRST); return true }
      if (k === '2') { e.preventDefault(); command.executeSetTitle(TITLE_LEVEL.SECOND); return true }
      if (k === '3') { e.preventDefault(); command.executeSetTitle(TITLE_LEVEL.THIRD); return true }
      if (k === '4') { e.preventDefault(); command.executeSetTitle(TITLE_LEVEL.FOURTH); return true }
      if (k === '5') { e.preventDefault(); command.executeSetTitle(TITLE_LEVEL.FIFTH); return true }
      if (k === '6') { e.preventDefault(); command.executeSetTitle(TITLE_LEVEL.SIXTH); return true }
    }

    return false
  }

  /**
   * 处理历史快捷键（撤销/重做/分页）
   * @param e 键盘事件
   * @param command 命令实例
   * @returns 是否已处理该事件
   */
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
