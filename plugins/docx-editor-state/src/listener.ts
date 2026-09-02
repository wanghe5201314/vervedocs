/**
 * VerveDocs State —— Listener
 *
 * 编辑器生命周期/交互事件的回调注册中心。
 * 基于 eventemitter3 实现，保持 on/off/emit API 不变。
 */

import { EventEmitter } from 'eventemitter3'
import type { IPosition, IRange } from '@vervedoc/docx-editor-schema'

export interface ListenerMap {
  rangeChange: (range: IRange | null) => void
  positionChange: (pos: IPosition | null) => void
  contentChange: () => void
  saved: () => void
  focus: () => void
  blur: () => void
  scaleChange: (scale: number) => void
  pageScaleChange: (scale: number) => void
  pageSizeChange: (size: { width: number; height: number }) => void
  zoneChange: (zone: 'main' | 'header' | 'footer') => void
}

export class Listener {
  private emitter = new EventEmitter()

  on<K extends keyof ListenerMap>(event: K, handler: ListenerMap[K]): () => void {
    const fn = handler as (...args: any[]) => void
    this.emitter.on(event, fn)
    return () => this.emitter.off(event, fn)
  }

  off<K extends keyof ListenerMap>(event: K, handler: ListenerMap[K]): void {
    this.emitter.off(event, handler as (...args: any[]) => void)
  }

  emit<K extends keyof ListenerMap>(event: K, ...args: Parameters<ListenerMap[K]>): void {
    this.emitter.emit(event, ...args)
  }
}
