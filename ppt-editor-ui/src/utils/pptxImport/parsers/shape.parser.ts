import { nanoid } from 'nanoid'
import { NS_A, NS_P, NS_R, emuToCanvas } from '../constants'
import { getFirstChildByTag, getChildrenByTag, forEachChild, getAttr, getAttrNS, findFirstDescendant, getColorElement } from '../xml.helper'
import { resolveColor, resolveFill, resolveOutline, resolveShadow, resolveGradient } from '../color.resolver'
import { resolveRelativePath } from '../rels.resolver'
import { getPresetShape } from '../preset-shapes'
import { parseTransform, parseTextBody } from './text.parser'
import type { PptxSlideContext } from '../types'
import type { PPTShapeElement, PPTImageElement, ShapeText, PPTElement } from '@/types/slides'

/**
 * Parse a p:sp element as a PPTShapeElement (or PPTImageElement if blipFill).
 */
export function parseShapeElement(spEl: Element, context: PptxSlideContext): PPTElement | null {
  const spPr = getFirstChildByTag(spEl, NS_P, 'spPr')
  const transform = parseTransform(spPr, context)
  if (!transform) return null

  // Check for blipFill on shape — convert to image element only when shape has no text.
  // If a shape has both blipFill and text, keep it as a shape to preserve the text content.
  if (spPr) {
    const blipFill = getFirstChildByTag(spPr, NS_A, 'blipFill')
    if (blipFill) {
      const txBody = getFirstChildByTag(spEl, NS_P, 'txBody')
      const shapeHasText = txBody ? hasShapeText(txBody) : false
      if (!shapeHasText) {
        const imgEl = parseShapeBlipFill(blipFill, transform, spPr, context)
        if (imgEl) return imgEl
      }
      // If shape has text or image resolution fails, fall through to shape parsing
    }
  }

  // Determine geometry
  let viewBox: [number, number] = [200, 200]
  let path = 'M 0 0 L 200 0 L 200 200 L 0 200 Z'
  let special = false
  let prstName = 'rect'

  if (spPr) {
    const prstGeom = getFirstChildByTag(spPr, NS_A, 'prstGeom')
    const custGeom = getFirstChildByTag(spPr, NS_A, 'custGeom')

    if (prstGeom) {
      prstName = getAttr(prstGeom, 'prst') || 'rect'
      const shape = getPresetShape(prstName, 200, 200)
      viewBox = shape.viewBox as [number, number]
      path = shape.path
      special = shape.special || false
    } else if (custGeom) {
      const customResult = parseCustomGeometry(custGeom)
      if (customResult) {
        viewBox = customResult.viewBox
        path = customResult.path
        special = customResult.special || false
      }
    }
  }

  // Extract p:style for theme style references
  const styleEl = getFirstChildByTag(spEl, NS_P, 'style')
  let styleDefaults: { fontName?: string; color?: string } | undefined
  if (styleEl) {
    const fontRef = getFirstChildByTag(styleEl, NS_A, 'fontRef')
    if (fontRef) {
      styleDefaults = {}
      const idx = getAttr(fontRef, 'idx')
      if (idx === 'major') styleDefaults.fontName = context.theme.majorFont
      else if (idx === 'minor') styleDefaults.fontName = context.theme.minorFont
      const frColorEl = getColorElement(fontRef)
      if (frColorEl) styleDefaults.color = resolveColor(frColorEl, context.theme, '')
    }
  }

  // Fill: direct spPr fill first, then p:style > fillRef fallback
  const fillResult = resolveFill(spPr, context.theme)
  let fill = fillResult.fill
  if (fillResult.grpFill && context.groupFill) {
    fill = context.groupFill
  }
  if (!fill && !fillResult.gradient && !fillResult.grpFill && styleEl) {
    const fillRef = getFirstChildByTag(styleEl, NS_A, 'fillRef')
    if (fillRef) {
      const fillIdx = Number(getAttr(fillRef, 'idx') || 0)
      if (fillIdx > 0) {
        const fillColorEl = getColorElement(fillRef)
        if (fillColorEl) fill = resolveColor(fillColorEl, context.theme, '')
      }
    }
  }
  fill = fill || context.theme.colors.accent1

  // Outline: direct spPr ln first, then p:style > lnRef fallback
  // Only fallback to lnRef when there's no explicit <a:ln> element at all.
  // If <a:ln><a:noFill/></a:ln> is present, it means "no outline" — don't override with lnRef.
  const lnEl = spPr ? getFirstChildByTag(spPr, NS_A, 'ln') : null
  let outline = resolveOutline(lnEl, context.theme)
  if (!outline && !lnEl && styleEl) {
    const lnRef = getFirstChildByTag(styleEl, NS_A, 'lnRef')
    if (lnRef) {
      const lnIdx = Number(getAttr(lnRef, 'idx') || 0)
      if (lnIdx > 0) {
        const lnColorEl = getColorElement(lnRef)
        if (lnColorEl) {
          const lnColor = resolveColor(lnColorEl, context.theme, '')
          if (lnColor) {
            outline = { style: 'solid', width: Math.max(1, lnIdx), color: lnColor }
          }
        }
      }
    }
  }

  // Shadow
  const effectLst = spPr ? getFirstChildByTag(spPr, NS_A, 'effectLst') : null
  const shadow = resolveShadow(effectLst, context.theme)

  // Opacity
  let opacity: number | undefined

  // Text inside shape
  let text: ShapeText | undefined
  const txBody = getFirstChildByTag(spEl, NS_P, 'txBody')
  if (txBody) {
    const { html, defaultFontName, defaultColor } = parseTextBody(txBody, context, styleDefaults)
    if (html && html !== '<p><br></p>') {
      // Determine vertical alignment (OOXML default anchor is 't' = top)
      const bodyPr = getFirstChildByTag(txBody, NS_A, 'bodyPr')
      let align: 'top' | 'middle' | 'bottom' = 'top'
      if (bodyPr) {
        const anchor = getAttr(bodyPr, 'anchor')
        if (anchor === 'ctr') align = 'middle'
        else if (anchor === 'b') align = 'bottom'
        else align = 'top'
      }

      // Extract text insets from bodyPr (lIns, rIns, tIns, bIns)
      const textInsets = parseBodyPrInsets(bodyPr, context)

      text = { content: html, defaultFontName, defaultColor, align, textInsets }
    }
  }

  const element: PPTShapeElement = {
    id: nanoid(10),
    type: 'shape',
    left: transform.left,
    top: transform.top,
    width: transform.width,
    height: transform.height,
    rotate: transform.rotate,
    viewBox,
    path,
    fixedRatio: false,
    fill,
  }

  if (fillResult.gradient) element.gradient = fillResult.gradient
  if (outline) element.outline = outline
  if (shadow) element.shadow = shadow
  if (transform.flipH) element.flipH = true
  if (transform.flipV) element.flipV = true
  if (special) element.special = true
  if (text) element.text = text
  if (opacity !== undefined) element.opacity = opacity

  return element
}

