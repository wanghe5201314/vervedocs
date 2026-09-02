/**
 * VerveDocs View —— CanvasRenderer
 *
 * 三层 canvas：background / content / overlay。
 *
 * 增量重绘：
 *  - 每个 Block 拥有独立 OffscreenCanvas 位图，key = block.id。
 *  - 首次或 dirty 时重建该 block bitmap；否则复用。
 *  - 主 content canvas 每帧执行：clear + drawImage(bitmap) 到屏幕对应位置。
 *  - 因此"内容变化局部更新" = 只对 dirty block 重建 bitmap。
 *
 * 坐标：block/line/inline 均使用块本地坐标；绘制到 bitmap 时以 (0,0) 为起点。
 * 主 canvas 落位时 = pageOriginY + block.rect.y - scrollY。
 */

import type {
  BlockNode, DocumentLayout,
  ParagraphBlock, ImageBlock, TableBlock, InlineBox
} from './layout-types'

export interface RendererOptions {
  dpr: number
  scale: number
  pageBg: string
  pageShadow: string
  /** 页面居中时相对 canvas 左侧的水平偏移（外部计算并传入） */
  pageOffsetX: number
  /** 页面 margin（top,right,bottom,left），用于绘制标尺角标 */
  pageMargins: [number, number, number, number]
  /** 是否显示 WPS 风格的四角边距标记 */
  showMarginRuler: boolean
  /** 标尺颜色 */
  rulerColor: string
}

interface DrawCommand {
  font: string
  color: string
  x: number
  y: number
  text: string
}

interface BlockCache {
  id: number
  bitmap: HTMLCanvasElement
  width: number
  height: number
  dpr: number
}

export class CanvasRenderer {
  private bgCanvas: HTMLCanvasElement
  private contentCanvas: HTMLCanvasElement
  private overlayCanvas: HTMLCanvasElement
  private bgCtx: CanvasRenderingContext2D
  private contentCtx: CanvasRenderingContext2D
  private overlayCtx: CanvasRenderingContext2D

  private cssWidth = 0
  private cssHeight = 0
  private opts: RendererOptions

  private imageCache = new Map<string, HTMLImageElement>()
  private blockCache = new Map<number, BlockCache>()
  private dirtyBlocks = new Set<number>()

  constructor(private container: HTMLElement, options: Partial<RendererOptions> = {}) {
    this.opts = {
      dpr: options.dpr ?? (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1),
      scale: options.scale ?? 1,
      pageBg: options.pageBg ?? '#ffffff',
      pageShadow: options.pageShadow ?? 'rgba(0,0,0,0.08)',
      pageOffsetX: options.pageOffsetX ?? 0,
      pageMargins: options.pageMargins ?? [100, 120, 100, 120],
      showMarginRuler: options.showMarginRuler ?? true,
      rulerColor: options.rulerColor ?? '#3a7afe'
    }

    this.bgCanvas = this.createLayer('bg', 0)
    this.contentCanvas = this.createLayer('content', 1)
    this.overlayCanvas = this.createLayer('overlay', 2)
    this.bgCtx = this.bgCanvas.getContext('2d')!
    this.contentCtx = this.contentCanvas.getContext('2d')!
    this.overlayCtx = this.overlayCanvas.getContext('2d')!
  }

  private createLayer(name: string, z: number): HTMLCanvasElement {
    const c = document.createElement('canvas')
    c.dataset.layer = name
    c.style.position = 'absolute'
    c.style.top = '0'
    c.style.left = '0'
    c.style.zIndex = String(z)
    c.style.pointerEvents = 'none'
    this.container.appendChild(c)
    return c
  }

  setSize(cssWidth: number, cssHeight: number): void {
    this.cssWidth = cssWidth
    this.cssHeight = cssHeight
    const dpr = this.opts.dpr
    for (const c of [this.bgCanvas, this.contentCanvas, this.overlayCanvas]) {
      c.width = Math.round(cssWidth * dpr)
      c.height = Math.round(cssHeight * dpr)
      c.style.width = `${cssWidth}px`
      c.style.height = `${cssHeight}px`
    }
    for (const ctx of [this.bgCtx, this.contentCtx, this.overlayCtx]) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
  }

