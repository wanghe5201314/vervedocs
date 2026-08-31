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

const externalEventHandlers = new Map<ExternalEventName, Set<ExternalEventHandler>>()
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
import type {
  ICommandSearchApi,
  ICommandBookmarkApi,
  ICommandBookmarkState,
  ICommandCatalogState,
  IDocxCommentApi,
  IDocxCommentState,
  ICommandRevisionApi,
  ICommandRevisionState
} from '@vervedoc/core'

/**
 * 外部 document API（由 EditorPage 在运行时挂载）
 */
export interface ExternalDocumentApi {
  getMeta: () => DocumentMeta
  setMeta: (patch: Partial<DocumentMeta> & { fileName?: string }) => void
  getSnapshot: () => unknown
  save: (opts?: { silent?: boolean }) => Promise<unknown> | unknown
}

export interface ExternalBookmarkApi
  extends Pick<ICommandBookmarkApi, 'add' | 'remove' | 'locate'> {
  getState: () => ICommandBookmarkState
}

export interface ExternalRevisionApi
  extends Omit<ICommandRevisionApi, 'getState'> {
  getState: () => ICommandRevisionState
}

export interface ExternalCommentApi
  extends Pick<IDocxCommentApi, 'create' | 'remove' | 'removeCurrent' | 'locate' | 'refresh'> {
  getState: () => IDocxCommentState
}

export interface ExternalCatalogApi {
  getState: () => ICommandCatalogState & {
    thumbnails: string[]
    selectedId: string
    activeTab: 'catalog' | 'section'
    visible: boolean
  }
  sync: () => Promise<ICommandCatalogState['list']>
  locate: (id: string) => void
  pageJump: (index: number) => void
  open: (tab?: 'catalog' | 'section') => void
  close: () => void
  toggle: (desired?: boolean, tab?: 'catalog' | 'section') => void
  switchTab: (tab: 'catalog' | 'section') => void
}

/**
 * 外部 API 对象（事件订阅/发布）
 */
export interface ExternalEditorApi {
  on: typeof onExternalEvent
  off: typeof offExternalEvent
  events: { on: typeof onExternalEvent; off: typeof offExternalEvent }
  document?: ExternalDocumentApi
  search?: ICommandSearchApi
  bookmark?: ExternalBookmarkApi
  revision?: ExternalRevisionApi
  comment?: ExternalCommentApi
  catalog?: ExternalCatalogApi
}

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

/**
 * 外部事件 composable 入口
 * @returns 事件订阅/发布相关方法
 */
export function useExternalEvents() {
  return {
    onExternalEvent,
    offExternalEvent,
    emitExternalEvent,
    externalApi
  }
}
