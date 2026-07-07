import { ElementType } from '@vervedoc/docx-editor-schema'
import { IElement } from '@vervedoc/docx-editor-schema'
import { formatElementContext } from '@vervedoc/docx-editor-schema'
import { getUUID } from '@vervedoc/docx-editor-schema'
import { BaseCommandAdapter, IAdapterContext, isSafeUrl } from './types'

export class HyperlinkAdapter extends BaseCommandAdapter {
  constructor(context: IAdapterContext) {
    super(context)
  }

  public hyperlink(payload: IElement): void {
    if (this.isDisabled()) return
    const activeControl = this.draw.getControl().getActiveControl()
    if (activeControl) return
    const { startIndex, endIndex } = this.range.getRange()
    if (startIndex < 0 || endIndex < 0) return
    const elementList = this.draw.getElementList()
    const { valueList, url } = payload
    if (url && !isSafeUrl(url)) {
      console.warn(`[HyperlinkAdapter] Unsafe URL protocol rejected: ${url}`)
      return
    }
    const hyperlinkId = getUUID()
    const newElementList = valueList?.map<IElement>(v => ({
      url,
      hyperlinkId,
      value: v.value,
      type: ElementType.HYPERLINK
    }))
    if (!newElementList) return
    const start = startIndex + 1
    formatElementContext(elementList, newElementList, startIndex, {
      editorOptions: this.options
    })
    this.draw.spliceElementList(
      elementList,
      start,
      startIndex === endIndex ? 0 : endIndex - startIndex,
      newElementList
    )
    const curIndex = start + newElementList.length - 1
    this.range.setRange(curIndex, curIndex)
    this.draw.render({ curIndex })
  }

  public getHyperlinkRange(): [number, number] | null {
    let leftIndex = -1
    let rightIndex = -1
    const { startIndex, endIndex } = this.range.getRange()
    if (startIndex < 0 || endIndex < 0) return null
    const elementList = this.draw.getElementList()
    const startElement = elementList[startIndex]
    if (startElement.type !== ElementType.HYPERLINK) return null
    let preIndex = startIndex
    while (preIndex > 0) {
      const preElement = elementList[preIndex]
      if (preElement.hyperlinkId !== startElement.hyperlinkId) {
        leftIndex = preIndex + 1
        break
      }
      preIndex--
    }
    if (leftIndex === -1 && preIndex === 0) {
      if (elementList[0].hyperlinkId === startElement.hyperlinkId) {
        leftIndex = 0
      }
    }
    let nextIndex = startIndex + 1
    while (nextIndex < elementList.length) {
      const nextElement = elementList[nextIndex]
      if (nextElement.hyperlinkId !== startElement.hyperlinkId) {
        rightIndex = nextIndex - 1
        break
      }
      nextIndex++
    }
    if (nextIndex === elementList.length) {
      rightIndex = nextIndex - 1
    }
    if (leftIndex < 0 || rightIndex < 0) return null
    return [leftIndex, rightIndex]
  }

  public deleteHyperlink(): void {
    if (this.isDisabled()) return
    const hyperRange = this.getHyperlinkRange()
    if (!hyperRange) return
    const elementList = this.draw.getElementList()
    const [leftIndex, rightIndex] = hyperRange
    this.draw.spliceElementList(
      elementList,
      leftIndex,
      rightIndex - leftIndex + 1
    )
    this.draw.getHyperlinkParticle().clearHyperlinkPopup()
    const newIndex = Math.max(0, leftIndex - 1)
    this.range.setRange(newIndex, newIndex)
    this.draw.render({ curIndex: newIndex })
  }

  public cancelHyperlink(): void {
    if (this.isDisabled()) return
    const hyperRange = this.getHyperlinkRange()
    if (!hyperRange) return
    const elementList = this.draw.getElementList()
    const [leftIndex, rightIndex] = hyperRange
    for (let i = leftIndex; i <= rightIndex; i++) {
      const element = elementList[i]
      delete element.type
      delete element.url
      delete element.hyperlinkId
      delete element.underline
    }
    this.draw.getHyperlinkParticle().clearHyperlinkPopup()
    const { endIndex } = this.range.getRange()
    this.draw.render({ curIndex: endIndex, isCompute: false })
  }

  public editHyperlink(payload: string): void {
    if (this.isDisabled()) return
    if (payload && !isSafeUrl(payload)) {
      console.warn(`[HyperlinkAdapter] Unsafe URL protocol rejected: ${payload}`)
      return
    }
    const hyperRange = this.getHyperlinkRange()
    if (!hyperRange) return
    const elementList = this.draw.getElementList()
    const [leftIndex, rightIndex] = hyperRange
    for (let i = leftIndex; i <= rightIndex; i++) {
      const element = elementList[i]
      element.url = payload
    }
    this.draw.getHyperlinkParticle().clearHyperlinkPopup()
    const { endIndex } = this.range.getRange()
    this.draw.render({ curIndex: endIndex, isCompute: false })
  }
}
