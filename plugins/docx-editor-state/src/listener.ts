/**
 * VerveDocs State —— Listener
 *
 * 编辑器生命周期/交互事件的回调注册中心。
 */

import type { IPosition, IRange } from '@vervedoc/docx-editor-schema'

export interface ListenerMap {
  rangeChange: (range: IRange | null) => void
  positionChange: (pos: IPosition | null) => void
  contentChange: () => void
  saved: () => void
  focus: () => void
  blur: () => void
  scaleChange: (scale: number) => void
  pageSizeChange: (size: { width: number; height: number }) => void
}

export class Listener {
  private map: Partial<{ [K in keyof ListenerMap]: Set<ListenerMap[K]> }> = {}

  on<K extends keyof ListenerMap>(event: K, handler: ListenerMap[K]): () => void {
    let set = this.map[event] as Set<ListenerMap[K]> | undefined
    if (!set) {
      set = new Set<ListenerMap[K]>()
      ;(this.map[event] as unknown as Set<ListenerMap[K]>) = set
    }
    set.add(handler)
    return () => this.off(event, handler)
  }

  off<K extends keyof ListenerMap>(event: K, handler: ListenerMap[K]): void {
    const set = this.map[event] as Set<ListenerMap[K]> | undefined
    set?.delete(handler)
  }

  emit<K extends keyof ListenerMap>(event: K, ...args: Parameters<ListenerMap[K]>): void {
    const set = this.map[event] as Set<ListenerMap[K]> | undefined
    if (!set) return
    for (const h of Array.from(set)) {
      try { (h as (...a: unknown[]) => void)(...(args as unknown[])) } catch (e) { console.error('[Listener]', e) }
    }
  }
}
