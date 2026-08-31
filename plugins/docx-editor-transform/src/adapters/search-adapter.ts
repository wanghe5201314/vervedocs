import { IReplaceOption, ISearchResultItem } from '@vervedoc/docx-editor-schema'
import { BaseCommandAdapter, IAdapterContext } from './types'

export class SearchAdapter extends BaseCommandAdapter {
  constructor(context: IAdapterContext) {
    super(context)
  }

  public search(payload: string | null): ISearchResultItem[] {
    this.searchManager.setSearchKeyword(payload)
    this.draw.render({ isSetCursor: false, isSubmitHistory: false })
    const resultList = this.searchManager.getSearchResultList?.() || []
    if (payload && resultList.length) {
      this.searchManager.locateSearchResult?.(0)
      return this.searchManager.getSearchResultList?.() || resultList
    }
    return resultList
  }
  public replace(payload: string, option?: IReplaceOption): void {
    this.draw.getSearch().replace(payload, option)
  }

  public replaceAll(searchKeyword: string, payload: string): ISearchResultItem[] {
    const currentKeyword = this.searchManager.getSearchKeyword?.()
    if (currentKeyword !== searchKeyword) {
      this.search(searchKeyword)
    }
    this.draw.getSearch().replace(payload)
    return this.search(searchKeyword)
  }

  public locateSearchResult(payload: number | string | ISearchResultItem) {
    return this.searchManager.locateSearchResult?.(payload) || null
  }
}
