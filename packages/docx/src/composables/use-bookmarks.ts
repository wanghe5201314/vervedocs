import { ref, nextTick } from 'vue'

/**
 * 书签项
 */
interface BookmarkItem {
  /** 书签名称 */
  name: string
}

/**
 * 书签管理 composable
 * @param options 配置项
 * @returns 书签列表与增删改查方法
 */
export function useBookmarks(options: {
  /** 获取编辑器实例 */
  getEditorInstance: () => { command?: { getBookmarks?: () => unknown } } | null
  /** 执行编辑器命令 */
  executeCommand: (command: string, ...args: any[]) => void
}) {
  const { getEditorInstance, executeCommand } = options

  const bookmarkList = ref<BookmarkItem[]>([])

  /**
   * 刷新书签列表，从编辑器获取并按中文名称排序
   */
  function refreshBookmarks() {
    const instance = getEditorInstance()
    const bookmarks = instance?.command?.getBookmarks?.()
    if (!Array.isArray(bookmarks)) {
      bookmarkList.value = []
      return
    }
    bookmarkList.value = bookmarks.map((b: any) => ({ name: b.name })).sort((a: any, b: any) => a.name.localeCompare(b.name, 'zh-CN'))
  }

  /**
   * 添加书签并刷新书签列表
   * @param name 书签名称
   */
  function handleAddBookmark(name: string) {
    executeCommand('addBookmark', { name })
    nextTick(() => refreshBookmarks())
  }

  /**
   * 删除书签并刷新书签列表
   * @param name 书签名称
   */
  function handleDeleteBookmark(name: string) {
    executeCommand('deleteBookmark', { name })
    nextTick(() => refreshBookmarks())
  }

  /**
   * 跳转到指定书签位置
   * @param name 书签名称
   */
  function handleGotoBookmark(name: string) {
    executeCommand('gotoBookmark', { name })
  }

  return {
    bookmarkList,
    refreshBookmarks,
    handleAddBookmark,
    handleDeleteBookmark,
    handleGotoBookmark,
  }
}