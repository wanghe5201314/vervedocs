/**
 * 外部事件 API composable
 * 用于与外部系统集成的事件订阅/发布机制
 */

/**
 * 外部事件名称
 */
export type ExternalEventName =
  | 'ready'
  | 'metaChange'
  | 'statusChange'
  | 'modeChange'
  | 'abilityChange'
  | 'contentChange'
  | 'collabConnectionChange'
  | 'collabSyncStateChange'
  | 'collabSharedSyncStateChange'
  | 'collabUsersChange'
  | 'collabError'

/**
 * 外部事件处理函数
 */
export type ExternalEventHandler<T = unknown> = (payload: T) => void

/**
 * 外部事件订阅选项
 */
export type ExternalEventSubscribeOptions = {
  /** 防抖毫秒数 */
  debounceMs?: number
  /** 防抖最大等待毫秒数 */
  maxWaitMs?: number
  /** 节流毫秒数 */
  throttleMs?: number
}

/** 外部事件处理函数集合，按事件名称分组 */
const externalEventHandlers = new Map<ExternalEventName, Set<ExternalEventHandler>>()
/** 事件处理函数包装映射，用于存储防抖/节流包装后的处理函数 */
const externalEventHandlerWrappers = new Map<ExternalEventName, Map<ExternalEventHandler, ExternalEventHandler>>()

/**
 * 创建防抖函数，支持最大等待时间
 * @param fn 原始处理函数
 * @param debounceMs 防抖毫秒数
 * @param maxWaitMs 最大等待毫秒数
 * @returns 防抖后的函数
 */
const createDebounced = <T>(fn: (payload: T) => void, debounceMs: number, maxWaitMs?: number) => {
  let timer: number | null = null
  let firstTs: number | null = null
  let latest: T | undefined
  const flush = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    firstTs = null
    if (latest !== undefined) fn(latest)
  }
  return (payload: T) => {
    latest = payload
    const now = Date.now()
    if (firstTs === null) firstTs = now
    if (timer) clearTimeout(timer)
    const wait = debounceMs
    const dueByMax = maxWaitMs && firstTs !== null ? Math.max(0, maxWaitMs - (now - firstTs)) : null
    const next = dueByMax === null ? wait : Math.min(wait, dueByMax)
    timer = window.setTimeout(flush, next)
  }
}

/**
 * 创建节流函数
 * @param fn 原始处理函数
 * @param throttleMs 节流毫秒数
 * @returns 节流后的函数
 */
const createThrottled = <T>(fn: (payload: T) => void, throttleMs: number) => {
  let lastTs = 0
  let timer: number | null = null
  let latest: T | undefined
  return (payload: T) => {
    latest = payload
    const now = Date.now()
    const remain = throttleMs - (now - lastTs)
    if (remain <= 0) {
      lastTs = now
      fn(latest)
      return
    }
    if (timer) return
    timer = window.setTimeout(() => {
      timer = null
      lastTs = Date.now()
      if (latest !== undefined) fn(latest)
    }, remain)
  }
}

/**
 * 订阅外部事件
 * @param event 事件名称
 * @param handler 事件处理函数
 * @param options 订阅选项（防抖/节流）
 * @returns 取消订阅函数
 */
export const onExternalEvent = <T = unknown>(
  event: ExternalEventName,
  handler: ExternalEventHandler<T>,
  options?: ExternalEventSubscribeOptions
) => {
  const set = externalEventHandlers.get(event) ?? new Set<ExternalEventHandler>()
  let effective: ExternalEventHandler = handler as ExternalEventHandler
  if (options?.debounceMs && options.debounceMs > 0) {
    effective = createDebounced(effective, options.debounceMs, options.maxWaitMs)
  } else if (options?.throttleMs && options.throttleMs > 0) {
    effective = createThrottled(effective, options.throttleMs)
  }
  if (effective !== (handler as ExternalEventHandler)) {
    const map = externalEventHandlerWrappers.get(event) ?? new Map<ExternalEventHandler, ExternalEventHandler>()
    map.set(handler as ExternalEventHandler, effective)
    externalEventHandlerWrappers.set(event, map)
  }
  set.add(effective)
  externalEventHandlers.set(event, set)
  return () => offExternalEvent(event, handler)
}

/**
 * 取消订阅外部事件
 * @param event 事件名称
 * @param handler 事件处理函数
 */
export const offExternalEvent = <T = unknown>(event: ExternalEventName, handler: ExternalEventHandler<T>) => {
  const set = externalEventHandlers.get(event)
  if (!set) return
  const map = externalEventHandlerWrappers.get(event)
  const effective = map?.get(handler as ExternalEventHandler) ?? (handler as ExternalEventHandler)
  set.delete(effective)
  map?.delete(handler as ExternalEventHandler)
  if (map && map.size === 0) externalEventHandlerWrappers.delete(event)
  if (set.size === 0) externalEventHandlers.delete(event)
}

