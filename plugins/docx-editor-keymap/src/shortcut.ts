import { IRegisterShortcut, isMod } from '@vervedoc/docx-editor-schema'
import { Command, createSafeCommand } from '@vervedoc/docx-editor-transform'
import { coreKeys } from './keys/core-keys'
import { richtextKeys } from './keys/richtext-keys'
import { titleKeys } from './keys/title-keys'
import { listKeys } from './keys/list-keys'
import { scaleKeys } from './keys/scale-keys'

/** Draw 编辑器实例类型（来自 docx-editor-core，此处使用 any 兜底以避免循环依赖） */
type Draw = any

/**
 * 快捷键管理类
 *
 * 负责注册全局快捷键与编辑器代理输入框快捷键，监听键盘事件并匹配执行对应回调。
 * 内置快捷键来源于 coreKeys、richtextKeys、titleKeys、listKeys、scaleKeys，
 * 同时支持外部通过 registerShortcutList 注册额外快捷键。
 */
export class Shortcut {
  /** 原始命令对象，用于执行内置快捷键回调 */
  private command: Command
  /** 安全命令对象（经 createSafeCommand 包装），用于执行外部注册的快捷键回调 */
  private safeCommand: Command
  /** 内置全局快捷键列表（在 document 上监听） */
  private globalShortcutList: IRegisterShortcut[]
  /** 内置编辑器代理输入框快捷键列表（在 agent DOM 上监听） */
  private agentShortcutList: IRegisterShortcut[]
  /** 外部注册的全局快捷键列表 */
  private externalGlobalList: IRegisterShortcut[]
  /** 外部注册的编辑器代理输入框快捷键列表 */
  private externalAgentList: IRegisterShortcut[]
  /** 编辑器代理输入框 DOM 节点，用于监听 keydown 事件 */
  private _agentDom: HTMLTextAreaElement | null = null
  /** 已绑定的代理 keydown 处理函数引用，便于卸载时移除监听 */
  private _boundAgentKeydown: ((evt: KeyboardEvent) => void) | null = null

  /**
   * 创建 Shortcut 实例并完成内置快捷键注册与事件绑定
   *
   * @param draw Draw 编辑器实例，用于获取代理输入框 DOM
   * @param command 命令对象，用于在内置快捷键回调中执行对应命令
   */
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

  /** 在 document 上绑定全局 keydown 事件 */
  private _addEvent() {
    document.addEventListener('keydown', this._globalKeydown)
  }

  /**
   * 移除全局与代理输入框的 keydown 事件监听并释放引用
   */
  public removeEvent() {
    document.removeEventListener('keydown', this._globalKeydown)
    if (this._agentDom && this._boundAgentKeydown) {
      this._agentDom.removeEventListener('keydown', this._boundAgentKeydown)
      this._agentDom = null
      this._boundAgentKeydown = null
    }
  }

  /**
   * 将一批快捷键注册到内部或外部列表，按数组顺序逆序插入以保持先注册优先
   *
   * @param payload 待注册的快捷键配置数组
   * @param isExternal 是否为外部注册（true 使用 external 列表与 safeCommand，false 使用内置列表与 command）
   */
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

  /**
   * 外部注册快捷键列表入口，使用安全命令执行回调
   *
   * @param payload 待注册的外部快捷键配置数组
   */
  public registerShortcutList(payload: IRegisterShortcut[]) {
    this._addShortcutList(payload, true)
  }

  /** 全局 keydown 处理函数：依次执行内置与外部全局快捷键匹配 */
  private _globalKeydown = (evt: KeyboardEvent) => {
    this._execute(evt, this.globalShortcutList, this.command)
    this._execute(evt, this.externalGlobalList, this.safeCommand)
  }

  /** 代理输入框 keydown 处理函数：依次执行内置与外部代理快捷键匹配 */
  private _agentKeydown(evt: KeyboardEvent) {
    this._execute(evt, this.agentShortcutList, this.command)
    this._execute(evt, this.externalAgentList, this.safeCommand)
  }

  /**
   * 在指定快捷键列表中匹配键盘事件，命中且未禁用则执行回调并阻止默认行为
   *
   * @param evt 键盘事件对象
   * @param shortCutList 候选快捷键列表
   * @param command 传入回调执行的命令对象
   */
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
