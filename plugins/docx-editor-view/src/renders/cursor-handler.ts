import { EDITOR_PREFIX } from '@vervedoc/docx-editor-schema'
import { EventBusMap } from '@vervedoc/docx-editor-schema'
import { Draw } from '../renders/engine'
import { CanvasEvent } from '../events/canvas-event'
import { EventBus } from '@vervedoc/docx-editor-state'
import { pasteByEvent } from '../events/handlers/paste'

export class CursorAgent {
  private draw: Draw
  private container: HTMLDivElement
  private agentCursorDom: HTMLTextAreaElement
  private canvasEvent: CanvasEvent
  private eventBus: EventBus<EventBusMap>

  constructor(draw: Draw, canvasEvent: CanvasEvent) {
    this.draw = draw
    this.container = draw.getContainer()
    this.canvasEvent = canvasEvent
    this.eventBus = draw.getEventBus()
    // 代理光标绘制
    const agentCursorDom = document.createElement('textarea')
    agentCursorDom.autocomplete = 'off'
    agentCursorDom.classList.add(`${EDITOR_PREFIX}-inputarea`)
    agentCursorDom.innerText = ''
    this.container.append(agentCursorDom)
    this.agentCursorDom = agentCursorDom
    // 事件
    agentCursorDom.onkeydown = (evt: KeyboardEvent) => this._keyDown(evt)
    agentCursorDom.oninput = this._input.bind(this)
    agentCursorDom.onpaste = (evt: ClipboardEvent) => this._paste(evt)
    agentCursorDom.addEventListener(
      'compositionstart',
      this._compositionstart.bind(this)
    )
    agentCursorDom.addEventListener(
      'compositionend',
      this._compositionend.bind(this)
    )
  }

  public getAgentCursorDom(): HTMLTextAreaElement {
    return this.agentCursorDom
  }

  private _keyDown(evt: KeyboardEvent) {
    this.canvasEvent.keydown(evt)
  }

  private _input(evt: Event) {
    const data = (<InputEvent>evt).data
    if (data) {
      this.canvasEvent.input(data)
    }
    if (this.eventBus.hasSubscribers('input')) {
      this.eventBus.emit('input', evt)
    }
  }

  private _paste(evt: ClipboardEvent) {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    const clipboardData = evt.clipboardData
    if (!clipboardData) return
    pasteByEvent(this.canvasEvent, evt)
    evt.preventDefault()
  }

  private _compositionstart() {
    this.canvasEvent.compositionstart()
  }

  private _compositionend(evt: CompositionEvent) {
    this.canvasEvent.compositionend(evt)
  }
}