/**
 * Parse bodyPr text insets (lIns, rIns, tIns, bIns) and convert to canvas px.
 * OOXML defaults: lIns=91440, rIns=91440, tIns=45720, bIns=45720 (EMU).
 * Returns [top, right, bottom, left] in canvas px.
 */
export function parseBodyPrInsets(bodyPr: Element | null, context: PptxSlideContext): [number, number, number, number] {
  // OOXML default insets in EMU
  let lIns = 91440
  let rIns = 91440
  let tIns = 45720
  let bIns = 45720

  if (bodyPr) {
    const lInsAttr = getAttr(bodyPr, 'lIns')
    const rInsAttr = getAttr(bodyPr, 'rIns')
    const tInsAttr = getAttr(bodyPr, 'tIns')
    const bInsAttr = getAttr(bodyPr, 'bIns')
    if (lInsAttr !== null) lIns = Number(lInsAttr)
    if (rInsAttr !== null) rIns = Number(rInsAttr)
    if (tInsAttr !== null) tIns = Number(tInsAttr)
    if (bInsAttr !== null) bIns = Number(bInsAttr)
  }

  return [
    emuToCanvas(tIns, context.slideWidthEmu),
    emuToCanvas(rIns, context.slideWidthEmu),
    emuToCanvas(bIns, context.slideWidthEmu),
    emuToCanvas(lIns, context.slideWidthEmu),
  ]
}

/**
 * Check if a txBody has actual visible text content (runs or fields).
 */
function hasShapeText(txBody: Element): boolean {
  const paragraphs = getChildrenByTag(txBody, NS_A, 'p')
  for (const p of paragraphs) {
    const runs = getChildrenByTag(p, NS_A, 'r')
    for (const r of runs) {
      const t = getFirstChildByTag(r, NS_A, 't')
      if (t && (t.textContent || '').trim()) return true
    }
    const flds = getChildrenByTag(p, NS_A, 'fld')
    for (const f of flds) {
      const t = getFirstChildByTag(f, NS_A, 't')
      if (t && (t.textContent || '').trim()) return true
    }
  }
  return false
}

/**
 * Parse custom geometry (a:custGeom) to SVG path.
 * Supports multiple path elements within pathLst.
 */