  /** 更新可视化选项（页偏移 / margin / 是否显示标尺） */
  updateVisualOptions(patch: Partial<Pick<RendererOptions,
    'pageOffsetX' | 'pageMargins' | 'showMarginRuler' | 'rulerColor' | 'pageBg' | 'pageShadow' | 'scale'
  >>): void {
    Object.assign(this.opts, patch)
  }

  /** 标脏（下一帧只重建这些 block 的 bitmap） */
  markDirty(blockIds: number[] | Set<number>): void {
    for (const id of blockIds) this.dirtyBlocks.add(id)
  }

  /** 全部标脏（用于选项/主题变更） */
  invalidateAll(): void {
    this.blockCache.clear()
    this.dirtyBlocks.clear()
  }

  /* -------------------- 光标 / 选区（Overlay） -------------------- */

  /**
   * 绘制光标（overlay 层）。传入文档坐标，内部会应用 scrollY 与 pageOffsetX。
   * cx: 文档坐标 x；cy: 文档坐标 y；height: 光标高度；scrollY, visible: 闪烁开关
   */
  drawCaret(cx: number, cy: number, height: number, scrollY: number, visible: boolean): void {
    const ov = this.overlayCtx
    ov.clearRect(0, 0, this.cssWidth, this.cssHeight)
    if (!visible) return
    const x = Math.round(cx + this.opts.pageOffsetX) + 0.5
    const y = Math.round(cy - scrollY)
    ov.save()
    ov.strokeStyle = '#111'
    ov.lineWidth = 1
    ov.beginPath()
    ov.moveTo(x, y)
    ov.lineTo(x, y + height)
    ov.stroke()
    ov.restore()
  }

  /** 清除 overlay 上的光标 / 选区 */
  clearOverlay(): void {
    this.overlayCtx.clearRect(0, 0, this.cssWidth, this.cssHeight)
  }


  /**
   * 渲染一帧。
   *   - 视口过滤：只处理与视口相交的页
   *   - block bitmap：按需构建（首次 / dirty）
   *   - 主 canvas：clear + drawImage
   */
  render(layout: DocumentLayout, scrollY: number, viewportHeight: number): void {
    const bg = this.bgCtx
    const ct = this.contentCtx
    bg.clearRect(0, 0, this.cssWidth, this.cssHeight)
    ct.clearRect(0, 0, this.cssWidth, this.cssHeight)

    const viewTop = scrollY
    const viewBottom = scrollY + viewportHeight

    // 收集使用中的 blockId 用于 GC
    const aliveIds = new Set<number>()

    for (const page of layout.pages) {
      const pageBottom = page.rect.y + page.rect.height
      if (pageBottom < viewTop || page.rect.y > viewBottom) continue

      // 页背景（居中偏移 + 阴影）
      const px = Math.round(page.rect.x + this.opts.pageOffsetX)
      const py = Math.round(page.rect.y - scrollY)
      bg.fillStyle = this.opts.pageShadow
      bg.fillRect(px + 3, py + 3, page.rect.width, page.rect.height)
      bg.fillStyle = this.opts.pageBg
      bg.fillRect(px, py, page.rect.width, page.rect.height)

      // WPS 风格四角边距标尺
      if (this.opts.showMarginRuler) {
        this.drawMarginRuler(bg, px, py, page.rect.width, page.rect.height)
      }

      const contentOriginX = page.contentRect.x + this.opts.pageOffsetX
      const contentOriginY = page.contentRect.y - scrollY

      for (const b of page.blocks) {
        this.renderBlockOnMain(ct, b, contentOriginX, contentOriginY, aliveIds)
      }
    }

    // GC：淘汰未使用的 bitmap
    for (const id of Array.from(this.blockCache.keys())) {
      if (!aliveIds.has(id)) this.blockCache.delete(id)
    }
    // 已应用完 dirty
    this.dirtyBlocks.clear()
  }

