import { ref, nextTick } from 'vue'

interface BookmarkItem {
  name: string
}

export function useBookmarks(options: {
  getEditorInstance: () => { command?: { getBookmarks?: () => unknown } } | null
  executeCommand: (command: string, ...args: any[]) => void
}) {
  const { getEditorInstance, executeCommand } = options

  const bookmarkList = ref<BookmarkItem[]>([])

  function refreshBookmarks() {
    const instance = getEditorInstance()
    const bookmarks = instance?.command?.getBookmarks?.()
    if (!Array.isArray(bookmarks)) {
      bookmarkList.value = []
      return
    }
    bookmarkList.value = bookmarks.map((b: any) => ({ name: b.name })).sort((a: any, b: any) => a.name.localeCompare(b.name, 'zh-CN'))
  }

  function handleAddBookmark(name: string) {
    executeCommand('addBookmark', { name })
    nextTick(() => refreshBookmarks())
  }

  function handleDeleteBookmark(name: string) {
    executeCommand('deleteBookmark', { name })
    nextTick(() => refreshBookmarks())
  }

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