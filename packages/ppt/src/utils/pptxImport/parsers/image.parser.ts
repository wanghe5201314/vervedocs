import { nanoid } from 'nanoid'
import { NS_A, NS_P, NS_R } from '../constants'
import { getFirstChildByTag, getAttr, getAttrNS, findFirstDescendant } from '../xml.helper'
import { resolveOutline, resolveShadow } from '../color.resolver'
import { resolveRelativePath } from '../rels.resolver'
import { parseTransform } from './text.parser'
import type { PptxSlideContext } from '../types'
import type { PPTImageElement, ImageElementClip } from '@/types/slides'

/**
 * Parse a p:pic element as a PPTImageElement.
 */
export function parseImageElement(picEl: Element, context: PptxSlideContext): PPTImageElement | null {
  // Get shape properties
  const spPr = getFirstChildByTag(picEl, NS_P, 'spPr')
  const transform = parseTransform(spPr, context)
  if (!transform) return null

  // Get image source from blipFill
  const blipFill = getFirstChildByTag(picEl, NS_P, 'blipFill')
  if (!blipFill) return null

  const blip = getFirstChildByTag(blipFill, NS_A, 'blip')
  if (!blip) return null

  const embedRId = getAttrNS(blip, NS_R, 'embed')
  if (!embedRId) return null

  // Resolve image path
  const relEntry = context.slideRels.get(embedRId)
  if (!relEntry) return null

  const resolvedPath = resolveRelativePath(context.slideBasePath, relEntry.target)
  const src = context.mediaMap.get(resolvedPath) || context.mediaMap.get(relEntry.target) || ''

  if (!src) return null

  // Parse clip/crop
  let clip: ImageElementClip | undefined
  const srcRect = findFirstDescendant(blipFill, NS_A, 'srcRect')
  if (srcRect) {
    const l = Number(getAttr(srcRect, 'l') || 0) / 1000
    const t = Number(getAttr(srcRect, 't') || 0) / 1000
    const r = Number(getAttr(srcRect, 'r') || 0) / 1000
    const b = Number(getAttr(srcRect, 'b') || 0) / 1000

    if (l > 0 || t > 0 || r > 0 || b > 0) {
      clip = {
        range: [[l, t], [100 - r, 100 - b]],
        shape: 'rect',
      }
    }
  }

  // Check for shape-based clip (e.g., ellipse)
  if (spPr) {
    const prstGeom = getFirstChildByTag(spPr, NS_A, 'prstGeom')
    if (prstGeom) {
      const prst = getAttr(prstGeom, 'prst')
      if (prst === 'ellipse') {
        if (!clip) {
          clip = { range: [[0, 0], [100, 100]], shape: 'ellipse' }
        } else {
          clip.shape = 'ellipse'
        }
      }
    }
  }

  // Outline
  const lnEl = spPr ? getFirstChildByTag(spPr, NS_A, 'ln') : null
  const outline = resolveOutline(lnEl, context.theme)

  // Shadow
  const effectLst = spPr ? getFirstChildByTag(spPr, NS_A, 'effectLst') : null
  const shadow = resolveShadow(effectLst, context.theme)

  const element: PPTImageElement = {
    id: nanoid(10),
    type: 'image',
    left: transform.left,
    top: transform.top,
    width: transform.width,
    height: transform.height,
    rotate: transform.rotate,
    fixedRatio: true,
    src,
  }

  if (transform.flipH) element.flipH = true
  if (transform.flipV) element.flipV = true
  if (clip) element.clip = clip
  if (outline) element.outline = outline
  if (shadow) element.shadow = shadow

  return element
}
