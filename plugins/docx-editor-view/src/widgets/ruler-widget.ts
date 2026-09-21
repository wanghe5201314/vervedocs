import type { DocumentLayout } from '../layout-types'

const PX_PER_CM = 96 / 2.54
const RULER_SIZE = 27
const BAND_START = 3
const BAND_SIZE = 17
const BACKGROUND = '#e2e2e2'
const MARGIN_BACKGROUND = '#d6d6d6'
const BORDER = '#bcbcbc'

/** Positions relative to the paragraph's available content area, in document pixels. */
export interface RulerIndent {
  first: number
  left: number
  right: number
}

export interface RulerWidgetDeps {
  container: HTMLDivElement
  getLayout: () => DocumentLayout | null
  getScrollY: () => number
  getWrapperWidth: () => number
  getWrapperHeight: () => number
  getPageOffsetX: () => number
  getScale: () => number
  getPageMargins: () => [number, number, number, number]
  getParagraphIndent: () => RulerIndent | null
  onCommand: (cmd: string, ...args: any[]) => void
}

type MarginSide = 'left' | 'right' | 'top' | 'bottom'
type IndentSide = 'first' | 'hanging' | 'indent' | 'end'
type Handle = MarginSide | IndentSide
const MARGINS: MarginSide[] = ['left', 'right', 'top', 'bottom']
const INDENTS: IndentSide[] = ['first', 'hanging', 'indent', 'end']

/** Compact Word-style rulers. All screen positions use the rendered page geometry. */
export class RulerWidget {
  private hRuler: HTMLDivElement | null = null
  private vRuler: HTMLDivElement | null = null
  private hCanvas: HTMLCanvasElement | null = null
  private vCanvas: HTMLCanvasElement | null = null
  private corner: HTMLDivElement | null = null
  private markers = new Map<Handle, HTMLDivElement>()
  private drag: { side: Handle; start: number; indent: RulerIndent | null; pageIndex: number } | null = null
  private visible = false

  constructor(private deps: RulerWidgetDeps) {}

  create(): void {
    const createRuler = (horizontal: boolean): [HTMLDivElement, HTMLCanvasElement] => {
      const ruler = document.createElement('div')
      ruler.className = `vervedocs-ruler-${horizontal ? 'horizontal' : 'vertical'}`
      Object.assign(ruler.style, {
        position: 'absolute', top: '0', left: '0', zIndex: horizontal ? '6' : '5',
        background: BACKGROUND, pointerEvents: 'none', overflow: 'hidden',
        ...(horizontal ? { right: '0', height: `${RULER_SIZE}px` } : { bottom: '0', width: `${RULER_SIZE}px` })
      })
      const canvas = document.createElement('canvas')
      canvas.style.cssText = 'width:100%;height:100%;display:block;'
      ruler.appendChild(canvas)
      this.deps.container.appendChild(ruler)
      return [ruler, canvas]
    }
    ;[this.hRuler, this.hCanvas] = createRuler(true)
    ;[this.vRuler, this.vCanvas] = createRuler(false)
    this.corner = document.createElement('div')
    this.corner.style.cssText = `position:absolute;top:0;left:0;width:${RULER_SIZE}px;height:${RULER_SIZE}px;background:${BACKGROUND};z-index:8;pointer-events:none;`
    this.deps.container.appendChild(this.corner)

    for (const side of [...MARGINS, ...INDENTS]) {
      const marker = this.createMarker(side)
      this.markers.set(side, marker)
      this.deps.container.appendChild(marker)
    }
    this.applyVisible()
  }

