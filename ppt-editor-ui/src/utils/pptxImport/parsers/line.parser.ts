import { nanoid } from 'nanoid'
import { NS_A, NS_P, emuToCanvas, emuToPx } from '../constants'
import { getFirstChildByTag, getAttr, getColorElement } from '../xml.helper'
import { resolveColor, resolveShadow } from '../color.resolver'
import type { PptxSlideContext } from '../types'
import type { PPTLineElement, LinePoint } from '@/types/slides'

/**
 * Parse a p:cxnSp (connector shape) element as a PPTLineElement.
 */
export function parseLineElement(cxnSpEl: Element, context: PptxSlideContext): PPTLineElement | null {
  const spPr = getFirstChildByTag(cxnSpEl, NS_P, 'spPr')
  if (!spPr) return null

  const xfrm = getFirstChildByTag(spPr, NS_A, 'xfrm')
  if (!xfrm) return null

  const offEl = getFirstChildByTag(xfrm, NS_A, 'off')
  const extEl = getFirstChildByTag(xfrm, NS_A, 'ext')
  if (!offEl || !extEl) return null

  const x = Number(getAttr(offEl, 'x') || 0)
  const y = Number(getAttr(offEl, 'y') || 0)
  const cx = Number(getAttr(extEl, 'cx') || 0)
  const cy = Number(getAttr(extEl, 'cy') || 0)

  const flipH = getAttr(xfrm, 'flipH') === '1'
  const flipV = getAttr(xfrm, 'flipV') === '1'

  const left = emuToCanvas(x, context.slideWidthEmu)
  const top = emuToCanvas(y, context.slideWidthEmu)
  const width = emuToCanvas(cx, context.slideWidthEmu)
  const height = emuToCanvas(cy, context.slideWidthEmu)

  // Compute start/end based on flip
  let start: [number, number]
  let end: [number, number]

  if (!flipH && !flipV) {
    start = [0, 0]
    end = [width, height]
  } else if (flipH && !flipV) {
    start = [width, 0]
    end = [0, height]
  } else if (!flipH && flipV) {
    start = [0, height]
    end = [width, 0]
  } else {
    start = [width, height]
    end = [0, 0]
  }

  // Line style
  const lnEl = getFirstChildByTag(spPr, NS_A, 'ln')
  let style: 'solid' | 'dashed' = 'solid'
  let color = '#000000'
  let lineWidth = 2
  let startPoint: LinePoint = ''
  let endPoint: LinePoint = ''

  if (lnEl) {
    const wAttr = getAttr(lnEl, 'w')
    if (wAttr) lineWidth = Math.max(1, Math.round(emuToPx(Number(wAttr))))

    const solidFill = getFirstChildByTag(lnEl, NS_A, 'solidFill')
    if (solidFill) {
      const colorEl = getColorElement(solidFill)
      color = resolveColor(colorEl, context.theme, '#000000')
    }

    const prstDash = getFirstChildByTag(lnEl, NS_A, 'prstDash')
    if (prstDash) {
      const dashVal = getAttr(prstDash, 'val')
      if (dashVal && dashVal !== 'solid') style = 'dashed'
    }

    // Head/tail end markers
    const headEnd = getFirstChildByTag(lnEl, NS_A, 'headEnd')
    const tailEnd = getFirstChildByTag(lnEl, NS_A, 'tailEnd')

    if (headEnd) {
      startPoint = parseEndType(getAttr(headEnd, 'type'))
    }
    if (tailEnd) {
      endPoint = parseEndType(getAttr(tailEnd, 'type'))
    }
  }

  // Shadow
  const effectLst = getFirstChildByTag(spPr, NS_A, 'effectLst')
  const shadow = resolveShadow(effectLst, context.theme)

  // Check connector type for broken/curve
  const prstGeom = getFirstChildByTag(spPr, NS_A, 'prstGeom')
  let broken: [number, number] | undefined
  let curve: [number, number] | undefined
  let cubic: [[number, number], [number, number]] | undefined

  if (prstGeom) {
    const prst = getAttr(prstGeom, 'prst') || ''
    if (prst.startsWith('bentConnector')) {
      // Simple bent connector - midpoint
      broken = [width / 2, height / 2]
    } else if (prst.startsWith('curvedConnector')) {
      // Simple curved connector
      curve = [width / 2, height / 2]
    }
  }

  const element: PPTLineElement = {
    id: nanoid(10),
    type: 'line',
    left,
    top,
    width: lineWidth,
    start,
    end,
    style,
    color,
    points: [startPoint, endPoint],
  }

  if (shadow) element.shadow = shadow
  if (broken) element.broken = broken
  if (curve) element.curve = curve
  if (cubic) element.cubic = cubic

  return element
}

function parseEndType(type: string | null): LinePoint {
  if (!type || type === 'none') return ''
  if (type === 'arrow' || type === 'triangle' || type === 'stealth') return 'arrow'
  if (type === 'oval' || type === 'diamond') return 'dot'
  return ''
}