  private renderBlockOnMain(
    ctx: CanvasRenderingContext2D,
    b: BlockNode,
    originX: number,
    originY: number,
    aliveIds: Set<number>
  ): void {
    aliveIds.add(b.id)
    if (b.kind === 'pageBreak') return
    const bx = originX + b.rect.x
    const by = originY + b.rect.y

    // table 不做整表 bitmap（cell 内容可能常变），直接递归绘制到主 canvas
    if (b.kind === 'table') {
      this.drawTable(ctx, b, bx, by, aliveIds)
      return
    }

    // 其它块使用 block bitmap 缓存
    const cache = this.blockCache.get(b.id)
    const needRebuild = !cache || this.dirtyBlocks.has(b.id) ||
      Math.round(cache.width) !== Math.round(b.rect.width) ||
      Math.round(cache.height) !== Math.round(b.rect.height) ||
      cache.dpr !== this.opts.dpr
    let bitmap: HTMLCanvasElement
    if (needRebuild) {
      bitmap = this.buildBlockBitmap(b)
      this.blockCache.set(b.id, {
        id: b.id,
        bitmap,
        width: b.rect.width,
        height: b.rect.height,
        dpr: this.opts.dpr
      })
    } else {
      bitmap = cache!.bitmap
    }
    ctx.drawImage(bitmap, Math.round(bx), Math.round(by), b.rect.width, b.rect.height)
  }

