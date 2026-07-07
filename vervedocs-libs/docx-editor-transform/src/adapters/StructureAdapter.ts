import { ZERO, WRAP } from '@vervedoc/docx-editor-schema'
import { ElementType } from '@vervedoc/docx-editor-schema'
import { defaultWatermarkOption } from '@vervedoc/docx-editor-schema'
import { EditorMode, EditorZone } from '@vervedoc/docx-editor-schema'
import { MoveDirection } from '@vervedoc/docx-editor-schema'
import { IElement } from '@vervedoc/docx-editor-schema'
import { IWatermark } from '@vervedoc/docx-editor-schema'
import { IAreaBadge, IBadge } from '@vervedoc/docx-editor-schema'
import { IInsertAreaOption, ILocationAreaOption, ISetAreaPropertiesOption } from '@vervedoc/docx-editor-schema'
import { IUpdateOption } from '@vervedoc/docx-editor-schema'
import { ISeparatorPayload, SeparatorType } from '@vervedoc/docx-editor-schema'
import { formatElementContext } from '@vervedoc/docx-editor-schema'
import { deepClone, getUUID, mergeOption } from '@vervedoc/docx-editor-schema'
import { BaseCommandAdapter, IAdapterContext, sanitizePropertyName } from './types'

const DEFAULT_SEPARATOR_DASH_ARRAY = [0, 0]
const DEFAULT_SEPARATOR_TYPE: SeparatorType = 'solid'
const DEFAULT_SEPARATOR_LINE_WIDTH = 1

function normalizeSeparatorDashArray(dashArray?: number[]) {
  if (!Array.isArray(dashArray) || dashArray.length === 0) {
    return [...DEFAULT_SEPARATOR_DASH_ARRAY]
  }
  return dashArray.map(item => {
    const value = Number(item)
    return Number.isFinite(value) ? value : 0
  })
}

function normalizeSeparatorPayload(payload: ISeparatorPayload | number[]) {
  if (Array.isArray(payload)) {
    return {
      lineType: DEFAULT_SEPARATOR_TYPE,
      lineWidth: DEFAULT_SEPARATOR_LINE_WIDTH,
      dashArray: normalizeSeparatorDashArray(payload),
      color: undefined as string | undefined
    }
  }
  const lineType = typeof payload?.lineType === 'string'
    ? payload.lineType
    : DEFAULT_SEPARATOR_TYPE
  const lineWidth = Number(payload?.lineWidth)
  return {
    lineType,
    lineWidth: Number.isFinite(lineWidth) && lineWidth > 0
      ? lineWidth
      : DEFAULT_SEPARATOR_LINE_WIDTH,
    dashArray: normalizeSeparatorDashArray(payload?.dashArray),
    color: typeof payload?.color === 'string' && payload.color.trim()
      ? payload.color.trim()
      : undefined
  }
}

function isSameDashArray(left?: number[], right?: number[]) {
  if (left === right) return true
  if (!left?.length && !right?.length) return true
  if (!left || !right || left.length !== right.length) return false
  return left.every((value, index) => value === right[index])
}

export class StructureAdapter extends BaseCommandAdapter {
  constructor(context: IAdapterContext) {
    super(context)
  }

  public insertElementList(payload: IElement[]): void {
    this.insertFormattedElementList(payload)
  }

  private getPageBreakElements(): IElement[] {
    return [
      { type: ElementType.PAGE_BREAK, value: WRAP },
      { value: ZERO }
    ]
  }

  private clearListContext(elementList: IElement[]): void {
    for (const element of elementList) {
      delete element.listId
      delete element.listType
      delete element.listStyle
      delete element.listWrap
      delete element.listLevel
      delete element.listIndent
      delete element.listHanging
    }
  }