  private createMarker(side: Handle): HTMLDivElement {
    const marker = document.createElement('div')
    const vertical = side === 'top' || side === 'bottom'
    const isMargin = MARGINS.includes(side as MarginSide)
    marker.dataset.rulerHandle = side
    const titles: Record<Handle, string> = {
      left: '左页边距', right: '右页边距', top: '上页边距', bottom: '下页边距',
      first: '首行缩进', hanging: '悬挂缩进', indent: '左缩进', end: '右缩进'
    }
    marker.title = titles[side]
    Object.assign(marker.style, {
      position: 'absolute', zIndex: isMargin ? '6' : '7', pointerEvents: 'auto',
      cursor: vertical ? 'ns-resize' : 'ew-resize', touchAction: 'none',
      // Keep a grab area outside the indent handles when they share the margin.
      width: vertical ? `${BAND_SIZE}px` : isMargin ? '20px' : '12px',
      height: vertical ? '6px' : isMargin ? `${BAND_SIZE}px` : side === 'indent' ? '6px' : '12px',
      ...(vertical ? { left: `${BAND_START}px` } : {
        top: `${isMargin ? BAND_START : side === 'first' ? 0 : side === 'indent' ? 20 : 9}px`
      })
    })
    if (!isMargin) {
      const canvas = document.createElement('canvas')
      const height = side === 'indent' ? 6 : 12
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(12 * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.cssText = `display:block;width:12px;height:${height}px;pointer-events:none;`
      const ctx = canvas.getContext('2d')!
      ctx.scale(dpr, dpr)
      ctx.fillStyle = '#fff'
      ctx.strokeStyle = '#666'
      ctx.lineWidth = 1
      ctx.beginPath()
      if (side === 'indent') {
        ctx.rect(0.5, 0.5, 11, 5)
      } else if (side === 'first') {
        ctx.moveTo(0.5, 0.5)
        ctx.lineTo(11.5, 0.5)
        ctx.lineTo(11.5, 4.5)
        ctx.lineTo(6, 11.5)
        ctx.lineTo(0.5, 4.5)
        ctx.closePath()
      } else {
        ctx.moveTo(6, 0.5)
        ctx.lineTo(11.5, 6.5)
        ctx.lineTo(11.5, 10.5)
        ctx.lineTo(0.5, 10.5)
        ctx.lineTo(0.5, 6.5)
        ctx.closePath()
      }
      ctx.fill()
      ctx.stroke()
      marker.appendChild(canvas)
    }
    marker.addEventListener('mousedown', (event) => {
      if (event.button !== 0) return
      event.preventDefault()
      event.stopPropagation()
      this.drag = {
        side, start: event.clientX, indent: this.deps.getParagraphIndent(),
        pageIndex: this.getVerticalPage()?.index ?? 0
      }
      window.addEventListener('mousemove', this.onDragMove)
      window.addEventListener('mouseup', this.onDragEnd)
      window.addEventListener('blur', this.onDragEnd)
    })
    return marker
  }

  private getVerticalPage() {
    const page = this.deps.getLayout()?.pages[0]
    const scrollY = this.deps.getScrollY()
    return page && page.rect.y + page.rect.height > scrollY + RULER_SIZE &&
      page.rect.y - scrollY < this.deps.getWrapperHeight() ? page : undefined
  }

  private onDragMove = (event: MouseEvent): void => {
    const drag = this.drag
    const layout = this.deps.getLayout()
    if (!drag || !layout) return
    event.preventDefault()
    const scale = this.deps.getScale()
    const rect = this.deps.container.getBoundingClientRect()
    const pageX = this.deps.getPageOffsetX()
    const [mt, mr, mb, ml] = this.deps.getPageMargins()
    const width = layout.pageWidth / scale
    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(Math.max(min, max), value))
    if (INDENTS.includes(drag.side as IndentSide)) {
      if (!drag.indent) return
      const next = { ...drag.indent }
      const contentWidth = width - ml - mr
      const movement = (event.clientX - drag.start) / scale
      const limit = contentWidth - next.right - 20
      if (drag.side === 'first') next.first = clamp(next.first + movement, 0, limit)
      if (drag.side === 'hanging') next.left = clamp(next.left + movement, 0, limit)
      if (drag.side === 'end') next.right = clamp(next.right - movement, 0, contentWidth - Math.max(next.first, next.left) - 20)
      if (drag.side === 'indent') {
        const delta = clamp(movement,
          -Math.min(next.first, next.left), limit - Math.max(next.first, next.left))
        next.first += delta
        next.left += delta
      }
      this.deps.onCommand('executeSetRulerIndent', next.first, next.left, next.right)
      return
    }
    const page = layout.pages[drag.pageIndex]
    if (!page) return
    const height = page.rect.height / scale
    const y = (event.clientY - rect.top + this.deps.getScrollY() - page.rect.y) / scale
    const x = (event.clientX - rect.left - pageX) / scale
    const margins: [number, number, number, number] = [mt, mr, mb, ml]
    if (drag.side === 'left') margins[3] = clamp(x, 0, width - mr - 50)
    if (drag.side === 'right') margins[1] = clamp(width - x, 0, width - ml - 50)
    if (drag.side === 'top') margins[0] = clamp(y, 0, height - mb - 50)
    if (drag.side === 'bottom') margins[2] = clamp(height - y, 0, height - mt - 50)
    this.deps.onCommand('executeSetPaperMargin', margins)
  }