  private buildBlockBitmap(b: BlockNode): HTMLCanvasElement {
    const dpr = this.opts.dpr
    const w = Math.max(1, Math.ceil(b.rect.width))
    const h = Math.max(1, Math.ceil(b.rect.height))
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(w * dpr))
    c.height = Math.max(1, Math.round(h * dpr))
    const ctx = c.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (b.kind === 'paragraph') this.drawParagraphInto(ctx, b)
    else if (b.kind === 'image') this.drawImageInto(ctx, b, 0, 0)
    return c
  }

  private drawParagraphInto(ctx: CanvasRenderingContext2D, b: ParagraphBlock): void {
    // 项目符号 / 编号
    if (b.paragraphKind === 'list' && b.bulletText) {
      const firstLine = b.lines[0]
      if (firstLine) {
        const size = b.bulletSize ?? 16
        const family = b.bulletFont ?? 'sans-serif'
        const bold = b.bulletBold ? '700' : '400'
        ctx.font = `${bold} ${size}px ${family}`
        ctx.fillStyle = b.bulletColor ?? '#000000'
        ctx.textBaseline = 'alphabetic'
        // 绘制位置：文本起点 - bulletWidth（含尾随间距），基线 = 行基线
        const bx = firstLine.x - (b.bulletWidth ?? 0)
        const by = firstLine.y + firstLine.baseline
        ctx.fillText(b.bulletText, bx, by)
      }
    }
    // 分桶
    const buckets = new Map<string, DrawCommand[]>()
    const bgRects: { x: number; y: number; w: number; h: number; color: string }[] = []
    const strokes: { x1: number; y1: number; x2: number; y2: number; color: string; width: number }[] = []
    for (const line of b.lines) {
      for (const inl of line.inlines) {
        if (inl.bgColor) {
          bgRects.push({ x: inl.x, y: inl.y, w: inl.width, h: line.height, color: inl.bgColor })
        }
        const font = fontOf(inl)
        const key = `${font}||${inl.color}`
        addBucket(buckets, key, {
          font, color: inl.color,
          x: inl.x, y: inl.baseline,
          text: inl.text
        })
        if (inl.underline) {
          strokes.push({
            x1: inl.x, y1: inl.baseline + 2, x2: inl.x + inl.width, y2: inl.baseline + 2,
            color: inl.color, width: 1
          })
        }
        if (inl.strikeout) {
          const my = inl.baseline - inl.size * 0.3
          strokes.push({
            x1: inl.x, y1: my, x2: inl.x + inl.width, y2: my,
            color: inl.color, width: 1
          })
        }
      }
    }
    for (const r of bgRects) {
      ctx.fillStyle = r.color
      ctx.fillRect(Math.round(r.x), Math.round(r.y), Math.round(r.w), Math.round(r.h))
    }
    ctx.textBaseline = 'alphabetic'
    for (const [key, list] of buckets) {
      const [font, color] = key.split('||')
      ctx.font = font
      ctx.fillStyle = color
      for (const c of list) ctx.fillText(c.text, c.x, c.y)
    }
    for (const s of strokes) {
      ctx.strokeStyle = s.color
      ctx.lineWidth = s.width
      ctx.beginPath()
      ctx.moveTo(s.x1 + 0.5, s.y1 + 0.5)
      ctx.lineTo(s.x2 + 0.5, s.y2 + 0.5)
      ctx.stroke()
    }
  }

  private drawImageInto(ctx: CanvasRenderingContext2D, b: ImageBlock, x: number, y: number): void {
    const url = String((b.block as unknown as { value?: string }).value ?? '')
    if (!url) return
    let img = this.imageCache.get(url)
    if (!img) {
      img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        // 图片加载完成 → 使该 block 失效 + 触发全局重绘
        this.dirtyBlocks.add(b.id)
        this.container.dispatchEvent(new CustomEvent('vervedocs:image-loaded', { detail: { url } }))
      }
      img.src = url
      this.imageCache.set(url, img)
    }
    if (img.complete && img.naturalWidth > 0) {
      try { ctx.drawImage(img, x, y, b.rect.width, b.rect.height) } catch { /* ignore CORS */ }
    } else {
      ctx.strokeStyle = '#cccccc'
      ctx.strokeRect(x + 0.5, y + 0.5, b.rect.width - 1, b.rect.height - 1)
      ctx.fillStyle = '#f5f5f5'
      ctx.fillRect(x, y, b.rect.width, b.rect.height)
    }
  }

  private drawTable(
    ctx: CanvasRenderingContext2D,
    b: TableBlock,
    bx: number,
    by: number,
    aliveIds: Set<number>
  ): void {
    // 1) 先绘制所有单元格背景色（如有）
    for (const row of b.rows) {
      for (const cell of row.cells) {
        const bg = (cell.cell as unknown as { backgroundColor?: string }).backgroundColor
        if (bg) {
          const cx = Math.round(bx + cell.rect.x)
          const cy = Math.round(by + cell.rect.y)
          const cw = Math.round(cell.rect.width)
          const ch = Math.round(cell.rect.height)
          ctx.fillStyle = bg
          ctx.fillRect(cx, cy, cw, ch)
        }
      }
    }
    // 2) 绘制单元格内容（不含边框）
    for (const row of b.rows) {
      for (const cell of row.cells) {
        const cx = bx + cell.rect.x
        const cy = by + cell.rect.y
        const contentX = cx + cell.contentPaddingLeft
        const contentY = cy + cell.contentPaddingTop + cell.verticalOffset
        for (const cb of cell.content) {
          this.renderBlockOnMain(ctx, cb, contentX, contentY, aliveIds)
        }
      }
    }
    // 3) 统一绘制边框（每条边只画一次；共享边优先使用有样式的那一侧）
    // 使用像素整数 + 0.5 对齐避免模糊；单条边分别绘制以尊重每格的 style/width/color
    for (const row of b.rows) {
      for (const cell of row.cells) {
        const cx = bx + cell.rect.x
        const cy = by + cell.rect.y
        const cw = cell.rect.width
        const ch = cell.rect.height
        const bs = cell.cell.borderStyle
        strokeSide(ctx, cx, cy, cx + cw, cy, bs.top)
        strokeSide(ctx, cx + cw, cy, cx + cw, cy + ch, bs.right)
        strokeSide(ctx, cx, cy + ch, cx + cw, cy + ch, bs.bottom)
        strokeSide(ctx, cx, cy, cx, cy + ch, bs.left)
      }
    }
  }

  /* -------------------- 边距标尺（WPS 风格） -------------------- */

  private drawMarginRuler(
    ctx: CanvasRenderingContext2D,
    px: number, py: number, pw: number, ph: number
  ): void {
    const [mt, mr, mb, ml] = this.opts.pageMargins
    const color = this.opts.rulerColor
    const L = 12  // 标尺短边长度
    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    // 四个角，每个角画一个 "L" 形（内边距处）
    const drawCorner = (cx: number, cy: number, dx: number, dy: number) => {
      ctx.beginPath()
      ctx.moveTo(cx + 0.5, cy + dy * L + 0.5)
      ctx.lineTo(cx + 0.5, cy + 0.5)
      ctx.lineTo(cx + dx * L + 0.5, cy + 0.5)
      ctx.stroke()
    }
    // 左上：内边距点 (px+ml, py+mt)
    drawCorner(px + ml, py + mt, 1, 1)
    // 右上：(px+pw-mr, py+mt)
    drawCorner(px + pw - mr, py + mt, -1, 1)
    // 左下：(px+ml, py+ph-mb)
    drawCorner(px + ml, py + ph - mb, 1, -1)
    // 右下：(px+pw-mr, py+ph-mb)
    drawCorner(px + pw - mr, py + ph - mb, -1, -1)
    ctx.restore()
  }

  /* -------------------- overlay: 旧接口（保留兼容） -------------------- */

  drawCaretSimple(x: number, y: number, height: number, color = '#000000'): void {
    const ctx = this.overlayCtx
    ctx.clearRect(0, 0, this.cssWidth, this.cssHeight)
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x + 0.5, y)
    ctx.lineTo(x + 0.5, y + height)
    ctx.stroke()
  }
}

