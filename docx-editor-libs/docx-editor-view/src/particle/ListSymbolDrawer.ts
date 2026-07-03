import { UlStyle } from '@wanghe1995/docx-editor-schema'

export class ListSymbolDrawer {
  public drawSymbol(
    ctx: CanvasRenderingContext2D,
    style: UlStyle,
    x: number,
    y: number,
    fontSize: number,
    color: string
  ): void {
    ctx.save()
    ctx.fillStyle = color
    ctx.strokeStyle = color
    ctx.lineWidth = Math.max(1.5, fontSize * 0.08)

    const size = fontSize * 0.6
    const centerY = y

    switch (style) {
      case UlStyle.DISC:
        this.drawDisc(ctx, x, centerY, size)
        break
      case UlStyle.CIRCLE:
        this.drawCircle(ctx, x, centerY, size)
        break
      case UlStyle.SQUARE:
        this.drawSquare(ctx, x, centerY, size, true)
        break
      case UlStyle.DIAMOND:
      case UlStyle.DIAMOND_SOLID:
        this.drawDiamond(ctx, x, centerY, size, true)
        break
      case UlStyle.DASH:
        this.drawDash(ctx, x, centerY, size)
        break
      case UlStyle.CHECK:
        this.drawCheck(ctx, x, centerY, size)
        break
      case UlStyle.TRIANGLE:
      case UlStyle.TRIANGLE_SOLID:
        this.drawTriangle(ctx, x, centerY, size, true)
        break
      case UlStyle.STAR:
      case UlStyle.STAR_SOLID:
        this.drawStar(ctx, x, centerY, size, true)
        break
      case UlStyle.ARROW:
        this.drawArrow(ctx, x, centerY, size)
        break
      case UlStyle.ANGLE:
        this.drawAngle(ctx, x, centerY, size)
        break
      case UlStyle.HOLLOW_CIRCLE:
        this.drawCircle(ctx, x, centerY, size)
        break
      case UlStyle.HOLLOW_SQUARE:
        this.drawSquare(ctx, x, centerY, size, false)
        break
      case UlStyle.HEART_HOLLOW:
        this.drawHeart(ctx, x, centerY, size, false)
        break
      case UlStyle.HASH:
        this.drawHash(ctx, x, centerY, size)
        break
      case UlStyle.HEART_SOLID:
        this.drawHeart(ctx, x, centerY, size, true)
        break
      case UlStyle.FLOWER:
        this.drawFlower(ctx, x, centerY, size)
        break
      case UlStyle.ASTERISK:
        this.drawAsterisk(ctx, x, centerY, size)
        break
      case UlStyle.HOLLOW_DIAMOND:
        this.drawDiamond(ctx, x, centerY, size, false)
        break
      case UlStyle.HOLLOW_TRIANGLE:
        this.drawTriangle(ctx, x, centerY, size, false)
        break
      default:
        this.drawDisc(ctx, x, centerY, size)
    }

    ctx.restore()
  }

