import { IReplaceOption, ISearchResultContext } from '@vervedoc/docx-editor-schema'
import { IElementPosition } from '@vervedoc/docx-editor-schema'
import { IRange } from '@vervedoc/docx-editor-schema'
import { deepClone } from '@vervedoc/docx-editor-schema'
import { BaseCommandAdapter, IAdapterContext } from './types'

type INavigateInfo = any

export class SearchAdapter extends BaseCommandAdapter {
  constructor(context: IAdapterContext) {
    super(context)
  }

  public search(payload: string | null): void {
    this.searchManager.setSearchKeyword(payload)
    this.draw.render({ isSetCursor: false, isSubmitHistory: false })
  }

  public getSearchKeyword(): string | null {
    return this.searchManager.getSearchKeyword()
  }

  public searchNavigatePre(): void {
    const index = this.searchManager.searchNavigatePre()
    if (index === null) return
    this.draw.render({ isSetCursor: false, isSubmitHistory: false, isCompute: false, isLazy: false })
  }

  public searchNavigateNext(): void {
    const index = this.searchManager.searchNavigateNext()
    if (index === null) return
    this.draw.render({ isSetCursor: false, isSubmitHistory: false, isCompute: false, isLazy: false })
  }

  public getSearchNavigateInfo(): null | INavigateInfo {
    return this.searchManager.getSearchNavigateInfo()
  }

  public replace(payload: string, option?: IReplaceOption): void {
    this.draw.getSearch().replace(payload, option)
  }

  public getKeywordRangeList(payload: string): IRange[] {
    return this.range.getKeywordRangeList(payload)
  }

  public getKeywordContext(payload: string): ISearchResultContext[] | null {
    const rangeList = this.getKeywordRangeList(payload)
    if (!rangeList.length) return null
    const searchResultContextList: ISearchResultContext[] = []
    const positionList = this.position.getOriginalMainPositionList()
    const elementList = this.draw.getOriginalMainElementList()
    for (let r = 0; r < rangeList.length; r++) {
      const range = rangeList[r]
      const { startIndex, endIndex, tableId, startTrIndex, startTdIndex } = range
      let keywordPositionList: IElementPosition[] = positionList
      if (range.tableId) {
        const tableElement = elementList.find(el => el.id === tableId)
        if (tableElement) {
          keywordPositionList =
            tableElement.trList?.[startTrIndex!]?.tdList?.[startTdIndex!]
              ?.positionList || []
        }
      }
      const startPosition = deepClone(keywordPositionList[startIndex])
      const endPosition = deepClone(keywordPositionList[endIndex])
      searchResultContextList.push({ range, startPosition, endPosition })
    }
    return searchResultContextList
  }
}
