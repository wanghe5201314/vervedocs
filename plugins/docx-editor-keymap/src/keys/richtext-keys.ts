import { Command } from '@vervedoc/docx-editor-transform'
import { KeyMap, IRegisterShortcut, isApple, ROW_FLEX } from '@vervedoc/docx-editor-schema'

/**
 * 富文本格式快捷键配置
 *
 * 涵盖删除线、字号增减、加粗、斜体、下划线、清除格式、上下标、
 * 以及行对齐（左/中/右/两端/分散）等富文本编辑常用快捷键。
 */
export const richtextKeys: IRegisterShortcut[] = [
  /** Ctrl/Cmd + Shift + X：切换删除线 */
  {
    key: KeyMap.X,
    ctrl: true,
    shift: true,
    callback: (command: Command) => {
      command.executeSetStrikeout()
    }
  },
  /** Ctrl/Cmd + [：增大选区字号 */
  {
    key: KeyMap.LEFT_BRACKET,
    mod: true,
    callback: (command: Command) => {
      command.executeSizeAdd()
    }
  },
  /** Ctrl/Cmd + ]：减小选区字号 */
  {
    key: KeyMap.RIGHT_BRACKET,
    mod: true,
    callback: (command: Command) => {
      command.executeSizeMinus()
    }
  },
  /** Ctrl/Cmd + B：切换加粗 */
  {
    key: KeyMap.B,
    mod: true,
    callback: (command: Command) => {
      command.executeSetBold()
    }
  },
  /** Ctrl/Cmd + I：切换斜体 */
  {
    key: KeyMap.I,
    mod: true,
    callback: (command: Command) => {
      command.executeSetItalic()
    }
  },
  /** Ctrl/Cmd + U：切换下划线 */
  {
    key: KeyMap.U,
    mod: true,
    callback: (command: Command) => {
      command.executeSetUnderline()
    }
  },
  /** Ctrl/Cmd + \：清除选区格式 */
  {
    key: KeyMap.BACKSLASH,
    mod: true,
    callback: (command: Command) => {
      command.executeClearFormat()
    }
  },
  /** Ctrl/Cmd + Shift + ,(Apple) / >(其他)：设置为上标 */
  {
    key: isApple ? KeyMap.COMMA : KeyMap.RIGHT_ANGLE_BRACKET,
    mod: true,
    shift: true,
    callback: (command: Command) => {
      command.executeSetSuperscript()
    }
  },
  /** Ctrl/Cmd + Shift + .(Apple) / <(其他)：设置为下标 */
  {
    key: isApple ? KeyMap.PERIOD : KeyMap.LEFT_ANGLE_BRACKET,
    mod: true,
    shift: true,
    callback: (command: Command) => {
      command.executeSetSubscript()
    }
  },
  /** Ctrl/Cmd + L：左对齐 */
  {
    key: KeyMap.L,
    mod: true,
    callback: (command: Command) => {
      command.executeSetRowFlex(ROW_FLEX.LEFT)
    }
  },
  /** Ctrl/Cmd + E：居中对齐 */
  {
    key: KeyMap.E,
    mod: true,
    callback: (command: Command) => {
      command.executeSetRowFlex(ROW_FLEX.CENTER)
    }
  },
  /** Ctrl/Cmd + R：右对齐 */
  {
    key: KeyMap.R,
    mod: true,
    callback: (command: Command) => {
      command.executeSetRowFlex(ROW_FLEX.RIGHT)
    }
  },
  /** Ctrl/Cmd + J：两端对齐 */
  {
    key: KeyMap.J,
    mod: true,
    callback: (command: Command) => {
      command.executeSetRowFlex(ROW_FLEX.JUSTIFY)
    }
  },
  /** Ctrl/Cmd + Shift + J：分散对齐 */
  {
    key: KeyMap.J,
    mod: true,
    shift: true,
    callback: (command: Command) => {
      command.executeSetRowFlex(ROW_FLEX.DISTRIBUTE)
    }
  }
]
