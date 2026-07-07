import { Command } from '@vervedoc/docx-editor-transform'
import { KeyMap, IRegisterShortcut } from '@vervedoc/docx-editor-schema'

export const coreKeys: IRegisterShortcut[] = [
  {
    key: KeyMap.Z,
    mod: true,
    isGlobal: true,
    callback: (command: Command) => {
      command.executeUndo()
    }
  },
  {
    key: KeyMap.Z,
    mod: true,
    shift: true,
    isGlobal: true,
    callback: (command: Command) => {
      command.executeRedo()
    }
  },
  {
    key: KeyMap.C,
    mod: true,
    callback: (command: Command) => {
      command.executeCopy()
    }
  },
  {
    key: KeyMap.X,
    mod: true,
    callback: (command: Command) => {
      command.executeCut()
    }
  },
  {
    key: KeyMap.V,
    mod: true,
    callback: (command: Command) => {
      command.executePaste()
    }
  },
  {
    key: KeyMap.A,
    mod: true,
    callback: (command: Command) => {
      command.executeSelectAll()
    }
  },
  {
    key: KeyMap.S,
    mod: true,
    isGlobal: true,
    callback: (command: Command) => {
      command.executeSave()
    }
  },
  {
    key: KeyMap.P,
    mod: true,
    isGlobal: true,
    callback: (command: Command) => {
      void command.executePrint()
    }
  }
]
