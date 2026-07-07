import { IElement } from '@vervedoc/docx-editor-schema'
import { LaTexSVG, LaTexUtils } from './utils/LaTexUtils'

const DEFAULT_SCALE = 1

type Draw = any

export class LaTexParticle {
  private draw: Draw
  private imageCache: Map<string, HTMLImageElement> = new Map()

  constructor(draw: Draw) {
    this.draw = draw
  }

  public static convertLaTextToSVG(laTex: string): LaTexSVG {
    return new LaTexUtils(laTex).svg({
      SCALE_X: 10,
      SCALE_Y: 10,
      MARGIN_X: 0,
      MARGIN_Y: 0
    })
  }

  public render(
    ctx: CanvasRenderingContext2D,
    element: IElement,
    x: number,
    y: number
  ) {
    const { scale = DEFAULT_SCALE } = this.draw?.getOptions?.() || {}
    const width = element.width! * scale
    const height = element.height! * scale
    if (this.imageCache.has(element.value)) {
      const img = this.imageCache.get(element.value)!
      ctx.drawImage(img, x, y, width, height)
    } else {
      const laTexLoadPromise = new Promise((resolve, reject) => {
        const img = new Image()
        img.src = element.laTexSVG!
        img.onload = () => {
          ctx.drawImage(img, x, y, width, height)
          this.imageCache.set(element.value, img)
          resolve(element)
        }
        img.onerror = error => {
          reject(error)
        }
      })
      this.addImageObserver(laTexLoadPromise)
    }
  }

  private addImageObserver(_promise: Promise<any>) {
    // TODO: 从 ImageParticle 继承的方法，待 view 层集成后实现
  }
}
