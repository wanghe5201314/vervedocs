import { IRegisterShortcut, isMod } from '@vervedoc/docx-editor-schema'
import { Command, createSafeCommand } from '@vervedoc/docx-editor-transform'
import { coreKeys } from './keys/coreKeys'
import { richtextKeys } from './keys/richtextKeys'
import { titleKeys } from './keys/titleKeys'
import { listKeys } from './keys/listKeys'
import { scaleKeys } from './keys/scaleKeys'

type Draw = any

export class Shortcut {
  private command: Command
  private safeCommand: Command
  private globalShortcutList: IRegisterShortcut[]
  private agentShortcutList: IRegisterShortcut[]
  private externalGlobalList: IRegisterShortcut[]
  private externalAgentList: IRegisterShortcut[]
  private _agentDom: HTMLTextAreaElement | null = null
  private _boundAgentKeydown: ((evt: KeyboardEvent) => void) | null = null

  constructor(draw: Draw, command: Command) {
    this.command = command
    this.safeCommand = createSafeCommand(command)
    this.globalShortcutList = []
    this.agentShortcutList = []
    this.externalGlobalList = []
    this.externalAgentList = []
    this._addShortcutList(
      [...coreKeys, ...richtextKeys, ...titleKeys, ...listKeys, ...scaleKeys],
      false
    )
    this._addEvent()
    this._boundAgentKeydown = this._agentKeydown.bind(this)
    this._agentDom = draw.getCursor().getAgentDom()
    this._agentDom?.addEventListener('keydown', this._boundAgentKeydown)
  }

  private _addEvent() {
    document.addEventListener('keydown', this._globalKeydown)
  }

  public removeEvent() {
    document.removeEventListener('keydown', this._globalKeydown)
    if (this._agentDom && this._boundAgentKeydown) {
      this._agentDom.removeEventListener('keydown', this._boundAgentKeydown)
      this._agentDom = null
      this._boundAgentKeydown = null
    }
  }

  private _addShortcutList(
    payload: IRegisterShortcut[],
    isExternal: boolean
  ) {
    for (let s = payload.length - 1; s >= 0; s--) {
      const shortCut = payload[s]
      const targetGlobal = isExternal
        ? this.externalGlobalList
        : this.globalShortcutList
      const targetAgent = isExternal
        ? this.externalAgentList
        : this.agentShortcutList
      if (shortCut.isGlobal) {
        targetGlobal.unshift(shortCut)
      } else {
        targetAgent.unshift(shortCut)
      }
    }
  }

  public registerShortcutList(payload: IRegisterShortcut[]) {
    this._addShortcutList(payload, true)
  }

  private _globalKeydown = (evt: KeyboardEvent) => {
    this._execute(evt, this.globalShortcutList, this.command)
    this._execute(evt, this.externalGlobalList, this.safeCommand)
  }

  private _agentKeydown(evt: KeyboardEvent) {
    this._execute(evt, this.agentShortcutList, this.command)
    this._execute(evt, this.externalAgentList, this.safeCommand)
  }

  private _execute(
    evt: KeyboardEvent,
    shortCutList: IRegisterShortcut[],
    command: Command
  ) {
    if (!shortCutList.length) return
    for (let s = 0; s < shortCutList.length; s++) {
      const shortCut = shortCutList[s]
      if (
        (shortCut.mod
          ? isMod(evt) === !!shortCut.mod
          : evt.ctrlKey === !!shortCut.ctrl &&
            evt.metaKey === !!shortCut.meta) &&
        evt.shiftKey === !!shortCut.shift &&
        evt.altKey === !!shortCut.alt &&
        evt.key.toLowerCase() === shortCut.key.toLowerCase()
      ) {
        if (!shortCut.disable && shortCut.callback) {
          shortCut.callback(command)
          evt.preventDefault()
        }
        break
      }
    }
  }
}
