import { nanoid } from 'nanoid'
import { VIEWPORT_SIZE } from '@/configs/canvas'
import { NS_A, NS_P, emuToCanvas } from '../constants'
import { getFirstChildByTag, forEachChild, getAttr, getColorElement } from '../xml.helper'
import { resolveColor, resolveOutline } from '../color.resolver'
import type { PptxSlideContext } from '../types'
import type { PPTElement, PPTShapeElement, PPTTextElement } from '@/types/slides'
import { isTextElement, parseTextElement } from './text.parser'
import { parseShapeElement } from './shape.parser'
import { parseImageElement } from './image.parser'
import { parseLineElement } from './line.parser'
import { isMediaElement, parseMediaElement } from './media.parser'

/**
 * Parse a p:sp element as either text or shape (inline to avoid circular deps).
 */
function parseShapeOrTextInGroup(spEl: Element, context: PptxSlideContext): PPTElement | null {
  if (isTextElement(spEl, context)) {
    return parseTextElement(spEl, context)
  }
  return parseShapeElement(spEl, context)
}

/**
 * Scale font-size values in HTML inline styles by a given factor.
 * Matches patterns like `font-size: 25.0px` and multiplies the value.
 */
function scaleFontSizesInHtml(html: string, scale: number): string {
  if (scale === 1) return html
  return html.replace(/font-size:\s*([\d.]+)px/g, (_, size) => {
    const scaled = (parseFloat(size) * scale).toFixed(1)
    return `font-size: ${scaled}px`
  })
}

/**
 * Parse a p:grpSp (group shape) element.
 * Returns a flat array of PPTElements, each with the same groupId.
 */
export function parseGroupElement(grpSpEl: Element, context: PptxSlideContext): PPTElement[] {
  const groupId = nanoid(10)

  // Get group transform
  const grpSpPr = getFirstChildByTag(grpSpEl, NS_P, 'grpSpPr')
  if (!grpSpPr) return []

  const xfrm = getFirstChildByTag(grpSpPr, NS_A, 'xfrm')
  if (!xfrm) return []

  const offEl = getFirstChildByTag(xfrm, NS_A, 'off')
  const extEl = getFirstChildByTag(xfrm, NS_A, 'ext')
  const chOffEl = getFirstChildByTag(xfrm, NS_A, 'chOff')
  const chExtEl = getFirstChildByTag(xfrm, NS_A, 'chExt')

  if (!offEl || !extEl || !chOffEl || !chExtEl) return []

  // Group bounding box in slide coordinates (EMU)
  const groupX = Number(getAttr(offEl, 'x') || 0)
  const groupY = Number(getAttr(offEl, 'y') || 0)
  const groupCx = Number(getAttr(extEl, 'cx') || 1)
  const groupCy = Number(getAttr(extEl, 'cy') || 1)

  // Child coordinate space
  const chOffX = Number(getAttr(chOffEl, 'x') || 0)
  const chOffY = Number(getAttr(chOffEl, 'y') || 0)
  const chExtCx = Number(getAttr(chExtEl, 'cx') || 1)
  const chExtCy = Number(getAttr(chExtEl, 'cy') || 1)

  // Scale factors
  const scaleX = groupCx / chExtCx
  const scaleY = groupCy / chExtCy

  // Font scale: use geometric mean of scaleX/scaleY since fonts scale uniformly
  const fontScale = Math.sqrt(scaleX * scaleY)

  // Parse group-level fill from grpSpPr (for grpFill inheritance by children)
  let groupFill: string | undefined
  const grpSolidFill = getFirstChildByTag(grpSpPr, NS_A, 'solidFill')
  if (grpSolidFill) {
    const colorEl = getColorElement(grpSolidFill)
    groupFill = resolveColor(colorEl, context.theme, '')
  }

  // Parse group-level outline from grpSpPr
  const grpLnEl = getFirstChildByTag(grpSpPr, NS_A, 'ln')
  const groupOutline = resolveOutline(grpLnEl, context.theme)

  // Set group fill/outline on context for child parsers, save previous values for restore
  const prevGroupFill = context.groupFill
  const prevGroupOutline = context.groupOutline
  if (groupFill) context.groupFill = groupFill
  if (groupOutline) context.groupOutline = groupOutline

  const elements: PPTElement[] = []

  forEachChild(grpSpEl, (child) => {
    const ns = child.namespaceURI
    const localName = child.localName

    if (ns !== NS_P) return

    let childElements: PPTElement[] = []

    try {
      if (localName === 'sp') {
        const el = parseShapeOrTextInGroup(child, context)
        if (el) childElements = [el]
      } else if (localName === 'pic') {
        if (isMediaElement(child, context)) {
          const el = parseMediaElement(child, context)
          if (el) childElements = [el]
        } else {
          const el = parseImageElement(child, context)
          if (el) childElements = [el]
        }
      } else if (localName === 'cxnSp') {
        const el = parseLineElement(child, context)
        if (el) childElements = [el]
      } else if (localName === 'grpSp') {
        childElements = parseGroupElement(child, context)
      }
    } catch (e) {
      console.warn('[PPTX Import] Failed to parse group child:', localName, e)
    }

    // Transform child coordinates from child space to slide space
    for (const el of childElements) {
      const childLeftEmu = el.left / VIEWPORT_SIZE * context.slideWidthEmu
      const childTopEmu = el.top / VIEWPORT_SIZE * context.slideWidthEmu

      const slideX = groupX + (childLeftEmu - chOffX) * scaleX
      const slideY = groupY + (childTopEmu - chOffY) * scaleY

      el.left = emuToCanvas(slideX, context.slideWidthEmu)
      el.top = emuToCanvas(slideY, context.slideWidthEmu)

      if (el.type !== 'line') {
        const childWidthEmu = el.width / VIEWPORT_SIZE * context.slideWidthEmu
        const childHeightEmu = el.height / VIEWPORT_SIZE * context.slideWidthEmu
        el.width = emuToCanvas(childWidthEmu * scaleX, context.slideWidthEmu)
        el.height = emuToCanvas(childHeightEmu * scaleY, context.slideWidthEmu)
      }

      // Scale font sizes in text content to match group transform
      if (fontScale !== 1) {
        if (el.type === 'shape') {
          const shapeEl = el as PPTShapeElement
          if (shapeEl.text) {
            shapeEl.text.content = scaleFontSizesInHtml(shapeEl.text.content, fontScale)
            if (shapeEl.text.textInsets) {
              shapeEl.text.textInsets = [
                shapeEl.text.textInsets[0] * scaleY,
                shapeEl.text.textInsets[1] * scaleX,
                shapeEl.text.textInsets[2] * scaleY,
                shapeEl.text.textInsets[3] * scaleX,
              ]
            }
          }
        } else if (el.type === 'text') {
          const textEl = el as PPTTextElement
          textEl.content = scaleFontSizesInHtml(textEl.content, fontScale)
        }
      }

      el.groupId = groupId
    }

    elements.push(...childElements)
  })

  // Restore previous group fill/outline on context
  context.groupFill = prevGroupFill
  context.groupOutline = prevGroupOutline

  return elements
}
