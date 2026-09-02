/**
 * VerveDocs State —— EventBus
 *
 * 轻量事件总线，支持带类型的事件订阅。
 */

export type EventHandler<T = unknown> = (payload: T) => void

export class EventBus<M extends Record<string, unknown> = Record<string, unknown>> {
  private handlers = new Map<keyof M, Set<EventHandler>>()

  on<K extends keyof M>(event: K, handler: EventHandler<M[K]>): () => void {
    let set = this.handlers.get(event)
    if (!set) {
      set = new Set()
      this.handlers.set(event, set)
    }
    set.add(handler as EventHandler)
    return () => this.off(event, handler)
  }

  off<K extends keyof M>(event: K, handler: EventHandler<M[K]>): void {
    this.handlers.get(event)?.delete(handler as EventHandler)
  }

  emit<K extends keyof M>(event: K, payload: M[K]): void {
    const set = this.handlers.get(event)
    if (!set) return
    for (const h of Array.from(set)) {
      try { (h as EventHandler<M[K]>)(payload) } catch (e) { console.error('[EventBus]', e) }
    }
  }

  clear(): void {
    this.handlers.clear()
  }
}
