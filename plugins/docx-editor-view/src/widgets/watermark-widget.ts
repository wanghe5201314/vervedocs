/**
 * WatermarkWidget —— 水印渲染 widget
 *
 * 负责在每页内容区绘制水印文本：
 *  - repeat=true：平铺水印（按 gapX/gapY 间隔，斜向 45° 排列）
 *  - repeat=false：单条居中水印（斜向 45° 居中于页面内容区）
 *  - 支持 color / opacity / size / font 自定义
 *
 * 生命周期：create() → drawWatermark() 每页调用 → destroy()
 */

import type { PageLayout } from '../layout-types'

/** 水印配置 */
export interface WatermarkConfig {
  /** 水印文本内容 */
  data: string
  /** 字体（如 'Microsoft YaHei'） */
  font?: string
  /** 字号（如 120） */
  size?: number
  /** 颜色（如 '#AEB5C0'） */
  color?: string
  /** 透明度（0-1） */
  opacity?: number
  /** 是否平铺重复 */
  repeat?: boolean
  /** 水平间隔（px，平铺模式生效） */
  gapX?: number
  /** 垂直间隔（px，平铺模式生效） */
  gapY?: number
}

/** WatermarkWidget 的依赖注入接口 */
export interface WatermarkWidgetDeps {
  /** 获取页面在容器中的水平偏移 */
  getPageOffsetX: () => number
}

/** 水印渲染 widget，负责在每页 canvas 上绘制水印文本 */
export class WatermarkWidget {
  /** 当前水印配置 */
  private config: WatermarkConfig | null = null

  /**
   * 创建 WatermarkWidget 实例
   * @param deps 依赖注入对象
   */
  constructor(private deps: WatermarkWidgetDeps) {}

  /* -------------------- 生命周期 -------------------- */

  /** 初始化（当前无需额外操作，保留接口一致性） */
  create(): void {}

  /** 销毁 widget：清理配置引用 */
  destroy(): void {
    this.config = null
  }

  /* -------------------- 配置 -------------------- */

  /** 设置水印配置 */
  setConfig(cfg: WatermarkConfig | null): void {
    this.config = cfg
  }

  /** 获取当前水印配置 */
  getConfig(): WatermarkConfig | null {
    return this.config
  }

  /* -------------------- 渲染 -------------------- */

  /**
   * 在指定页面上绘制水印。
   * @param ctx 内容 canvas 2d 上下文
   * @param page 页面布局信息
   * @param scrollY 当前垂直滚动偏移
   */
  drawWatermark(
    ctx: CanvasRenderingContext2D,
    page: PageLayout,
    scrollY: number
  ): void {
    const pageOffsetX = this.deps.getPageOffsetX()
    const px = page.rect.x + pageOffsetX
    const py = page.rect.y - scrollY
    this.renderAt(ctx, px, py, page.rect.width, page.rect.height)
  }

  /**
   * 为缩略图绘制水印（原点在页面左上角 0,0）。
   * @param ctx 离屏 canvas 2d 上下文
   * @param page 页面布局信息
   */
  drawWatermarkForThumbnail(
    ctx: CanvasRenderingContext2D,
    page: PageLayout
  ): void {
    this.renderAt(ctx, 0, 0, page.rect.width, page.rect.height)
  }

  /** 水印渲染核心：在指定位置和尺寸内绘制水印 */
  private renderAt(
    ctx: CanvasRenderingContext2D,
    px: number, py: number,
    pw: number, ph: number
  ): void {
    const cfg = this.config
    if (!cfg || !cfg.data) return

    const font = cfg.font || 'Microsoft YaHei'
    const fontSize = cfg.size || 120
    const color = cfg.color || '#AEB5C0'
    const opacity = cfg.opacity ?? 0.3
    const repeat = cfg.repeat ?? false

    ctx.save()
    ctx.rect(px, py, pw, ph)
    ctx.clip()
    ctx.globalAlpha = opacity
    ctx.fillStyle = color
    ctx.font = `${fontSize}px "${font}", "PingFang SC", sans-serif`

    if (repeat) {
      this.drawTiled(ctx, cfg.data, px, py, pw, ph, fontSize, cfg.gapX ?? 10, cfg.gapY ?? 10)
    } else {
      this.drawCentered(ctx, cfg.data, px, py, pw, ph)
    }

    ctx.restore()
  }

  /**
   * 绘制单条居中水印（斜向 45° 居中于页面）。
   */
  private drawCentered(
    ctx: CanvasRenderingContext2D,
    text: string,
    px: number, py: number,
    pw: number, ph: number
  ): void {
    const cx = px + pw / 2
    const cy = py + ph / 2
    ctx.translate(cx, cy)
    ctx.rotate(-Math.PI / 4)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 0, 0)
  }

  /**
   * 绘制平铺水印（按间隔斜向 45° 排列，覆盖整页）。
   */
  private drawTiled(
    ctx: CanvasRenderingContext2D,
    text: string,
    px: number, py: number,
    pw: number, ph: number,
    fontSize: number,
    gapX: number, gapY: number
  ): void {
    const metrics = ctx.measureText(text)
    const textW = metrics.width
    const stepX = textW + gapX
    const stepY = fontSize + gapY

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const diag = Math.sqrt(pw * pw + ph * ph)
    const cols = Math.ceil(diag / stepX) + 1
    const rows = Math.ceil(diag / stepY) + 1

    const cx = px + pw / 2
    const cy = py + ph / 2

    ctx.translate(cx, cy)
    ctx.rotate(-Math.PI / 4)

    const startX = -(cols * stepX) / 2
    const startY = -(rows * stepY) / 2

    for (let r = 0; r < rows; r++) {
      const y = startY + r * stepY
      const offsetX = (r % 2 === 0) ? 0 : stepX / 2
      for (let c = 0; c < cols; c++) {
        const x = startX + c * stepX + offsetX
        ctx.fillText(text, x, y)
      }
    }
  }
}