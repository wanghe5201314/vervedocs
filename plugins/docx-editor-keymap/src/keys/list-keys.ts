import { Command } from '@vervedoc/docx-editor-transform'
import { KeyMap, IRegisterShortcut, ListStyle, ListType } from '@vervedoc/docx-editor-schema'

export const listKeys: IRegisterShortcut[] = [
  {
    key: KeyMap.I,
    shift: true,
    mod: true,
    callback: (command: Command) => {
      command.executeList(ListType.UL, ListStyle.DISC)
    }
  },
  {
    key: KeyMap.U,
    shift: true,
    mod: true,
    callback: (command: Command) => {
      command.executeList(ListType.OL)
    }
  }
]
