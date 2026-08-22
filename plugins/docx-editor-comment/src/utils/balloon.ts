const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * 创建气泡箭头 div（指向左侧文档内容）
 * @param color 箭头颜色，默认白色
 * @returns 箭头 div 元素
 */
export function createBalloonArrow(color = '#fff'): HTMLDivElement {
  const arrow = document.createElement('div')
  arrow.style.cssText = `position:absolute;left:-8px;top:14px;width:0;height:0;border-top:6px solid transparent;border-bottom:6px solid transparent;border-right:8px solid ${color};z-index:1;`
  return arrow
}

/**
 * 清空 SVG 子元素
 */
export function clearSvg(svg: SVGSVGElement): void {
  while (svg.firstChild) svg.removeChild(svg.firstChild)
}

/**
 * 渲染激活态标记：起止竖线
 * @param svg SVG 容器
 * @param anchor 锚点坐标
 * @param color 标记颜色
 */
export function renderActiveHighlight(
  svg: SVGSVGElement,
  anchor: { startX: number; startY: number; endX: number; endY: number; lineHeight?: number },
  color: string
): void {
  clearSvg(svg)
  const { startX, startY, endX, endY } = anchor
  const lineHeight = anchor.lineHeight || 20
  const endSolidX = endX || startX
  const endSolidY = endY || startY

  // 开始位置竖线
  const startLine = document.createElementNS(SVG_NS, 'line')
  startLine.setAttribute('x1', String(startX))
  startLine.setAttribute('y1', String(startY))
  startLine.setAttribute('x2', String(startX))
  startLine.setAttribute('y2', String(startY + lineHeight))
  startLine.setAttribute('stroke', color)
  startLine.setAttribute('stroke-width', '1.5')
  svg.append(startLine)

  // 结束位置竖线
  const endLine = document.createElementNS(SVG_NS, 'line')
  endLine.setAttribute('x1', String(endSolidX))
  endLine.setAttribute('y1', String(endSolidY))
  endLine.setAttribute('x2', String(endSolidX))
  endLine.setAttribute('y2', String(endSolidY + lineHeight))
  endLine.setAttribute('stroke', color)
  endLine.setAttribute('stroke-width', '1.5')
  svg.append(endLine)
}

