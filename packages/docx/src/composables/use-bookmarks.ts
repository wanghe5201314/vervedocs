import { ref, nextTick, type Ref } from 'vue'
import type { IRange } from '@vervedoc/docx-editor-schema'

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

/** 默认书签名称，当无可用选区文本时使用 */
const DEFAULT_BOOKMARK_NAME = ''
/** 书签名称最大长度限制 */
const MAX_BOOKMARK_NAME_LENGTH = 12

/**
 * 规范化书签名称：移除零宽空格、空白字符及非单词/非中文字符，并截断到最大长度
 * @param {string} text 原始文本
 * @returns {string} 处理后的合法书签名称
 */
function sanitizeBookmarkName(text: string): string {
  return text
    .replace(/\u200B/g, '')
    .replace(/\s+/g, '')
    .replace(/[^\w\u4e00-\u9fff]/g, '')
    .slice(0, MAX_BOOKMARK_NAME_LENGTH)
}

/**
 * 书签管理 API 接口
 */
export interface IBookmarkApi {
  /** 书签列表 */
  bookmarkList: Ref<BookmarkItem[]>
  /** 建议的书签名称（基于当前选区文本） */
  suggestedBookmarkName: Ref<string>
  /** 书签选区预览文本 */
  bookmarkSelectionPreview: Ref<string>
  /** 当前是否存在有效的书签选区范围 */
  hasBookmarkSelectionRange: Ref<boolean>
  /** 刷新书签列表 */
  refresh(): void
  /** 添加书签 */
  add(name: string): void
  /** 删除书签 */
  remove(name: string): void
  /** 定位到指定书签 */
  locate(name: string): void
}

/**
 * 确保书签名称唯一：若基础名称已存在，则追加递增数字后缀
 * @param {string} baseName 基础书签名称
 * @param {Set<string>} names 已存在的书签名称集合
 * @returns {string} 唯一的书签名称
 */
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
      getBookmarks: () => unknown
      getRange?: () => IRange | null
      executeExtractSelectionText?: () => string
      executeAddBookmark: (payload: { name: string }) => void
      executeDeleteBookmark: (payload: { name: string }) => void
      executeGotoBookmark: (payload: { name: string }) => void
    }
  } | null
}) {
  const { getEditorInstance } = options

  /** 书签列表 */
  const bookmarkList = ref<BookmarkItem[]>([])
  /** 建议的书签名称 */
  const suggestedBookmarkName = ref(DEFAULT_BOOKMARK_NAME)
  /** 书签选区预览文本 */
  const bookmarkSelectionPreview = ref('')
  /** 当前是否存在有效的书签选区范围 */
  const hasBookmarkSelectionRange = ref(false)

  /**
   * 刷新书签列表，从编辑器获取并按中文名称排序
   */
  function refreshBookmarks() {
    const instance = getEditorInstance()
    const bookmarks = instance?.command?.getBookmarks()
    if (!Array.isArray(bookmarks)) {
      bookmarkList.value = []
      suggestedBookmarkName.value = DEFAULT_BOOKMARK_NAME
      bookmarkSelectionPreview.value = ''
      hasBookmarkSelectionRange.value = false
      return
    }
    const range = instance?.command?.getRange?.()
    const selectionText = String(instance?.command?.executeExtractSelectionText?.() || '')
      .replace(/\u200B/g, '')
      .trim()
    const isRangeSelection = !!range && (
      range.anchor.offset !== range.focus.offset ||
      JSON.stringify(range.anchor.path) !== JSON.stringify(range.focus.path)
    )
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
    instance?.command?.executeAddBookmark({ name })
    nextTick(() => refreshBookmarks())
  }

  /**
   * 删除书签并刷新书签列表
   * @param name 书签名称
   */
  function remove(name: string) {
    const instance = getEditorInstance()
    instance?.command?.executeDeleteBookmark({ name })
    nextTick(() => refreshBookmarks())
  }

  /**
   * 跳转到指定书签位置
   * @param name 书签名称
   */
  function locate(name: string) {
    const instance = getEditorInstance()
    instance?.command?.executeGotoBookmark({ name })
  }

  /** 书签管理 API 对象，聚合书签列表与增删改查方法 */
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
