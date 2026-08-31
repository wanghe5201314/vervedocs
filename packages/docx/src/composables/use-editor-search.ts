import type { ISearchResultItem } from '@vervedoc/core'

/**
 * 编辑器实例接口
 */
interface EditorInstance {
  /** 编辑器命令对象 */
  command: any
}

export interface IEditorSearchApi {
  query(keyword: string | null): ISearchResultItem[]
  locate(result: ISearchResultItem | number): ISearchResultItem | null
  replaceOne(
    result: ISearchResultItem | null,
    replacement: string
  ): ISearchResultItem[]
  replaceAll(keyword: string, replacement: string): ISearchResultItem[]
  clear(): ISearchResultItem[]
}

/**
 * 查找替换 composable
 * @param options 配置项
 * @returns 搜索领域 API
 */
export function useEditorSearch(options: { getEditorInstance: () => EditorInstance | null }) {
  const { getEditorInstance } = options

  function query(keyword: string | null): ISearchResultItem[] {
    const instance = getEditorInstance()
    if (!instance) return []
    return instance.command.executeSearch(keyword) || []
  }

  function locate(result: ISearchResultItem | number): ISearchResultItem | null {
    const instance = getEditorInstance()
    if (!instance) return null
    return instance.command.executeLocateSearchResult?.(result) ?? null
  }

  function replaceOne(
    result: ISearchResultItem | null,
    replacement: string
  ): ISearchResultItem[] {
    const instance = getEditorInstance()
    if (!instance || !result || !replacement) return []
    instance.command.executeReplace(replacement, {
      index: result.resultIndex
    })
    return instance.command.executeSearch(result.keyword) || []
  }

  function replaceAll(keyword: string, replacement: string): ISearchResultItem[] {
    const instance = getEditorInstance()
    if (!instance) return []
    return instance.command.executeReplaceAll?.(keyword, replacement) || []
  }

  function clear(): ISearchResultItem[] {
    return query(null)
  }

  const searchAPI: IEditorSearchApi = {
    query,
    locate,
    replaceOne,
    replaceAll,
    clear
  }

  return {
    searchAPI
  }
}
