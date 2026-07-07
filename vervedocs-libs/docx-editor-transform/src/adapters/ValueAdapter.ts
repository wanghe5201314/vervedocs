import { ElementType, IElement, IElementPosition } from '@vervedoc/docx-editor-schema'
import { IGetValueOption, IGetImageOption } from '@vervedoc/docx-editor-schema'
import { IEditorResult } from '@vervedoc/docx-editor-schema'
import { IGetAreaValueOption, IGetAreaValueResult } from '@vervedoc/docx-editor-schema'
import { IGetTitleValueOption, IGetTitleValueResult } from '@vervedoc/docx-editor-schema'
import { ICatalog } from '@vervedoc/docx-editor-schema'
import { DeepRequired, IEditorOption } from '@vervedoc/docx-editor-schema'
import { IRange, RangeContext, RangeRect } from '@vervedoc/docx-editor-schema'
import { EditorZone } from '@vervedoc/docx-editor-schema'
import { titleOrderNumberMapping } from '@vervedoc/docx-editor-schema'
import { isTableElement } from '@vervedoc/docx-editor-schema'
import { buildCatalogFromElementList, createDomFromElementList, getTextFromElementList, zipElementList, pickElementAttr } from '@vervedoc/docx-editor-schema'
import { deepClone } from '@vervedoc/docx-editor-schema'
import { IPositionContextByEventOption, IPositionContextByEventResult, ITableInfoByEvent } from '@vervedoc/docx-editor-schema'
import { BaseCommandAdapter, IAdapterContext } from './types'

function collectGroupIds(elementList: IElement[], groupIdSet = new Set<string>(), result: string[] = []) {
  for (const element of elementList) {
    if (Array.isArray(element?.groupIds)) {
      for (const groupId of element.groupIds) {
        if (groupId && !groupIdSet.has(groupId)) {
          groupIdSet.add(groupId)
          result.push(groupId)
        }
      }
    }
    if (element?.type === ElementType.TABLE) {
      for (const tr of element.trList || []) {
        for (const td of tr.tdList || []) {
          collectGroupIds(td.value || [], groupIdSet, result)
        }
      }
      continue
    }
    if (Array.isArray(element?.valueList)) {
      collectGroupIds(element.valueList, groupIdSet, result)
    }
  }
  return result
}

const workerFallbackWarnedSet = new Set<string>()

function warnWorkerFallback(key: string, message: string, error?: unknown) {
  if (workerFallbackWarnedSet.has(key)) return
  workerFallbackWarnedSet.add(key)
  if (error) {
    console.warn(`[ValueAdapter] ${message}`, error)
  } else {
    console.warn(`[ValueAdapter] ${message}`)
  }
}

export class ValueAdapter extends BaseCommandAdapter {
  constructor(context: IAdapterContext) {
    super(context)
  }

  private _getMainTextStats() {
    const mainElementList = this.draw.getOriginalMainElementList()
    const text = getTextFromElementList(mainElementList).replace(/\u200B/g, '')
    const charCountWithSpaces = text.length
    const charCount = text.replace(/\s/g, '').length
    const paragraphCount = text
      .split(/\r\n|\r|\n/)
      .map(item => item.trim())
      .filter(Boolean).length
    return {
      text,
      charCount,
      charCountWithSpaces,
      paragraphCount
    }
  }

  public getPaperWidth(): number {
    return this.draw.getWidth()
  }

  public getPaperHeight(): number {
    return this.draw.getHeight()
  }

  public getImage(payload?: IGetImageOption): Promise<string[]> {
    return this.draw.getDataURL(payload)
  }

  public getOptions(): DeepRequired<IEditorOption> {
    return this.options
  }

  public getValue(options?: IGetValueOption): IEditorResult {
    return this.draw.getValue(options)
  }

  public getValueAsync(options?: IGetValueOption): Promise<IEditorResult> {
    const workerManager = this.draw.getWorkerManager?.()
    const getValue = workerManager?.getValue
    if (typeof getValue !== 'function') {
      warnWorkerFallback('getValueAsync-missing', 'getValueAsync 未获取到 WorkerManager.getValue，已降级为主线程执行。')
      return Promise.resolve(this.getValue(options))
    }
    return getValue.call(workerManager, options)
      .catch((error: unknown) => {
        warnWorkerFallback('getValueAsync-error', 'getValueAsync 的 Worker 调用失败，已降级为主线程执行。', error)
        return this.getValue(options)
      })
  }

  public getAreaValue(options?: IGetAreaValueOption): IGetAreaValueResult | null {
    return this.draw.getArea().getAreaValue(options)
  }

