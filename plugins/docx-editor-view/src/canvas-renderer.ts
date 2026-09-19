/**
 * VerveDocs View —— CanvasRenderer
 *
 * 背景 DOM 层 + content/overlay 两层 canvas。
 *
 * 增量重绘：
 *  - 每个 Block 拥有独立 canvas 位图，key = block.id。
 *  - 首次或 dirty 时重建该 block bitmap；否则复用。
 *  - 主 content canvas 每帧执行：clear + drawImage(bitmap) 到屏幕对应位置。
 *  - 因此"内容变化局部更新" = 只对 dirty block 重建 bitmap。
 *
 * 坐标：block/line/inline 均使用块本地坐标；绘制到 bitmap 时以 (0,0) 为起点。
 * 主 canvas 落位时 = pageOriginY + block.rect.y - scrollY。
 */

import type {
  BlockNode, DocumentLayout, PageLayout,
  ParagraphBlock, ImageBlock, TableBlock, SeparatorBlock, ChartBlock
} from './layout-types'
import type { IGroupColor } from '@vervedoc/docx-editor-schema'
import { getChartRenderer } from '@vervedoc/docx-editor-schema'
import { paintParagraph, type PaintCtx } from './block-painter'
import { chartTableSignature } from './block-signature'


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
  /** 页码配置（设置后在页眉/页脚中渲染页码） */
  pageNumber?: { style: string; position: 'left' | 'center' | 'right'; zone: 'header' | 'footer' } | null

}


/** 块位图缓存条目：保存已渲染好的位图及其尺寸元信息 */
interface BlockCache {
  /** 块 id（与 BlockNode.id 对应） */
  id: number
  /** 已渲染好的位图（OffscreenCanvas 时为 ImageBitmap，降级时为 HTMLCanvasElement） */
  bitmap: HTMLCanvasElement | ImageBitmap | null
  /** 位图 CSS 宽度 */
  width: number
  /** 位图 CSS 高度 */
  height: number
  /** 创建该位图时的 dpr（dpr 变化时需重建） */
  dpr: number
}

/**
 * Canvas 渲染器：维护背景 DOM 层 + content/overlay 两层 canvas，
 * 负责 block 位图缓存、增量重绘、光标/选区/页眉页脚分隔线绘制。
 */
export class CanvasRenderer {
  /** 背景层 DOM 容器（每页背景 div，z-index:0） */
  private bgLayer: HTMLDivElement
  /** 内容层 canvas（绘制 block 位图） */
  private contentCanvas: HTMLCanvasElement
  /** 覆盖层 canvas（绘制光标、选区高亮、zone 分隔线） */
  private overlayCanvas: HTMLCanvasElement
  /** 内容层 2d 上下文 */
  private contentCtx: CanvasRenderingContext2D
  /** 覆盖层 2d 上下文 */
  private overlayCtx: CanvasRenderingContext2D
  /** 选区层 DOM 容器（选区高亮 div，z-index:3） */
  private selectionLayer: HTMLDivElement
  /** 每页背景 div（页号 → div），带 data-index 供协同光标定位 */
  private pageBgEls = new Map<number, HTMLDivElement>()
  /** 选区高亮 div 池（复用，避免频繁创建） */
  private selectionEls: HTMLDivElement[] = []

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

  /** 当前帧的文档布局（供 drawChartInto 查找表格数据源） */
  private currentLayout: DocumentLayout | null = null


  /** 水印 widget（可选，设置后在每页渲染完成后绘制水印） */
  private watermarkWidget: { drawWatermark(ctx: CanvasRenderingContext2D, page: import('./layout-types').PageLayout, scrollY: number): void; drawWatermarkForThumbnail(ctx: CanvasRenderingContext2D, page: import('./layout-types').PageLayout): void } | null = null

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

    this.bgLayer = this.createDomLayer('bg', 0)
    this.contentCanvas = this.createLayer('content', 1)
    this.overlayCanvas = this.createLayer('overlay', 2)
    this.selectionLayer = this.createDomLayer('selection', 3)
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

