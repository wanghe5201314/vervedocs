import type { EditorInterface } from './types'

/**
 * 订阅编辑器事件总线上的指定事件
 *
 * 兼容两种事件总线实现：
 * - 优先使用 `select(event).subscribe(handler)` 风格（DocxEditor 内置）
 * - 回退使用 `on/off` 风格的传统 EventEmitter
 *
 * @param eventBus 编辑器事件总线实例
 * @param event 要订阅的事件名称
 * @param handler 事件回调函数
 * @returns 包含 unsubscribe 方法的订阅句柄，调用后取消订阅
 */
export function subscribeEventBus(
  eventBus: EditorInterface['eventBus'],
  event: string,
  handler: (...args: unknown[]) => void
): { unsubscribe: () => void } {
  if (typeof (eventBus as any).select === 'function') {
    return (eventBus as any).select(event).subscribe(handler)
  }
  if (typeof (eventBus as any).on === 'function') {
    ;(eventBus as any).on(event, handler)
    return {
      unsubscribe: () => {
        if (typeof (eventBus as any).off === 'function') {
          ;(eventBus as any).off(event, handler)
        }
      }
    }
  }
  return { unsubscribe: () => {} }
}