  public getHTML(): { header: string; main: string; footer: string } {
    const options = this.options
    const headerElementList = this.draw.getHeaderElementList()
    const mainElementList = this.draw.getOriginalMainElementList()
    const footerElementList = this.draw.getFooterElementList()
    return {
      header: createDomFromElementList(headerElementList, options).innerHTML,
      main: createDomFromElementList(mainElementList, options).innerHTML,
      footer: createDomFromElementList(footerElementList, options).innerHTML
    }
  }

  public getText(): { header: string; main: string; footer: string } {
    const headerElementList = this.draw.getHeaderElementList()
    const mainElementList = this.draw.getOriginalMainElementList()
    const footerElementList = this.draw.getFooterElementList()
    return {
      header: getTextFromElementList(headerElementList),
      main: getTextFromElementList(mainElementList),
      footer: getTextFromElementList(footerElementList)
    }
  }

  public getWordCount(): Promise<number> {
    const workerManager = this.draw.getWorkerManager?.()
    const getWordCount = workerManager?.getWordCount
    if (typeof getWordCount === 'function') {
      return getWordCount.call(workerManager)
    }
    warnWorkerFallback('getWordCount-missing', 'getWordCount 未获取到 WorkerManager.getWordCount，已降级为主线程执行。')
    return Promise.resolve(this._getMainTextStats().charCount)
  }

  public getIsReadonly(): boolean {
    return this.draw.isReadonly()
  }

  public getIsDisabled(): boolean {
    return this.draw.isDisabled()
  }

  public canInput(): boolean {
    return this.range.canInput()
  }

  public getIsEditable(): boolean {
    const { startIndex, endIndex } = this.range.getRange()
    const hasFocus = startIndex !== -1 && endIndex !== -1
    return hasFocus && !this.draw.isReadonly() && !this.draw.isDisabled() && this.range.canInput()
  }

  public getCursorPosition(): IElementPosition | null {
    return this.position.getCursorPosition()
  }

  public getRange(): IRange {
    return deepClone(this.range.getRange())
  }

  public getRangeText(): string {
    return this.range.toString()
  }

  public getRangeContext(): RangeContext | null {
    const range = this.range.getRange()
    const { startIndex, endIndex } = range
    if (startIndex < 0 || endIndex < 0) return null
    const isCollapsed = startIndex === endIndex
    const selectionText = this.range.toString()
    const selectionElementList = zipElementList(this.range.getSelectionElementList() || [])
    const elementList = this.draw.getElementList()
    const startElement = pickElementAttr(elementList[isCollapsed ? startIndex : startIndex + 1], { extraPickAttrs: ['id', 'controlComponent'] })
    const endElement = pickElementAttr(elementList[endIndex], { extraPickAttrs: ['id', 'controlComponent'] })
    const rowList = this.draw.getRowList()
    const positionList = this.position.getPositionList()
    const startPosition = positionList[startIndex]
    const endPosition = positionList[endIndex]
    if (!startPosition || !endPosition) return null
    const startPageNo = startPosition.pageNo
    const endPageNo = endPosition.pageNo
    const startRowNo = startPosition.rowIndex
    const endRowNo = endPosition.rowIndex
    const startRow = rowList[startRowNo]
    const endRow = rowList[endRowNo]
    let startColNo = 0
    let endColNo = 0
    if (!this.draw.getCursor().getHitLineStartIndex()) {
      startColNo = startRow.elementList[0]?.value === '\u200B'
        ? startPosition.index! - startRow.startIndex
        : startPosition.index! - startRow.startIndex + 1
    }
    if (startPosition === endPosition) {
      endColNo = startColNo
    } else {
      endColNo = endRow.elementList[0]?.value === '\u200B'
        ? endPosition.index! - endRow.startIndex
        : endPosition.index! - endRow.startIndex + 1
    }
    const rangeRects: RangeRect[] = []
    const height = this.draw.getOriginalHeight()
    const pageGap = this.draw.getOriginalPageGap()
    const selectionPositionList = this.position.getSelectionPositionList()
    if (selectionPositionList) {
      let currentRowNo: number | null = null
      let currentX = 0
      let rangeRect: RangeRect | null = null
      for (let p = 0; p < selectionPositionList.length; p++) {
        const { rowNo, pageNo, coordinate: { leftTop, rightTop }, lineHeight } = selectionPositionList[p]
        if (currentRowNo === null || currentRowNo !== rowNo) {
          if (rangeRect) rangeRects.push(rangeRect)
          rangeRect = { x: leftTop[0], y: leftTop[1] + pageNo * (height + pageGap), width: rightTop[0] - leftTop[0], height: lineHeight }
          currentRowNo = rowNo
          currentX = leftTop[0]
        } else {
          rangeRect!.width = rightTop[0] - currentX
        }
        if (p === selectionPositionList.length - 1 && rangeRect) rangeRects.push(rangeRect)
      }
    } else {
      const pos = positionList[endIndex]
      if (pos) {
        const { coordinate: { rightTop }, pageNo, lineHeight } = pos
        rangeRects.push({ x: rightTop[0], y: rightTop[1] + pageNo * (height + pageGap), width: 0, height: lineHeight })
      }
    }
    const zone = this.draw.getZone().getZone()
    const { isTable, trIndex, tdIndex, index } = this.position.getPositionContext()
    let tableElement: IElement | null = null
    if (isTable) {
      const originalElementList = this.draw.getOriginalElementList()
      const originTableElement = originalElementList[index!] || null
      if (originTableElement) tableElement = zipElementList([originTableElement])[0]
    }
    let titleId: string | null = null
    let titleStartPageNo: number | null = null
    let start = startIndex - 1
    while (start > 0) {
      const curElement = elementList[start]
      const preElement = elementList[start - 1]
      if (curElement.titleId && curElement.titleId !== preElement?.titleId) {
        titleId = curElement.titleId
        titleStartPageNo = positionList[start]?.pageNo ?? null
        break
      }
      start--
    }
    return deepClone<RangeContext>({
      isCollapsed, startElement, endElement, startPageNo, endPageNo,
      startRowNo, endRowNo, startColNo, endColNo, rangeRects, zone,
      isTable, trIndex: trIndex ?? null, tdIndex: tdIndex ?? null,
      tableElement, selectionText, selectionElementList, titleId, titleStartPageNo
    })
  }

