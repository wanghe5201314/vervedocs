/**
 * VerveDocs State —— Listener
 *
 * 编辑器生命周期/交互事件的回调注册中心。
 * 基于 eventemitter3 实现，保持 on/off/emit API 不变。
 *
 * 事件名统一使用 camelCase（如 'rangeChange'、'contentChange'）。
 * core 层在状态变更时主动 emit 事件，调用方通过 listener.on() 订阅。
 * 命名空间方法不带 on 前缀、不带 Change 后缀，以 Listener 结尾。
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
  rangeListener(handler: (range: IRange | null) => void): () => void
  /** 格式变更（bold/italic 等回显状态） */
  formatListener(handler: (style: IRangeStyle) => void): () => void
  /** 光标位置变更 */
  positionListener(handler: (pos: IPosition | null) => void): () => void
}

/** 内容事件命名空间 */
export interface IContentListener {
  /** 内容变更（文本增删/格式修改等） */
  contentListener(handler: () => void): () => void
  /** 文档保存完成 */
  savedListener(handler: () => void): () => void
}

/** 能力事件命名空间 */
export interface IAbilityListener {
  /** 编辑器能力变更（readonly/disabled/canUndo/canRedo） */
  abilityListener(handler: (ability: IEditorAbility) => void): () => void
}

/** 页面事件命名空间 */
export interface IPageListener {
  /** 缩放比例变更 */
  pageScaleListener(handler: (scale: number) => void): () => void
  /** 页面尺寸变更（宽高） */
  pageSizeListener(handler: (size: { width: number; height: number }) => void): () => void
  /** 总页数变更 */
  pageCountListener(handler: (count: number) => void): () => void
  /** 当前页码变更 */
  currentPageNoListener(handler: (pageNo: number) => void): () => void
}

/** 目录事件命名空间 */
export interface ITocListener {
  /** 目录变更 */
  tocListener(handler: (toc: { id: string; level: number; name: string; number?: string }[]) => void): () => void
}

/** 区域事件命名空间 */
export interface IZoneListener {
  /** 编辑区域切换（正文/页眉/页脚） */
  zoneListener(handler: (zone: 'main' | 'header' | 'footer') => void): () => void
}

/** 生命周期事件命名空间 */
export interface ILifecycleListener {
  /** 编辑器获得焦点 */
  focusListener(handler: () => void): () => void
  /** 编辑器失去焦点 */
  blurListener(handler: () => void): () => void
  /** 渲染完成后触发（各组件订阅此事件执行渲染联动） */
  afterRenderListener(handler: () => void): () => void
}

/** 请求事件命名空间（右键菜单等触发的插入请求） */
export interface IRequestListener {
  /** 请求插入图片 */
  requestInsertImageListener(handler: () => void): () => void
  /** 请求插入超链接 */
  requestInsertHyperlinkListener(handler: () => void): () => void
  /** 请求插入公式 */
  requestInsertFormulaListener(handler: () => void): () => void

}

/** 缩略图事件命名空间 */
export interface IThumbnailListener {
  /** 缩略图变更 */
  thumbnailListener(handler: (images: string[]) => void): () => void
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

  hasListeners(event: keyof ListenerMap): boolean {
    return this.emitter.listenerCount(event) > 0
  }

  /** 触发事件（core 内部调用） */
  emit<K extends keyof ListenerMap>(event: K, ...args: Parameters<ListenerMap[K]>): void {
    this.emitter.emit(event, ...args)
  }

  /** 选区事件 */
  get range(): IRangeListener {
    return {
      rangeListener: (handler) => this.on('rangeChange', handler),
      formatListener: (handler) => this.on('formatChange', handler),
      positionListener: (handler) => this.on('positionChange', handler)
    }
  }

  /** 内容事件 */
  get content(): IContentListener {
    return {
      contentListener: (handler) => this.on('contentChange', handler),
      savedListener: (handler) => this.on('saved', handler)
    }
  }

  /** 能力事件 */
  get ability(): IAbilityListener {
    return {
      abilityListener: (handler) => this.on('abilityChange', handler)
    }
  }

  /** 页面事件 */
  get page(): IPageListener {
    return {
      pageScaleListener: (handler) => this.on('pageScaleChange', handler),
      pageSizeListener: (handler) => this.on('pageSizeChange', handler),
      pageCountListener: (handler) => this.on('pageCountChange', handler),
      currentPageNoListener: (handler) => this.on('currentPageNoChange', handler)
    }
  }

  /** 目录事件 */
  get toc(): ITocListener {
    return {
      tocListener: (handler) => this.on('tocChange', handler)
    }
  }

  /** 缩略图事件 */
  get thumbnail(): IThumbnailListener {
    return {
      thumbnailListener: (handler) => this.on('thumbnailChange', handler)
    }
  }

  /** 区域事件 */
  get zone(): IZoneListener {
    return {
      zoneListener: (handler) => this.on('zoneChange', handler)
    }
  }

  /** 生命周期事件 */
  get lifecycle(): ILifecycleListener {
    return {
      focusListener: (handler) => this.on('focus', handler),
      blurListener: (handler) => this.on('blur', handler),
      afterRenderListener: (handler) => this.on('afterRender', handler)
    }
  }

  /** 请求事件 */
  get request(): IRequestListener {
    return {
      requestInsertImageListener: (handler) => this.on('requestInsertImage', handler),
      requestInsertHyperlinkListener: (handler) => this.on('requestInsertHyperlink', handler),
      requestInsertFormulaListener: (handler) => this.on('requestInsertFormula', handler)
    }
  }
}