  private drawDisc(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number
  ): void {
    ctx.beginPath()
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2)
    ctx.fill()
  }

  private drawCircle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number
  ): void {
    ctx.beginPath()
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2)
    ctx.stroke()
  }

  private drawSquare(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    filled: boolean
  ): void {
    const half = size * 0.5
    ctx.beginPath()
    ctx.rect(x - half, y - half, size, size)
    if (filled) {
      ctx.fill()
    } else {
      ctx.stroke()
    }
  }

  private drawDiamond(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    filled: boolean
  ): void {
    const half = size * 0.6
    ctx.beginPath()
    ctx.moveTo(x, y - half)
    ctx.lineTo(x + half, y)
    ctx.lineTo(x, y + half)
    ctx.lineTo(x - half, y)
    ctx.closePath()
    if (filled) {
      ctx.fill()
    } else {
      ctx.stroke()
    }
  }

  private drawDash(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number
  ): void {
    const half = size * 0.6
    ctx.beginPath()
    ctx.moveTo(x - half, y)
    ctx.lineTo(x + half, y)
    ctx.stroke()
  }

  private drawCheck(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number
  ): void {
    const scale = size * 0.04
    ctx.beginPath()
    ctx.moveTo(x - size * 0.3, y)
    ctx.lineTo(x - size * 0.1, y + size * 0.25)
    ctx.lineTo(x + size * 0.35, y - size * 0.25)
    ctx.lineWidth = Math.max(1.5, scale * 4)
    ctx.stroke()
  }

  private drawTriangle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    filled: boolean
  ): void {
    const half = size * 0.55
    ctx.beginPath()
    ctx.moveTo(x - half, y - half * 0.6)
    ctx.lineTo(x + half, y)
    ctx.lineTo(x - half, y + half * 0.6)
    ctx.closePath()
    if (filled) {
      ctx.fill()
    } else {
      ctx.stroke()
    }
  }

  private drawStar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    filled: boolean
  ): void {
    const outerRadius = size * 0.55
    const innerRadius = outerRadius * 0.4
    const points = 5
    const step = Math.PI / points

    ctx.beginPath()
    for (let i = 0; i < 2 * points; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius
      const angle = i * step - Math.PI / 2
      const px = x + radius * Math.cos(angle)
      const py = y + radius * Math.sin(angle)
      if (i === 0) {
        ctx.moveTo(px, py)
      } else {
        ctx.lineTo(px, py)
      }
    }
    ctx.closePath()
    if (filled) {
      ctx.fill()
    } else {
      ctx.stroke()
    }
  }

  private drawArrow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number
  ): void {
    const half = size * 0.5
    ctx.beginPath()
    ctx.moveTo(x - half * 0.3, y - half)
    ctx.lineTo(x + half, y)
    ctx.lineTo(x - half * 0.3, y + half)
    ctx.lineTo(x - half * 0.3, y)
    ctx.closePath()
    ctx.fill()
  }

  private drawAngle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number
  ): void {
    const half = size * 0.5
    ctx.beginPath()
    ctx.moveTo(x - half, y - half * 0.8)
    ctx.lineTo(x + half * 0.3, y)
    ctx.lineTo(x - half, y + half * 0.8)
    ctx.lineWidth = Math.max(1.5, size * 0.08)
    ctx.stroke()
  }

  private drawHeart(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    filled: boolean
  ): void {
    const scale = size * 0.025
    ctx.beginPath()
    ctx.moveTo(x, y + scale * 4)
    ctx.bezierCurveTo(
      x - scale * 5,
      y + scale * 1,
      x - scale * 6,
      y - scale * 4,
      x,
      y - scale * 2
    )
    ctx.bezierCurveTo(
      x + scale * 6,
      y - scale * 4,
      x + scale * 5,
      y + scale * 1,
      x,
      y + scale * 4
    )
    ctx.closePath()
    if (filled) {
      ctx.fill()
    } else {
      ctx.stroke()
    }
  }

  private drawHash(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number
  ): void {
    const half = size * 0.5
    const offset = size * 0.2
    ctx.beginPath()
    ctx.moveTo(x - half * 0.5, y - half)
    ctx.lineTo(x + half * 0.5, y + half)
    ctx.moveTo(x + half * 0.5, y - half)
    ctx.lineTo(x - half * 0.5, y + half)
    ctx.moveTo(x - half, y - offset)
    ctx.lineTo(x + half, y - offset)
    ctx.moveTo(x - half, y + offset)
    ctx.lineTo(x + half, y + offset)
    ctx.lineWidth = Math.max(1, size * 0.06)
    ctx.stroke()
  }

  private drawFlower(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number
  ): void {
    const petalRadius = size * 0.25
    const centerOffset = size * 0.2
    const petals = 5

    for (let i = 0; i < petals; i++) {
      const angle = (i * 2 * Math.PI) / petals - Math.PI / 2
      const px = x + centerOffset * Math.cos(angle)
      const py = y + centerOffset * Math.sin(angle)
      ctx.beginPath()
      ctx.arc(px, py, petalRadius, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.beginPath()
    ctx.arc(x, y, petalRadius * 0.6, 0, Math.PI * 2)
    ctx.fill()
  }

  private drawAsterisk(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number
  ): void {
    const half = size * 0.5
    const lines = 4
    ctx.beginPath()
    for (let i = 0; i < lines; i++) {
      const angle = (i * Math.PI) / lines
      const dx = half * Math.cos(angle)
      const dy = half * Math.sin(angle)
      ctx.moveTo(x - dx, y - dy)
      ctx.lineTo(x + dx, y + dy)
    }
    ctx.lineWidth = Math.max(1.5, size * 0.08)
    ctx.stroke()
  }

  public getSymbolWidth(style: UlStyle, fontSize: number): number {
    const size = fontSize * 0.6
    switch (style) {
      case UlStyle.DISC:
      case UlStyle.CIRCLE:
      case UlStyle.HOLLOW_CIRCLE:
        return size
      case UlStyle.SQUARE:
      case UlStyle.HOLLOW_SQUARE:
        return size
      case UlStyle.DIAMOND:
      case UlStyle.DIAMOND_SOLID:
      case UlStyle.HOLLOW_DIAMOND:
        return size * 1.2
      case UlStyle.DASH:
        return size * 1.2
      case UlStyle.CHECK:
        return size * 0.7
      case UlStyle.TRIANGLE:
      case UlStyle.TRIANGLE_SOLID:
      case UlStyle.HOLLOW_TRIANGLE:
        return size * 1.1
      case UlStyle.STAR:
      case UlStyle.STAR_SOLID:
        return size * 1.1
      case UlStyle.ARROW:
        return size * 1.5
      case UlStyle.ANGLE:
        return size * 1.3
      case UlStyle.HEART_HOLLOW:
      case UlStyle.HEART_SOLID:
        return size * 1.2
      case UlStyle.HASH:
        return size
      case UlStyle.FLOWER:
        return size * 0.9
      case UlStyle.ASTERISK:
        return size
      default:
        return size
    }
  }
}
