/**
 * RulerWidget —— WPS 风格标尺
 *
 * 在编辑区顶部和左侧显示标尺，含刻度、边距区域标记。
 * 标尺固定在 container 上（不随内容滚动），刻度根据滚动位置实时更新。
 */

import type { DocumentLayout } from '../layout-types'

/** 每厘米对应的像素数（基于 96 DPI） */
const PX_PER_CM = 96 / 2.5
/** 标尺的厚度（像素） */
const RULER_SIZE = 20

/** RulerWidget 的依赖注入接口 */
export interface RulerWidgetDeps {
  /** 标尺挂载的容器元素 */
  container: HTMLDivElement
  /** 获取当前文档布局 */
  getLayout: () => DocumentLayout | null
  /** 获取当前垂直滚动偏移 */
  getScrollY: () => number
  /** 获取编辑区可视宽度 */
  getWrapperWidth: () => number
  /** 获取编辑区可视高度 */
  getWrapperHeight: () => number
  /** 获取页面在容器中的水平偏移 */
  getPageOffsetX: () => number
  /** 获取当前缩放比例 */
  getScale: () => number
  /** 获取页面边距 [上, 右, 下, 左] */
  getPageMargins: () => [number, number, number, number]
  /** 获取页面之间的间距 */
  getPageGap: () => number
  /** 触发命令回调 */
  onCommand: (cmd: string, ...args: any[]) => void
}

/** 边距标记的边方向 */
type MarginSide = 'left' | 'right' | 'top' | 'bottom'

/** WPS 风格标尺 widget，在编辑区顶部和左侧显示刻度及边距标记 */
export class RulerWidget {
  /** 水平标尺容器 div */
  private hRuler: HTMLDivElement | null = null
  /** 垂直标尺容器 div */
  private vRuler: HTMLDivElement | null = null
  /** 水平标尺的 canvas 元素 */
  private hCanvas: HTMLCanvasElement | null = null
  /** 垂直标尺的 canvas 元素 */
  private vCanvas: HTMLCanvasElement | null = null
  /** 左上角占位方块 */
  private corner: HTMLDivElement | null = null
  /** 四个方向的边距拖拽标记 */
  private markers: Record<MarginSide, HTMLDivElement | null> = { left: null, right: null, top: null, bottom: null }
  /** 当前正在拖拽的边方向，null 表示未拖拽 */
  private dragSide: MarginSide | null = null
  /** 标尺是否可见 */
  private visible = false

  /**
   * 创建 RulerWidget 实例
   * @param deps 依赖注入对象
   */
  constructor(private deps: RulerWidgetDeps) {}

  /**
   * 创建标尺 DOM 并挂载到容器
   */
  create(): void {
    const container = this.deps.container

    this.hRuler = document.createElement('div')
    Object.assign(this.hRuler.style, {
      position: 'absolute', top: '0', left: '0', right: '0',
      height: `${RULER_SIZE}px`, zIndex: '5',
      background: '#fafafa', borderBottom: '1px solid #dcdfe6',
      pointerEvents: 'none', overflow: 'hidden'
    } as CSSStyleDeclaration)
    this.hCanvas = document.createElement('canvas')
    this.hCanvas.style.cssText = 'width:100%;height:100%;display:block;'
    this.hRuler.appendChild(this.hCanvas)
    container.appendChild(this.hRuler)

    this.vRuler = document.createElement('div')
    Object.assign(this.vRuler.style, {
      position: 'absolute', top: '0', left: '0', bottom: '0',
      width: `${RULER_SIZE}px`, zIndex: '5',
      background: '#fafafa', borderRight: '1px solid #dcdfe6',
      pointerEvents: 'none', overflow: 'hidden'
    } as CSSStyleDeclaration)
    this.vCanvas = document.createElement('canvas')
    this.vCanvas.style.cssText = 'width:100%;height:100%;display:block;'
    this.vRuler.appendChild(this.vCanvas)
    container.appendChild(this.vRuler)

    this.corner = document.createElement('div')
    Object.assign(this.corner.style, {
      position: 'absolute', top: '0', left: '0',
      width: `${RULER_SIZE}px`, height: `${RULER_SIZE}px`, zIndex: '6',
      background: '#f0f0f0', borderBottom: '1px solid #dcdfe6',
      borderRight: '1px solid #dcdfe6', pointerEvents: 'none'
    } as CSSStyleDeclaration)
    container.appendChild(this.corner)

    this.markers.left = this.createMarker('left', 'ew-resize')
    this.markers.right = this.createMarker('right', 'ew-resize')
    this.markers.top = this.createMarker('top', 'ns-resize')
    this.markers.bottom = this.createMarker('bottom', 'ns-resize')
    container.appendChild(this.markers.left)
    container.appendChild(this.markers.right)
    container.appendChild(this.markers.top)
    container.appendChild(this.markers.bottom)

    this.applyVisible()
  }

