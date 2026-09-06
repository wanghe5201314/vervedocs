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
  BlockNode, DocumentLayout, PageLayout,
  ParagraphBlock, ImageBlock, TableBlock, SeparatorBlock, InlineBox
} from './layout-types'
import type { IGroupColor } from '@vervedoc/docx-editor-schema'

/** CanvasRenderer 渲染器配置选项 */
export interface RendererOptions {
  /** 设备像素比，用于高 DPI 屏幕清晰渲染 */
  dpr: number
  /** 渲染缩放倍数 */
  scale: number
  /** 页面背景色 */
  pageBg: string
  /** 页面阴影颜色 */
  pageShadow: string
  /** 页面居中时相对 canvas 左侧的水平偏移（外部计算并传入） */
  pageOffsetX: number
  /** 页面 margin（top,right,bottom,left），用于绘制标尺角标 */
  pageMargins: [number, number, number, number]
  /** 是否显示 WPS 风格的四角边距标记 */
  showMarginRuler: boolean
  /** 标尺颜色 */
  rulerColor: string
  /** 批注/修订组颜色映射，用于高亮文档中带 groupIds 的文本 */
  groupColors?: Record<string, IGroupColor>
  /** 当前高亮的 group ID（鼠标悬浮批注气泡时设置） */
  activeGroupId?: string | null
}

/** 单条文本绘制命令（用于分桶合并绘制以减少 ctx.font 切换开销） */
interface DrawCommand {
  /** 字体字符串（CSS font 简写） */
  font: string
  /** 文本颜色 */
  color: string
  /** 绘制起点 x 坐标 */
  x: number
  /** 绘制基线 y 坐标 */
  y: number
  /** 待绘制文本内容 */
  text: string
  /** 字符间距（两端对齐时使用，逐字绘制） */
  letterSpacing?: number
}

/** 块位图缓存条目：保存已渲染好的 OffscreenCanvas/HTMLCanvasElement 及其尺寸元信息 */
interface BlockCache {
  /** 块 id（与 BlockNode.id 对应） */
  id: number
  /** 已渲染好的位图 */
  bitmap: HTMLCanvasElement
  /** 位图 CSS 宽度 */
  width: number
  /** 位图 CSS 高度 */
  height: number
  /** 创建该位图时的 dpr（dpr 变化时需重建） */
  dpr: number
}

/**
 * Canvas 渲染器：维护 background / content / overlay 三层 canvas，
 * 负责 block 位图缓存、增量重绘、光标/选区/页眉页脚分隔线绘制。
 */
export class CanvasRenderer {
  /** 背景层 canvas（绘制页面底色与阴影） */
  private bgCanvas: HTMLCanvasElement
  /** 内容层 canvas（绘制 block 位图） */
  private contentCanvas: HTMLCanvasElement
  /** 覆盖层 canvas（绘制光标、选区高亮、zone 分隔线） */
  private overlayCanvas: HTMLCanvasElement
  /** 背景层 2d 上下文 */
  private bgCtx: CanvasRenderingContext2D
  /** 内容层 2d 上下文 */
  private contentCtx: CanvasRenderingContext2D
  /** 覆盖层 2d 上下文 */
  private overlayCtx: CanvasRenderingContext2D

  /** canvas CSS 宽度（视口宽度） */
  private cssWidth = 0
  /** canvas CSS 高度（视口高度） */
  private cssHeight = 0
  /** 渲染器选项 */
  private opts: RendererOptions

  /** 图片元素缓存（url -> HTMLImageElement） */
  private imageCache = new Map<string, HTMLImageElement>()
  /** block 位图缓存（blockId -> BlockCache） */
  private blockCache = new Map<number, BlockCache>()
  /** 待重建位图的 block id 集合 */
  private dirtyBlocks = new Set<number>()