/**
 * 触发外部事件
 * @param event 事件名称
 * @param payload 事件载荷
 */
export const emitExternalEvent = <T = unknown>(event: ExternalEventName, payload: T) => {
  const set = externalEventHandlers.get(event)
  if (!set || set.size === 0) return
  for (const handler of set) {
    try {
      handler(payload)
    } catch (e) {
      void e
    }
  }
}

import type { DocumentMeta } from '@/types/document'
import type { IEditorSearchApi } from '@/composables/use-editor-search'

/* ============================================================
 * 外部 API State 类型（core 包已删除，本地维护）
 * ============================================================ */

/** 书签状态接口 */
export interface BookmarkState {
  /** 书签列表 */
  list: any[]
  /** 建议的书签名称 */
  suggestedName: string
  /** 选中文本预览 */
  selectionPreview: string
  /** 是否存在选区范围 */
  hasSelectionRange: boolean
}

/** 修订状态接口 */
export interface RevisionState {
  /** 修订列表 */
  list: any[]
  /** 当前激活的修订 ID */
  activeId: string | null
}

/** 批注状态接口 */
export interface CommentState {
  /** 批注列表 */
  list: any[]
  /** 其他扩展属性 */
  [key: string]: any
}

/** 目录状态接口 */
export interface TocState {
  /** 目录条目列表 */
  list: any[]
  /** 其他扩展属性 */
  [key: string]: any
}

/**
 * 外部 document API（由 EditorPage 在运行时挂载）
 */
export interface ExternalDocumentApi {
  getMeta: () => DocumentMeta
  setMeta: (patch: Partial<DocumentMeta> & { fileName?: string }) => void
  getSnapshot: () => unknown
  save: (opts?: { silent?: boolean }) => Promise<unknown> | unknown
}

/** 外部书签 API 接口 */
export interface ExternalBookmarkApi {
  /** 添加书签 */
  add: (name: string) => void
  /** 删除书签 */
  remove: (name: string) => void
  /** 定位到书签 */
  locate: (name: string) => void
  /** 获取书签状态 */
  getState: () => BookmarkState
}

/** 外部修订 API 接口 */
export interface ExternalRevisionApi {
  /** 定位到指定修订 */
  locate: (id: string) => void
  /** 定位到上一处修订 */
  locatePrevious: () => void
  /** 定位到下一处修订 */
  locateNext: () => void
  /** 接受指定修订 */
  accept: (id: string) => void
  /** 拒绝指定修订 */
  reject: (id: string) => void
  /** 接受当前修订 */
  acceptCurrent: () => void
  /** 拒绝当前修订 */
  rejectCurrent: () => void
  /** 接受所有修订 */
  acceptAll: () => void
  /** 拒绝所有修订 */
  rejectAll: () => void
  /** 获取修订状态 */
  getState: () => RevisionState
}

/** 外部批注 API 接口 */
export interface ExternalCommentApi {
  /** 创建批注 */
  create: (userName: string) => any
  /** 删除批注 */
  remove: (id: string) => any
  /** 删除当前批注组 */
  removeCurrent: (groupId: string) => void
  /** 定位到批注 */
  locate: (id: string) => any
  /** 刷新批注 */
  refresh: () => any
  /** 获取批注状态 */
  getState: () => CommentState
}

/** 外部目录 API 接口 */
export interface ExternalTocApi {
  /** 获取目录状态 */
  getState: () => TocState & {
    thumbnails: string[]
    selectedId: string
    activeTab: 'toc' | 'section'
    visible: boolean
  }
  /** 同步目录列表 */
  sync: () => Promise<any[]>
  /** 定位到目录条目 */
  locate: (id: string) => void
  /** 跳转页码 */
  pageJump: (index: number) => void
  /** 打开目录面板 */
  open: (tab?: 'toc' | 'section') => void
  /** 关闭目录面板 */
  close: () => void
  /** 切换目录面板可见状态 */
  toggle: (desired?: boolean, tab?: 'toc' | 'section') => void
  /** 切换标签页 */
  switchTab: (tab: 'toc' | 'section') => void
}

/**
 * 外部 API 对象（事件订阅/发布）
 */
export interface ExternalEditorApi {
  on: typeof onExternalEvent
  off: typeof offExternalEvent
  events: { on: typeof onExternalEvent; off: typeof offExternalEvent }
  document?: ExternalDocumentApi
  search?: IEditorSearchApi
  bookmark?: ExternalBookmarkApi
  revision?: ExternalRevisionApi
  comment?: ExternalCommentApi
  toc?: ExternalTocApi
}

/** 外部编辑器 API 对象实例，挂载到 window 上供外部调用 */
export const externalApi: ExternalEditorApi = {
  on: onExternalEvent,
  off: offExternalEvent,
  events: {
    on: onExternalEvent,
    off: offExternalEvent
  }
}

if (typeof window !== 'undefined') {
  const w = window as any
  w.docxEditorUI = externalApi
  w.docxEditorAppApi = externalApi
}

