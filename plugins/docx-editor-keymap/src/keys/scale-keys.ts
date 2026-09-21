import { Command } from '@vervedoc/docx-editor-transform'
import { KeyMap, IRegisterShortcut } from '@vervedoc/docx-editor-schema'

/**
 * 页面缩放快捷键配置
 *
 * 全局快捷键，通过 Ctrl/Cmd 配合减号、等号、零控制页面缩放：
 * 减号缩小、等号放大、零恢复默认比例。
 */
export const scaleKeys: IRegisterShortcut[] = [
  /** Ctrl/Cmd + -：缩小页面显示比例 */
  {
    key: KeyMap.MINUS,
    mod: true,
    isGlobal: true,
    callback: (command: Command) => {
      command.executePageScaleMinus()
    }
  },
  /** Ctrl/Cmd + =：放大页面显示比例 */
  {
    key: KeyMap.EQUAL,
    mod: true,
    isGlobal: true,
    callback: (command: Command) => {
      command.executePageScaleAdd()
    }
  },
  /** Ctrl/Cmd + 0：恢复页面默认显示比例 */
  {
    key: KeyMap.ZERO,
    mod: true,
    isGlobal: true,
    callback: (command: Command) => {
      command.executePageScaleRecovery()
    }
  }
]