  /**
   * 创建渲染器并挂载三层 canvas 到容器。
   * @param container 宿主 DOM 容器，三层 canvas 绝对定位覆盖其内
   * @param options 渲染选项（缺省字段使用默认值）
   */
  constructor(private container: HTMLElement, options: Partial<RendererOptions> = {}) {
    this.opts = {
      dpr: options.dpr ?? (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1),
      scale: options.scale ?? 1,
      pageBg: options.pageBg ?? '#ffffff',
      pageShadow: options.pageShadow ?? 'rgba(0,0,0,0.08)',
      pageOffsetX: options.pageOffsetX ?? 0,
      pageMargins: options.pageMargins ?? [100, 120, 100, 120],
      showMarginRuler: options.showMarginRuler ?? true,
      rulerColor: options.rulerColor ?? '#999999'
    }

    this.bgCanvas = this.createLayer('bg', 0)
    this.contentCanvas = this.createLayer('content', 1)
    this.overlayCanvas = this.createLayer('overlay', 2)
    this.bgCtx = this.bgCanvas.getContext('2d')!
    this.contentCtx = this.contentCanvas.getContext('2d')!
    this.overlayCtx = this.overlayCanvas.getContext('2d')!
  }

  /**
   * 创建一个 canvas 图层并挂载到容器。
   * @param name 图层名（写入 dataset.layer，便于调试与查找）
   * @param z 图层 z-index（越大越上层）
   * @returns 创建好的 canvas 元素
   */
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

