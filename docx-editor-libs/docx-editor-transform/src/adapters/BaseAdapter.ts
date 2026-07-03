import { ZERO } from '@wanghe1995/docx-editor-schema'
import { EDITOR_ELEMENT_STYLE_ATTR } from '@wanghe1995/docx-editor-schema'
import { EditorMode } from '@wanghe1995/docx-editor-schema'
import { ElementStyleKey } from '@wanghe1995/docx-editor-schema'
import { IDrawOption, IForceUpdateOption, IPainterOption } from '@wanghe1995/docx-editor-schema'
import { IElement, IElementStyle } from '@wanghe1995/docx-editor-schema'
import { ICopyOption, IPasteOption } from '@wanghe1995/docx-editor-schema'
import { IRange } from '@wanghe1995/docx-editor-schema'
import { IRichtextOption } from '@wanghe1995/docx-editor-schema'
import { isNumber } from '@wanghe1995/docx-editor-schema'
import { BaseCommandAdapter, IAdapterContext } from './types'

export class BaseAdapter extends BaseCommandAdapter {
  constructor(context: IAdapterContext) {
    super(context)
  }

  public mode(payload: EditorMode): void {
    this.draw.setMode(payload)
  }

  public cut(): void {
    if (this.isDisabled()) return
    this.canvasEvent.cut()
  }

  public copy(payload?: ICopyOption): void {
    this.canvasEvent.copy(payload)
  }

  public paste(payload?: IPasteOption): void {
    if (this.isDisabled()) return
    this.requirePasteByApi()(this.canvasEvent, payload)
  }

  public selectAll(): void {
    this.canvasEvent.selectAll()
  }

  public backspace(): void {
    if (this.isDisabled()) return
    const elementList = this.draw.getElementList()
    const { startIndex, endIndex } = this.range.getRange()
    const isCollapsed = startIndex === endIndex
    if (isCollapsed && startIndex <= 0) return
    if (
      isCollapsed &&
      elementList[startIndex].value === ZERO &&
      startIndex === 0
    ) {
      return
    }
    if (!isCollapsed) {
      this.draw.spliceElementList(
        elementList,
        startIndex + 1,
        endIndex - startIndex
      )
    } else {
      this.draw.spliceElementList(elementList, startIndex, 1)
    }
    const curIndex = isCollapsed ? startIndex - 1 : startIndex
    this.range.setRange(Math.max(0, curIndex), Math.max(0, curIndex))
    this.draw.render({ curIndex: Math.max(0, curIndex) })
  }

  public setRange(
    startIndex: number,
    endIndex: number,
    tableId?: string,
    startTdIndex?: number,
    endTdIndex?: number,
    startTrIndex?: number,
    endTrIndex?: number
  ): void {
    if (startIndex < 0 || endIndex < 0 || endIndex < startIndex) return
    this.range.setRange(
      startIndex, endIndex, tableId, startTdIndex, endTdIndex, startTrIndex, endTrIndex
    )
    const isCollapsed = startIndex === endIndex
    this.draw.render({
      curIndex: isCollapsed ? startIndex : undefined,
      isCompute: false,
      isSubmitHistory: false,
      isSetCursor: isCollapsed
    })
  }

  public replaceRange(range: IRange): void {
    this.setRange(
      range.startIndex, range.endIndex, range.tableId,
      range.startTdIndex, range.endTdIndex, range.startTrIndex, range.endTrIndex
    )
  }

  public setPositionContext(range: IRange): void {
    const { tableId, startTrIndex, startTdIndex } = range
    if (tableId) {
      const originalElementList = this.draw.getOriginalElementList()
      const tableElementIndex = originalElementList.findIndex(
        el => el.id === tableId
      )
      if (tableElementIndex >= 0) {
        const tableElement = originalElementList[tableElementIndex]
        const trList = tableElement.trList!
        this.position.setPositionContext({
          isTable: true,
          index: tableElementIndex,
          trIndex: startTrIndex,
          tdIndex: startTdIndex,
          tdId: trList[startTrIndex!]?.tdList[startTdIndex!]?.id,
          trId: trList[startTrIndex!]?.id,
          tableId
        })
      }
    } else {
      this.position.setPositionContext({ isTable: false })
    }
  }

  public forceUpdate(options?: IForceUpdateOption): void {
    const { isSubmitHistory = false } = options || {}
    this.range.clearRange()
    this.draw.render({ isSetCursor: false, isSubmitHistory })
  }

  public blur(): void {
    this.range.clearRange()
    this.draw.getCursor().recoveryCursor()
  }

  public undo(): void {
    if (this.isReadonly() && this.draw.getMode() !== EditorMode.FORM) return
    this.activateCanvas()
    this.historyManager.undo()
  }

  public redo(): void {
    if (this.isReadonly() && this.draw.getMode() !== EditorMode.FORM) return
    this.activateCanvas()
    this.historyManager.redo()
  }

