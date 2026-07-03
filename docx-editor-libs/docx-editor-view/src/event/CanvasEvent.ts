import { ElementStyleKey } from '@wanghe1995/docx-editor-schema'
import { IElement, IElementPosition } from '@wanghe1995/docx-editor-schema'
import { ICurrentPosition, IPositionContext } from '@wanghe1995/docx-editor-schema'
import { Draw } from '../draw/Draw'
import { Position } from '../position/Position'
import { RangeManager } from '@wanghe1995/docx-editor-state'
import { handleTripleClick } from '@wanghe1995/docx-editor-schema'
import { IRange, IRangeElementStyle } from '@wanghe1995/docx-editor-schema'
import { mousedown } from './handlers/mousedown'
import { mouseup } from './handlers/mouseup'
import { mouseleave } from './handlers/mouseleave'
import { mousemove } from './handlers/mousemove'
import { keydown } from './handlers/keydown'
import { input } from './handlers/input'
import { cut } from './handlers/cut'
import { copy } from './handlers/copy'
import { drop } from './handlers/drop'
import { contextmenu } from './handlers/contextmenu'
import click from './handlers/click'
import composition from './handlers/composition'
import drag from './handlers/drag'
import { isIOS } from '@wanghe1995/docx-editor-schema'
import { ICopyOption } from '@wanghe1995/docx-editor-schema'

export interface ICompositionInfo {
  elementList: IElement[]
  startIndex: number
  endIndex: number
  value: string
  defaultStyle: IRangeElementStyle | null
}

export class CanvasEvent {
  public isAllowSelection: boolean
  public isComposing: boolean
  public compositionInfo: ICompositionInfo | null

  public isAllowDrag: boolean
  public isAllowDrop: boolean
  public cacheRange: IRange | null
  public cacheElementList: IElement[] | null
  public cachePositionList: IElementPosition[] | null
  public cachePositionContext: IPositionContext | null
  public mouseDownStartPosition: ICurrentPosition | null

  private draw: Draw
  private pageContainer: HTMLDivElement
  private pageList: HTMLCanvasElement[]
  private range: RangeManager
  private position: Position

  private _clickHandler: ((evt: MouseEvent) => void) | null = null
  private _mousedownHandler: ((evt: MouseEvent) => void) | null = null
  private _mouseupHandler: ((evt: MouseEvent) => void) | null = null
  private _mouseleaveHandler: ((evt: MouseEvent) => void) | null = null
  private _mousemoveHandler: ((evt: MouseEvent) => void) | null = null
  private _dblclickHandler: ((evt: MouseEvent) => void) | null = null
  private _dragoverHandler: ((evt: DragEvent) => void) | null = null
  private _dropHandler: ((evt: DragEvent) => void) | null = null
  private _contextmenuHandler: ((evt: MouseEvent) => void) | null = null
  private _threeClickCleanup: (() => void) | null = null

  constructor(draw: Draw) {
    this.draw = draw
    this.pageContainer = draw.getPageContainer()
    this.pageList = draw.getPageList()
    this.range = this.draw.getRange()
    this.position = this.draw.getPosition()

    this.isAllowSelection = false
    this.isComposing = false
    this.compositionInfo = null
    this.isAllowDrag = false
    this.isAllowDrop = false
    this.cacheRange = null
    this.cacheElementList = null
    this.cachePositionList = null
    this.cachePositionContext = null
    this.mouseDownStartPosition = null
  }

  public getDraw(): Draw {
    return this.draw
  }

  public register() {
    this._clickHandler = this.click.bind(this)
    this._mousedownHandler = this.mousedown.bind(this)
    this._mouseupHandler = this.mouseup.bind(this)
    this._mouseleaveHandler = this.mouseleave.bind(this)
    this._mousemoveHandler = this.mousemove.bind(this)
    this._dblclickHandler = this.dblclick.bind(this)
    this._dragoverHandler = this.dragover.bind(this)
    this._dropHandler = this.drop.bind(this)
    this._contextmenuHandler = this._contextmenu.bind(this)
    this.pageContainer.addEventListener('click', this._clickHandler)
    this.pageContainer.addEventListener('mousedown', this._mousedownHandler)
    this.pageContainer.addEventListener('mouseup', this._mouseupHandler)
    this.pageContainer.addEventListener('mouseleave', this._mouseleaveHandler)
    this.pageContainer.addEventListener('mousemove', this._mousemoveHandler)
    this.pageContainer.addEventListener('dblclick', this._dblclickHandler)
    this.pageContainer.addEventListener('dragover', this._dragoverHandler)
    this.pageContainer.addEventListener('drop', this._dropHandler)
    this.pageContainer.addEventListener('contextmenu', this._contextmenuHandler)
    this._threeClickCleanup = handleTripleClick(this.pageContainer, this.handleTripleClick.bind(this))
  }

