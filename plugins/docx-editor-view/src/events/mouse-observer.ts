import { EventBusMap } from '@vervedoc/docx-editor-schema'
import { Draw } from '../renders/engine'
import { EventBus } from '@vervedoc/docx-editor-state'

export class MouseObserver {
  private draw: Draw
  private eventBus: EventBus<EventBusMap>
  private pageContainer: HTMLDivElement
  private _mousemoveHandler: (evt: MouseEvent) => void
  private _mouseenterHandler: (evt: MouseEvent) => void
  private _mouseleaveHandler: (evt: MouseEvent) => void
  private _mousedownHandler: (evt: MouseEvent) => void
  private _mouseupHandler: (evt: MouseEvent) => void
  private _clickHandler: (evt: MouseEvent) => void
  constructor(draw: Draw) {
    this.draw = draw
    this.eventBus = this.draw.getEventBus()
    this.pageContainer = this.draw.getPageContainer()
    this._mousemoveHandler = this._mousemove.bind(this)
    this._mouseenterHandler = this._mouseenter.bind(this)
    this._mouseleaveHandler = this._mouseleave.bind(this)
    this._mousedownHandler = this._mousedown.bind(this)
    this._mouseupHandler = this._mouseup.bind(this)
    this._clickHandler = this._click.bind(this)
    this.pageContainer.addEventListener('mousemove', this._mousemoveHandler)
    this.pageContainer.addEventListener('mouseenter', this._mouseenterHandler)
    this.pageContainer.addEventListener('mouseleave', this._mouseleaveHandler)
    this.pageContainer.addEventListener('mousedown', this._mousedownHandler)
    this.pageContainer.addEventListener('mouseup', this._mouseupHandler)
    this.pageContainer.addEventListener('click', this._clickHandler)
  }

  public removeEvent() {
    this.pageContainer.removeEventListener('mousemove', this._mousemoveHandler)
    this.pageContainer.removeEventListener('mouseenter', this._mouseenterHandler)
    this.pageContainer.removeEventListener('mouseleave', this._mouseleaveHandler)
    this.pageContainer.removeEventListener('mousedown', this._mousedownHandler)
    this.pageContainer.removeEventListener('mouseup', this._mouseupHandler)
    this.pageContainer.removeEventListener('click', this._clickHandler)
  }

  private _mousemove(evt: MouseEvent) {
    if (!this.eventBus.hasSubscribers('mousemove')) return
    this.eventBus.emit('mousemove', evt)
  }

  private _mouseenter(evt: MouseEvent) {
    if (!this.eventBus.hasSubscribers('mouseenter')) return
    this.eventBus.emit('mouseenter', evt)
  }

  private _mouseleave(evt: MouseEvent) {
    if (!this.eventBus.hasSubscribers('mouseleave')) return
    this.eventBus.emit('mouseleave', evt)
  }

  private _mousedown(evt: MouseEvent) {
    if (!this.eventBus.hasSubscribers('mousedown')) return
    this.eventBus.emit('mousedown', evt)
  }

  private _mouseup(evt: MouseEvent) {
    if (!this.eventBus.hasSubscribers('mouseup')) return
    this.eventBus.emit('mouseup', evt)
  }

  private _click(evt: MouseEvent) {
    if (!this.eventBus.hasSubscribers('click')) return
    this.eventBus.emit('click', evt)
  }
}