  public save(): void {
    if (this.isReadonly()) return
    this.activateCanvas({ syncRange: true })
    const value = this.draw.getValue()
    const listener = this.draw.getListener()
    if (listener.saved) {
      listener.saved(value)
    }
    const eventBus = this.draw.getEventBus()
    if (eventBus.hasSubscribers('saved')) {
      eventBus.emit('saved', value)
    }
  }

  public painter(options: IPainterOption): void {
    if (!options.isDblclick && this.draw.getPainterStyle()) {
      this.canvasEvent.clearPainterStyle()
      return
    }
    const selection = this.range.getSelection()
    if (!selection) return
    const painterStyle: IElementStyle = {}
    selection.forEach(s => {
      const painterStyleKeys = EDITOR_ELEMENT_STYLE_ATTR
      painterStyleKeys.forEach(p => {
        const key = p as keyof typeof ElementStyleKey
        if (painterStyle[key] === undefined) {
          painterStyle[key] = s[key] as any
        }
      })
    })
    this.draw.setPainterStyle(painterStyle, options)
  }

  public applyPainterStyle(): void {
    if (this.isDisabled()) return
    this.canvasEvent.applyPainterStyle()
  }

  public format(options?: IRichtextOption): void {
    const { isIgnoreDisabledRule = false } = options || {}
    const isDisabled = !isIgnoreDisabledRule && this.isDisabled()
    if (isDisabled) return
    const selection = this.range.getSelectionElementList()
    let renderOption: IDrawOption = {}
    let changeElementList: IElement[] = []
    if (selection?.length) {
      changeElementList = selection
      renderOption = { isSetCursor: false }
    } else {
      const { endIndex } = this.range.getRange()
      const elementList = this.draw.getElementList()
      const enterElement = elementList[endIndex]
      if (enterElement?.value === ZERO) {
        changeElementList.push(enterElement)
        renderOption = { curIndex: endIndex }
      }
    }
    if (!changeElementList.length) return
    changeElementList.forEach(el => {
      EDITOR_ELEMENT_STYLE_ATTR.forEach(attr => {
        delete el[attr]
      })
    })
    this.draw.render(renderOption)
  }

  public focus(payload?: any): void {
    const {
      position = 'after' as any,
      isMoveCursorToVisible = true,
      rowNo,
      range
    } = payload || {}
    let curIndex = -1
    if (range) {
      this.range.replaceRange(range)
      curIndex = position === 'before' ? range.startIndex : range.endIndex
    } else if (isNumber(rowNo)) {
      const rowList = this.draw.getOriginalRowList()
      curIndex = position === 'before'
        ? rowList[rowNo]?.startIndex
        : rowList[rowNo + 1]?.startIndex - 1
      if (!isNumber(curIndex)) return
      this.range.setRange(curIndex, curIndex)
    } else {
      curIndex = position === 'before'
        ? 0
        : this.draw.getOriginalMainElementList().length - 1
      this.range.setRange(curIndex, curIndex)
    }
    const renderParams: IDrawOption = {
      isCompute: false,
      isSetCursor: false,
      isSubmitHistory: false
    }
    if (curIndex >= 0 && this.range.getIsCollapsed()) {
      renderParams.curIndex = curIndex
      renderParams.isSetCursor = true
    }
    this.draw.render(renderParams)
    if (isMoveCursorToVisible) {
      const positionList = this.draw.getPosition().getPositionList()
      this.draw.getCursor().moveCursorToVisible({
        cursorPosition: positionList[curIndex],
        direction: 'down' as any
      })
    }
  }

  public locationCatalog(titleId: string): void {
    const elementList = this.draw.getOriginalMainElementList()

    let newIndex = -1
    for (let e = 0; e < elementList.length; e++) {
      const element = elementList[e]
      if (element.titleId === titleId && elementList[e + 1]?.titleId !== titleId) {
        newIndex = e
        break
      }
    }
    if (newIndex < 0) return

    this.position.setPositionContext({ isTable: false })
    this.range.setRange(newIndex, newIndex)
    this.draw.render({ curIndex: newIndex, isCompute: false, isSubmitHistory: false })
    const positionList = this.draw.getPosition().getPositionList()
    const cursorPosition = positionList[newIndex]
    if (cursorPosition) {
      this.draw.getCursor().moveCursorToVisible({
        cursorPosition,
        direction: 'down' as any
      })
    }
  }

  public wordTool(): void {
    const elementList = this.draw.getMainElementList()
    let isApply = false
    for (let i = 0; i < elementList.length; i++) {
      const element = elementList[i]
      if (element.value === ZERO) {
        while (i + 1 < elementList.length) {
          const nextElement = elementList[i + 1]
          if (nextElement.value !== ZERO && nextElement.value !== '\u00A0') break
          elementList.splice(i + 1, 1)
          isApply = true
        }
      }
    }
    if (!isApply) {
      const isCollapsed = this.range.getIsCollapsed()
      this.draw.getCursor().drawCursor({ isShow: isCollapsed })
    } else {
      this.draw.render({ isSetCursor: false })
    }
  }
}
