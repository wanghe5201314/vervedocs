import { Command } from '@wanghe1995/docx-editor-transform'
import { KeyMap, IRegisterShortcut } from '@wanghe1995/docx-editor-schema'

export const scaleKeys: IRegisterShortcut[] = [
  {
    key: KeyMap.MINUS,
    mod: true,
    isGlobal: true,
    callback: (command: Command) => {
      command.executePageScaleMinus()
    }
  },
  {
    key: KeyMap.EQUAL,
    mod: true,
    isGlobal: true,
    callback: (command: Command) => {
      command.executePageScaleAdd()
    }
  },
  {
    key: KeyMap.ZERO,
    mod: true,
    isGlobal: true,
    callback: (command: Command) => {
      command.executePageScaleRecovery()
    }
  }
]
