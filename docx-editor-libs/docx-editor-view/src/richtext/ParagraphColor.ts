import { AbstractRichText } from './AbstractRichText'

export class ParagraphColor extends AbstractRichText {
  public render(ctx: CanvasRenderingContext2D) {
    if (!this.fillRect.width) return
    const { x, y, width, height } = this.fillRect
    ctx.save()
    ctx.fillStyle = this.fillColor!
    ctx.fillRect(x, y, width, height)
    ctx.restore()
    this.clearFillInfo()
  }
}