  private getFormattedPageBreakElements(anchorIndex: number): IElement[] {
    const elementList = this.draw.getElementList()
    const pageBreakElements = deepClone(this.getPageBreakElements())
    formatElementContext(elementList, pageBreakElements, anchorIndex, {
      isBreakWhenWrap: true,
      editorOptions: this.options
    })
    this.clearListContext(pageBreakElements)
    return pageBreakElements
  }

  private replacePlaceholderWithElements(index: number, payload: IElement[]): void {
    const elementList = this.draw.getElementList()
    const cloneElementList = deepClone(payload)
    this.draw.spliceElementList(elementList, index, 1, cloneElementList)
    const curIndex = index + cloneElementList.length - 1
    this.range.setRange(curIndex, curIndex)
    this.draw.render({ curIndex })
  }

  public setGroup(): string | null {
    if (this.isReadonly()) return null
    return this.draw.getGroup().setGroup()
  }

  public deleteGroup(groupId: string): void {
    if (this.isReadonly()) return
    this.draw.getGroup().deleteGroup(groupId)
  }

  public locationGroup(groupId: string): void {
    const elementList = this.draw.getOriginalMainElementList()
    const context = this.draw.getGroup().getContextByGroupId(elementList, groupId)
    if (!context) return
    const { isTable, index, trIndex, tdIndex, tdId, trId, tableId, endIndex } = context
    this.position.setPositionContext({ isTable, index, trIndex, tdIndex, tdId, trId, tableId })
    this.range.setRange(endIndex, endIndex)
    this.draw.render({ curIndex: endIndex, isCompute: false, isSubmitHistory: false })
  }

  public insertArea(payload: IInsertAreaOption) {
    return this.draw.getArea().insertArea(payload)
  }

  public setAreaProperties(payload: ISetAreaPropertiesOption): void {
    this.draw.getArea().setAreaProperties(payload)
  }

  public locationArea(areaId: string, options?: ILocationAreaOption): void {
    const context = this.draw.getArea().getContextByAreaId(areaId, options)
    if (!context) return
    const { range: { endIndex }, elementPosition } = context
    this.position.setPositionContext({ isTable: false })
    this.range.setRange(endIndex, endIndex)
    this.draw.render({ isSetCursor: false, isCompute: false, isSubmitHistory: false })
    const cursor = this.draw.getCursor()
    this.position.setCursorPosition(elementPosition)
    cursor.drawCursor({ hitLineStartIndex: endIndex })
    cursor.moveCursorToVisible({ cursorPosition: elementPosition, direction: MoveDirection.UP })
  }

  public insertColumn(count: number, gap?: number, separator?: boolean): void {
    if (this.isDisabled()) return
    if (count < 2 || count > 4) return
    const activeControl = this.draw.getControl().getActiveControl()
    if (activeControl) return
    const { startIndex, endIndex } = this.range.getRange()
    if (startIndex < 0 || endIndex < 0) return
    const columnId = getUUID()
    const columnGap = gap ?? 20
    const elementList = this.draw.getElementList()
    const selectedElements: IElement[] = []
    for (let i = startIndex + 1; i <= endIndex; i++) {
      selectedElements.push(deepClone(elementList[i]))
    }
    if (selectedElements.length === 0) return
    const columnElements: IElement[] = [
      { value: ZERO, columnId, columnCount: count, columnGap, columnSeparator: separator || false }
    ]
    for (const el of selectedElements) {
      el.columnId = columnId
      columnElements.push(el)
    }
    for (let c = 1; c < count; c++) {
      columnElements.push({ value: WRAP, type: ElementType.COLUMN_BREAK, columnId })
      columnElements.push({ value: ZERO, columnId })
    }
    columnElements.push({ value: ZERO })
    this.draw.spliceElementList(elementList, startIndex + 1, endIndex - startIndex, columnElements)
    this.draw.render({ curIndex: startIndex })
  }

