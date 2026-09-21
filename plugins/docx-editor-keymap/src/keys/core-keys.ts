import { Command } from '@vervedoc/docx-editor-transform'
import { KeyMap, IRegisterShortcut } from '@vervedoc/docx-editor-schema'

/**
 * 核心编辑快捷键配置
 *
 * 包含撤销/重做、复制/剪切/粘贴、全选、保存、打印等编辑器核心命令快捷键。
 */
export const coreKeys: IRegisterShortcut[] = [
  /** Ctrl/Cmd + Z：撤销上一步操作 */
  {
    key: KeyMap.Z,
    mod: true,
    isGlobal: true,
    callback: (command: Command) => {
      command.executeUndo()
    }
  },
  /** Ctrl/Cmd + Shift + Z：重做被撤销的操作 */
  {
    key: KeyMap.Z,
    mod: true,
    shift: true,
    isGlobal: true,
    callback: (command: Command) => {
      command.executeRedo()
    }
  },
  /** Ctrl/Cmd + C：复制选区内容 */
  {
    key: KeyMap.C,
    mod: true,
    callback: (command: Command) => {
      command.executeCopy()
    }
  },
  /** Ctrl/Cmd + X：剪切选区内容 */
  {
    key: KeyMap.X,
    mod: true,
    callback: (command: Command) => {
      command.executeCut()
    }
  },
  /** Ctrl/Cmd + V：粘贴剪贴板内容 */
  {
    key: KeyMap.V,
    mod: true,
    callback: (command: Command) => {
      void navigator.clipboard.readText().then(text => command.executePaste(text))
    }
  },
  /** Ctrl/Cmd + A：全选文档内容 */
  {
    key: KeyMap.A,
    mod: true,
    callback: (command: Command) => {
      command.executeSelectAll()
    }
  },

  /** Ctrl/Cmd + P：打印文档 */
  {
    key: KeyMap.P,
    mod: true,
    isGlobal: true,
    callback: (command: Command) => {
      void command.executePrint()
    }
  }
]