  /** 创建一个 DOM 叠加层并挂载到容器 */
  private createDomLayer(name: string, z: number): HTMLDivElement {
    const el = document.createElement('div')
    el.dataset.layer = name
    el.style.position = 'absolute'
    el.style.top = '0'
    el.style.left = '0'
    el.style.zIndex = String(z)
    el.style.pointerEvents = 'none'
    this.container.appendChild(el)
    return el
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
    for (const c of [this.contentCanvas, this.overlayCanvas]) {
      c.width = Math.round(cssWidth * dpr)
      c.height = Math.round(cssHeight * dpr)
      c.style.width = `${cssWidth}px`
      c.style.height = `${cssHeight}px`
    }
    for (const ctx of [this.contentCtx, this.overlayCtx]) {
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
  renderPageThumbnail(page: PageLayout, quality = 0.7, pageCount = 1): string {
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

    this.drawPageNumberForThumbnail(ctx, page, pageCount)
    this.watermarkWidget?.drawWatermarkForThumbnail(ctx, page)

    const image = canvas.toDataURL('image/png', quality)
    this.trimCache()
    return image
  }

  /** 标脏（下一帧只重建这些 block 的 bitmap） */
  markDirty(blockIds: number[] | Set<number>): void {
    for (const id of blockIds) this.dirtyBlocks.add(id)
  }

  /** Retain offscreen document blocks; remove only deleted occurrences. */
  setLayout(layout: DocumentLayout, ids: Set<number>): void {
    this.currentLayout = layout
    for (const [id, cached] of this.blockCache) {
      if (ids.has(id)) continue
      if (cached.bitmap instanceof ImageBitmap) cached.bitmap.close()
      this.blockCache.delete(id)
    }
    for (const id of this.dirtyBlocks) {
      if (!ids.has(id)) this.dirtyBlocks.delete(id)
    }
  }

  /** Bound retained bitmap memory with least-recently-used eviction. */
  private trimCache(): void {
    let bytes = 0
    const size = (entry: BlockCache) => Math.ceil(entry.width) * Math.ceil(entry.height) * entry.dpr ** 2 * 4
    for (const entry of this.blockCache.values()) bytes += size(entry)
    for (const [id, entry] of this.blockCache) {
      if (bytes <= 64 * 1024 * 1024) break
      bytes -= size(entry)
      if (entry.bitmap instanceof ImageBitmap) entry.bitmap.close()
      this.blockCache.delete(id)
    }
  }

  /** 全部标脏（用于选项/主题变更） */
  invalidateAll(): void {
    for (const c of this.blockCache.values()) {
      if (c.bitmap instanceof ImageBitmap) c.bitmap.close()
    }
    this.blockCache.clear()
    this.dirtyBlocks.clear()
  }

  /** 销毁渲染器 */
  destroy(): void {
    for (const c of this.blockCache.values()) {
      if (c.bitmap instanceof ImageBitmap) c.bitmap.close()
    }
    this.pageBgEls.clear()
    this.blockCache.clear()
    this.dirtyBlocks.clear()
    for (const image of this.imageCache.values()) image.onload = null
    this.imageCache.clear()
    this.selectionEls = []
    this.bgLayer.remove()
    this.selectionLayer.remove()
    this.contentCanvas.remove()
    this.overlayCanvas.remove()
  }

  /** 更新页码配置 */
  updatePageNumber(cfg: { style: string; position: 'left' | 'center' | 'right'; zone: 'header' | 'footer' } | null): void {
    this.opts.pageNumber = cfg
  }

  /** 设置水印 widget */
  setWatermarkWidget(widget: { drawWatermark(ctx: CanvasRenderingContext2D, page: import('./layout-types').PageLayout, scrollY: number): void; drawWatermarkForThumbnail(ctx: CanvasRenderingContext2D, page: import('./layout-types').PageLayout): void } | null): void {
    this.watermarkWidget = widget
  }


  /** 将数字转为罗马数字字符串 */
  private toRoman(num: number): string {
    const map: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
    let result = ''
    for (const [v, s] of map) {
      while (num >= v) { result += s; num -= v }
    }
    return result
  }

  /** 将数字转为中文数字字符串（支持大写） */
  private toChineseNumber(num: number, uppercase = false): string {
    const digits = uppercase
      ? ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
      : ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
    const units = uppercase
      ? ['', '拾', '佰', '仟', '萬', '億']
      : ['', '十', '百', '千', '万', '亿']
    if (num === 0) return digits[0]
    if (num < 10) return digits[num]
    if (num < 20) return (num === 10 ? units[1] : units[1] + digits[num - 10])
    if (num < 100) {
      const tens = Math.floor(num / 10)
      const ones = num % 10
      return digits[tens] + units[1] + (ones > 0 ? digits[ones] : '')
    }
    if (num < 1000) {
      const hundreds = Math.floor(num / 100)
      const rest = num % 100
      let result = digits[hundreds] + units[2]
      if (rest >= 10) {
        result += this.toChineseNumber(rest, uppercase)
      } else if (rest > 0) {
        result += digits[0] + digits[rest]
      }
      return result
    }
    if (num < 10000) {
      const thousands = Math.floor(num / 1000)
      const rest = num % 1000
      let result = digits[thousands] + units[3]
      if (rest >= 100) {
        result += this.toChineseNumber(rest, uppercase)
      } else if (rest > 0) {
        result += digits[0] + this.toChineseNumber(rest, uppercase)
      }
      return result
    }
    return String(num)
  }

  /**
   * 在页眉/页脚区域绘制页码文本。
   * @param ct 内容 canvas 上下文
   * @param page 页面布局
   * @param scrollY 滚动偏移
   * @param totalPages 总页数
   */
  private drawPageNumber(
    ct: CanvasRenderingContext2D,
    page: { index: number; rect: { x: number; y: number; width: number; height: number }; headerRect?: { x: number; y: number; width: number; height: number } | null; footerRect?: { x: number; y: number; width: number; height: number } | null },
    scrollY: number,
    totalPages: number
  ): void {
    const cfg = this.opts.pageNumber
    if (!cfg) return
    const rect = cfg.zone === 'header' ? page.headerRect : page.footerRect
    if (!rect) return
    const text = this.formatPageNumber(page.index, totalPages, cfg.style)
    ct.save()
    ct.fillStyle = '#333333'
    ct.font = '12px "Microsoft YaHei", "PingFang SC", sans-serif'
    const metrics = ct.measureText(text)
    const textW = metrics.width
    const textH = 16
    const cx = page.rect.x + this.opts.pageOffsetX
    let x: number
    if (cfg.position === 'left') {
      x = cx + rect.x - page.rect.x + 4
    } else if (cfg.position === 'right') {
      x = cx + rect.x - page.rect.x + rect.width - textW - 4
    } else {
      x = cx + rect.x - page.rect.x + (rect.width - textW) / 2
    }
    const baselineY = cfg.zone === 'header'
      ? rect.y + rect.height - textH - 4 - scrollY
      : rect.y + 4 - scrollY
    ct.fillText(text, x, baselineY + textH)
    ct.restore()
  }

  /**
   * 为缩略图绘制页码（原点在页面左上角 0,0，无 scrollY/pageOffsetX）。
   */
  private drawPageNumberForThumbnail(
    ct: CanvasRenderingContext2D,
    page: { index: number; rect: { x: number; y: number; width: number; height: number }; headerRect?: { x: number; y: number; width: number; height: number } | null; footerRect?: { x: number; y: number; width: number; height: number } | null },
    totalPages: number
  ): void {
    const cfg = this.opts.pageNumber
    if (!cfg) return
    const rect = cfg.zone === 'header' ? page.headerRect : page.footerRect
    if (!rect) return
    const text = this.formatPageNumber(page.index, totalPages, cfg.style)
    ct.save()
    ct.fillStyle = '#333333'
    ct.font = '12px "Microsoft YaHei", "PingFang SC", sans-serif'
    const metrics = ct.measureText(text)
    const textW = metrics.width
    const textH = 16
    const relX = rect.x - page.rect.x
    const relY = rect.y - page.rect.y
    let x: number
    if (cfg.position === 'left') {
      x = relX + 4
    } else if (cfg.position === 'right') {
      x = relX + rect.width - textW - 4
    } else {
      x = relX + (rect.width - textW) / 2
    }
    const baselineY = cfg.zone === 'header'
      ? relY + rect.height - textH - 4
      : relY + 4
    ct.fillText(text, x, baselineY + textH)
    ct.restore()
  }

  /**
   * 将页码索引格式化为字符串（Word 标准格式 + 原有格式）。
   * @param index 页码索引（从 0 开始）
   * @param totalPages 总页数
   * @param style 页码样式
   * @returns 格式化后的页码字符串
   */
  private formatPageNumber(index: number, totalPages: number, style: string): string {
    const n = index + 1
    switch (style) {
      case '第1页': return `第${n}页`
      case '第1页共x页': return `第${n}页共${totalPages}页`
      case '1/x': return `${n}/${totalPages}`
      case '第一页': return `第${this.toChineseNumber(n)}页`
      case '第一页共X页': return `第${this.toChineseNumber(n)}页共${this.toChineseNumber(totalPages)}页`
      case '1, 2, 3 ...': return String(n)
      case 'I, II, III ...': return this.toRoman(n).toUpperCase()
      case 'i, ii, iii ...': return this.toRoman(n).toLowerCase()
      case 'A, B, C ...': return String.fromCharCode(64 + n)
      case 'a, b, c ...': return String.fromCharCode(96 + n)
      case '一, 二, 三 ...': return this.toChineseNumber(n)
      case '壹, 贰, 叁 ...': return this.toChineseNumber(n, true)
      default: return String(n)
    }
  }


  /* -------------------- 光标 / 选区（Overlay） -------------------- */

  /**

   * 绘制选区高亮（DOM div 池）。传入文档坐标矩形列表，内部应用 scrollY 与 pageOffsetX。
   */
  drawSelection(rects: { x: number; y: number; width: number; height: number }[], scrollY: number): void {
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i]
      let el = this.selectionEls[i]
      if (!el) {
        el = document.createElement('div')
        el.className = 'vd-selection'
        el.style.position = 'absolute'
        el.style.background = 'rgba(77, 146, 255, 0.3)'
        el.style.pointerEvents = 'none'
        this.selectionLayer.appendChild(el)
        this.selectionEls[i] = el
      }
      el.style.display = 'block'
      el.style.left = `${Math.round(r.x + this.opts.pageOffsetX)}px`
      el.style.top = `${Math.round(r.y - scrollY)}px`
      el.style.width = `${Math.round(r.width)}px`
      el.style.height = `${Math.round(r.height)}px`
    }
    for (let i = rects.length; i < this.selectionEls.length; i++) {
      this.selectionEls[i].style.display = 'none'
    }
  }