  public removeColumn(): void {
    if (this.isDisabled()) return
    const { startIndex } = this.range.getRange()
    if (startIndex < 0) return
    const elementList = this.draw.getElementList()
    const curElement = elementList[startIndex]
    if (!curElement?.columnId) return
    const columnId = curElement.columnId
    let columnStartIndex = startIndex
    while (columnStartIndex > 0 && elementList[columnStartIndex - 1]?.columnId === columnId) {
      columnStartIndex--
    }
    if (columnStartIndex > 0 && elementList[columnStartIndex - 1]?.columnId === columnId) {
      columnStartIndex--
    }
    let columnEndIndex = startIndex
    while (columnEndIndex < elementList.length - 1 && elementList[columnEndIndex + 1]?.columnId === columnId) {
      columnEndIndex++
    }
    const contentElements: IElement[] = []
    for (let i = columnStartIndex; i <= columnEndIndex; i++) {
      const el = elementList[i]
      if (el.type !== ElementType.COLUMN_BREAK && el.columnId === columnId && !(el.columnCount && el.columnCount >= 2)) {
        const cleaned = deepClone(el)
        delete cleaned.columnId
        contentElements.push(cleaned)
      }
    }
    const removeStart = Math.max(0, columnStartIndex - 1)
    const removeEnd = Math.min(elementList.length - 1, columnEndIndex + 1)
    this.draw.spliceElementList(elementList, removeStart, removeEnd - removeStart + 1, contentElements)
    this.draw.render({ curIndex: removeStart })
  }

  public columnBreak(): void {
    if (this.isDisabled()) return
    const activeControl = this.draw.getControl().getActiveControl()
    if (activeControl) return
    const { startIndex } = this.range.getRange()
    if (startIndex < 0) return
    const elementList = this.draw.getElementList()
    const curElement = elementList[startIndex]
    if (!curElement?.columnId) return
    this.insertElementList([{ type: ElementType.COLUMN_BREAK, value: WRAP, columnId: curElement.columnId }])
  }

  public addWatermark(payload: IWatermark): void {
    if (this.isReadonly()) return
    const options = this.draw.getOptions()
    const { color, size, opacity, font, gap } = defaultWatermarkOption
    options.watermark.data = payload.data
    options.watermark.color = payload.color || color
    options.watermark.size = payload.size || size
    options.watermark.opacity = payload.opacity || opacity
    options.watermark.font = payload.font || font
    options.watermark.repeat = !!payload.repeat
    options.watermark.gap = payload.gap || gap
    this.draw.render({ isSetCursor: false, isSubmitHistory: false, isCompute: false })
  }

  public deleteWatermark(): void {
    if (this.isReadonly()) return
    const options = this.draw.getOptions()
    if (options.watermark && options.watermark.data) {
      options.watermark = { ...defaultWatermarkOption }
      this.draw.render({ isSetCursor: false, isSubmitHistory: false, isCompute: false })
    }
  }

  public setMainBadge(payload: IBadge | null): void {
    this.draw.getBadge().setMainBadge(payload)
    this.draw.render({ isCompute: false, isSubmitHistory: false })
  }

  public setAreaBadge(payload: IAreaBadge[]): void {
    this.draw.getBadge().setAreaBadgeMap(payload)
    this.draw.render({ isCompute: false, isSubmitHistory: false })
  }

  public setZone(zone: EditorZone): void {
    this.draw.getZone().setZone(zone)
  }

