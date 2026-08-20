import { nanoid } from 'nanoid'
import { NS_A, NS_P, NS_C, NS_MC, NS_R, NS_DSP, NS_DGM } from './constants'
import { parseXml, getFirstChildByTag, forEachChild, findFirstDescendant, getAttr, getAttrNS, getChildrenByTag, getColorElement } from './xml.helper'
import { parseBackground } from './parsers/background.parser'
import { isTextElement, parseTextElement, parseTransform, parseTextBody } from './parsers/text.parser'
import { parseShapeElement, parseBodyPrInsets } from './parsers/shape.parser'
import { parseImageElement } from './parsers/image.parser'
import { parseLineElement } from './parsers/line.parser'
import { parseTableElement } from './parsers/table.parser'
import { parseChartElement } from './parsers/chart.parser'
import { parseGroupElement } from './parsers/group.parser'
import { isMediaElement, parseMediaElement } from './parsers/media.parser'
import { resolveRelativePath } from './rels.resolver'
import { resolveFill, resolveOutline, resolveShadow, resolveColor } from './color.resolver'
import { getPresetShape } from './preset-shapes'
import type { PptxSlideContext } from './types'
import type { Slide, PPTElement } from '@/types/slides'

/**
 * Parse a single slide XML into a Slide object.
 */
export function parseSlide(slideXml: string, context: PptxSlideContext): Slide {
  const doc = parseXml(slideXml)
  const root = doc.documentElement

  // Find shape tree: p:cSld -> p:spTree
  const cSld = getFirstChildByTag(root, NS_P, 'cSld')
  const elements: PPTElement[] = []

  if (cSld) {
    const spTree = getFirstChildByTag(cSld, NS_P, 'spTree')
    if (spTree) {
      forEachChild(spTree, (child) => {
        const parsed = parseSpTreeChild(child, context)
        elements.push(...parsed)
      })
    }
  }

  // Parse background
  const bgEl = cSld ? getFirstChildByTag(cSld, NS_P, 'bg') : null
  const background = parseBackground(bgEl, context)

  const slide: Slide = {
    id: nanoid(10),
    elements,
  }

  if (background) slide.background = background

  return slide
}

/**
 * Parse a child element of the shape tree.
 * Returns an array because groups expand to multiple elements.
 */
function parseSpTreeChild(child: Element, context: PptxSlideContext): PPTElement[] {
  const ns = child.namespaceURI
  const localName = child.localName

  // Handle mc:AlternateContent — unwrap and parse children from mc:Choice (or mc:Fallback)
  if (ns === NS_MC && localName === 'AlternateContent') {
    const choice = getFirstChildByTag(child, NS_MC, 'Choice')
    if (choice) {
      const results: PPTElement[] = []
      forEachChild(choice, (subChild) => {
        results.push(...parseSpTreeChild(subChild, context))
      })
      if (results.length > 0) {
        return results
      }
    }
    const fallback = getFirstChildByTag(child, NS_MC, 'Fallback')
    if (fallback) {
      const results: PPTElement[] = []
      forEachChild(fallback, (subChild) => {
        results.push(...parseSpTreeChild(subChild, context))
      })
      return results
    }
    return []
  }

  if (ns !== NS_P) {
    return []
  }

  try {
    if (localName === 'sp') {
      const el = parseShapeOrText(child, context)
      return el ? [el] : []
    }

    if (localName === 'pic') {
      if (isMediaElement(child, context)) {
        const el = parseMediaElement(child, context)
        return el ? [el] : []
      }
      const el = parseImageElement(child, context)
      return el ? [el] : []
    }

    if (localName === 'cxnSp') {
      const el = parseLineElement(child, context)
      return el ? [el] : []
    }

    if (localName === 'graphicFrame') {
      return parseGraphicFrame(child, context)
    }

    if (localName === 'grpSp') {
      return parseGroupElement(child, context)
    }

  } catch (e) {
    console.warn('[PPTX Import] Failed to parse element:', localName, e)
  }

  return []
}

/**
 * Parse a p:sp element as either text or shape.
 */
function parseShapeOrText(spEl: Element, context: PptxSlideContext): PPTElement | null {
  if (isTextElement(spEl, context)) {
    return parseTextElement(spEl, context)
  }
  return parseShapeElement(spEl, context)
}

/**
 * Parse a p:graphicFrame - could be a table, chart, or SmartArt diagram.
 */
