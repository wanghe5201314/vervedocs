import { NS_A, NS_P } from '../constants'
import { getFirstChildByTag, getAttr, getColorElement, findFirstDescendant } from '../xml.helper'
import { resolveColor, resolveGradient } from '../color.resolver'
import { resolveRelativePath } from '../rels.resolver'
import type { PptxSlideContext } from '../types'
import type { SlideBackground } from '@/types/slides'

/**
 * Parse slide background from p:bg element.
 */
export function parseBackground(
  bgEl: Element | null,
  context: PptxSlideContext,
): SlideBackground | undefined {
  if (!bgEl) {
    // Fallback to slide layout, then slide master background
    return context.slideLayoutBg || context.slideMasterBg
  }

  // Try bgPr first (background properties with fill)
  const bgPr = getFirstChildByTag(bgEl, NS_P, 'bgPr')
  if (bgPr) {
    return parseBgPr(bgPr, context)
  }

  // Try bgRef (background reference to theme)
  const bgRef = getFirstChildByTag(bgEl, NS_P, 'bgRef')
  if (bgRef) {
    return parseBgRef(bgRef, context)
  }

  return context.slideLayoutBg || context.slideMasterBg
}

function parseBgPr(bgPr: Element, context: PptxSlideContext): SlideBackground | undefined {
  // Solid fill
  const solidFill = getFirstChildByTag(bgPr, NS_A, 'solidFill')
  if (solidFill) {
    const colorEl = getColorElement(solidFill)
    const color = resolveColor(colorEl, context.theme, '#FFFFFF')
    return { type: 'solid', color }
  }

  // Gradient fill
  const gradFill = getFirstChildByTag(bgPr, NS_A, 'gradFill')
  if (gradFill) {
    const gradient = resolveGradient(gradFill, context.theme)
    if (gradient) {
      return {
        type: 'gradient',
        gradientType: gradient.type,
        gradientColor: gradient.color,
        gradientRotate: gradient.rotate,
      }
    }
  }

  // Image fill (blipFill)
  const blipFill = getFirstChildByTag(bgPr, NS_A, 'blipFill')
  if (blipFill) {
    const blip = getFirstChildByTag(blipFill, NS_A, 'blip')
    if (blip) {
      const embedRId = blip.getAttributeNS(
        'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
        'embed',
      )
      if (embedRId) {
        const relEntry = context.slideRels.get(embedRId)
        if (relEntry) {
          const resolvedPath = resolveRelativePath(context.slideBasePath, relEntry.target)
          const src = context.mediaMap.get(resolvedPath) || context.mediaMap.get(relEntry.target) || ''
          if (src) {
            return { type: 'image', image: src, imageSize: 'cover' }
          }
        }
      }
    }
  }

  return undefined
}

function parseBgRef(bgRef: Element, context: PptxSlideContext): SlideBackground | undefined {
  // bgRef references a theme style with a color override
  const colorEl = getColorElement(bgRef)
  if (colorEl) {
    const color = resolveColor(colorEl, context.theme, '#FFFFFF')
    return { type: 'solid', color }
  }

  const idx = Number(getAttr(bgRef, 'idx') || 0)
  if (idx > 0 && idx <= 999) {
    // Simple fill from theme
    return { type: 'solid', color: context.theme.colors.lt1 }
  }

  return undefined
}

/**
 * Parse background from a slide master or slide layout XML.
 */
export function parseMasterBackground(xmlString: string, context: PptxSlideContext): SlideBackground | undefined {
  if (!xmlString) return undefined

  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'application/xml')
  const root = doc.documentElement

  // Find p:cSld -> p:bg
  const cSld = findFirstDescendant(root, NS_P, 'cSld')
  if (!cSld) return undefined

  const bg = getFirstChildByTag(cSld, NS_P, 'bg')
  return parseBackground(bg, context)
}
