/**
 * VerveDocs State —— Listener
 *
 * 编辑器生命周期/交互事件的回调注册中心。
 * 基于 eventemitter3 实现，保持 on/off/emit API 不变。
 *
 * 事件名统一使用 kebab-case（如 'range-change'、'content-change'）。
 * core 层在状态变更时主动 emit 事件，调用方通过 listener.on() 订阅。
 */

import { EventEmitter } from 'eventemitter3'
import type {
  IPosition,
  IRange,
  IRangeStyle,
  IEditorAbility,
  ListenerMap
} from '@vervedoc/docx-editor-schema'

// 重新导出迁移至 schema 的跨包共享类型，保持 state 包 API 兼容
export type { IRangeStyle, IEditorAbility, ListenerMap } from '@vervedoc/docx-editor-schema'

/** 选区事件命名空间 */
export interface IRangeListener {
  /** 选区变更（光标移动/选区改变） */
  onChange(handler: (range: IRange | null) => void): () => void
  /** 选区样式变更（bold/italic 等回显状态） */
  onStyleChange(handler: (style: IRangeStyle) => void): () => void
  /** 光标位置变更 */
  onPositionChange(handler: (pos: IPosition | null) => void): () => void
}

/** 内容事件命名空间 */
export interface IContentListener {
  /** 内容变更（文本增删/格式修改等） */
  onChange(handler: () => void): () => void
  /** 文档保存完成 */
  onSaved(handler: () => void): () => void
}

/** 能力事件命名空间 */
export interface IAbilityListener {
  /** 编辑器能力变更（readonly/disabled/canUndo/canRedo） */
  onChange(handler: (ability: IEditorAbility) => void): () => void
}

/** 页面事件命名空间 */
export interface IPageListener {
  /** 缩放比例变更 */
  onScaleChange(handler: (scale: number) => void): () => void
  /** 页面尺寸变更（宽高） */
  onSizeChange(handler: (size: { width: number; height: number }) => void): () => void
  /** 总页数变更 */
  onCountChange(handler: (count: number) => void): () => void
  /** 当前页码变更 */
  onCurrentNoChange(handler: (pageNo: number) => void): () => void
}

/** 目录事件命名空间 */
export interface ITocListener {
  /** 目录变更 */
  onChange(handler: (toc: { id: string; level: number; name: string; number?: string }[]) => void): () => void
}

/** 区域事件命名空间 */
export interface IZoneListener {
  /** 编辑区域切换（正文/页眉/页脚） */
  onChange(handler: (zone: 'main' | 'header' | 'footer') => void): () => void
}

/** 生命周期事件命名空间 */
export interface ILifecycleListener {
  /** 编辑器获得焦点 */
  onFocus(handler: () => void): () => void
  /** 编辑器失去焦点 */
  onBlur(handler: () => void): () => void
}

/** 请求事件命名空间（右键菜单等触发的插入请求） */
export interface IRequestListener {
  /** 请求插入图片 */
  onInsertImage(handler: () => void): () => void
  /** 请求插入超链接 */
  onInsertHyperlink(handler: () => void): () => void
  /** 请求插入公式 */
  onInsertFormula(handler: () => void): () => void
}

/** 缩略图事件命名空间 */
export interface IThumbnailListener {
  /** 缩略图变更 */
  onChange(handler: (images: string[]) => void): () => void
}

/**
 * 编辑器事件监听器
 *
 * 统一管理编辑器各类事件的订阅、取消订阅与触发。
 * 通过命名空间 getter（range/content/ability/page 等）提供分类订阅入口。
 */
export class Listener {
  /** 底层事件分发器实例 */
  private emitter = new EventEmitter()

  /** 订阅事件，返回取消订阅函数 */
  on<K extends keyof ListenerMap>(event: K, handler: ListenerMap[K]): () => void {
    const fn = handler as (...args: any[]) => void
    this.emitter.on(event, fn)
    return () => this.emitter.off(event, fn)
  }

  /** 取消订阅事件 */
  off<K extends keyof ListenerMap>(event: K, handler: ListenerMap[K]): void {
    this.emitter.off(event, handler as (...args: any[]) => void)
  }

  /** 触发事件（core 内部调用） */
  emit<K extends keyof ListenerMap>(event: K, ...args: Parameters<ListenerMap[K]>): void {
    this.emitter.emit(event, ...args)
  }

  /** 选区事件 */
  get range(): IRangeListener {
    return {
      onChange: (handler) => this.on('range-change', handler),
      onStyleChange: (handler) => this.on('range-style-change', handler),
      onPositionChange: (handler) => this.on('position-change', handler)
    }
  }

  /** 内容事件 */
  get content(): IContentListener {
    return {
      onChange: (handler) => this.on('content-change', handler),
      onSaved: (handler) => this.on('saved', handler)
    }
  }

  /** 能力事件 */
  get ability(): IAbilityListener {
    return {
      onChange: (handler) => this.on('ability-change', handler)
    }
  }

  /** 页面事件 */
  get page(): IPageListener {
    return {
      onScaleChange: (handler) => this.on('page-scale-change', handler),
      onSizeChange: (handler) => this.on('page-size-change', handler),
      onCountChange: (handler) => this.on('page-count-change', handler),
      onCurrentNoChange: (handler) => this.on('current-page-no-change', handler)
    }
  }

  /** 目录事件 */
  get toc(): ITocListener {
    return {
      onChange: (handler) => this.on('toc-change', handler)
    }
  }

  /** 缩略图事件 */
  get thumbnail(): IThumbnailListener {
    return {
      onChange: (handler) => this.on('thumbnail-change', handler)
    }
  }

  /** 区域事件 */
  get zone(): IZoneListener {
    return {
      onChange: (handler) => this.on('zone-change', handler)
    }
  }

  /** 生命周期事件 */
  get lifecycle(): ILifecycleListener {
    return {
      onFocus: (handler) => this.on('focus', handler),
      onBlur: (handler) => this.on('blur', handler)
    }
  }

  /** 请求事件 */
  get request(): IRequestListener {
    return {
      onInsertImage: (handler) => this.on('request-insert-image', handler),
      onInsertHyperlink: (handler) => this.on('request-insert-hyperlink', handler),
      onInsertFormula: (handler) => this.on('request-insert-formula', handler)
    }
  }
}
