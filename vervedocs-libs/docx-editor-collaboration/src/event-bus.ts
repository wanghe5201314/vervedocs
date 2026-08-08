import type { EditorInterface } from './types'

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