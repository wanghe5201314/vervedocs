/**
 * SystemWatermarkWidget —— 系统级水印 widget
 *
 * 与普通水印（canvas 内绘制）不同，系统级水印是覆盖整个编辑器视口的 DOM 层：
 *  - 创建一个 position:absolute; inset:0 的 div，叠加在 canvas 之上
 *  - pointer-events:none，不拦截鼠标交互
 *  - repeat=true：用 SVG 背景平铺水印文本
 *  - repeat=false：单条居中水印（CSS transform 旋转 -45°）
 *
 * 生命周期：create() → setConfig() → destroy()
 */

/** 系统级水印配置 */
export interface SystemWatermarkConfig {
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

/** SystemWatermarkWidget 的依赖注入接口 */
export interface SystemWatermarkWidgetDeps {
  /** 获取编辑器容器 DOM（水印覆盖层挂载于此） */
  getContainer: () => HTMLDivElement
}

/** 系统级水印 widget，在编辑器容器上叠加 DOM 水印层 */
export class SystemWatermarkWidget {
  /** 水印覆盖层 div */
  private overlayEl: HTMLDivElement | null = null
  /** 当前水印配置 */
  private config: SystemWatermarkConfig | null = null

  /**
   * 创建 SystemWatermarkWidget 实例
   * @param deps 依赖注入对象
   */
  constructor(private deps: SystemWatermarkWidgetDeps) {}

  /* -------------------- 生命周期 -------------------- */

  /** 创建覆盖层 DOM 并挂载到容器 */
  create(): void {
    const el = document.createElement('div')
    el.className = 'vervedocs-system-watermark'
    Object.assign(el.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '50',
      display: 'none',
      overflow: 'hidden',
    } as CSSStyleDeclaration)
    this.deps.getContainer().appendChild(el)
    this.overlayEl = el
  }

  /** 销毁 widget：移除 DOM 并清理引用 */
  destroy(): void {
    this.overlayEl?.remove()
    this.overlayEl = null
    this.config = null
  }

  /* -------------------- 配置 -------------------- */

  /** 设置系统水印配置，null 表示移除水印 */
  setConfig(config: SystemWatermarkConfig | null): void {
    this.config = config
    this.render()
  }

  /** 获取当前配置 */
  getConfig(): SystemWatermarkConfig | null {
    return this.config
  }

  /* -------------------- 渲染 -------------------- */

  /** 根据配置渲染水印 */
  private render(): void {
    const el = this.overlayEl
    if (!el) return
    const cfg = this.config
    if (!cfg || !cfg.data) {
      el.style.display = 'none'
      el.innerHTML = ''
      el.style.backgroundImage = ''
      return
    }

    const font = cfg.font || 'Microsoft YaHei'
    const fontSize = cfg.size || 120
    const color = cfg.color || '#AEB5C0'
    const opacity = cfg.opacity ?? 0.3
    const repeat = cfg.repeat ?? false

    el.style.display = 'block'
    el.innerHTML = ''
    el.style.backgroundImage = ''

    if (repeat) {
      this.renderTiled(el, cfg.data, font, fontSize, color, opacity, cfg.gapX ?? 10, cfg.gapY ?? 10)
    } else {
      this.renderCentered(el, cfg.data, font, fontSize, color, opacity)
    }
  }

  /**
   * 平铺水印：用 SVG data URL 作为 background-image，background-repeat: repeat
   */
  private renderTiled(
    el: HTMLDivElement,
    text: string, font: string, fontSize: number,
    color: string, opacity: number,
    gapX: number, gapY: number
  ): void {
    const tileW = fontSize * 2 + gapX
    const tileH = fontSize + gapY
    const cx = tileW / 2
    const cy = tileH / 2
    const escText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${tileW}" height="${tileH}">` +
      `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" ` +
      `transform="rotate(-45 ${cx} ${cy})" ` +
      `font-family="${font}" font-size="${fontSize}" fill="${color}" opacity="${opacity}">${escText}</text>` +
      `</svg>`
    const encoded = encodeURIComponent(svg).replace(/'/g, '%27').replace(/"/g, '%22')
    el.style.backgroundImage = `url("data:image/svg+xml,${encoded}")`
    el.style.backgroundRepeat = 'repeat'
  }

  /**
   * 居中水印：单个文本元素，CSS transform 旋转 -45° 居中
   */
  private renderCentered(
    el: HTMLDivElement,
    text: string, font: string, fontSize: number,
    color: string, opacity: number
  ): void {
    const span = document.createElement('span')
    span.textContent = text
    Object.assign(span.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%) rotate(-45deg)',
      fontSize: `${fontSize}px`,
      fontFamily: `"${font}", "PingFang SC", sans-serif`,
      color: color,
      opacity: String(opacity),
      whiteSpace: 'nowrap',
      userSelect: 'none',
      pointerEvents: 'none',
    } as CSSStyleDeclaration)
    el.appendChild(span)
  }
}