  /**
   * 设置 canvas 视口尺寸（CSS 像素），同时按 dpr 调整物理像素与变换矩阵。
   * @param cssWidth CSS 宽度
   * @param cssHeight CSS 高度
   */
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
    'pageOffsetX' | 'pageMargins' | 'showMarginRuler' | 'rulerColor' | 'pageBg' | 'pageShadow' | 'scale' | 'groupColors' | 'activeGroupId'
  >>): void {
    Object.assign(this.opts, patch)
  }

  /**
   * 渲染单页缩略图到离屏 canvas 并返回 data URL。
   * 创建临时 canvas（页面尺寸 × dpr），绘制白底背景 + 页面内容，输出 PNG data URL。
   * @param page 页面布局信息
   * @param quality PNG 压缩质量（0-1）
   * @returns 缩略图 data URL；页面尺寸为 0 时返回空字符串
   */
  renderPageThumbnail(page: PageLayout, quality = 0.7): string {
    if (page.rect.width === 0 || page.rect.height === 0) return ''
    const dpr = this.opts.dpr
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(page.rect.width * dpr)
    canvas.height = Math.round(page.rect.height * dpr)
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // 页面背景
    ctx.fillStyle = this.opts.pageBg
    ctx.fillRect(0, 0, page.rect.width, page.rect.height)

    // 内容区原点（相对于页面左上角）
    const contentOriginX = page.contentRect.x - page.rect.x
    const contentOriginY = page.contentRect.y - page.rect.y
    const aliveIds = new Set<number>()
    for (const b of page.blocks) {
      this.renderBlockOnMain(ctx, b, contentOriginX, contentOriginY, aliveIds)
    }

    // 页眉
    if (page.headerBlocks && page.headerRect) {
      const hx = page.headerRect.x - page.rect.x
      const hy = page.headerRect.y - page.rect.y
      for (const b of page.headerBlocks) {
        this.renderBlockOnMain(ctx, b, hx, hy, aliveIds)
      }
    }

    // 页脚
    if (page.footerBlocks && page.footerRect) {
      const fx = page.footerRect.x - page.rect.x
      const fy = page.footerRect.y - page.rect.y
      for (const b of page.footerBlocks) {
        this.renderBlockOnMain(ctx, b, fx, fy, aliveIds)
      }
    }

    return canvas.toDataURL('image/png', quality)
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
   * 注意：不再自行 clearOverlay，由调用方先 clearOverlay 再画选区再画光标。
   * cx: 文档坐标 x；cy: 文档坐标 y；height: 光标高度；scrollY, visible: 闪烁开关
   */
  drawCaret(cx: number, cy: number, height: number, scrollY: number, visible: boolean): void {
    if (!visible) return
    const ov = this.overlayCtx
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

  /**
   * 绘制选区高亮（overlay 层）。传入文档坐标矩形列表，内部应用 scrollY 与 pageOffsetX。
   */
  drawSelection(rects: { x: number; y: number; width: number; height: number }[], scrollY: number): void {
    if (rects.length === 0) return
    const ov = this.overlayCtx
    ov.save()
    ov.fillStyle = 'rgba(77, 146, 255, 0.3)'
    for (const r of rects) {
      const x = Math.round(r.x + this.opts.pageOffsetX)
      const y = Math.round(r.y - scrollY)
      ov.fillRect(x, y, Math.round(r.width), Math.round(r.height))
    }
    ov.restore()
  }

  /** 清除 overlay 上的光标 / 选区 */
  clearOverlay(): void {
    this.overlayCtx.clearRect(0, 0, this.cssWidth, this.cssHeight)
  }

  /** 绘制页眉/页脚编辑区域的分隔虚线（一条横穿整页宽度的淡灰虚线） */
  drawZoneBorder(
    layout: DocumentLayout,
    scrollY: number,
    zone: 'header' | 'footer',
    pageOffsetX: number
  ): void {
    const ov = this.overlayCtx
    ov.save()
    ov.strokeStyle = '#d9d9d9'
    ov.lineWidth = 1
    ov.setLineDash([4, 3])
    for (const page of layout.pages) {
      const rect = zone === 'header' ? page.headerRect : page.footerRect
      if (!rect) continue
      const pageBottom = page.rect.y + page.rect.height
      if (pageBottom < scrollY || page.rect.y > scrollY + this.cssHeight) continue

      // 横向范围：横穿整页宽度（含左右页边距）
      const lineStartX = Math.round(page.rect.x + pageOffsetX) + 0.5
      const lineEndX = lineStartX + Math.round(page.rect.width) - 1

      // 页眉：分隔线在页眉区域下沿（正文顶部）
      // 页脚：分隔线在页脚区域上沿（正文底部）
      const lineY = zone === 'header'
        ? Math.round(rect.y + rect.height - scrollY) + 0.5
        : Math.round(rect.y - scrollY) + 0.5

      ov.beginPath()
      ov.moveTo(lineStartX, lineY)
      ov.lineTo(lineEndX, lineY)
      ov.stroke()
    }
    ov.restore()
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

      // 页背景（居中偏移 + 柔和阴影）
      const px = Math.round(page.rect.x + this.opts.pageOffsetX)
      const py = Math.round(page.rect.y - scrollY)
      bg.save()
      bg.shadowColor = this.opts.pageShadow
      bg.shadowBlur = 12
      bg.shadowOffsetX = 0
      bg.shadowOffsetY = 4
      bg.fillStyle = this.opts.pageBg
      bg.fillRect(px, py, page.rect.width, page.rect.height)
      bg.restore()

      // WPS 风格四角边距标尺
      if (this.opts.showMarginRuler) {
        this.drawMarginRuler(bg, px, py, page.rect.width, page.rect.height)
      }

      const contentOriginX = page.contentRect.x + this.opts.pageOffsetX
      const contentOriginY = page.contentRect.y - scrollY

      for (const b of page.blocks) {
        this.renderBlockOnMain(ct, b, contentOriginX, contentOriginY, aliveIds)
      }

      // 页眉内容
      if (page.headerBlocks && page.headerRect) {
        const hx = page.headerRect.x + this.opts.pageOffsetX
        const hy = page.headerRect.y - scrollY
        for (const b of page.headerBlocks) {
          this.renderBlockOnMain(ct, b, hx, hy, aliveIds)
        }
      }

      // 页脚内容
      if (page.footerBlocks && page.footerRect) {
        const fx = page.footerRect.x + this.opts.pageOffsetX
        const fy = page.footerRect.y - scrollY
        for (const b of page.footerBlocks) {
          this.renderBlockOnMain(ct, b, fx, fy, aliveIds)
        }
      }
    }

    // GC：淘汰未使用的 bitmap
    for (const id of Array.from(this.blockCache.keys())) {
      if (!aliveIds.has(id)) this.blockCache.delete(id)
    }
    // 已应用完 dirty
    this.dirtyBlocks.clear()
  }

  /**
   * 渲染单个 block 到主 content canvas：按需构建/复用位图，再 drawImage 落位。
   * @param ctx 主 canvas 2d 上下文
   * @param b 待渲染块
   * @param originX 块所属内容区在 canvas 上的 x 原点
   * @param originY 块所属内容区在 canvas 上的 y 原点（已应用 scrollY）
   * @param aliveIds 收集本帧使用中的 block id，用于 GC 旧位图
   */
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

    // 分割线：直接在主 canvas 上按样式画线（简单图形，不走 bitmap 缓存）
    if (b.kind === 'separator') {
      this.drawSeparator(ctx, b, bx, by)
      return
    }

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

  /** 绘制分割线，按元素上的 lineType/lineWidth/dashArray/color 渲染 */
  private drawSeparator(ctx: CanvasRenderingContext2D, b: SeparatorBlock, bx: number, by: number): void {
    const anyBlock = b.block as unknown as Record<string, unknown>
    const lineType = (anyBlock.lineType as string) || 'solid'
    const lineWidth = Number(anyBlock.lineWidth ?? 1)
    const dashArray = Array.isArray(anyBlock.dashArray) ? (anyBlock.dashArray as number[]) : [0, 0]
    const color = (anyBlock.color as string) || '#9e9e9e'
    const x0 = Math.round(bx)
    const x1 = Math.round(bx + b.rect.width)
    const cy = by + Math.round(b.rect.height / 2)

    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'butt'

    if (lineType === 'wavy') {
      // 波浪线：用正弦近似，振幅随线宽
      const amp = Math.max(1.5, lineWidth * 1.5)
      const wave = 6
      ctx.beginPath()
      for (let x = x0; x <= x1; x += 1) {
        const y = cy + amp * Math.sin(((x - x0) / wave) * Math.PI)
        if (x === x0) { ctx.moveTo(x, y) } else { ctx.lineTo(x, y) }
      }
      ctx.stroke()
    } else if (lineType === 'double' || lineType === 'triple') {
      const gap = Math.max(2, lineWidth + 1.5)
      const lines = lineType === 'triple' ? [-gap, 0, gap] : [-gap / 2, gap / 2]
      ctx.setLineDash(dashArray)
      for (const off of lines) {
        ctx.beginPath()
        ctx.moveTo(x0, Math.round(cy + off) + 0.5)
        ctx.lineTo(x1, Math.round(cy + off) + 0.5)
        ctx.stroke()
      }
    } else if (lineType === 'shadow') {
      // 阴影线：主线下方画一条浅色偏移线
      ctx.beginPath()
      ctx.moveTo(x0, Math.round(cy) + 0.5)
      ctx.lineTo(x1, Math.round(cy) + 0.5)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'
      ctx.beginPath()
      ctx.moveTo(x0, Math.round(cy + 1.5) + 0.5)
      ctx.lineTo(x1, Math.round(cy + 1.5) + 0.5)
      ctx.stroke()
    } else if (lineType === 'emboss') {
      // 浮雕线：上亮下暗
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'
      ctx.beginPath()
      ctx.moveTo(x0, Math.round(cy - 0.75) + 0.5)
      ctx.lineTo(x1, Math.round(cy - 0.75) + 0.5)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'
      ctx.beginPath()
      ctx.moveTo(x0, Math.round(cy + 0.75) + 0.5)
      ctx.lineTo(x1, Math.round(cy + 0.75) + 0.5)
      ctx.stroke()
    } else if (lineType === 'gradient') {
      // 渐变线：左透明右实色
      const grad = ctx.createLinearGradient(x0, 0, x1, 0)
      grad.addColorStop(0, 'rgba(158,158,158,0)')
      grad.addColorStop(1, color)
      ctx.strokeStyle = grad
      ctx.beginPath()
      ctx.moveTo(x0, Math.round(cy) + 0.5)
      ctx.lineTo(x1, Math.round(cy) + 0.5)
      ctx.stroke()
    } else {
      // solid / dotted / dashed
      ctx.setLineDash(dashArray)
      ctx.beginPath()
      ctx.moveTo(x0, Math.round(cy) + 0.5)
      ctx.lineTo(x1, Math.round(cy) + 0.5)
      ctx.stroke()
    }
    ctx.restore()
  }

  /**
   * 为单个 block 构建独立位图（paragraph/image），返回新建的 canvas。
   * @param b 待构建块（仅处理 paragraph/image，其它类型返回空 canvas）
   * @returns 渲染好块内容的 canvas 元素
   */
  private buildBlockBitmap(b: BlockNode): HTMLCanvasElement {
    const dpr = this.opts.dpr
    const w = Math.max(1, Math.ceil(b.rect.width))
    const h = Math.max(1, Math.ceil(b.rect.height))
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(w * dpr))
    c.height = Math.max(1, Math.round(h * dpr))
    const ctx = c.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (b.kind === 'paragraph') {
      if (b.surroundImage) {
        const si = b.surroundImage
        const sx = si.rect.x
        const sy = 0
        const mode = String((si.block as unknown as { imgDisplay?: string }).imgDisplay ?? 'surround')
        if (mode === 'floatBottom') {
          this.drawImageInto(ctx, si, sx, sy)
          this.drawParagraphInto(ctx, b)
        } else {
          this.drawParagraphInto(ctx, b)
          if (mode === 'surround') {
            ctx.clearRect(sx, sy, si.rect.width, si.rect.height)
          }
          this.drawImageInto(ctx, si, sx, sy)
        }
      } else {
        this.drawParagraphInto(ctx, b)
      }
    }
    else if (b.kind === 'image') this.drawImageInto(ctx, b, 0, 0)
    return c
  }

  /** 将 hex/rgb 颜色转为半透明高亮色（用于批注/修订文本背景） */
  private _groupHighlightColor(color: string): string {
    const m = color.match(/^#([0-9a-f]{6})$/i)
    if (m) {
      const r = parseInt(m[1].slice(0, 2), 16)
      const g = parseInt(m[1].slice(2, 4), 16)
      const b = parseInt(m[1].slice(4, 6), 16)
      return `rgba(${r},${g},${b},0.18)`
    }
    return color
  }

  /**
   * 将段落块绘制到目标 ctx：项目符号/编号 + 分桶文本 + 背景色 + 下划线/删除线。
   * @param ctx 目标 2d 上下文
   * @param b 段落块
   */
  private drawParagraphInto(ctx: CanvasRenderingContext2D, b: ParagraphBlock): void {
    // 项目符号 / 编号（list 段落必有；title 段落若关联多级列表也会有）
    if (b.bulletText) {
      const firstLine = b.lines[0]
      if (firstLine) {
        const size = b.bulletSize ?? 16
        const family = b.bulletFont ?? 'sans-serif'
        const bold = b.bulletBold ? '700' : '400'
        ctx.font = `${bold} ${size}px ${family}`
        ctx.fillStyle = b.bulletColor ?? '#000000'
        ctx.textBaseline = 'alphabetic'
        // 绘制位置：优先使用 bulletX 偏移（相对首行 x，支持 lvlJc 对齐）；
        // 无偏移时回退到 "文本起点 - bulletWidth"（等价原行为）。
        const bx = firstLine.x + (b.bulletX ?? -(b.bulletWidth ?? 0))
        const by = firstLine.y + firstLine.baseline
        ctx.fillText(b.bulletText, bx, by)
      }
    }
    // 分桶
    const buckets = new Map<string, DrawCommand[]>()
    const bgRects: { x: number; y: number; w: number; h: number; color: string }[] = []
    const strokes: { x1: number; y1: number; x2: number; y2: number; color: string; width: number }[] = []
    const groupColors = this.opts.groupColors
    for (const line of b.lines) {
      for (const inl of line.inlines) {
        if (inl.bgColor) {
          bgRects.push({ x: inl.x, y: inl.y, w: inl.width, h: line.height, color: inl.bgColor })
        }
        const activeGroupId = this.opts.activeGroupId
        if (activeGroupId && groupColors && inl.groupIds?.includes(activeGroupId)) {
          const gc = groupColors[activeGroupId]
          if (gc) {
            bgRects.push({ x: inl.x, y: inl.y, w: inl.width, h: line.height, color: this._groupHighlightColor(gc.color) })
          }
        }
        const font = fontOf(inl)
        const key = `${font}||${inl.color}`
        addBucket(buckets, key, {
          font, color: inl.color,
          x: inl.x, y: inl.baseline,
          text: inl.text,
          letterSpacing: inl.letterSpacing
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
      for (const c of list) {
        if (!c.letterSpacing) {
          ctx.fillText(c.text, c.x, c.y)
        } else {
          // 逐字绘制以支持两端对齐字距
          let cx = c.x
          for (let i = 0; i < c.text.length; i++) {
            const ch = c.text[i]
            ctx.fillText(ch, cx, c.y)
            cx += ctx.measureText(ch).width + c.letterSpacing
          }
        }
      }
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

  /**
   * 将图片块绘制到目标 ctx：异步加载图片，加载完成后触发重绘；支持 90/180/270 旋转。
   * @param ctx 目标 2d 上下文
   * @param b 图片块
   * @param x 绘制左上角 x
   * @param y 绘制左上角 y
   */
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
    const rotate = Number((b.block as unknown as { rotate?: number }).rotate ?? 0) % 360
    if (img.complete && img.naturalWidth > 0) {
      try {
        if (rotate === 0) {
          ctx.drawImage(img, x, y, b.rect.width, b.rect.height)
        } else {
          const cx = x + b.rect.width / 2
          const cy = y + b.rect.height / 2
          ctx.save()
          ctx.translate(cx, cy)
          ctx.rotate((rotate * Math.PI) / 180)
          const dw = (rotate === 90 || rotate === 270) ? b.rect.height : b.rect.width
          const dh = (rotate === 90 || rotate === 270) ? b.rect.width : b.rect.height
          ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh)
          ctx.restore()
        }
      } catch { /* ignore CORS */ }
    } else {
      ctx.strokeStyle = '#cccccc'
      ctx.strokeRect(x + 0.5, y + 0.5, b.rect.width - 1, b.rect.height - 1)
      ctx.fillStyle = '#f5f5f5'
      ctx.fillRect(x, y, b.rect.width, b.rect.height)
    }
  }

  /**
   * 绘制表格块到主 canvas：依次绘制单元格背景色、单元格内容、统一边框（共享边去重）与斜线。
   * @param ctx 主 canvas 2d 上下文
   * @param b 表格块
   * @param bx 表格左上角在 canvas 上的 x
   * @param by 表格左上角在 canvas 上的 y
   * @param aliveIds 收集本帧使用中的 block id，用于 GC
   */
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
    // 3) 统一绘制边框（每条网格边只画一次，避免共享边被重复描绘制造成"边框加深/重影"）
    // 用"边端点 + 方向"做去重：相邻两个 cell 的共享边、跨行格下探边都会折叠为一条。
    // 像素对齐沿用 strokeSide（奇数宽 +0.5）。
    const drawnEdges = new Set<string>()
    const edgeKey = (x1: number, y1: number, x2: number, y2: number): string => {
      // 归一化端点（保证横边/竖边方向唯一），保留 0.5px 精度避免浮点抖动
      const a1 = Math.round(x1 * 2) / 2, b1 = Math.round(y1 * 2) / 2
      const a2 = Math.round(x2 * 2) / 2, b2 = Math.round(y2 * 2) / 2
      if (a1 === a2 && b1 === b2) return ''
      // 竖边：x 相同，按 y 排序；横边：y 相同，按 x 排序
      if (a1 === a2) return `V${a1}:${Math.min(b1, b2)}-${Math.max(b1, b2)}`
      return `H${b1}:${Math.min(a1, a2)}-${Math.max(a1, a2)}`
    }
    const drawOnce = (
      x1: number, y1: number, x2: number, y2: number,
      side?: { width: number; color: string; style: string }
    ) => {
      // 该侧无边框定义 → 不画且不占用去重 key（否则会挡住邻格共享边的绘制）
      if (!side || side.style === 'none' || side.width <= 0) return
      const key = edgeKey(x1, y1, x2, y2)
      if (!key || drawnEdges.has(key)) return   // 已画过（共享边）→ 跳过
      drawnEdges.add(key)
      strokeSide(ctx, x1, y1, x2, y2, side)
    }
    // 每个 cell 四条边都尝试绘制（数据中共享边可能只由某一侧的格子定义，
    // 例如附表5：水平分隔线只定义在上格的 bottom，下格无 top），
    // 共享边由先遍历到的格子画出，后到的经 drawnEdges 去重跳过。
    for (const row of b.rows) {
      for (const cell of row.cells) {
        const cx = bx + cell.rect.x
        const cy = by + cell.rect.y
        const cw = cell.rect.width
        const ch = cell.rect.height
        const bs = cell.cell.borderStyle
        // borderTypes: [top,right,bottom,left]，值为 0 表示隐藏该侧（三线表等场景）
        const bt = (cell.cell as unknown as { borderTypes?: number[] }).borderTypes
        const showTop    = !bt || bt[0] !== 0
        const showRight  = !bt || bt[1] !== 0
        const showBottom = !bt || bt[2] !== 0
        const showLeft   = !bt || bt[3] !== 0
        if (showTop)    drawOnce(cx, cy, cx + cw, cy, bs.top)              // 顶边
        if (showBottom) drawOnce(cx, cy + ch, cx + cw, cy + ch, bs.bottom) // 底边
        if (showLeft)   drawOnce(cx, cy, cx, cy + ch, bs.left)             // 左边
        if (showRight)  drawOnce(cx + cw, cy, cx + cw, cy + ch, bs.right)  // 右边
        // slashTypes: 单元格斜线（斜表头）
        const slashes = (cell.cell as unknown as { slashTypes?: string[] }).slashTypes
        if (slashes && slashes.length > 0) {
          const side = bs.top ?? bs.bottom ?? bs.left ?? bs.right
          const color = side?.color ?? '#000000'
          const width = side?.width ?? 1
          ctx.save()
          ctx.strokeStyle = color
          ctx.lineWidth = width
          for (const s of slashes) {
            ctx.beginPath()
            if (s === 'forward') {
              // '/'：左下 -> 右上
              ctx.moveTo(cx + 0.5, cy + ch + 0.5)
              ctx.lineTo(cx + cw + 0.5, cy + 0.5)
            } else if (s === 'backward') {
              // '\'：左上 -> 右下
              ctx.moveTo(cx + 0.5, cy + 0.5)
              ctx.lineTo(cx + cw + 0.5, cy + ch + 0.5)
            } else if (s === 'cross') {
              // '×'：两条对角线
              ctx.moveTo(cx + 0.5, cy + 0.5)
              ctx.lineTo(cx + cw + 0.5, cy + ch + 0.5)
              ctx.moveTo(cx + 0.5, cy + ch + 0.5)
              ctx.lineTo(cx + cw + 0.5, cy + 0.5)
            }
            ctx.stroke()
          }
          ctx.restore()
        }
      }
    }
  }

  /* -------------------- 边距标尺（WPS 风格） -------------------- */

  /**
   * 绘制 WPS 风格四角边距标尺：内容区四角的角标朝外伸入页边距。
   * @param ctx 背景 2d 上下文
   * @param px 页面左上角 x
   * @param py 页面左上角 y
   * @param pw 页面宽度
   * @param ph 页面高度
   */
  private drawMarginRuler(
    ctx: CanvasRenderingContext2D,
    px: number, py: number, pw: number, ph: number
  ): void {
    const [mt, mr, mb, ml] = this.opts.pageMargins
    const color = this.opts.rulerColor
    const L = 20 // 角标两臂等长
    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    // WPS 风格：内容区四角的角标朝"外"伸入页边距，
    // 顶部指示器垂直臂朝上、底部指示器垂直臂朝下，水平臂分别朝左右外侧
    const drawCorner = (cx: number, cy: number, dx: number, dy: number) => {
      ctx.beginPath()
      ctx.moveTo(cx + dx * L + 0.5, cy + 0.5)
      ctx.lineTo(cx + 0.5, cy + 0.5)
      ctx.lineTo(cx + 0.5, cy + dy * L + 0.5)
      ctx.stroke()
    }
    // 左上：内边距点 (px+ml, py+mt)，水平臂朝左、垂直臂朝上
    drawCorner(px + ml, py + mt, -1, -1)
    // 右上：水平臂朝右、垂直臂朝上
    drawCorner(px + pw - mr, py + mt, 1, -1)
    // 左下：水平臂朝左、垂直臂朝下
    drawCorner(px + ml, py + ph - mb, -1, 1)
    // 右下：水平臂朝右、垂直臂朝下
    drawCorner(px + pw - mr, py + ph - mb, 1, 1)
    ctx.restore()
  }

  /* -------------------- overlay: 旧接口（保留兼容） -------------------- */

  /**
   * 简易光标绘制（旧接口，保留兼容）：清空 overlay 后绘制一条竖线。
   * @param x 光标 x
   * @param y 光标顶部 y
   * @param height 光标高度
   * @param color 光标颜色，默认 '#000000'
   */
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

/**
 * 由 inline 拼出 CSS font 字符串（含粗细、斜体、字号、字体族）。
 * @param inl inline 元数据
 * @returns CSS font 简写字符串
 */
function fontOf(inl: InlineBox): string {
  const w = inl.bold ? '700' : '400'
  const s = inl.italic ? 'italic ' : ''
  return `${s}${w} ${inl.size}px ${inl.font}`
}

/**
 * 将绘制命令按 key 推入分桶，便于后续按相同 font/color 批量绘制。
 * @param buckets 桶映射
 * @param key 桶键（通常为 font||color）
 * @param cmd 待加入的绘制命令
 */
function addBucket(buckets: Map<string, DrawCommand[]>, key: string, cmd: DrawCommand): void {
  let list = buckets.get(key)
  if (!list) { list = []; buckets.set(key, list) }
  list.push(cmd)
}

/**
 * 绘制一条带样式的边：支持 solid/dashed/dotted/double，并对奇数宽度做 0.5px 像素对齐。
 * @param ctx 目标 2d 上下文
 * @param x1 起点 x
 * @param y1 起点 y
 * @param x2 终点 x
 * @param y2 终点 y
 * @param side 边样式（宽/色/风格）
 */
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