function parseCustomGeometry(custGeomEl: Element): { viewBox: [number, number]; path: string; special?: boolean } | null {
  const pathLst = getFirstChildByTag(custGeomEl, NS_A, 'pathLst')
  if (!pathLst) return null

  const pathEls = getChildrenByTag(pathLst, NS_A, 'path')
  if (pathEls.length === 0) return null

  // Use the first path's dimensions for viewBox, or the largest across all paths
  let maxW = 0
  let maxH = 0
  const allCommands: string[] = []

  for (const pathEl of pathEls) {
    const w = Number(getAttr(pathEl, 'w') || 200)
    const h = Number(getAttr(pathEl, 'h') || 200)
    if (w > maxW) maxW = w
    if (h > maxH) maxH = h

    forEachChild(pathEl, (child) => {
      const name = child.localName

      if (name === 'moveTo') {
        const pt = getFirstChildByTag(child, NS_A, 'pt')
        if (pt) {
          allCommands.push(`M ${getAttr(pt, 'x') || 0} ${getAttr(pt, 'y') || 0}`)
        }
      } else if (name === 'lnTo') {
        const pt = getFirstChildByTag(child, NS_A, 'pt')
        if (pt) {
          allCommands.push(`L ${getAttr(pt, 'x') || 0} ${getAttr(pt, 'y') || 0}`)
        }
      } else if (name === 'cubicBezTo') {
        const pts = getChildrenByTag(child, NS_A, 'pt')
        if (pts.length >= 3) {
          const x1 = getAttr(pts[0], 'x') || 0
          const y1 = getAttr(pts[0], 'y') || 0
          const x2 = getAttr(pts[1], 'x') || 0
          const y2 = getAttr(pts[1], 'y') || 0
          const x = getAttr(pts[2], 'x') || 0
          const y = getAttr(pts[2], 'y') || 0
          allCommands.push(`C ${x1} ${y1} ${x2} ${y2} ${x} ${y}`)
        }
      } else if (name === 'quadBezTo') {
        const pts = getChildrenByTag(child, NS_A, 'pt')
        if (pts.length >= 2) {
          const x1 = getAttr(pts[0], 'x') || 0
          const y1 = getAttr(pts[0], 'y') || 0
          const x = getAttr(pts[1], 'x') || 0
          const y = getAttr(pts[1], 'y') || 0
          allCommands.push(`Q ${x1} ${y1} ${x} ${y}`)
        }
      } else if (name === 'arcTo') {
        const wR = Number(getAttr(child, 'wR') || 0)
        const hR = Number(getAttr(child, 'hR') || 0)
        const stAng = Number(getAttr(child, 'stAng') || 0) / 60000
        const swAng = Number(getAttr(child, 'swAng') || 0) / 60000

        if (wR > 0 && hR > 0) {
          const largeArc = Math.abs(swAng) > 180 ? 1 : 0
          const sweep = swAng > 0 ? 1 : 0
          const stAngRad = stAng * Math.PI / 180
          const endAngRad = (stAng + swAng) * Math.PI / 180
          const dx = wR * (Math.cos(endAngRad) - Math.cos(stAngRad))
          const dy = hR * (Math.sin(endAngRad) - Math.sin(stAngRad))
          allCommands.push(`a ${wR} ${hR} 0 ${largeArc} ${sweep} ${dx.toFixed(2)} ${dy.toFixed(2)}`)
        }
      } else if (name === 'close') {
        allCommands.push('Z')
      }
    })
  }

  if (allCommands.length === 0) return null

  return {
    viewBox: [maxW || 200, maxH || 200],
    path: allCommands.join(' '),
    special: true,
  }
}

/**
 * Convert a shape with blipFill (image fill) to a PPTImageElement.
 */
function parseShapeBlipFill(
  blipFill: Element,
  transform: { left: number; top: number; width: number; height: number; rotate: number; flipH: boolean; flipV: boolean },
  spPr: Element,
  context: PptxSlideContext,
): PPTImageElement | null {
  const blip = getFirstChildByTag(blipFill, NS_A, 'blip')
  if (!blip) return null

  const embedRId = getAttrNS(blip, NS_R, 'embed')
  if (!embedRId) return null

  const relEntry = context.slideRels.get(embedRId)
  if (!relEntry) return null

  const resolvedPath = resolveRelativePath(context.slideBasePath, relEntry.target)
  const src = context.mediaMap.get(resolvedPath) || context.mediaMap.get(relEntry.target) || ''
  if (!src) return null

  // Check for ellipse clip
  let clip: { range: [[number, number], [number, number]]; shape: string } | undefined
  const prstGeom = getFirstChildByTag(spPr, NS_A, 'prstGeom')
  if (prstGeom) {
    const prst = getAttr(prstGeom, 'prst')
    if (prst === 'ellipse') {
      clip = { range: [[0, 0], [100, 100]], shape: 'ellipse' }
    }
  }

  const outline = resolveOutline(getFirstChildByTag(spPr, NS_A, 'ln'), context.theme)
  const effectLst = getFirstChildByTag(spPr, NS_A, 'effectLst')
  const shadow = resolveShadow(effectLst, context.theme)

  const element: PPTImageElement = {
    id: nanoid(10),
    type: 'image',
    left: transform.left,
    top: transform.top,
    width: transform.width,
    height: transform.height,
    rotate: transform.rotate,
    fixedRatio: false,
    src,
  }

  if (transform.flipH) element.flipH = true
  if (transform.flipV) element.flipV = true
  if (clip) element.clip = clip
  if (outline) element.outline = outline
  if (shadow) element.shadow = shadow

  return element
}
