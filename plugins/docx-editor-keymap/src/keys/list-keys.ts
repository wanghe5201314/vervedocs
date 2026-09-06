import { Command } from '@vervedoc/docx-editor-transform'
import { KeyMap, IRegisterShortcut, LIST_STYLE, LIST_TYPE } from '@vervedoc/docx-editor-schema'

/**
 * 列表快捷键配置
 *
 * 通过 Ctrl/Cmd + Shift + I / U 切换无序与有序列表。
 */
export const listKeys: IRegisterShortcut[] = [
  /** Ctrl/Cmd + Shift + I：切换无序列表（实心圆点样式） */
  {
    key: KeyMap.I,
    shift: true,
    mod: true,
    callback: (command: Command) => {
      command.executeSetList(LIST_TYPE.UL, LIST_STYLE.DISC)
    }
  },
  /** Ctrl/Cmd + Shift + U：切换有序列表 */
  {
    key: KeyMap.U,
    shift: true,
    mod: true,
    callback: (command: Command) => {
      command.executeSetList(LIST_TYPE.OL, LIST_STYLE.DECIMAL)
    }
  }
]