function parseGraphicFrame(graphicFrameEl: Element, context: PptxSlideContext): PPTElement[] {
  const graphic = findFirstDescendant(graphicFrameEl, NS_A, 'graphic')
  if (!graphic) {
    return []
  }

  const graphicData = findFirstDescendant(graphic, NS_A, 'graphicData')
  if (!graphicData) {
    return []
  }

  const uri = graphicData.getAttribute('uri') || ''

  // Table
  if (uri.includes('table') || findFirstDescendant(graphicData, NS_A, 'tbl')) {
    const el = parseTableElement(graphicFrameEl, context)
    return el ? [el] : []
  }

  // Chart
  if (uri.includes('chart') || findFirstDescendant(graphicData, NS_C, 'chart')) {
    const el = parseChartElement(graphicFrameEl, context)
    return el ? [el] : []
  }

  // SmartArt / Diagram: parse pre-rendered drawing XML
  if (uri.includes('diagram')) {
    return parseDiagramGraphicFrame(graphicFrameEl, graphicData, context)
  }

  return []
}

/**
 * Parse a SmartArt diagram graphicFrame.
 * SmartArt has a pre-rendered drawing XML in ppt/diagrams/drawingN.xml that
 * contains dsp:sp elements with actual shapes. We find this via the
 * relationship `http://...diagramDrawing` referenced by dgm:relIds/@r:dm or
 * a separate drawing relationship.
 */
function parseDiagramGraphicFrame(
  graphicFrameEl: Element,
  graphicData: Element,
  context: PptxSlideContext,
): PPTElement[] {
  if (!context.diagramDrawingMap) return []

  // Get graphicFrame transform for bounding box
  const nvGraphicFramePr = getFirstChildByTag(graphicFrameEl, NS_P, 'nvGraphicFramePr')
  const xfrmEl = getFirstChildByTag(graphicFrameEl, NS_P, 'xfrm')
    || (nvGraphicFramePr ? null : null)

  // Find the diagram drawing relationship
  // The dgm:relIds element has dm, lo, qs, cs attributes pointing to diagram parts
  // We look for the drawing relationship in slide rels
  const relIds = findFirstDescendant(graphicData, NS_DGM, 'relIds')
  let drawingXml: string | null = null

  if (relIds) {
    // Try dm (data model) first - but we actually need the drawing
    // The drawing is typically a separate relationship
    // Look for all diagram-related rels
    for (const [, entry] of context.slideRels) {
      if (entry.type.includes('diagramDrawing') || entry.type.includes('microsoft.com/office/2007/relationships/diagramDrawing')) {
        const resolvedPath = resolveRelativePath(context.slideBasePath, entry.target)
        drawingXml = context.diagramDrawingMap.get(resolvedPath)
          || context.diagramDrawingMap.get(entry.target)
          || null
        if (drawingXml) break
      }
    }
  }

  // Also try finding drawing reference via r:dm attribute on relIds
  if (!drawingXml && relIds) {
    const dmRId = getAttrNS(relIds, NS_R, 'dm')
    if (dmRId) {
      // The dm points to data, but sometimes there's a parallel drawing relationship
      // Try incrementing the rId number to find the drawing
      const dmEntry = context.slideRels.get(dmRId)
      if (dmEntry) {
        // Search for any rel that points to diagrams/drawing*.xml
        for (const [, entry] of context.slideRels) {
          if (entry.target.includes('diagrams/drawing')) {
            const resolvedPath = resolveRelativePath(context.slideBasePath, entry.target)
            drawingXml = context.diagramDrawingMap.get(resolvedPath)
              || context.diagramDrawingMap.get(entry.target)
              || null
            if (drawingXml) break
          }
        }
      }
    }
  }

  if (!drawingXml) return []

  return parseDiagramDrawingXml(drawingXml, graphicFrameEl, context)
}

/**
 * Parse a diagram drawing XML (dsp:drawing) into PPTElements.
 * The drawing contains dsp:spTree with dsp:sp elements that use DrawingML (a:) namespace
 * for their shape properties and text bodies.
 */
function parseDiagramDrawingXml(
  drawingXml: string,
  graphicFrameEl: Element,
  context: PptxSlideContext,
): PPTElement[] {
  try {
    const doc = parseXml(drawingXml)
    const root = doc.documentElement

    // Find dsp:spTree (shape tree within the diagram drawing)
    const spTree = findFirstDescendant(root, NS_DSP, 'spTree')
      || findDescendantByLocalName(root, 'spTree')
    if (!spTree) return []

    const elements: PPTElement[] = []

    forEachChild(spTree, (child) => {
      try {
        const parsed = parseDspShape(child, context)
        if (parsed) elements.push(parsed)
      } catch (e) {
        console.warn('[PPTX Import] Failed to parse diagram shape:', child.localName, e)
      }
    })

    return elements
  } catch (e) {
    console.warn('[PPTX Import] Failed to parse diagram drawing XML:', e)
    return []
  }
}

/**
 * Parse a dsp:sp element from a diagram drawing.
 * dsp:sp uses a:spPr (not p:spPr) for shape properties and a:txBody for text.
 */
