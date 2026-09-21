import type { IElement } from '@vervedoc/docx-editor-schema'
import type { Draw } from '@vervedoc/docx-editor-view'
import type { ILatexElement } from './constants'
import { LaTexSVG, LaTexUtils } from './latex-utils'

/** 默认缩放比例 */
const DEFAULT_SCALE = 1

/** LaTeX 粒子渲染器，将 LaTeX 元素以 SVG 图片形式绘制到 canvas */
export class LaTexParticle {
  /** 编辑器绘制实例 */
  private draw: Draw
  /** 已加载图片缓存，避免重复加载 */
  private imageCache: Map<string, HTMLImageElement> = new Map()
  /** 正在加载的图片 Promise 集合 */
  private pendingImages: Set<Promise<unknown>> = new Set()

  /**
   * 创建 LaTeX 粒子渲染器
   * @param draw 编辑器绘制实例
   */
  constructor(draw: Draw) {
    this.draw = draw
  }

  /**
   * 将 LaTeX 字符串转换为 SVG
   * @param laTex LaTeX 字符串
   * @returns SVG 结果
   */
  public static convertLaTextToSVG(laTex: string): LaTexSVG {
    return new LaTexUtils(laTex).svg({
      SCALE_X: 10,
      SCALE_Y: 10,
      MARGIN_X: 0,
      MARGIN_Y: 0
    })
  }

  /**
   * 在 canvas 上渲染 LaTeX 元素
   * @param ctx canvas 上下文
   * @param element 元素
   * @param x X 坐标
   * @param y Y 坐标
   */
  public render(
    ctx: CanvasRenderingContext2D,
    element: IElement,
    x: number,
    y: number
  ): void {
    const { scale = DEFAULT_SCALE } = this.draw.getOptions() as { scale?: number }
    const el = element as unknown as ILatexElement
    const width = el.width * scale
    const height = el.height * scale
    if (this.imageCache.has(element.value)) {
      const img = this.imageCache.get(element.value)!
      ctx.drawImage(img, x, y, width, height)
      return
    }
    const promise = new Promise<void>((resolve, reject) => {
      const img = new Image()
      img.src = el.laTexSVG
      img.onload = () => {
        ctx.drawImage(img, x, y, width, height)
        this.imageCache.set(element.value, img)
        resolve()
      }
      img.onerror = reject
    })
    this.pendingImages.add(promise)
    promise.finally(() => this.pendingImages.delete(promise))
  }

  /**
   * 等待所有正在加载的 LaTeX 图片完成
   * @returns Promise
   */
  public awaitImages(): Promise<void> {
    return Promise.all(this.pendingImages).then(() => undefined)
  }

  /** 销毁渲染器，清空缓存 */
  public destroy(): void {
    this.imageCache.clear()
    this.pendingImages.clear()
  }
}
