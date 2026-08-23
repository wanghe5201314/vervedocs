import { IEditorOption } from '@vervedoc/docx-editor-schema'
import { Draw } from '../renders/engine'

interface IHighlightLineRange {
  x: number
  y: number
  width: number
  height: number
}

interface IHighlightFillRect {
  lineRanges: IHighlightLineRange[]
}

export class Highlight {
  private options: Required<IEditorOption>
  private fillRectMap: Map<string, IHighlightFillRect>

  constructor(draw: Draw) {
    this.options = draw.getOptions()
    this.fillRectMap = new Map()
  }

  public clearFillInfo() {
    this.fillRectMap.clear()
  }

  public recordFillInfo(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string
  ) {
    const fillRect = this.fillRectMap.get(color)
    if (!fillRect) {
      this.fillRectMap.set(color, {
        lineRanges: [{ x, y, width, height }]
      })
    } else {
      const lastLine = fillRect.lineRanges[fillRect.lineRanges.length - 1]
      if (lastLine && Math.abs(lastLine.y - y) < 1) {
        lastLine.width += width
      } else {
        fillRect.lineRanges.push({ x, y, width, height })
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    if (!this.fillRectMap.size) return
    const { highlightAlpha } = this.options
    ctx.save()
    ctx.globalAlpha = highlightAlpha
    this.fillRectMap.forEach((fillRect, color) => {
      ctx.fillStyle = color
      for (const line of fillRect.lineRanges) {
        ctx.fillRect(line.x, line.y, line.width, line.height)
      }
    })
    ctx.restore()
    this.clearFillInfo()
  }
}