function parseDspShape(spEl: Element, context: PptxSlideContext): PPTElement | null {
  const localName = spEl.localName
  if (localName !== 'sp') return null

  // dsp:sp has dsp:spPr (or just spPr) containing a:xfrm, a:prstGeom, fills, etc.
  const spPr = findFirstDescendant(spEl, NS_DSP, 'spPr')
    || findDescendantByLocalName(spEl, 'spPr')
  if (!spPr) return null

  const transform = parseTransform(spPr, context)
  if (!transform) return null

  // Check for text body
  const txBody = findFirstDescendant(spEl, NS_DSP, 'txBody')
    || findDescendantByLocalName(spEl, 'txBody')

  // Since dsp:sp has the same internal structure as p:sp (a:spPr, a:txBody),
  // we can reuse existing parse logic. But the namespace differs.
  // Create the element directly from the transform and fill data.

  // Geometry
  let viewBox: [number, number] = [200, 200]
  let path = 'M 0 0 L 200 0 L 200 200 L 0 200 Z'
  let special = false

  const prstGeom = getFirstChildByTag(spPr, NS_A, 'prstGeom')
  if (prstGeom) {
    const prst = getAttr(prstGeom, 'prst') || 'rect'
    const shape = getPresetShape(prst, 200, 200)
    viewBox = shape.viewBox as [number, number]
    path = shape.path
    special = shape.special || false
  }

  // Fill
  const fillResult = resolveFill(spPr, context.theme)
  let fill = fillResult.fill

  // Style element for fallback fill
  const styleEl = findFirstDescendant(spEl, NS_DSP, 'style')
    || findDescendantByLocalName(spEl, 'style')
  if (!fill && !fillResult.gradient && styleEl) {
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

  // Outline
  const lnEl = getFirstChildByTag(spPr, NS_A, 'ln')
  const outline = resolveOutline(lnEl, context.theme)

  // Shadow
  const effectLst = getFirstChildByTag(spPr, NS_A, 'effectLst')
  const shadow = resolveShadow(effectLst, context.theme)

  // Text
  let text: { content: string; defaultFontName: string; defaultColor: string; align: 'top' | 'middle' | 'bottom'; textInsets?: [number, number, number, number] } | undefined
  if (txBody) {
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

    const { html, defaultFontName, defaultColor } = parseTextBody(txBody, context, styleDefaults)
    if (html && html !== '<p><br></p>') {
      const bodyPr = getFirstChildByTag(txBody, NS_A, 'bodyPr')
      let align: 'top' | 'middle' | 'bottom' = 'top'
      if (bodyPr) {
        const anchor = getAttr(bodyPr, 'anchor')
        if (anchor === 'ctr') align = 'middle'
        else if (anchor === 'b') align = 'bottom'
      }
      const textInsets = parseBodyPrInsets(bodyPr, context)
      text = { content: html, defaultFontName, defaultColor, align, textInsets }
    }
  }

  const element: any = {
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

  return element as PPTElement
}

/**
 * Find a descendant element by local name (ignoring namespace).
 * Useful for dsp: namespace elements that may vary.
 */
function findDescendantByLocalName(parent: Element, localName: string): Element | null {
  const all = parent.getElementsByTagName('*')
  for (let i = 0; i < all.length; i++) {
    if (all[i].localName === localName) return all[i]
  }
  return null
}

/**
 * Parse non-placeholder elements from a slide layout or slide master XML.
 * These are decorative/visual elements that appear behind slide-specific content.
 */
export function parseLayoutElements(layoutXml: string, context: PptxSlideContext): PPTElement[] {
  const doc = parseXml(layoutXml)
  const root = doc.documentElement

  const cSld = getFirstChildByTag(root, NS_P, 'cSld')
  if (!cSld) return []

  const spTree = getFirstChildByTag(cSld, NS_P, 'spTree')
  if (!spTree) return []

  const elements: PPTElement[] = []

  forEachChild(spTree, (child) => {
    // Skip placeholder elements — they are "slots" filled by the slide itself
    if (isPlaceholderElement(child)) return

    try {
      const parsed = parseSpTreeChild(child, context)
      elements.push(...parsed)
    } catch (e) {
      console.warn('[PPTX Import] Failed to parse layout element:', child.localName, e)
    }
  })

  return elements
}

/**
 * Check if an element is a placeholder (has p:ph in its non-visual properties).
 */
function isPlaceholderElement(el: Element): boolean {
  const ns = el.namespaceURI
  if (ns !== NS_P) return false

  const nvTagMap: Record<string, string> = {
    sp: 'nvSpPr',
    pic: 'nvPicPr',
    grpSp: 'nvGrpSpPr',
    graphicFrame: 'nvGraphicFramePr',
    cxnSp: 'nvCxnSpPr',
  }

  const nvTag = nvTagMap[el.localName || '']
  if (!nvTag) return false

  const nvEl = getFirstChildByTag(el, NS_P, nvTag)
  if (!nvEl) return false

  const nvPr = getFirstChildByTag(nvEl, NS_P, 'nvPr')
  if (!nvPr) return false

  return !!getFirstChildByTag(nvPr, NS_P, 'ph')
}
