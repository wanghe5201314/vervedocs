import { DeepRequired } from '@vervedoc/docx-editor-schema'
import { IEditorOption } from '@vervedoc/docx-editor-schema'
import { IRowElement } from '@vervedoc/docx-editor-schema'
import { Draw } from '../renders/engine'
import { getSeparatorDashArray, getSeparatorLineWidth, getSeparatorRenderHeight, getSeparatorType } from '../separator'

export class SeparatorParticle {
  private options: DeepRequired<IEditorOption>

  constructor(draw: Draw) {
    this.options = draw.getOptions()
  }

  private withAlpha(color: string, alpha: number) {
    const normalizedAlpha = Math.max(0, Math.min(1, alpha))
    if (color.startsWith('#')) {
      const hex = color.slice(1)
      const fullHex =
        hex.length === 3
          ? hex.split('').map(char => char + char).join('')
          : hex.length === 6
            ? hex
            : ''
      if (fullHex) {
        const r = Number.parseInt(fullHex.slice(0, 2), 16)
        const g = Number.parseInt(fullHex.slice(2, 4), 16)
        const b = Number.parseInt(fullHex.slice(4, 6), 16)
        return `rgba(${r}, ${g}, ${b}, ${normalizedAlpha})`
      }
    }
    const rgbMatch = color.match(/^rgba?\(([^)]+)\)$/i)
    if (rgbMatch) {
      const [r = '0', g = '0', b = '0'] = rgbMatch[1].split(',').map(item => item.trim())
      return `rgba(${r}, ${g}, ${b}, ${normalizedAlpha})`
    }
    return color
  }

  private scaleDashArray(dashArray: number[], scale: number, lineWidth: number) {
    if (!dashArray.some(item => item > 0)) return []
    return dashArray.map(item => {
      if (item <= 0) return 0
      return Math.max(item * Math.max(scale * Math.max(lineWidth, 1), 1), 1)
    })
  }

  private drawStraightLine(
    ctx: CanvasRenderingContext2D,
    startX: number,
    endX: number,
    y: number,
    lineWidth: number,
    color: string | CanvasGradient,
    dashArray: number[] = []
  ) {
    ctx.save()
    ctx.lineWidth = lineWidth
    ctx.strokeStyle = color
    ctx.lineCap = dashArray.length ? 'round' : 'butt'
    ctx.setLineDash(dashArray)
    ctx.beginPath()
    ctx.moveTo(startX, y)
    ctx.lineTo(endX, y)
    ctx.stroke()
    ctx.restore()
  }

  private drawWavyLine(
    ctx: CanvasRenderingContext2D,
    startX: number,
    endX: number,
    centerY: number,
    lineWidth: number,
    color: string
  ) {
    const amplitude = Math.max(lineWidth, 2)
    const wavelength = Math.max(lineWidth * 6, 12)
    ctx.save()
    ctx.lineWidth = lineWidth
    ctx.strokeStyle = color
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(startX, centerY)
    let currentX = startX
    while (currentX < endX) {
      const midX = Math.min(currentX + wavelength / 2, endX)
      const nextX = Math.min(currentX + wavelength, endX)
      ctx.quadraticCurveTo(
        currentX + wavelength / 4,
        centerY - amplitude,
        midX,
        centerY
      )
      if (midX < endX) {
        ctx.quadraticCurveTo(
          currentX + (wavelength * 3) / 4,
          centerY + amplitude,
          nextX,
          centerY
        )
      }
      currentX = nextX
    }
    ctx.stroke()
    ctx.restore()
  }

  public render(
    ctx: CanvasRenderingContext2D,
    element: IRowElement,
    x: number,
    y: number
  ) {
    ctx.save()
    const {
      scale,
      separator: { lineWidth, strokeStyle }
    } = this.options
    const startX = x
    const endX = x + (element.width || 0) * scale
    const type = getSeparatorType(element)
    const actualLineWidth = getSeparatorLineWidth(element, lineWidth) * scale
    const actualDashArray = this.scaleDashArray(getSeparatorDashArray(element, type), scale, actualLineWidth)
    const color = element.color || strokeStyle
    const renderHeight = getSeparatorRenderHeight(element, lineWidth) * scale
    const centerY = Math.round(y + renderHeight / 2)

    if (endX <= startX) {
      ctx.restore()
      return
    }

    if (type === 'double') {
      const gap = Math.max(actualLineWidth + scale, 2)
      this.drawStraightLine(ctx, startX, endX, centerY - gap / 2, actualLineWidth, color, actualDashArray)
      this.drawStraightLine(ctx, startX, endX, centerY + gap / 2, actualLineWidth, color, actualDashArray)
    } else if (type === 'triple') {
      const gap = Math.max(actualLineWidth + scale, 2)
      this.drawStraightLine(ctx, startX, endX, centerY - gap, actualLineWidth, color, actualDashArray)
      this.drawStraightLine(ctx, startX, endX, centerY, actualLineWidth, color, actualDashArray)
      this.drawStraightLine(ctx, startX, endX, centerY + gap, actualLineWidth, color, actualDashArray)
    } else if (type === 'wavy') {
      this.drawWavyLine(ctx, startX, endX, centerY, actualLineWidth, color)
    } else if (type === 'gradient') {
      const gradient = ctx.createLinearGradient(startX, centerY, endX, centerY)
      gradient.addColorStop(0, this.withAlpha(color, 0))
      gradient.addColorStop(0.2, this.withAlpha(color, 0.4))
      gradient.addColorStop(0.5, this.withAlpha(color, 1))
      gradient.addColorStop(0.8, this.withAlpha(color, 0.4))
      gradient.addColorStop(1, this.withAlpha(color, 0))
      this.drawStraightLine(ctx, startX, endX, centerY, actualLineWidth, gradient as unknown as string, actualDashArray)
    } else if (type === 'shadow') {
      this.drawStraightLine(ctx, startX + scale, endX + scale, centerY + scale, actualLineWidth, this.withAlpha('#000000', 0.18), actualDashArray)
      this.drawStraightLine(ctx, startX, endX, centerY, actualLineWidth, color, actualDashArray)
    } else if (type === 'emboss') {
      this.drawStraightLine(ctx, startX, endX, centerY - scale, Math.max(actualLineWidth / 2, 1), this.withAlpha('#ffffff', 0.85), actualDashArray)
      this.drawStraightLine(ctx, startX, endX, centerY, actualLineWidth, color, actualDashArray)
      this.drawStraightLine(ctx, startX, endX, centerY + scale, Math.max(actualLineWidth / 2, 1), this.withAlpha('#000000', 0.25), actualDashArray)
    } else {
      this.drawStraightLine(ctx, startX, endX, centerY, actualLineWidth, color, actualDashArray)
    }
    ctx.restore()
  }
}
