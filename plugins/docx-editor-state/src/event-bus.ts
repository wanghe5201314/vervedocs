/**
 * VerveDocs State —— EventBus
 *
 * 轻量事件总线，支持带类型的事件订阅。
 * 基于 eventemitter3 实现，保持 on/off/emit/clear API 不变。
 */

import { EventEmitter } from 'eventemitter3'
import type { EventHandler } from '@vervedoc/docx-editor-schema'

// 重新导出迁移至 schema 的跨包共享类型，保持 state 包 API 兼容
export type { EventHandler } from '@vervedoc/docx-editor-schema'

/**
 * 轻量事件总线
 *
 * 支持带类型的事件订阅与派发，泛型 M 描述事件名到 payload 类型的映射。
 * 基于 eventemitter3 实现，保持 on/off/emit/clear API 不变。
 */
export class EventBus<M extends Record<string, unknown> = Record<string, unknown>> {
  /** 底层事件分发器实例 */
  private emitter = new EventEmitter()

  /**
   * 订阅指定事件
   * @param event 事件名
   * @param handler 事件处理器
   * @returns 取消订阅函数，调用后移除该处理器
   */
  on<K extends keyof M>(event: K, handler: EventHandler<M[K]>): () => void {
    const fn = handler as (...args: any[]) => void
    const e = event as string
    this.emitter.on(e, fn)
    return () => this.emitter.off(e, fn)
  }

  /**
   * 取消订阅指定事件
   * @param event 事件名
   * @param handler 需要移除的事件处理器
   */
  off<K extends keyof M>(event: K, handler: EventHandler<M[K]>): void {
    this.emitter.off(event as string, handler as (...args: any[]) => void)
  }

  /**
   * 派发指定事件
   * @param event 事件名
   * @param payload 事件载荷
   */
  emit<K extends keyof M>(event: K, payload: M[K]): void {
    this.emitter.emit(event as string, payload)
  }

  /**
   * 移除所有事件的所有监听器
   */
  clear(): void {
    this.emitter.removeAllListeners()
  }
}