  public separator(payload: ISeparatorPayload | number[]): void {
    if (this.isDisabled()) return
    const activeControl = this.draw.getControl().getActiveControl()
    if (activeControl) return
    const { startIndex, endIndex } = this.range.getRange()
    if (startIndex < 0 || endIndex < 0) return
    const elementList = this.draw.getElementList()
    const separatorPayload = normalizeSeparatorPayload(payload)
    let curIndex = -1
    const endElement = elementList[endIndex + 1]
    if (endElement && endElement.type === ElementType.SEPARATOR) {
      const sameStyle =
        isSameDashArray(endElement.dashArray, separatorPayload.dashArray) &&
        (endElement.separatorType || DEFAULT_SEPARATOR_TYPE) === separatorPayload.lineType &&
        (endElement.separatorLineWidth || DEFAULT_SEPARATOR_LINE_WIDTH) === separatorPayload.lineWidth &&
        (separatorPayload.color === undefined || endElement.color === separatorPayload.color)
      if (sameStyle) return
      curIndex = endIndex
      endElement.dashArray = separatorPayload.dashArray
      endElement.separatorType = separatorPayload.lineType
      endElement.separatorLineWidth = separatorPayload.lineWidth
      if (separatorPayload.color !== undefined) {
        endElement.color = separatorPayload.color
      }
    } else {
      const newElement: IElement = {
        value: WRAP,
        type: ElementType.SEPARATOR,
        dashArray: separatorPayload.dashArray,
        separatorType: separatorPayload.lineType,
        separatorLineWidth: separatorPayload.lineWidth
      }
      if (separatorPayload.color !== undefined) {
        newElement.color = separatorPayload.color
      }
      formatElementContext(elementList, [newElement], startIndex, { editorOptions: this.options })
      if (startIndex !== 0 && elementList[startIndex].value === ZERO) {
        this.draw.spliceElementList(elementList, startIndex, 1, [newElement])
        curIndex = startIndex - 1
      } else {
        this.draw.spliceElementList(elementList, startIndex + 1, 0, [newElement])
        curIndex = startIndex
      }
    }
    this.range.setRange(curIndex, curIndex)
    this.draw.render({ curIndex })
  }

  public pageBreak(): void {
    if (this.isDisabled()) return
    const activeControl = this.draw.getControl().getActiveControl()
    if (activeControl) return
    const { startIndex, endIndex } = this.range.getRange()
    const elementList = this.draw.getElementList()
    const curElement = elementList[startIndex]
    const pageBreakElements = this.getFormattedPageBreakElements(startIndex)
    if (
      startIndex === endIndex &&
      startIndex !== 0 &&
      curElement?.value === ZERO &&
      (!curElement.type || curElement.type === ElementType.TEXT)
    ) {
      this.replacePlaceholderWithElements(startIndex, pageBreakElements)
      return
    }
    this.draw.insertElementList(pageBreakElements)
  }

  public insertFootnote(content?: string): void {
    if (this.isDisabled()) return
    const { endIndex } = this.range.getRange()
    const elementList = this.draw.getElementList()
    const getFootnotes = () => {
      return elementList.filter(el => el.type === ElementType.FOOTNOTE_MARK)
    }
    const footnotes = getFootnotes()
    const footnoteNumber = footnotes.length + 1
    const footnoteMark: IElement = {
      value: String(footnoteNumber),
      type: ElementType.FOOTNOTE_MARK,
      footnoteId: getUUID(),
      footnoteNumber,
      actualSize: this.options.defaultSize! * 0.6
    }
    this.draw.spliceElementList(elementList, endIndex, 0, [footnoteMark])
    if (content) {
      const mainElementList = this.draw.getOriginalMainElementList()
      const lastElement = mainElementList[mainElementList.length - 1]
      if (lastElement?.value !== ZERO) {
        this.draw.spliceElementList(mainElementList, mainElementList.length, 0, [{ value: ZERO }])
      }
      this.draw.spliceElementList(mainElementList, mainElementList.length, 0, [{
        value: '\n', type: ElementType.FOOTNOTE_SEPARATOR
      }])
      const footnoteContent: IElement[] = [
        { value: `${footnoteNumber}. `, size: this.options.defaultSize! * 0.8, footnoteId: footnoteMark.footnoteId, footnoteNumber, type: ElementType.FOOTNOTE_CONTENT },
        ...content.split('').map(char => ({
          value: char, size: this.options.defaultSize! * 0.8, footnoteId: footnoteMark.footnoteId, footnoteNumber, type: ElementType.FOOTNOTE_CONTENT
        } as IElement)),
        { value: ZERO, footnoteId: footnoteMark.footnoteId, footnoteNumber, type: ElementType.FOOTNOTE_CONTENT }
      ]
      this.draw.spliceElementList(mainElementList, mainElementList.length, 0, footnoteContent)
    }
    this.draw.render({ curIndex: endIndex + 1, isSetCursor: true })
  }

