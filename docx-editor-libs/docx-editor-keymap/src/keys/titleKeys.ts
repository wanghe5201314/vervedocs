import { Command } from '@wanghe1995/docx-editor-transform'
import { KeyMap, IRegisterShortcut, TitleLevel } from '@wanghe1995/docx-editor-schema'

export const titleKeys: IRegisterShortcut[] = [
  {
    key: KeyMap.ZERO,
    alt: true,
    ctrl: true,
    callback: (command: Command) => {
      command.executeTitle(null)
    }
  },
  {
    key: KeyMap.ONE,
    alt: true,
    ctrl: true,
    callback: (command: Command) => {
      command.executeTitle(TitleLevel.FIRST)
    }
  },
  {
    key: KeyMap.TWO,
    alt: true,
    ctrl: true,
    callback: (command: Command) => {
      command.executeTitle(TitleLevel.SECOND)
    }
  },
  {
    key: KeyMap.THREE,
    alt: true,
    ctrl: true,
    callback: (command: Command) => {
      command.executeTitle(TitleLevel.THIRD)
    }
  },
  {
    key: KeyMap.FOUR,
    alt: true,
    ctrl: true,
    callback: (command: Command) => {
      command.executeTitle(TitleLevel.FOURTH)
    }
  },
  {
    key: KeyMap.FIVE,
    alt: true,
    ctrl: true,
    callback: (command: Command) => {
      command.executeTitle(TitleLevel.FIFTH)
    }
  },
  {
    key: KeyMap.SIX,
    alt: true,
    ctrl: true,
    callback: (command: Command) => {
      command.executeTitle(TitleLevel.SIXTH)
    }
  }
]
