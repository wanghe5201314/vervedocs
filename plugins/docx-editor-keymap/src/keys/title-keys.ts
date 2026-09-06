import { Command } from '@vervedoc/docx-editor-transform'
import { KeyMap, IRegisterShortcut, TITLE_LEVEL } from '@vervedoc/docx-editor-schema'

/**
 * 标题级别快捷键配置
 *
 * 通过 Ctrl/Cmd + Alt + 数字键（0-6）快速设置选区标题级别：
 * 0 取消标题，1-6 对应一级到六级标题。
 */
export const titleKeys: IRegisterShortcut[] = [
  /** Ctrl/Cmd + Alt + 0：取消标题级别 */
  {
    key: KeyMap.ZERO,
    alt: true,
    ctrl: true,
    callback: (command: Command) => {
      command.executeSetTitle(null)
    }
  },
  /** Ctrl/Cmd + Alt + 1：设置为一级标题 */
  {
    key: KeyMap.ONE,
    alt: true,
    ctrl: true,
    callback: (command: Command) => {
      command.executeSetTitle(TITLE_LEVEL.FIRST)
    }
  },
  /** Ctrl/Cmd + Alt + 2：设置为二级标题 */
  {
    key: KeyMap.TWO,
    alt: true,
    ctrl: true,
    callback: (command: Command) => {
      command.executeSetTitle(TITLE_LEVEL.SECOND)
    }
  },
  /** Ctrl/Cmd + Alt + 3：设置为三级标题 */
  {
    key: KeyMap.THREE,
    alt: true,
    ctrl: true,
    callback: (command: Command) => {
      command.executeSetTitle(TITLE_LEVEL.THIRD)
    }
  },
  /** Ctrl/Cmd + Alt + 4：设置为四级标题 */
  {
    key: KeyMap.FOUR,
    alt: true,
    ctrl: true,
    callback: (command: Command) => {
      command.executeSetTitle(TITLE_LEVEL.FOURTH)
    }
  },
  /** Ctrl/Cmd + Alt + 5：设置为五级标题 */
  {
    key: KeyMap.FIVE,
    alt: true,
    ctrl: true,
    callback: (command: Command) => {
      command.executeSetTitle(TITLE_LEVEL.FIFTH)
    }
  },
  /** Ctrl/Cmd + Alt + 6：设置为六级标题 */
  {
    key: KeyMap.SIX,
    alt: true,
    ctrl: true,
    callback: (command: Command) => {
      command.executeSetTitle(TITLE_LEVEL.SIXTH)
    }
  }
]