  public removeEvent() {
    if (this._clickHandler) this.pageContainer.removeEventListener('click', this._clickHandler)
    if (this._mousedownHandler) this.pageContainer.removeEventListener('mousedown', this._mousedownHandler)
    if (this._mouseupHandler) this.pageContainer.removeEventListener('mouseup', this._mouseupHandler)
    if (this._mouseleaveHandler) this.pageContainer.removeEventListener('mouseleave', this._mouseleaveHandler)
    if (this._mousemoveHandler) this.pageContainer.removeEventListener('mousemove', this._mousemoveHandler)
    if (this._dblclickHandler) this.pageContainer.removeEventListener('dblclick', this._dblclickHandler)
    if (this._dragoverHandler) this.pageContainer.removeEventListener('dragover', this._dragoverHandler)
    if (this._dropHandler) this.pageContainer.removeEventListener('drop', this._dropHandler)
    if (this._contextmenuHandler) this.pageContainer.removeEventListener('contextmenu', this._contextmenuHandler)
    if (this._threeClickCleanup) this._threeClickCleanup()
    this._clickHandler = null
    this._mousedownHandler = null
    this._mouseupHandler = null
    this._mouseleaveHandler = null
    this._mousemoveHandler = null
    this._dblclickHandler = null
    this._dragoverHandler = null
    this._dropHandler = null
    this._contextmenuHandler = null
    this._threeClickCleanup = null
  }

  public setIsAllowSelection(payload: boolean) {
    this.isAllowSelection = payload
    if (!payload) {
      this.applyPainterStyle()
    }
  }

  public setIsAllowDrag(payload: boolean) {
    this.isAllowDrag = payload
    this.isAllowDrop = payload
  }

  public clearPainterStyle() {
    this.pageList.forEach(p => {
      p.style.cursor = 'text'
    })
    this.draw.setPainterStyle(null)
  }

  public applyPainterStyle() {
    const painterStyle = this.draw.getPainterStyle()
    if (!painterStyle) return
    const isDisabled = this.draw.isReadonly() || this.draw.isDisabled()
    if (isDisabled) return
    const selection = this.range.getSelection()
    if (!selection) return
    const painterStyleKeys = Object.keys(painterStyle)
    selection.forEach(s => {
      painterStyleKeys.forEach(pKey => {
        const key = pKey as keyof typeof ElementStyleKey
        s[key] = painterStyle[key] as any
      })
    })
    this.draw.render({ isSetCursor: false })
    // 清除格式刷
    const painterOptions = this.draw.getPainterOptions()
    if (!painterOptions || !painterOptions.isDblclick) {
      this.clearPainterStyle()
    }
  }

  public selectAll() {
    const position = this.position.getPositionList()
    this.range.setRange(0, position.length - 1)
    this.draw.render({
      isSubmitHistory: false,
      isSetCursor: false,
      isCompute: false
    })
  }

  public mousemove(evt: MouseEvent) {
    mousemove(evt, this)
  }

  public mousedown(evt: MouseEvent) {
    mousedown(evt, this)
  }

  public click() {
    // IOS系统限制非用户主动触发事件的键盘弹出
    if (isIOS && !this.draw.isReadonly()) {
      this.draw.getCursor().getAgentDom().focus()
    }
  }

  public mouseup(evt: MouseEvent) {
    mouseup(evt, this)
  }

  public mouseleave(evt: MouseEvent) {
    mouseleave(evt, this)
  }

  public keydown(evt: KeyboardEvent) {
    keydown(evt, this)
  }

  public dblclick(evt: MouseEvent) {
    click.dblclick(this, evt)
  }

  public handleTripleClick() {
    click.handleTripleClick(this)
  }

  public input(data: string) {
    input(data, this)
  }

  public cut() {
    cut(this)
  }

  public copy(options?: ICopyOption) {
    copy(this, options)
  }

  public compositionstart() {
    composition.compositionstart(this)
  }

  public compositionend(evt: CompositionEvent) {
    composition.compositionend(this, evt)
  }

  public drop(evt: DragEvent) {
    drop(evt, this)
  }

  public dragover(evt: DragEvent | MouseEvent) {
    drag.dragover(evt, this)
  }

  private _contextmenu(evt: MouseEvent) {
    contextmenu(evt, this.draw)
  }
}
