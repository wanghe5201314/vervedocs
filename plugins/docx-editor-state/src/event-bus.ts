/**
 * VerveDocs State —— EventBus
 *
 * 轻量事件总线，支持带类型的事件订阅。
 * 基于 eventemitter3 实现，保持 on/off/emit/clear API 不变。
 */

import { EventEmitter } from 'eventemitter3'

export type EventHandler<T = unknown> = (payload: T) => void

export class EventBus<M extends Record<string, unknown> = Record<string, unknown>> {
  private emitter = new EventEmitter()

  on<K extends keyof M>(event: K, handler: EventHandler<M[K]>): () => void {
    const fn = handler as (...args: any[]) => void
    const e = event as string
    this.emitter.on(e, fn)
    return () => this.emitter.off(e, fn)
  }

  off<K extends keyof M>(event: K, handler: EventHandler<M[K]>): void {
    this.emitter.off(event as string, handler as (...args: any[]) => void)
  }

  emit<K extends keyof M>(event: K, payload: M[K]): void {
    this.emitter.emit(event as string, payload)
  }

  clear(): void {
    this.emitter.removeAllListeners()
  }
}