  private onDragEnd = (): void => {
    this.drag = null
    window.removeEventListener('mousemove', this.onDragMove)
    window.removeEventListener('mouseup', this.onDragEnd)
    window.removeEventListener('blur', this.onDragEnd)
  }

  setVisible(visible: boolean): void {
    this.visible = visible
    if (!visible) this.onDragEnd()
    this.applyVisible()
    if (visible) this.update()
  }

  private applyVisible(): void {
    for (const element of [this.hRuler, this.vRuler, this.corner, ...this.markers.values()]) {
      if (element) element.style.display = this.visible ? 'block' : 'none'
    }
  }

  update(): void {
    if (!this.visible || !this.hCanvas || !this.vCanvas) return
    this.drawHorizontal()
    this.drawVertical()
    this.updateMarkers()
  }

  private updateMarkers(): void {
    const layout = this.deps.getLayout()
    const page = this.getVerticalPage()
    const scale = this.deps.getScale()
    const [mt, mr, mb, ml] = this.deps.getPageMargins()
    const start = this.deps.getPageOffsetX() + ml * scale
    const end = this.deps.getPageOffsetX() + (layout?.pageWidth ?? 0) - mr * scale
    const indent = this.deps.getParagraphIndent()
    const positions: Record<Handle, number> = {
      left: start, right: end,
      top: (page?.rect.y ?? 0) - this.deps.getScrollY() + mt * scale,
      bottom: (page?.rect.y ?? 0) + (page?.rect.height ?? 0) - this.deps.getScrollY() - mb * scale,
      first: start + (indent?.first ?? 0) * scale,
      hanging: start + (indent?.left ?? 0) * scale,
      indent: start + (indent?.left ?? 0) * scale,
      end: end - (indent?.right ?? 0) * scale
    }
    for (const [side, marker] of this.markers) {
      const vertical = side === 'top' || side === 'bottom'
      const isMargin = MARGINS.includes(side as MarginSide)
      const position = Math.round(positions[side])
      const max = vertical ? this.deps.getWrapperHeight() : this.deps.getWrapperWidth()
      marker.style.display = layout && (!vertical || page) && (isMargin || indent) &&
        position >= RULER_SIZE + 6 && position <= max - 6 ? 'block' : 'none'
      marker.style[vertical ? 'top' : 'left'] = `${position - (isMargin ? vertical ? 3 : 10 : 6)}px`
    }
  }

