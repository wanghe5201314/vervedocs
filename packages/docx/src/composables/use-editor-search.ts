/**
 * 编辑器实例接口
 */
interface EditorInstance {
  /** 编辑器命令对象 */
  command: any
}

/**
 * 查找替换 composable
 * @param options 配置项
 * @returns 查找、上一个/下一个、替换、全部替换方法
 */
export function useEditorSearch(options: { getEditorInstance: () => EditorInstance | null }) {
  const { getEditorInstance } = options

  /**
   * 执行查找操作
   * @param text 待查找的文本，传入 null 可清除查找结果
   */
  function search(text: string | null) {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeSearch(text)
  }

  /** 跳转到上一个查找匹配结果 */
  function searchNavigatePre() {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeSearchNavigatePre()
  }

  /** 跳转到下一个查找匹配结果 */
  function searchNavigateNext() {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeSearchNavigateNext()
  }

  /**
   * 替换当前匹配的查找结果
   * @param text 替换后的文本
   */
  function replace(text: string) {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeReplace(text)
  }

  /**
   * 替换文档中所有匹配的查找结果
   * @param searchText 待查找的文本
   * @param replaceText 替换后的文本
   */
  function replaceAll(searchText: string, replaceText: string) {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeReplaceAll?.(searchText, replaceText)
  }

  return {
    search,
    searchNavigatePre,
    searchNavigateNext,
    replace,
    replaceAll
  }
}