  public deleteFootnote(footnoteId?: string): void {
    if (this.isDisabled()) return
    const elementList = this.draw.getElementList()
    if (footnoteId) {
      const indicesToDelete: number[] = []
      for (let i = 0; i < elementList.length; i++) {
        const el = elementList[i]
        if (el.footnoteId === footnoteId && (el.type === ElementType.FOOTNOTE_MARK || el.type === ElementType.FOOTNOTE_CONTENT)) {
          indicesToDelete.push(i)
        }
      }
      if (indicesToDelete.length) {
        indicesToDelete.sort((a, b) => b - a)
        for (const idx of indicesToDelete) {
          this.draw.spliceElementList(elementList, idx, 1)
        }
      }
    } else {
      const { startIndex, endIndex } = this.range.getRange()
      const selectedElements = elementList.slice(startIndex, endIndex + 1)
      const footnoteElement = selectedElements.find(el => el.type === ElementType.FOOTNOTE_MARK)
      if (footnoteElement?.footnoteId) {
        this.deleteFootnote(footnoteElement.footnoteId)
        return
      }
    }
    this.draw.render()
  }

  public getFootnotes(): Array<{ id: string; number: number; mark: IElement; content: IElement[] }> {
    const elementList = this.draw.getElementList()
    const footnotes: Array<{ id: string; number: number; mark: IElement; content: IElement[] }> = []
    const footnoteMarks = elementList.filter(el => el.type === ElementType.FOOTNOTE_MARK)
    footnoteMarks.forEach(mark => {
      if (mark.footnoteId) {
        const contentElements = elementList.filter(
          el => el.footnoteId === mark.footnoteId && el.type === ElementType.FOOTNOTE_CONTENT
        )
        footnotes.push({ id: mark.footnoteId, number: mark.footnoteNumber!, mark, content: contentElements })
      }
    })
    return footnotes.sort((a, b) => a.number - b.number)
  }

  public async print(): Promise<void> {
    if (!this.activateCanvas({ syncRange: true, requireAgentActive: true })) {
      return
    }
    const { scale, printPixelRatio, paperDirection, width, height } = this.options
    try {
      if (scale !== 1) {
        this.draw.setPageScale(1)
      }
      const base64List = await this.draw.getDataURL({
        pixelRatio: printPixelRatio,
        mode: EditorMode.PRINT
      })
      this.requirePrintImageBase64()(base64List, {
        width,
        height,
        direction: paperDirection
      })
    } finally {
      if (scale !== 1) {
        this.draw.setPageScale(scale)
      }
    }
  }

  public translate(path: string): string {
    return this.i18n.t(path)
  }

  public setLocale(payload: string): void {
    this.i18n.setLocale(payload)
  }

  public updateOptions(payload: IUpdateOption): void {
    const newOption = mergeOption(payload)
    Object.entries(newOption).forEach(([key, value]) => {
      if (sanitizePropertyName(key)) {
        Reflect.set(this.options, key, value)
      }
    })
    this.draw.render({ isSubmitHistory: false, isSetCursor: false })
  }

  public async tocInsert(payload: {
    title?: string
    maxLevel?: number
    showPageNumber?: boolean
    useDotLeader?: boolean
  } = {}): Promise<void> {
    if (this.isDisabled()) return
    const title = String(payload.title || '目录').trim() || '目录'
    const maxLevel = Math.max(1, Math.min(6, Number(payload.maxLevel || 3) || 3))
    const showPageNumber = payload.showPageNumber !== undefined ? !!payload.showPageNumber : true
    const useDotLeader = payload.useDotLeader !== undefined ? !!payload.useDotLeader : true

    const flatten = (items: any[], out: any[]) => {
      for (const it of items || []) {
        out.push(it)
        const sub = (it as any)?.subCatalog
        if (Array.isArray(sub) && sub.length) flatten(sub, out)
      }
    }

    const levelToNumber = (lv: any) => {
      if (typeof lv === 'number' && Number.isFinite(lv)) return Math.max(1, Math.min(6, Math.round(lv)))
      const s = String(lv || '').trim().toLowerCase()
      const map: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6 }
      return map[s] || 1
    }