  private prepareCanvas(canvas: HTMLCanvasElement, width: number, height: number): CanvasRenderingContext2D {
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.max(1, Math.round(width * dpr))
    canvas.height = Math.max(1, Math.round(height * dpr))
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)
    return ctx
  }

  /** The same 17px band is used horizontally and vertically (via a canvas transform). */
  private drawBand(ctx: CanvasRenderingContext2D, start: number, end: number, origin: number, contentEnd: number, viewport: number): void {
    const step = PX_PER_CM * this.deps.getScale()
    const center = BAND_START + BAND_SIZE / 2
    ctx.fillStyle = MARGIN_BACKGROUND
    ctx.fillRect(start, BAND_START, end - start, BAND_SIZE)
    ctx.fillStyle = '#fff'
    ctx.fillRect(origin, BAND_START, Math.max(0, contentEnd - origin), BAND_SIZE)
    ctx.strokeStyle = BORDER
    ctx.lineWidth = 1
    ctx.strokeRect(Math.round(start) + 0.5, BAND_START + 0.5, Math.round(end) - Math.round(start) - 1, BAND_SIZE - 1)
    ctx.save()
    ctx.beginPath()
    ctx.rect(start + 1, BAND_START + 1, Math.max(0, end - start - 2), BAND_SIZE - 2)
    ctx.clip()
    ctx.strokeStyle = '#363636'
    ctx.fillStyle = '#161616'
    ctx.font = '11px Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const firstTick = Math.ceil((Math.max(start, 0) - origin) / step * 4)
    const lastTick = Math.floor((Math.min(end, viewport) - origin) / step * 4)
    for (let tick = firstTick; tick <= lastTick; tick++) {
      const x = Math.round(origin + tick * step / 4) + 0.5
      if (tick % 4 === 0) {
        if (tick !== 0) ctx.fillText(String(Math.abs(tick / 4)), x, center)
      } else {
        const height = tick % 2 === 0 ? 5 : 3
        ctx.beginPath()
        ctx.moveTo(x, Math.round(center - height / 2))
        ctx.lineTo(x, Math.round(center + height / 2))
        ctx.stroke()
      }
    }
    ctx.restore()
  }

  private drawHorizontal(): void {
    const width = this.deps.getWrapperWidth()
    const ctx = this.prepareCanvas(this.hCanvas!, width, RULER_SIZE)
    const layout = this.deps.getLayout()
    if (!layout) return
    const scale = this.deps.getScale()
    const start = this.deps.getPageOffsetX()
    const end = start + layout.pageWidth
    const [, mr, , ml] = this.deps.getPageMargins()
    const origin = start + ml * scale
    const contentEnd = end - mr * scale
    this.drawBand(ctx, start, end, origin, contentEnd, width)
    // Default tab stops sit below the band, starting at the text origin.
    const tabStep = PX_PER_CM * 1.25 * scale
    ctx.strokeStyle = '#777'
    ctx.beginPath()
    for (let x = origin + tabStep; x < Math.min(contentEnd, width); x += tabStep) {
      if (x < 0) continue
      const aligned = Math.round(x) + 0.5
      ctx.moveTo(aligned, 22)
      ctx.lineTo(aligned, 25)
    }
    ctx.stroke()
  }

  private drawVertical(): void {
    const page = this.getVerticalPage()
    if (!page) {
      this.vRuler!.style.display = 'none'
      return
    }
    const start = page.rect.y - this.deps.getScrollY()
    const end = start + page.rect.height
    // Limit both the canvas and its background to the first page.
    const height = Math.min(this.deps.getWrapperHeight(), Math.ceil(end))
    this.vRuler!.style.display = 'block'
    this.vRuler!.style.bottom = 'auto'
    this.vRuler!.style.height = `${height}px`
    const ctx = this.prepareCanvas(this.vCanvas!, RULER_SIZE, height)
    const scale = this.deps.getScale()
    const [mt, , mb] = this.deps.getPageMargins()
    // Rotate, rather than reflect, so vertical labels remain readable.
    ctx.transform(0, 1, -1, 0, BAND_START * 2 + BAND_SIZE, 0)
    this.drawBand(ctx, start, end, start + mt * scale, end - mb * scale, height)
  }

  destroy(): void {
    this.onDragEnd()
    for (const element of [this.hRuler, this.vRuler, this.corner, ...this.markers.values()]) element?.remove()
    this.markers.clear()
    this.hRuler = this.vRuler = this.corner = null
    this.hCanvas = this.vCanvas = null
  }
}
