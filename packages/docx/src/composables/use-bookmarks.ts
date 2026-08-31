import { ref, nextTick, type Ref } from 'vue'

/**
 * 书签项
 */
export interface BookmarkItem {
  /** 书签名称 */
  name: string
  /** 起始位置 */
  startIndex?: number
  /** 结束位置 */
  endIndex?: number | null
  /** 是否为点书签 */
  collapsed?: boolean
}

const DEFAULT_BOOKMARK_NAME = '书签'
const MAX_BOOKMARK_NAME_LENGTH = 12

function sanitizeBookmarkName(text: string): string {
  return text
    .replace(/\u200B/g, '')
    .replace(/\s+/g, '')
    .replace(/[^\w\u4e00-\u9fff]/g, '')
    .slice(0, MAX_BOOKMARK_NAME_LENGTH)
}

export interface IBookmarkApi {
  bookmarkList: Ref<BookmarkItem[]>
  suggestedBookmarkName: Ref<string>
  bookmarkSelectionPreview: Ref<string>
  hasBookmarkSelectionRange: Ref<boolean>
  refresh(): void
  add(name: string): void
  remove(name: string): void
  locate(name: string): void
}

function ensureUniqueBookmarkName(baseName: string, names: Set<string>): string {
  const normalizedBase = baseName || DEFAULT_BOOKMARK_NAME
  if (!names.has(normalizedBase)) return normalizedBase
  let suffix = 1
  while (true) {
    const nextName = `${normalizedBase}${suffix}`
    if (!names.has(nextName)) return nextName
    suffix++
  }
}

/**
 * 书签管理 composable
 * @param options 配置项
 * @returns 书签列表与增删改查方法
 */
export function useBookmarks(options: {
  /** 获取编辑器实例 */
  getEditorInstance: () => {
    command?: {
      getBookmarks?: () => unknown
      getRangeContext?: () => any
      executeAddBookmark?: (payload: { name: string }) => void
      executeDeleteBookmark?: (payload: { name: string }) => void
      executeGotoBookmark?: (payload: { name: string }) => void
    }
  } | null
}) {
  const { getEditorInstance } = options

  const bookmarkList = ref<BookmarkItem[]>([])
  const suggestedBookmarkName = ref(DEFAULT_BOOKMARK_NAME)
  const bookmarkSelectionPreview = ref('')
  const hasBookmarkSelectionRange = ref(false)

  /**
   * 刷新书签列表，从编辑器获取并按中文名称排序
   */
  function refreshBookmarks() {
    const instance = getEditorInstance()
    const bookmarks = instance?.command?.getBookmarks?.()
    if (!Array.isArray(bookmarks)) {
      bookmarkList.value = []
      suggestedBookmarkName.value = DEFAULT_BOOKMARK_NAME
      bookmarkSelectionPreview.value = ''
      hasBookmarkSelectionRange.value = false
      return
    }
    const rangeContext = instance?.command?.getRangeContext?.()
    const selectionText = String(rangeContext?.selectionText || '')
      .replace(/\u200B/g, '')
      .trim()
    const isRangeSelection = !!selectionText && !rangeContext?.isCollapsed
    const existingNames = new Set(
      bookmarks
        .map((b: any) => (typeof b?.name === 'string' ? b.name : ''))
        .filter(Boolean)
    )
    const baseName = sanitizeBookmarkName(selectionText) || DEFAULT_BOOKMARK_NAME
    suggestedBookmarkName.value = ensureUniqueBookmarkName(baseName, existingNames)
    bookmarkSelectionPreview.value = selectionText
    hasBookmarkSelectionRange.value = isRangeSelection
    bookmarkList.value = bookmarks
      .filter((b: any) => !b?.hidden)
      .map((b: any) => ({
        name: b.name,
        startIndex: b.startIndex,
        endIndex: b.endIndex,
        collapsed: b.collapsed
      }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name, 'zh-CN'))
  }

  /**
   * 添加书签并刷新书签列表
   * @param name 书签名称
   */
  function add(name: string) {
    const instance = getEditorInstance()
    instance?.command?.executeAddBookmark?.({ name })
    nextTick(() => refreshBookmarks())
  }

  /**
   * 删除书签并刷新书签列表
   * @param name 书签名称
   */
  function remove(name: string) {
    const instance = getEditorInstance()
    instance?.command?.executeDeleteBookmark?.({ name })
    nextTick(() => refreshBookmarks())
  }

  /**
   * 跳转到指定书签位置
   * @param name 书签名称
   */
  function locate(name: string) {
    const instance = getEditorInstance()
    instance?.command?.executeGotoBookmark?.({ name })
  }

  const bookmarkAPI: IBookmarkApi = {
    bookmarkList,
    suggestedBookmarkName,
    bookmarkSelectionPreview,
    hasBookmarkSelectionRange,
    refresh: refreshBookmarks,
    add,
    remove,
    locate
  }

  return {
    bookmarkAPI
  }
}
