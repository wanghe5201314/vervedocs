import { ZERO } from '@vervedoc/docx-editor-schema'
import { titleSizeMapping } from '@vervedoc/docx-editor-schema'
import { ListStyle, ListType } from '@vervedoc/docx-editor-schema'
import { RowFlex } from '@vervedoc/docx-editor-schema'
import { TitleLevel } from '@vervedoc/docx-editor-schema'
import { getOrCreateTitleId } from '@vervedoc/docx-editor-schema'
import { isTextLikeElement, isFirstElementOfParagraph } from '@vervedoc/docx-editor-schema'
import { BaseCommandAdapter, IAdapterContext } from './types'

export class ParagraphAdapter extends BaseCommandAdapter {
  constructor(context: IAdapterContext) {
    super(context)
  }

  public title(payload: TitleLevel | null): void {
    if (this.isDisabled()) return
    const { startIndex, endIndex } = this.range.getRange()
    if (startIndex < 0 || endIndex < 0) return
    const elementList = this.draw.getElementList()
    const changeElementList =
      startIndex === endIndex
        ? this.range.getRangeParagraphElementList()
        : elementList.slice(startIndex + 1, endIndex + 1)
    if (!changeElementList || !changeElementList.length) return
    const titleId = getOrCreateTitleId()

    const titleOptions = this.draw.getOptions().title
    changeElementList.forEach(el => {
      if (payload) {
        el.level = payload
        el.titleId = titleId
        if (isTextLikeElement(el) || el.value === ZERO) {
          el.size = titleOptions[titleSizeMapping[payload]]
          el.bold = true
        }
      } else {
        if (el.titleId) {
          delete el.titleId
          delete el.title
          delete el.level
          delete el.size
          delete el.bold
        }
      }
    })
    const isSetCursor = startIndex === endIndex
    const curIndex = isSetCursor ? endIndex : startIndex
    this.draw.render({ curIndex, isSetCursor })
  }

  public list(listType: ListType | null, listStyle?: ListStyle): void {
    if (this.isDisabled()) return
    this.draw.getListParticle().setList(listType, listStyle)
  }

  public rowFlex(payload: RowFlex): void {
    if (this.isDisabled()) return
    const { startIndex, endIndex } = this.range.getRange()
    if (startIndex < 0 || endIndex < 0) return
    const rowElementList = this.range.getRangeRowElementList()
    if (!rowElementList) return
    rowElementList.forEach(element => { element.rowFlex = payload })
    const isSetCursor = startIndex === endIndex
    const curIndex = isSetCursor ? endIndex : startIndex
    this.draw.render({ curIndex, isSetCursor })
  }

  public rowMargin(payload: number): void {
    if (this.isDisabled()) return
    const { startIndex, endIndex } = this.range.getRange()
    if (startIndex < 0 || endIndex < 0) return
    const rowElementList = this.range.getRangeRowElementList()
    if (!rowElementList) return
    rowElementList.forEach(element => { element.rowMargin = payload })
    const isSetCursor = startIndex === endIndex
    const curIndex = isSetCursor ? endIndex : startIndex
    this.draw.render({ curIndex, isSetCursor })
  }

  public lineHeight(payload: number): void {
    if (this.isDisabled()) return
    const { startIndex, endIndex } = this.range.getRange()
    if (startIndex < 0 || endIndex < 0) return
    const rowElementList = this.range.getRangeRowElementList()
    if (!rowElementList) return
    rowElementList.forEach(element => { element.lineHeight = payload })
    const isSetCursor = startIndex === endIndex
    const curIndex = isSetCursor ? endIndex : startIndex
    this.draw.render({ curIndex, isSetCursor })
  }

  public paragraphFirstLineIndent(payload: number): void {
    if (this.isDisabled()) return
    const { startIndex, endIndex } = this.range.getRange()
    if (startIndex < 0 || endIndex < 0) return
    const elementList = this.draw.getElementList()
    const positionList = this.position.getPositionList()
    const rangeRow = this.range.getRangeParagraph()
    if (!rangeRow) return
    const targetElementIndexes: number[] = []
    for (let p = 0; p < positionList.length; p++) {
      const pos = positionList[p]
      const rowArray = rangeRow.get(pos.pageNo)
      if (!rowArray || !rowArray.includes(pos.rowNo)) continue
      if (isFirstElementOfParagraph(p, elementList)) {
        targetElementIndexes.push(p)
      }
    }
    for (const index of targetElementIndexes) {
      const element = elementList[index]
      if (payload > 0) { element.paragraphFirstLineIndent = payload } else { delete element.paragraphFirstLineIndent }
    }
    const isSetCursor = startIndex === endIndex
    const curIndex = isSetCursor ? endIndex : startIndex
    this.draw.render({ curIndex, isSetCursor })
  }

  private static readonly INDENT_PX_PER_CHAR = 14

  public indentStep(direction: 'add' | 'sub'): void {
    if (this.isDisabled()) return
    const d = typeof direction === 'string' ? direction.trim().toLowerCase() : ''
    if (d !== 'add' && d !== 'sub') return
    const currentPx = this.getFirstLineIndentPx()
    const next = Math.max(0, currentPx + (d === 'add' ? ParagraphAdapter.INDENT_PX_PER_CHAR : -ParagraphAdapter.INDENT_PX_PER_CHAR))
    this.paragraphFirstLineIndent(next)
  }

  public getFirstLineIndentPx(): number {
    const rows = this.range.getRangeRow()
    if (!rows) return 0
    let rowArray: any[] = []
    if (Array.isArray(rows)) {
      rowArray = rows
    } else if (rows instanceof Map) {
      rowArray = Array.from(rows.values()).flat()
    }
    if (!rowArray || rowArray.length === 0) return 0
    const px = Number((rowArray[0] as any)?.paragraphFirstLineIndent || 0)
    return Number.isFinite(px) && px > 0 ? px : 0
  }

  public getFirstLineIndent(): number {
    const px = this.getFirstLineIndentPx()
    return px > 0 ? Math.round(px / ParagraphAdapter.INDENT_PX_PER_CHAR) : 0
  }
}