  public getRangeRow(): IElement[] | null {
    const rowElementList = this.range.getRangeRowElementList()
    return rowElementList ? zipElementList(rowElementList) : null
  }

  public getRangeParagraph(): IElement[] | null {
    const paragraphElementList = this.range.getRangeParagraphElementList()
    return paragraphElementList ? zipElementList(paragraphElementList) : null
  }

  public getPaperMargin(): number[] {
    return this.options.margins
  }

  public getLocale(): string {
    return this.i18n.getLocale()
  }

  public getGroupIds(): Promise<string[]> {
    const workerManager = this.draw.getWorkerManager?.()
    const getGroupIds = workerManager?.getGroupIds
    if (typeof getGroupIds !== 'function') {
      warnWorkerFallback('getGroupIds-missing', 'getGroupIds 未获取到 WorkerManager.getGroupIds，已降级为主线程执行。')
      return Promise.resolve(collectGroupIds(this.draw.getOriginalMainElementList()))
    }
    return getGroupIds.call(workerManager)
      .catch((error: unknown) => {
        warnWorkerFallback('getGroupIds-error', 'getGroupIds 的 Worker 调用失败，已降级为主线程执行。', error)
        return collectGroupIds(this.draw.getOriginalMainElementList())
      })
  }

  public getGroupContext(groupId: string) {
    const elementList = this.draw.getOriginalMainElementList()
    return this.draw.getGroup().getContextByGroupId(elementList, groupId)
  }

  public getPositionList() {
    return this.position.getPositionList()
  }

  public getEventBus() {
    return this.draw.getEventBus()
  }

  public getContainer(): HTMLDivElement {
    return this.draw.getContainer()
  }

  public getRevisionOverlay() {
    return this.draw.getRevisionOverlay()
  }

  public getTitleValue(payload: IGetTitleValueOption): IGetTitleValueResult | null {
    const { conceptId } = payload
    const result: IGetTitleValueResult = []
    const getValue = (elementList: IElement[], zone: EditorZone) => {
      let i = 0
      while (i < elementList.length) {
        const element = elementList[i]
        i++
        if (isTableElement(element)) {
          const trList = element.trList!
          for (let r = 0; r < trList.length; r++) {
            for (let d = 0; d < trList[r].tdList.length; d++) {
              getValue(trList[r].tdList[d].value, zone)
            }
          }
        }
        if (element?.title?.conceptId !== conceptId) continue
        const valueList: IElement[] = []
        let j = i
        while (j < elementList.length) {
          const nextElement = elementList[j]
          j++
          if (element.titleId === nextElement.titleId) continue
          if (nextElement.level && titleOrderNumberMapping[nextElement.level] <= titleOrderNumberMapping[element.level!]) break
          valueList.push(nextElement)
        }
        result.push({ ...element.title!, value: getTextFromElementList(valueList), elementList: zipElementList(valueList), zone })
        i = j
      }
    }
    const data = [
      { zone: EditorZone.HEADER, elementList: this.draw.getHeaderElementList() },
      { zone: EditorZone.MAIN, elementList: this.draw.getOriginalMainElementList() },
      { zone: EditorZone.FOOTER, elementList: this.draw.getFooterElementList() }
    ]
    for (const { zone, elementList } of data) getValue(elementList, zone)
    return result
  }

