/** 搜索结果计数 */
export interface ISearchCount {
  count: number
}

/** 单个搜索命中项：index 为命中序号，before/match/after 为上下文与匹配文本 */
export interface ISearchMatch {
  index: number
  before: string
  match: string
  after: string
}

/**
 * 编辑器搜索 API
 * 基于后端导航式搜索契约：executeSearch 返回命中数，
 * 通过 locate 按索引定位，getMatches 可获取完整命中列表用于结果展示。
 */
export interface IEditorSearchApi {
  /** 搜索关键词，返回命中数；传 null 清除搜索 */
  search(keyword: string | null): ISearchCount
  /** 获取当前搜索命中列表，每项含匹配文本与上下文 */
  getMatches(): ISearchMatch[]
  /** 定位到指定命中索引 */
  locate(index: number): void
  /** 替换指定索引的命中并重新搜索，返回剩余命中数 */
  replaceOne(index: number, keyword: string, replacement: string): ISearchCount
  /** 全部替换，返回替换计数 */
  replaceAll(keyword: string, replacement: string): ISearchCount
  /** 清除搜索 */
  clear(): ISearchCount
}

/** 编辑器实例接口（搜索所需的最小能力） */
interface EditorInstance {
  /** 编辑器命令对象 */
  command: any
}

/** 空搜索结果常量，表示无命中 */
const EMPTY: ISearchCount = { count: 0 }

/**
 * 查找替换 composable
 * @param options 配置项
 * @returns 包含搜索领域 API 的对象
 */
export function useEditorSearch(options: { getEditorInstance: () => EditorInstance | null }) {
  const { getEditorInstance } = options

  /**
   * 搜索关键词，返回命中数
   * @param keyword 搜索关键词，传 null 清除搜索
   * @returns 搜索结果计数
   */
  function search(keyword: string | null): ISearchCount {
    const instance = getEditorInstance()
    if (!instance || !keyword) return EMPTY
    return instance.command.executeSearch(keyword) ?? EMPTY
  }

  /**
   * 定位到指定命中索引
   * @param index 命中索引
   */
  function locate(index: number): void {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeLocateSearchResult(index)
  }

  /**
   * 获取当前搜索命中列表
   * @returns 匹配项数组，每项含匹配文本与上下文
   */
  function getMatches(): ISearchMatch[] {
    const instance = getEditorInstance()
    if (!instance) return []
    return instance.command.executeGetSearchMatches() ?? []
  }

  /**
   * 替换指定索引的命中并重新搜索
   * @param index 命中索引
   * @param keyword 搜索关键词
   * @param replacement 替换文本
   * @returns 剩余命中数
   */
  function replaceOne(
    index: number,
    keyword: string,
    replacement: string
  ): ISearchCount {
    const instance = getEditorInstance()
    if (!instance || !keyword || !replacement) return EMPTY
    return (
      instance.command.executeReplaceOne(
        { resultIndex: index, keyword },
        replacement
      ) ?? EMPTY
    )
  }

  /**
   * 全部替换
   * @param keyword 搜索关键词
   * @param replacement 替换文本
   * @returns 替换计数
   */
  function replaceAll(keyword: string, replacement: string): ISearchCount {
    const instance = getEditorInstance()
    if (!instance || !keyword || !replacement) return EMPTY
    return instance.command.executeReplaceAll(keyword, replacement) ?? EMPTY
  }

  /**
   * 清除搜索
   * @returns 空搜索结果计数
   */
  function clear(): ISearchCount {
    return search(null)
  }

  /** 搜索领域 API 对象 */
  const searchAPI: IEditorSearchApi = {
    search,
    getMatches,
    locate,
    replaceOne,
    replaceAll,
    clear
  }

  return {
    searchAPI
  }
}