  /**
   * 创建单个边距拖拽标记元素
   * @param side 边方向
   * @param cursor 鼠标光标样式
   * @returns 创建好的 div 元素
   */
  private createMarker(side: MarginSide, cursor: string): HTMLDivElement {
    const el = document.createElement('div')
    const isH = side === 'left' || side === 'right'
    Object.assign(el.style, {
      position: 'absolute',
      zIndex: '7',
      pointerEvents: 'auto',
      cursor: cursor,
      background: '#409eff'
    } as CSSStyleDeclaration)
    if (isH) {
      el.style.width = '4px'
      el.style.height = `${RULER_SIZE}px`
      el.style.top = '0'
    } else {
      el.style.width = `${RULER_SIZE}px`
      el.style.height = '4px'
      el.style.left = '0'
    }
    el.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); this.startDrag(side, e) })
    return el
  }

  /**
   * 开始拖拽边距标记，绑定全局鼠标事件
   * @param side 边方向
   * @param _e 鼠标事件
   */
  private startDrag(side: MarginSide, _e: MouseEvent): void {
    this.dragSide = side
    window.addEventListener('mousemove', this.onDragMove)
    window.addEventListener('mouseup', this.onDragEnd)
  }

  /**
   * 拖拽移动事件处理：根据鼠标位置实时计算并下发新的页边距
   * @param e 鼠标事件
   */
  private onDragMove = (e: MouseEvent): void => {
    if (!this.dragSide) return
    e.preventDefault()
    const layout = this.deps.getLayout()
    if (!layout) return
    const scale = this.deps.getScale()
    const rect = this.deps.container.getBoundingClientRect()
    const pageOffsetX = this.deps.getPageOffsetX()
    const scrollY = this.deps.getScrollY()
    const pageGap = this.deps.getPageGap()
    const pageW = layout.pageWidth
    const pageH = layout.pages[0]?.rect.height ?? 0
    const [mt, mr, mb, ml] = this.deps.getPageMargins()
    const minContent = 50

    if (this.dragSide === 'left') {
      const newMl = Math.max(0, Math.min(pageW - mr - minContent, (e.clientX - rect.left - pageOffsetX) / scale))
      this.deps.onCommand('executeSetPaperMargin', [mt, mr, mb, newMl])
    } else if (this.dragSide === 'right') {
      const newMr = Math.max(0, Math.min(pageW - ml - minContent, (pageOffsetX + pageW - (e.clientX - rect.left)) / scale))
      this.deps.onCommand('executeSetPaperMargin', [mt, newMr, mb, ml])
    } else if (this.dragSide === 'top') {
      const pageTop = pageGap - scrollY
      const newMt = Math.max(0, Math.min(pageH - mb - minContent, (e.clientY - rect.top - pageTop) / scale))
      this.deps.onCommand('executeSetPaperMargin', [newMt, mr, mb, ml])
    } else if (this.dragSide === 'bottom') {
      const pageTop = pageGap - scrollY
      const newMb = Math.max(0, Math.min(pageH - mt - minContent, (pageTop + pageH - (e.clientY - rect.top)) / scale))
      this.deps.onCommand('executeSetPaperMargin', [mt, mr, newMb, ml])
    }
  }

  /** 结束拖拽，移除全局鼠标事件监听 */
  private onDragEnd = (): void => {
    this.dragSide = null
    window.removeEventListener('mousemove', this.onDragMove)
    window.removeEventListener('mouseup', this.onDragEnd)
  }

  /**
   * 设置标尺可见性
   * @param visible 是否可见
   */
  setVisible(visible: boolean): void {
    this.visible = visible
    this.applyVisible()
    if (visible) this.update()
  }

  /** 根据 visible 状态切换所有标尺元素的 display */
  private applyVisible(): void {
    const display = this.visible ? 'block' : 'none'
    if (this.hRuler) this.hRuler.style.display = display
    if (this.vRuler) this.vRuler.style.display = display
    if (this.corner) this.corner.style.display = display
    for (const k of ['left', 'right', 'top', 'bottom'] as MarginSide[]) {
      if (this.markers[k]) this.markers[k]!.style.display = display
    }
  }

  /** 重绘标尺刻度并更新边距标记位置 */
  update(): void {
    if (!this.visible) return
    if (!this.hCanvas || !this.vCanvas) return
    this.drawHorizontal()
    this.drawVertical()
    this.updateMarkers()
  }

  /** 根据当前页边距与滚动位置更新四个边距标记的坐标 */
  private updateMarkers(): void {
    const layout = this.deps.getLayout()
    if (!layout) return
    const scale = this.deps.getScale()
    const pageOffsetX = this.deps.getPageOffsetX()
    const scrollY = this.deps.getScrollY()
    const pageGap = this.deps.getPageGap()
    const pageW = layout.pageWidth
    const pageH = layout.pages[0]?.rect.height ?? 0
    const [mt, mr, mb, ml] = this.deps.getPageMargins()

    const leftX = pageOffsetX + ml * scale - 2
    const rightX = pageOffsetX + pageW - mr * scale - 2
    const topY = pageGap - scrollY + mt * scale - 2
    const bottomY = pageGap - scrollY + pageH - mb * scale - 2

    if (this.markers.left) this.markers.left.style.left = `${Math.round(leftX)}px`
    if (this.markers.right) this.markers.right.style.left = `${Math.round(rightX)}px`
    if (this.markers.top) this.markers.top.style.top = `${Math.round(topY)}px`
    if (this.markers.bottom) this.markers.bottom.style.top = `${Math.round(bottomY)}px`
  }

  /** 绘制水平标尺：边距阴影 + 厘米/毫米刻度 + 数字标签 */
  private drawHorizontal(): void {
    const canvas = this.hCanvas!
    const layout = this.deps.getLayout()
    if (!layout) return

    const dpr = window.devicePixelRatio || 1
    const w = this.deps.getWrapperWidth()
    const h = RULER_SIZE
    canvas.width = Math.max(1, Math.round(w * dpr))
    canvas.height = Math.max(1, Math.round(h * dpr))
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    const scale = this.deps.getScale()
    const pageOffsetX = this.deps.getPageOffsetX()
    const pageW = layout.pageWidth
    const [, mr] = this.deps.getPageMargins()
    const [, , , ml] = this.deps.getPageMargins()
    const pxPerCm = PX_PER_CM * scale

    const pageLeft = pageOffsetX
    const pageRight = pageOffsetX + pageW

    ctx.fillStyle = '#e0e0e0'
    ctx.fillRect(pageLeft, 0, ml * scale, h)
    ctx.fillRect(pageRight - mr * scale, 0, mr * scale, h)

    ctx.strokeStyle = '#c0c0c0'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(Math.round(pageLeft) + 0.5, 0)
    ctx.lineTo(Math.round(pageLeft) + 0.5, h)
    ctx.moveTo(Math.round(pageRight) + 0.5, 0)
    ctx.lineTo(Math.round(pageRight) + 0.5, h)
    ctx.stroke()

    ctx.strokeStyle = '#888'
    ctx.fillStyle = '#666'
    ctx.font = '9px "Microsoft YaHei",sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'

    const startCm = 0
    const endCm = Math.ceil(pageW / pxPerCm)

    for (let cm = startCm; cm <= endCm; cm++) {
      const x = pageLeft + cm * pxPerCm
      if (x > w) break

      ctx.beginPath()
      ctx.moveTo(Math.round(x) + 0.5, h - 8)
      ctx.lineTo(Math.round(x) + 0.5, h)
      ctx.stroke()

      if (cm > 0 && x + 20 < pageRight) {
        ctx.fillText(String(cm), x + 2, 2)
      }

      for (let mm = 1; mm < 10; mm++) {
        const mx = x + mm * (pxPerCm / 10)
        if (mx > pageRight) break
        ctx.beginPath()
        ctx.moveTo(Math.round(mx) + 0.5, h - 4)
        ctx.lineTo(Math.round(mx) + 0.5, h)
        ctx.stroke()
      }
    }
  }

  /** 绘制垂直标尺：遍历每页的边距阴影 + 厘米/毫米刻度 + 旋转数字标签 */
  private drawVertical(): void {
    const canvas = this.vCanvas!
    const layout = this.deps.getLayout()
    if (!layout) return

    const dpr = window.devicePixelRatio || 1
    const w = RULER_SIZE
    const h = this.deps.getWrapperHeight()
    canvas.width = Math.max(1, Math.round(w * dpr))
    canvas.height = Math.max(1, Math.round(h * dpr))
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    const scale = this.deps.getScale()
    const scrollY = this.deps.getScrollY()
    const pageGap = this.deps.getPageGap()
    const pageH = layout.pages[0]?.rect.height ?? 0
    const [mt] = this.deps.getPageMargins()
    const [, , mb] = this.deps.getPageMargins()
    const pxPerCm = PX_PER_CM * scale

    ctx.strokeStyle = '#888'
    ctx.fillStyle = '#666'
    ctx.font = '9px "Microsoft YaHei",sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'

    for (let i = 0; i < layout.pages.length; i++) {
      const pageTop = pageGap + i * (pageH + pageGap) - scrollY
      const pageBottom = pageTop + pageH

      if (pageBottom < 0 || pageTop > h) continue

      ctx.fillStyle = '#e0e0e0'
      ctx.fillRect(0, pageTop, w, mt * scale)
      ctx.fillRect(0, pageBottom - mb * scale, w, mb * scale)

      ctx.strokeStyle = '#c0c0c0'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, Math.round(pageTop) + 0.5)
      ctx.lineTo(w, Math.round(pageTop) + 0.5)
      ctx.moveTo(0, Math.round(pageBottom) + 0.5)
      ctx.lineTo(w, Math.round(pageBottom) + 0.5)
      ctx.stroke()

      ctx.strokeStyle = '#888'
      ctx.fillStyle = '#666'
      const endCm = Math.ceil(pageH / pxPerCm)
      for (let cm = 0; cm <= endCm; cm++) {
        const y = pageTop + cm * pxPerCm
        if (y > h) break

        ctx.beginPath()
        ctx.moveTo(w - 8, Math.round(y) + 0.5)
        ctx.lineTo(w, Math.round(y) + 0.5)
        ctx.stroke()

        if (cm > 0 && y + 20 < pageBottom) {
          ctx.save()
          ctx.translate(2, y + 2)
          ctx.rotate(Math.PI / 2)
          ctx.fillText(String(cm), 0, 0)
          ctx.restore()
        }

        for (let mm = 1; mm < 10; mm++) {
          const my = y + mm * (pxPerCm / 10)
          if (my > pageBottom) break
          ctx.beginPath()
          ctx.moveTo(w - 4, Math.round(my) + 0.5)
          ctx.lineTo(w, Math.round(my) + 0.5)
          ctx.stroke()
        }
      }
    }
  }

  /** 销毁标尺：结束拖拽、移除所有 DOM 并清理引用 */
  destroy(): void {
    this.onDragEnd()
    this.hRuler?.remove()
    this.vRuler?.remove()
    this.corner?.remove()
    for (const k of ['left', 'right', 'top', 'bottom'] as MarginSide[]) {
      this.markers[k]?.remove()
      this.markers[k] = null
    }
    this.hRuler = null
    this.vRuler = null
    this.corner = null
    this.hCanvas = null
    this.vCanvas = null
  }
}