  public getPositionContextByEvent(evt: MouseEvent, options: IPositionContextByEventOption = {}): IPositionContextByEventResult | null {
    const pageIndex = (<HTMLElement>evt.target)?.dataset.index
    if (!pageIndex) return null
    const { isMustDirectHit = true } = options
    const pageNo = Number(pageIndex)
    const positionContext = this.position.getPositionByXY({ x: evt.offsetX, y: evt.offsetY, pageNo })
    const { isDirectHit, isTable, index, trIndex, tdIndex, tdValueIndex, zone } = positionContext
    if ((isMustDirectHit && !isDirectHit) || (zone && zone !== this.zone.getZone())) return null
    let tableInfo: ITableInfoByEvent | null = null
    let element: IElement | null = null
    const elementList = this.draw.getOriginalElementList()
    let position: IElementPosition | null = null
    const positionList = this.position.getOriginalPositionList()
    if (isTable) {
      const td = elementList[index!].trList?.[trIndex!].tdList[tdIndex!]
      element = td?.value[tdValueIndex!] || null
      position = td?.positionList?.[tdValueIndex!] || null
      tableInfo = { element: elementList[index!], trIndex: trIndex!, tdIndex: tdIndex! }
    } else {
      element = elementList[index] || null
      position = positionList[index] || null
    }
    let rangeRect: RangeRect | null = null
    if (position) {
      const { pageNo, coordinate: { leftTop, rightTop }, lineHeight } = position
      const height = this.draw.getOriginalHeight()
      const pageGap = this.draw.getOriginalPageGap()
      rangeRect = { x: leftTop[0], y: leftTop[1] + pageNo * (height + pageGap), width: rightTop[0] - leftTop[0], height: lineHeight }
    }
    return { pageNo, element, rangeRect, tableInfo }
  }

  public getCatalog(): Promise<ICatalog | null> {
    const mainElementList = this.draw.getOriginalMainElementList()
    return Promise.resolve(buildCatalogFromElementList(mainElementList))
  }

  public getRevisions(): Array<{ id: string; type: 'insert' | 'delete'; author: string; date: string; content: string; firstIndex: number }> {
    const elementList = this.draw.getElementList()
    const revisionMap = new Map<string, { id: string; type: 'insert' | 'delete'; author: string; date: string; content: string; firstIndex: number }>()
    let revAttrCount = 0
    for (let i = 0; i < elementList.length; i++) {
      const el = elementList[i]
      if (el.revisionId || el.revisionType) revAttrCount++
      if (!el.revisionId || !el.revisionType) continue
      const existing = revisionMap.get(el.revisionId)
      if (existing) {
        existing.content += el.value || ''
      } else {
        revisionMap.set(el.revisionId, {
          id: el.revisionId,
          type: el.revisionType,
          author: el.revisionAuthor || '',
          date: el.revisionDate || '',
          content: el.value || '',
          firstIndex: i
        })
      }
    }
    return Array.from(revisionMap.values())
  }

  public initRevisionOverlay(callbacks?: { onAccept?: (id: string) => void; onReject?: (id: string) => void }) {
    this.draw.initRevisionOverlay(callbacks)
  }

  public setRevisionOverlay(overlay: any) {
    this.draw.setRevisionOverlay(overlay)
  }

  public setCommentOverlay(overlay: any) {
    this.draw.setCommentOverlay(overlay)
  }

  public destroyRevisionOverlay() {
    this.draw.destroyRevisionOverlay()
  }

  public getElementList(): IElement[] {
    return this.draw.getElementList()
  }

  public spliceElementList(elementList: IElement[], start: number, deleteCount?: number, newItems?: IElement[], options?: any): void {
    this.draw.spliceElementList(elementList, start, deleteCount, newItems, options)
  }

  public getPageGap(): number {
    return this.draw.getPageGap()
  }

  public getDrawWidth(): number {
    return this.draw.getWidth()
  }

  public getDrawHeight(): number {
    return this.draw.getHeight()
  }

  public renderDraw(options?: any): void {
    this.draw.render(options)
  }
}
