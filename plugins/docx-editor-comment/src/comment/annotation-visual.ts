import type { IComment } from '@vervedoc/docx-editor-schema'

export { getAuthorColor as getAvatarColor } from '@vervedoc/docx-editor-schema'

/** Shared hover geometry for comments and revisions, in overlay coordinates. */
export function drawAnnotationConnector(
  overlay: HTMLDivElement,
  card: HTMLElement,
  anchor: NonNullable<IComment['anchor']>,
  color: string,
  className: string
): HTMLDivElement[] {
  const origin = overlay.getBoundingClientRect()
  const scaleX = overlay.offsetWidth ? origin.width / overlay.offsetWidth : 1
  const scaleY = overlay.offsetHeight ? origin.height / overlay.offsetHeight : 1
  const rect = card.getBoundingClientRect()
  const cardX = Math.round((rect.left - origin.left) / (scaleX || 1))
  const cardTop = Math.round((rect.top - origin.top) / (scaleY || 1))
  const cardBottom = cardTop + rect.height / (scaleY || 1)
  const startX = Math.round(anchor.startX)
  const endX = Math.round(anchor.endX)
  const lineHeight = anchor.lineHeight ?? 20
  const startY = Math.round(anchor.startY)
  const startBottom = Math.round(anchor.startY + lineHeight)
  const endY = Math.round(anchor.endY - (anchor.endLineHeight ?? lineHeight))
  const endBottom = Math.round(anchor.endY)
  const targetY = Math.round(Math.max(cardTop, Math.min(cardBottom - 1, startY)))
  const lines: HTMLDivElement[] = []
  const segment = (x1: number, y1: number, x2: number, y2: number) => {
    const line = document.createElement('div')
    line.className = className
    line.setAttribute('aria-hidden', 'true')
    line.style.cssText = `position:absolute;left:${Math.min(x1, x2)}px;top:${Math.min(y1, y2)}px;width:${Math.max(1, Math.abs(x2 - x1))}px;height:${Math.max(1, Math.abs(y2 - y1))}px;background:${color};pointer-events:none;z-index:11;`
    overlay.append(line)
    lines.push(line)
  }
  segment(startX, startY, startX, startBottom)
  segment(endX, endY, endX, endBottom)
  if (targetY === startY) {
    segment(startX, startY, cardX, startY)
  } else {
    const elbowX = Math.max(startX, cardX - 8)
    segment(startX, startY, elbowX, startY)
    segment(elbowX, startY, elbowX, targetY)
    segment(elbowX, targetY, cardX, targetY)
  }
  return lines
}
