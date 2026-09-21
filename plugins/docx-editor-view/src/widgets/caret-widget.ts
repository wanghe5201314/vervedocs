/**
 * CaretWidget —— DOM 光标 widget
 *
 * 用一个 position:absolute 的 div 绘制文本光标（1px 竖线），替代 canvas overlay 绘制。
 *  - 挂载于 canvasHost（覆盖 container 视口，pointer-events:none）
 *  - 增量更新 style.left/top/height + display，不每帧重建 DOM
 *  - 显隐由外部 visible 开关驱动（沿用原 setInterval 闪烁机制）
 *
 * 生命周期：create() → update() / hide() → destroy()
 */

import type { CaretRect } from '../caret-rect'

/** CaretWidget 的依赖注入接口 */
export interface CaretWidgetDeps {
  /** 获取 canvasHost DOM（光标 div 挂载于此） */
  getCanvasHost: () => HTMLDivElement
}

/** DOM 光标 widget，在 canvasHost 上叠加 1px 竖线 div */
export class CaretWidget {
  /** 光标 div 元素 */
  private el: HTMLDivElement | null = null

  /**
   * 创建 CaretWidget 实例
   * @param deps 依赖注入对象
   */
  constructor(private deps: CaretWidgetDeps) {}

  /* -------------------- 生命周期 -------------------- */

  /** 创建光标 div 并挂载到 canvasHost */
  create(): void {
    const el = document.createElement('div')
    el.className = 'vervedocs-caret'
    Object.assign(el.style, {
      position: 'absolute',
      left: '0px',
      top: '0px',
      width: '1px',
      height: '0px',
      background: '#111',
      display: 'none',
      pointerEvents: 'none',
      zIndex: '3'
    } as CSSStyleDeclaration)
    this.deps.getCanvasHost().appendChild(el)
    this.el = el

  }

  /** 销毁 widget：移除 DOM 并清理引用 */
  destroy(): void {
    this.el?.remove()
    this.el = null
  }

  /* -------------------- 渲染 -------------------- */

  /**
   * 更新光标位置与可见性。
   * rect 为文档坐标系（未减 scrollY），内部应用 scrollY 与 pageOffsetX 转为视口坐标。
   * @param rect 光标矩形（文档坐标）
   * @param scrollY 当前垂直滚动偏移
   * @param pageOffsetX 页面水平居中偏移
   * @param visible 是否可见（闪烁开关）
   */
  update(rect: CaretRect, scrollY: number, pageOffsetX: number, visible: boolean): void {
    const el = this.el
    if (!el) return
    if (!visible) {
      el.style.display = 'none'
      return
    }
    const x = Math.round(rect.x + pageOffsetX)
    const y = Math.round(rect.y - scrollY)
    el.style.left = `${x}px`
    el.style.top = `${y}px`
    el.style.height = `${rect.height}px`
    el.style.display = 'block'
  }

  /** 隐藏光标（无 focus 或定位失败时调用） */
  hide(): void {
    if (this.el) this.el.style.display = 'none'
  }
}