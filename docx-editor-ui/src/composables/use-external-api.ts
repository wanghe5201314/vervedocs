/**
 * 外部事件 API composable
 * 用于与外部系统集成的事件订阅/发布机制
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
  | 'collabUsersChange'
  | 'collabError'

export type ExternalEventHandler<T = unknown> = (payload: T) => void

export type ExternalEventSubscribeOptions = {
  debounceMs?: number
  maxWaitMs?: number
  throttleMs?: number
}

const externalEventHandlers = new Map<ExternalEventName, Set<ExternalEventHandler>>()
const externalEventHandlerWrappers = new Map<ExternalEventName, Map<ExternalEventHandler, ExternalEventHandler>>()

const createDebounced = <T>(fn: (payload: T) => void, debounceMs: number, maxWaitMs?: number) => {
  let timer: number | null = null
  let firstTs: number | null = null
  let latest: T
  const flush = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    firstTs = null
    fn(latest)
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

const createThrottled = <T>(fn: (payload: T) => void, throttleMs: number) => {
  let lastTs = 0
  let timer: number | null = null
  let latest: T
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
      fn(latest)
    }, remain)
  }
}

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

export const externalApi = {
  on: onExternalEvent,
  off: offExternalEvent,
  events: {
    on: onExternalEvent,
    off: offExternalEvent
  }
}

// 注册到全局
if (typeof window !== 'undefined') {
  const w = window as any
  w.docxEditorUI = externalApi
  w.docxEditorAppApi = externalApi
}

export function useExternalApi() {
  return {
    onExternalEvent,
    offExternalEvent,
    emitExternalEvent,
    externalApi
  }
}