    const mk = (kind: 'start' | 'end') => ({ value: '\u200b', extension: { tocMarker: kind } })
    const toElements = (text: string) => Array.from(text).map(ch => ({ value: ch }))

    const removeExisting = () => {
      const raw = this.draw.getValue()
      const data = raw?.data || {}
      const main = Array.isArray(data.main) ? data.main : []
      const start = main.findIndex((el: any) => el?.extension?.tocMarker === 'start')
      if (start < 0) return
      const end = main.findIndex((el: any, idx: number) => idx > start && el?.extension?.tocMarker === 'end')
      if (end < 0) return
      const nextMain = main.filter((_: any, idx: number) => idx < start || idx > end)
      this.draw.setValue({ ...data, main: nextMain })
    }

    removeExisting()

    const catalog = await (this.draw as any).getCatalog?.()
    const flat: any[] = []
    if (Array.isArray(catalog)) flatten(catalog, flat)
    const items = flat.filter(it => levelToNumber((it as any)?.level) <= maxLevel)
    const lines: string[] = [title]
    for (const it of items) {
      const name = String((it as any)?.name || '').trim()
      if (!name) continue
      const lvl = levelToNumber((it as any)?.level)
      const indent = '  '.repeat(Math.max(0, lvl - 1))
      const pageNoRaw = (it as any)?.pageNo ?? (it as any)?.page ?? (it as any)?.pageIndex
      const pageNo = Number(pageNoRaw)
      const pageText = Number.isFinite(pageNo) ? String(Math.max(1, Math.round(pageNo + 1))) : ''
      const leader = showPageNumber && useDotLeader && pageText ? ' ...... ' : showPageNumber && pageText ? '  ' : ''
      const tail = showPageNumber && pageText ? `${leader}${pageText}` : ''
      lines.push(`${indent}${name}${tail}`)
    }

    const content = lines.join('\n') + '\n'
    const elements = [mk('start'), ...toElements(content), mk('end'), { value: '\n' }]
    this.insertElementList(elements)
  }

  public tocRemove(): void {
    if (this.isDisabled()) return
    const raw = this.draw.getValue()
    const data = raw?.data || {}
    const main = Array.isArray(data.main) ? data.main : []
    const start = main.findIndex((el: any) => el?.extension?.tocMarker === 'start')
    if (start < 0) return
    const end = main.findIndex((el: any, idx: number) => idx > start && el?.extension?.tocMarker === 'end')
    if (end < 0) return
    const nextMain = main.filter((_: any, idx: number) => idx < start || idx > end)
    this.draw.setValue({ ...data, main: nextMain })
  }

  public insertShape(_type: string): void {
    if (this.isDisabled()) return
    console.warn('[StructureAdapter] insertShape requires GadgetComponent to be installed')
  }

  public async qrcode(_content: string): Promise<void> {
    if (this.isDisabled()) return
    console.warn('[StructureAdapter] qrcode requires GadgetComponent to be installed')
  }

  public barcode(_content: string): void {
    if (this.isDisabled()) return
    console.warn('[StructureAdapter] barcode requires GadgetComponent to be installed')
  }

  public async exportDocx(_payload?: any): Promise<void> {
    console.warn('[StructureAdapter] exportDocx requires ExportComponent to be installed')
  }

  public previewHtml(_payload?: any): void {
    console.warn('[StructureAdapter] previewHtml requires ExportComponent to be installed')
  }
}