/* -------------------- 工具 -------------------- */

function fontOf(inl: InlineBox): string {
  const w = inl.bold ? '700' : '400'
  const s = inl.italic ? 'italic ' : ''
  return `${s}${w} ${inl.size}px ${inl.font}`
}

function addBucket(buckets: Map<string, DrawCommand[]>, key: string, cmd: DrawCommand): void {
  let list = buckets.get(key)
  if (!list) { list = []; buckets.set(key, list) }
  list.push(cmd)
}

function strokeSide(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  side: { width: number; color: string; style: string }
): void {
  if (!side || side.style === 'none' || side.width <= 0) return
  const w = side.width
  // 像素对齐：奇数宽度用 +0.5，偶数宽度用 +0
  const halfOffset = (w % 2 === 1) ? 0.5 : 0
  ctx.save()
  ctx.strokeStyle = side.color
  ctx.lineWidth = w
  // dashed / dotted 样式
  switch (side.style) {
    case 'dashed': ctx.setLineDash([Math.max(2, w * 3), Math.max(2, w * 2)]); break
    case 'dotted': ctx.setLineDash([w, Math.max(2, w * 2)]); break
    case 'double': {
      // 双线：绘制两条平行线（简单实现）
      const gap = Math.max(1, w)
      ctx.lineWidth = 1
      const off = halfOffset
      ctx.beginPath()
      if (y1 === y2) {
        ctx.moveTo(Math.round(x1), Math.round(y1) + off - gap / 2)
        ctx.lineTo(Math.round(x2), Math.round(y2) + off - gap / 2)
        ctx.moveTo(Math.round(x1), Math.round(y1) + off + gap / 2)
        ctx.lineTo(Math.round(x2), Math.round(y2) + off + gap / 2)
      } else {
        ctx.moveTo(Math.round(x1) + off - gap / 2, Math.round(y1))
        ctx.lineTo(Math.round(x2) + off - gap / 2, Math.round(y2))
        ctx.moveTo(Math.round(x1) + off + gap / 2, Math.round(y1))
        ctx.lineTo(Math.round(x2) + off + gap / 2, Math.round(y2))
      }
      ctx.stroke()
      ctx.restore()
      return
    }
    default: ctx.setLineDash([])
  }
  ctx.beginPath()
  ctx.moveTo(Math.round(x1) + halfOffset, Math.round(y1) + halfOffset)
  ctx.lineTo(Math.round(x2) + halfOffset, Math.round(y2) + halfOffset)
  ctx.stroke()
  ctx.restore()
}