  /** 清除 overlay canvas 上的光标/zone，并隐藏选区 div */
  clearOverlay(): void {
    this.overlayCtx.clearRect(0, 0, this.cssWidth, this.cssHeight)
    for (const el of this.selectionEls) el.style.display = 'none'
  }

  /** 绘制页眉/页脚编辑区域的虚线边框（参照 Word：紧贴可输入内容区域的矩形边框） */
  drawZoneBorder(
    layout: DocumentLayout,
    scrollY: number,
    zone: 'header' | 'footer',
    pageOffsetX: number
  ): void {
    const ov = this.overlayCtx
    ov.save()
    ov.strokeStyle = this.opts.rulerColor
    ov.lineWidth = 1
    ov.setLineDash([4, 3])
    for (const page of layout.pages) {
      const rect = zone === 'header' ? page.headerRect : page.footerRect
      if (!rect) continue
      const pageBottom = page.rect.y + page.rect.height
      if (pageBottom < scrollY || page.rect.y > scrollY + this.cssHeight) continue

      const blocks = zone === 'header' ? page.headerBlocks : page.footerBlocks
      // 虚线矩形紧贴可输入内容区域，并留出 4px 视觉间距：
      // - 页眉：顶部在内容上方 4px，底部对齐边距区域下沿（正文顶部）
      // - 页脚：顶部对齐边距区域上沿（正文底部），底部在内容下方 4px
      const PADDING = 20
      let top: number
      let bottom: number
      if (zone === 'header') {
        bottom = rect.y + rect.height
        if (blocks && blocks.length > 0) {
          const contentTop = Math.min(...blocks.map(b => b.rect.y))
          top = rect.y + contentTop - PADDING
        } else {
          top = rect.y
        }
      } else {
        top = rect.y
        if (blocks && blocks.length > 0) {
          const contentBottom = Math.max(...blocks.map(b => b.rect.y + b.rect.height))
          bottom = rect.y + contentBottom + PADDING
        } else {
          bottom = rect.y + rect.height
        }
      }

      const x = Math.round(rect.x + pageOffsetX) + 0.5
      const y = Math.round(top - scrollY) + 0.5
      const w = Math.round(rect.width) - 1
      const h = Math.max(0, Math.round(bottom - top) - 1)

      // 只绘制三边虚线（靠近正文的一侧由贯穿整页的分隔虚线代替，避免重叠）：
      // - 页眉：上 + 左 + 右（不画底部）
      // - 页脚：下 + 左 + 右（不画顶部）
      ov.beginPath()
      if (zone === 'header') {
        // 上边
        ov.moveTo(x, y)
        ov.lineTo(x + w, y)
        // 左边
        ov.moveTo(x, y)
        ov.lineTo(x, y + h)
        // 右边
        ov.moveTo(x + w, y)
        ov.lineTo(x + w, y + h)
      } else {
        // 下边
        ov.moveTo(x, y + h)
        ov.lineTo(x + w, y + h)
        // 左边
        ov.moveTo(x, y)
        ov.lineTo(x, y + h)
        // 右边
        ov.moveTo(x + w, y)
        ov.lineTo(x + w, y + h)
      }
      ov.stroke()

      // 贯穿整页宽度的分隔虚线（页眉：正文顶部；页脚：正文底部）
      const fullLineStartX = Math.round(page.rect.x + pageOffsetX) + 0.5
      const fullLineEndX = fullLineStartX + Math.round(page.rect.width) - 1
      const dividerY = zone === 'header'
        ? Math.round(bottom - scrollY) + 0.5
        : Math.round(top - scrollY) + 0.5
      ov.beginPath()
      ov.moveTo(fullLineStartX, dividerY)
      ov.lineTo(fullLineEndX, dividerY)
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
  render(layout: DocumentLayout, scrollY: number, viewportHeight: number, dirtyRect?: { x: number; y: number; width: number; height: number } | null): void {
    this.currentLayout = layout
    const ct = this.contentCtx
    const w = this.cssWidth
    const h = this.cssHeight
    const pageCount = layout.pages.length
    const aliveIds = new Set<number>()

    // 脏区域合成：无重排局部变更时只清 + 重画脏区域，不重画 bg，跳过 GC
    if (dirtyRect) {
      if (dirtyRect.width <= 0 || dirtyRect.height <= 0) return

      // Expand to physical pixel boundaries; rounding just the origin can leave
      // partially cleared rows when a fractional-height header intersects a table.
      const dpr = this.opts.dpr
      const dx = Math.floor((dirtyRect.x + this.opts.pageOffsetX) * dpr) / dpr
      const dy = Math.floor((dirtyRect.y - scrollY) * dpr) / dpr
      const dw = Math.ceil((dirtyRect.x + dirtyRect.width + this.opts.pageOffsetX) * dpr) / dpr - dx
      const dh = Math.ceil((dirtyRect.y + dirtyRect.height - scrollY) * dpr) / dpr - dy
      const dTop = dirtyRect.y
      const dBottom = dirtyRect.y + dirtyRect.height

      ct.clearRect(dx, dy, dw, dh)
      ct.save()
      ct.beginPath()
      ct.rect(dx, dy, dw, dh)
      ct.clip()
      for (const page of layout.pages) {
        const pageBottom = page.rect.y + page.rect.height
        if (pageBottom < dTop || page.rect.y > dBottom ||
            pageBottom < scrollY || page.rect.y > scrollY + viewportHeight) continue
        this.renderPageContent(ct, page, scrollY, pageCount, aliveIds)
      }
      ct.restore()
      this.trimCache()
      return
    }

    // 全量

    ct.clearRect(0, 0, w, h)
    const viewTop = scrollY
    const viewBottom = scrollY + viewportHeight

    this.renderBgDom(layout, scrollY, viewportHeight)

    for (const page of layout.pages) {
      const pageBottom = page.rect.y + page.rect.height
      if (pageBottom < viewTop || page.rect.y > viewBottom) continue
      this.renderPageContent(ct, page, scrollY, pageCount, aliveIds)
    }

    this.trimCache()
  }

  /** 渲染每页背景 DOM div（带 data-index 供协同光标定位） */
  private renderBgDom(layout: DocumentLayout, scrollY: number, viewportHeight: number): void {
    const viewTop = scrollY
    const viewBottom = scrollY + viewportHeight
    const alive = new Set<number>()
    for (const page of layout.pages) {
      const pageBottom = page.rect.y + page.rect.height
      if (pageBottom < viewTop || page.rect.y > viewBottom) continue
      alive.add(page.index)
      let el = this.pageBgEls.get(page.index)
      if (!el) {
        el = document.createElement('div')
        el.className = 'vd-page-bg'
        el.dataset.index = String(page.index)
        el.style.position = 'absolute'
        el.style.background = this.opts.pageBg
        el.style.boxShadow = `0 4px 12px ${this.opts.pageShadow}`
        el.style.pointerEvents = 'none'
        this.bgLayer.appendChild(el)
        this.pageBgEls.set(page.index, el)
      }
      el.style.left = `${Math.round(page.rect.x + this.opts.pageOffsetX)}px`
      el.style.top = `${Math.round(page.rect.y - scrollY)}px`
      el.style.width = `${page.rect.width}px`
      el.style.height = `${page.rect.height}px`
      if (this.opts.showMarginRuler) {
        this.renderMarginRuler(el, page.rect.width, page.rect.height)
      }
    }
    for (const [idx, el] of this.pageBgEls) {
      if (!alive.has(idx)) { el.remove(); this.pageBgEls.delete(idx) }
    }
  }

  /**
   * 绘制 WPS 风格四角边距标尺（SVG，DOM）。内容区四角的角标朝外伸入页边距。
   * 用签名缓存避免每帧重建 SVG。
   */
  private renderMarginRuler(el: HTMLDivElement, pw: number, ph: number): void {
    const [mt, mr, mb, ml] = this.opts.pageMargins
    const color = this.opts.rulerColor
    const L = 20
    const sig = `${pw}|${ph}|${ml}|${mr}|${mt}|${mb}|${color}`
    if (el.dataset.rulerSig === sig) return
    el.dataset.rulerSig = sig
    const corners = [
      `${ml - L},${mt} ${ml},${mt} ${ml},${mt - L}`,
      `${pw - mr + L},${mt} ${pw - mr},${mt} ${pw - mr},${mt - L}`,
      `${ml - L},${ph - mb} ${ml},${ph - mb} ${ml},${ph - mb + L}`,
      `${pw - mr + L},${ph - mb} ${pw - mr},${ph - mb} ${pw - mr},${ph - mb + L}`
    ]
    el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none" fill="none" stroke="${color}" stroke-width="1">${corners.map(p => `<polyline points="${p}"/>`).join('')}</svg>`
  }

  /** 渲染单页内容：blocks + 页眉 + 页脚 + 页码 + 水印 */
  private renderPageContent(ct: CanvasRenderingContext2D, page: PageLayout, scrollY: number, pageCount: number, aliveIds: Set<number>): void {
    const contentOriginX = page.contentRect.x + this.opts.pageOffsetX
    const contentOriginY = page.contentRect.y - scrollY
    for (const b of page.blocks) {
      this.renderBlockOnMain(ct, b, contentOriginX, contentOriginY, aliveIds)
    }
    if (page.headerBlocks && page.headerRect) {
      const hx = page.headerRect.x + this.opts.pageOffsetX
      const hy = page.headerRect.y - scrollY
      for (const b of page.headerBlocks) {
        this.renderBlockOnMain(ct, b, hx, hy, aliveIds)
      }
    }
    if (page.footerBlocks && page.footerRect) {
      const fx = page.footerRect.x + this.opts.pageOffsetX
      const fy = page.footerRect.y - scrollY
      for (const b of page.footerBlocks) {
        this.renderBlockOnMain(ct, b, fx, fy, aliveIds)
      }
    }
    this.drawPageNumber(ct, page, scrollY, pageCount)
    this.watermarkWidget?.drawWatermark(ct, page, scrollY)
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
    if (b.kind === 'block') return
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

    let bitmap: HTMLCanvasElement | ImageBitmap | null
    if (needRebuild) {
      if (cache?.bitmap instanceof ImageBitmap) cache.bitmap.close()
      bitmap = this.buildBlockBitmap(b)
      this.blockCache.set(b.id, {
        id: b.id,
        bitmap,
        width: b.rect.width,
        height: b.rect.height,
        dpr: this.opts.dpr
      })
      this.dirtyBlocks.delete(b.id)
    } else {
      bitmap = cache!.bitmap
      this.blockCache.delete(b.id)
      this.blockCache.set(b.id, cache!)
    }
    if (bitmap) {
      ctx.drawImage(bitmap, Math.round(bx), Math.round(by), b.rect.width, b.rect.height)
    }
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
   * 为单个 block 构建独立位图（paragraph/image）。
   * 优先使用 OffscreenCanvas + transferToImageBitmap（零拷贝），不支持时降级 HTMLCanvasElement。
   * @param b 待构建块（仅处理 paragraph/image，其它类型返回空位图）
   * @returns 渲染好块内容的 ImageBitmap 或 canvas 元素
   */
  private buildBlockBitmap(b: BlockNode): HTMLCanvasElement | ImageBitmap {
    const dpr = this.opts.dpr
    const w = Math.max(1, Math.ceil(b.rect.width))
    const h = Math.max(1, Math.ceil(b.rect.height))
    const pw = Math.max(1, Math.round(w * dpr))
    const ph = Math.max(1, Math.round(h * dpr))

    let ctx: PaintCtx
    let off: OffscreenCanvas | null = null
    let c: HTMLCanvasElement | null = null
    if (typeof OffscreenCanvas !== 'undefined') {
      off = new OffscreenCanvas(pw, ph)
      ctx = off.getContext('2d')!
    } else {
      c = document.createElement('canvas')
      c.width = pw
      c.height = ph
      ctx = c.getContext('2d')!
    }
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
    else if (b.kind === 'chart') this.drawChartInto(ctx, b, 0, 0)

    if (off) return off.transferToImageBitmap()
    return c!
  }

  /**
   * 将段落块绘制到目标 ctx：委托共享纯函数 paintParagraph。
   * @param ctx 目标 2d 上下文
   * @param b 段落块
   */
  private drawParagraphInto(ctx: PaintCtx, b: ParagraphBlock): void {
    paintParagraph(ctx, b, { groupColors: this.opts.groupColors, activeGroupId: this.opts.activeGroupId })
  }


  /**
   * 将图片块绘制到目标 ctx：异步加载图片，加载完成后触发重绘；支持 90/180/270 旋转。
   * @param ctx 目标 2d 上下文
   * @param b 图片块
   * @param x 绘制左上角 x
   * @param y 绘制左上角 y
   */
  private drawImageInto(ctx: PaintCtx, b: ImageBlock, x: number, y: number): void {
    const url = String((b.block as unknown as { value?: string }).value ?? '')
    if (!url) return
    let img = this.imageCache.get(url)
    if (!img) {
      img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        // 图片加载完成 → 使该 block 失效 + 触发全局重绘
        this.invalidateAll()
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
   * 将图表块绘制到目标 ctx：从 chartBlock 数据生成 dataUrl，加载为 Image 后 drawImage。
   * 数据源变更时由 signBlock 触发 bitmap 重建。
   */
  private drawChartInto(ctx: PaintCtx, b: ChartBlock, x: number, y: number): void {
    const el = b.block as unknown as {
      id?: string
      block?: { chartBlock?: Record<string, unknown> }
    }
    const chartBlock = el.block?.chartBlock
    if (!chartBlock) return

    const renderer = getChartRenderer()
    if (!renderer) {
      ctx.strokeStyle = '#cccccc'
      ctx.strokeRect(x + 0.5, y + 0.5, b.rect.width - 1, b.rect.height - 1)
      ctx.fillStyle = '#f5f5f5'
      ctx.fillRect(x, y, b.rect.width, b.rect.height)
      ctx.fillStyle = '#999'
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('图表插件未加载', x + b.rect.width / 2, y + b.rect.height / 2)
      return
    }

    const dependency = this.currentLayout ? chartTableSignature(b, this.currentLayout) : ''
    const cacheKey = `chart|${el.id ?? ''}|${b.rect.width}x${b.rect.height}|${JSON.stringify(chartBlock)}|${dependency}`
    let img = this.imageCache.get(cacheKey)
    if (!img) {
      const option = this.getChartOption(chartBlock, renderer)
      const width = Math.max(10, Math.round(b.rect.width))
      const height = Math.max(10, Math.round(b.rect.height))
      const dataUrl = renderer.renderToDataUrl(option, width, height, 2)
      img = new Image()
      img.onload = () => {
        this.invalidateAll()
        this.container.dispatchEvent(new CustomEvent('vervedocs:chart-loaded', { detail: { id: el.id } }))
      }
      img.src = dataUrl
      this.imageCache.set(cacheKey, img)
    }

    if (img.complete && img.naturalWidth > 0) {
      try {
        ctx.drawImage(img, x, y, b.rect.width, b.rect.height)
      } catch { /* ignore */ }
    } else {
      ctx.strokeStyle = '#cccccc'
      ctx.strokeRect(x + 0.5, y + 0.5, b.rect.width - 1, b.rect.height - 1)
      ctx.fillStyle = '#f5f5f5'
      ctx.fillRect(x, y, b.rect.width, b.rect.height)
    }
  }

  /**
   * 根据图表数据源生成图表配置选项。
   * manual 数据直接使用；table 数据从布局中查找对应表格元素提取。
   */
  private getChartOption(chartBlock: Record<string, unknown>, renderer: ReturnType<typeof getChartRenderer>): any {
    const { dataSource, chartType, config, subtype } = chartBlock as {
      dataSource: { type: string; manualData?: any; tableId?: string; range?: any }
      chartType: string
      config?: any
      subtype?: string
    }

    if (dataSource?.type === 'manual' && dataSource.manualData) {
      return renderer!.generateOption(chartType, dataSource.manualData, config, subtype)
    }

    if (dataSource?.type === 'table' && dataSource.tableId && this.currentLayout) {
      for (const page of this.currentLayout.pages) {
        for (const blk of page.blocks) {
          if (blk.kind === 'table') {
            const tableEl = blk.block as unknown as { type?: string; id?: string }
            if (tableEl.type === 'table' && tableEl.id === dataSource.tableId) {
              const tableData = renderer!.extractTableData(tableEl, dataSource.range)
              return renderer!.generateOption(chartType, tableData, config, subtype)
            }
          }
        }
      }
    }

    return {
      type: 'bar',
      data: { labels: [], datasets: [] },
      options: { plugins: { title: { display: true, text: '暂无数据' } } }
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


}

/* -------------------- 工具 -------------------- */

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
