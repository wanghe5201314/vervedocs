import { nanoid } from 'nanoid'
import { NS_A, NS_P, emuToCanvas, angleToDeg, ptToCanvasPx } from '../constants'
import { VIEWPORT_SIZE } from '@/configs/canvas'
import { getFirstChildByTag, getChildrenByTag, forEachChild, getAttr, findFirstDescendant, getColorElement } from '../xml.helper'
import { resolveColor, resolveFill, resolveOutline, resolveShadow } from '../color.resolver'
import type { PptxSlideContext, ParsedTransform } from '../types'
import type { PPTTextElement } from '@/types/slides'

/**
 * Parse a text body element (p:txBody / a:txBody) into HTML string.
 */
export function parseTextBody(
  txBodyEl: Element,
  context: PptxSlideContext,
  styleDefaults?: { fontName?: string; color?: string },
): { html: string; defaultFontName: string; defaultColor: string; vertical?: boolean; noWrap?: boolean; fontScale?: number } {
  const fallbackFont = styleDefaults?.fontName || context.theme.minorFont
  const fallbackColor = styleDefaults?.color || '#333333'
  const paragraphs = getChildrenByTag(txBodyEl, NS_A, 'p')
  if (paragraphs.length === 0) return { html: '', defaultFontName: fallbackFont, defaultColor: fallbackColor }

  // Check bodyPr attributes
  const bodyPr = getFirstChildByTag(txBodyEl, NS_A, 'bodyPr')
  let vertical = false
  let noWrap = false
  let fontScale = 1.0
  if (bodyPr) {
    const vert = getAttr(bodyPr, 'vert')
    if (vert === 'eaVert' || vert === 'vert' || vert === 'vert270' || vert === 'wordArtVert') {
      vertical = true
    }
    const wrap = getAttr(bodyPr, 'wrap')
    if (wrap === 'none') {
      noWrap = true
    }

    // Handle normAutofit: PowerPoint auto-shrinks font to fit text box
    const normAutofit = getFirstChildByTag(bodyPr, NS_A, 'normAutofit')
    if (normAutofit) {
      const fontScaleVal = Number(getAttr(normAutofit, 'fontScale') || 100000)
      fontScale = fontScaleVal / 100000
    }
  }

  // Extract defaults from lstStyle for each paragraph level (alignment, font size, font name, color).
  // In OOXML, lstStyle defines per-level defaults that paragraphs inherit when they don't have explicit values.
  const lstStyle = getFirstChildByTag(txBodyEl, NS_A, 'lstStyle')
  const lstLevelDefaults = parseLstStyleDefaults(lstStyle, context)
  const bodyDefaultSz = lstLevelDefaults.get(0)?.sz || null

  let firstFontName = ''
  let firstColor = ''

  const htmlParts: string[] = []

  for (const pEl of paragraphs) {
    const pPr = getFirstChildByTag(pEl, NS_A, 'pPr')
    
    // Determine paragraph level (0-based, from pPr lvl attribute)
    const paraLevel = pPr ? Number(getAttr(pPr, 'lvl') || 0) : 0
    const levelDefaults = lstLevelDefaults.get(paraLevel)

    // Paragraph alignment
    let textAlign = ''
    const alignMap: Record<string, string> = {
      l: 'left', ctr: 'center', r: 'right', just: 'justify', dist: 'justify',
    }
    // Extract default font size from paragraph's defRPr
    let paraDefaultSz: string | null = bodyDefaultSz
    let paraDefaultFontName = ''
    let paraDefaultColor = ''

    if (pPr) {
      const algn = getAttr(pPr, 'algn')
      if (algn) {
        textAlign = alignMap[algn] || ''
      }

      // Default run properties for this paragraph (overrides body-level default)
      const defRPr = getFirstChildByTag(pPr, NS_A, 'defRPr')
      if (defRPr) {
        const defSz = getAttr(defRPr, 'sz')
        if (defSz) paraDefaultSz = defSz

        // Default font from defRPr
        const defLatin = getFirstChildByTag(defRPr, NS_A, 'latin')
        const defEa = getFirstChildByTag(defRPr, NS_A, 'ea')
        if (defEa) {
          const tf = getAttr(defEa, 'typeface')
          if (tf && !tf.startsWith('+')) paraDefaultFontName = tf
        }
        if (!paraDefaultFontName && defLatin) {
          const tf = getAttr(defLatin, 'typeface')
          if (tf && !tf.startsWith('+')) paraDefaultFontName = tf
        }

        // Default color from defRPr
        const defFill = getFirstChildByTag(defRPr, NS_A, 'solidFill')
        if (defFill) {
          const colorEl = getColorElement(defFill)
          paraDefaultColor = resolveColor(colorEl, context.theme, '')
        }
      }

    }

    // Fallback to lstStyle level defaults when pPr doesn't have explicit values
    if (levelDefaults) {
      if (!textAlign && levelDefaults.align) {
        textAlign = alignMap[levelDefaults.align] || ''
      }
      if (!paraDefaultSz && levelDefaults.sz) {
        paraDefaultSz = levelDefaults.sz
      }
      if (!paraDefaultFontName && levelDefaults.fontName) {
        paraDefaultFontName = levelDefaults.fontName
      }
      if (!paraDefaultColor && levelDefaults.color) {
        paraDefaultColor = levelDefaults.color
      }
    }

    // Also check endParaRPr for font size (used when paragraph has no runs)
    if (!paraDefaultSz) {
      const endParaRPr = getFirstChildByTag(pEl, NS_A, 'endParaRPr')
      if (endParaRPr) {
        const epSz = getAttr(endParaRPr, 'sz')
        if (epSz) paraDefaultSz = epSz
      }
    }

    // Process runs
    const runParts: string[] = []
    forEachChild(pEl, (child) => {
      if (child.localName === 'r' && child.namespaceURI === NS_A) {
        const { spanHtml, fontName, color } = parseRun(child, context, paraDefaultSz, paraDefaultFontName, paraDefaultColor, fontScale)
        runParts.push(spanHtml)
        if (!firstFontName && fontName) firstFontName = fontName
        if (!firstColor && color) firstColor = color
      } else if (child.localName === 'br' && child.namespaceURI === NS_A) {
        runParts.push('<br>')
      } else if (child.localName === 'fld' && child.namespaceURI === NS_A) {
        // Field: treat as text run
        const { spanHtml, fontName, color } = parseRun(child, context, paraDefaultSz, paraDefaultFontName, paraDefaultColor, fontScale)
        if (spanHtml) {
          runParts.push(spanHtml)
        } else {
          const tEl = findFirstDescendant(child, NS_A, 't')
          if (tEl) {
            runParts.push(escapeHtml(tEl.textContent || ''))
          }
        }
      }
    })

    if (!firstFontName && paraDefaultFontName) firstFontName = paraDefaultFontName
    if (!firstColor && paraDefaultColor) firstColor = paraDefaultColor

    const pStyle = textAlign ? ` style="text-align: ${textAlign}"` : ''
    const content = runParts.join('')
    htmlParts.push(`<p${pStyle}>${content || '<br>'}</p>`)
  }

  return {
    html: htmlParts.join(''),
    defaultFontName: firstFontName || fallbackFont,
    defaultColor: firstColor || fallbackColor,
    vertical,
    noWrap,
    fontScale: fontScale < 1.0 ? fontScale : undefined,
  }
}

function parseRun(
  rEl: Element,
  context: PptxSlideContext,
  defaultSz: string | null = null,
  defaultFontName: string = '',
  defaultColor: string = '',
  fontScale: number = 1.0,
): { spanHtml: string; fontName: string; color: string } {
  const rPr = getFirstChildByTag(rEl, NS_A, 'rPr')
  const tEl = getFirstChildByTag(rEl, NS_A, 't')
  const text = tEl ? (tEl.textContent || '') : ''

  if (!text) return { spanHtml: '', fontName: '', color: '' }

  const styles: string[] = []
  let fontName = ''
  let color = ''

  // Font size: from rPr.sz or fallback to paragraph's defRPr.sz, then apply fontScale
  const sz = rPr ? getAttr(rPr, 'sz') : null
  const effectiveSz = sz || defaultSz
  if (effectiveSz) {
    const ptSize = Number(effectiveSz) / 100
    const pxSize = ptToCanvasPx(ptSize, context.slideWidthEmu) * fontScale
    styles.push(`font-size: ${pxSize.toFixed(1)}px`)
  }

  if (rPr) {
    // Bold
    const bold = getAttr(rPr, 'b')
    if (bold === '1' || bold === 'true') {
      styles.push('font-weight: bold')
    }

    // Italic
    const italic = getAttr(rPr, 'i')
    if (italic === '1' || italic === 'true') {
      styles.push('font-style: italic')
    }

    // Underline
    const underline = getAttr(rPr, 'u')
    if (underline && underline !== 'none') {
      styles.push('text-decoration: underline')
    }

    // Strikethrough
    const strike = getAttr(rPr, 'strike')
    if (strike && strike !== 'noStrike') {
      styles.push('text-decoration: line-through')
    }

    // Font family
    const latinEl = getFirstChildByTag(rPr, NS_A, 'latin')
    const eaEl = getFirstChildByTag(rPr, NS_A, 'ea')
    if (eaEl) {
      const tf = getAttr(eaEl, 'typeface')
      if (tf && !tf.startsWith('+')) {
        fontName = tf
      }
    }
    if (!fontName && latinEl) {
      const tf = getAttr(latinEl, 'typeface')
      if (tf && !tf.startsWith('+')) {
        fontName = tf
      }
    }
    if (!fontName && defaultFontName) {
      fontName = defaultFontName
    }
    if (fontName) {
      styles.push(`font-family: ${fontName}`)
    }

    // Color: solidFill first, then gradFill (take first gradient stop)
    const solidFill = getFirstChildByTag(rPr, NS_A, 'solidFill')
    if (solidFill) {
      const colorEl = getColorElement(solidFill)
      color = resolveColor(colorEl, context.theme, '')
      if (color) {
        styles.push(`color: ${color}`)
      }
    }
    if (!color) {
      const gradFill = getFirstChildByTag(rPr, NS_A, 'gradFill')
      if (gradFill) {
        const gsLst = getFirstChildByTag(gradFill, NS_A, 'gsLst')
        if (gsLst) {
          const firstGs = getFirstChildByTag(gsLst, NS_A, 'gs')
          if (firstGs) {
            const gColorEl = getColorElement(firstGs)
            color = resolveColor(gColorEl, context.theme, '')
            if (color) styles.push(`color: ${color}`)
          }
        }
      }
    }
    if (!color && defaultColor) {
      color = defaultColor
      styles.push(`color: ${color}`)
    }
  } else {
    // No rPr at all - apply defaults
    if (defaultFontName) {
      fontName = defaultFontName
      styles.push(`font-family: ${defaultFontName}`)
    }
    if (defaultColor) {
      color = defaultColor
      styles.push(`color: ${defaultColor}`)
    }
  }

  const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : ''
  const escapedText = escapeHtml(text)
  const spanHtml = styles.length > 0 ? `<span${styleAttr}>${escapedText}</span>` : escapedText

  return { spanHtml, fontName, color }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Parse transform (xfrm) from a shape properties element.
 */
export function parseTransform(spPrEl: Element | null, context: PptxSlideContext): ParsedTransform | null {
  if (!spPrEl) return null

  const xfrm = getFirstChildByTag(spPrEl, NS_A, 'xfrm')
  if (!xfrm) return null

  const offEl = getFirstChildByTag(xfrm, NS_A, 'off')
  const extEl = getFirstChildByTag(xfrm, NS_A, 'ext')
  if (!offEl || !extEl) return null

  const x = Number(getAttr(offEl, 'x') || 0)
  const y = Number(getAttr(offEl, 'y') || 0)
  const cx = Number(getAttr(extEl, 'cx') || 0)
  const cy = Number(getAttr(extEl, 'cy') || 0)

  const rot = getAttr(xfrm, 'rot')
  const flipH = getAttr(xfrm, 'flipH') === '1'
  const flipV = getAttr(xfrm, 'flipV') === '1'

  return {
    left: emuToCanvas(x, context.slideWidthEmu),
    top: emuToCanvas(y, context.slideWidthEmu),
    width: emuToCanvas(cx, context.slideWidthEmu),
    height: emuToCanvas(cy, context.slideWidthEmu),
    rotate: rot ? angleToDeg(rot) : 0,
    flipH,
    flipV,
  }
}

/**
 * Determine if a p:sp element should be treated as a text element vs shape.
 */
export function isTextElement(spEl: Element, context: PptxSlideContext): boolean {
  const nvSpPr = getFirstChildByTag(spEl, NS_P, 'nvSpPr')
  if (nvSpPr) {
    // Check cNvSpPr txBox="1" — explicit text box marker
    const cNvSpPr = getFirstChildByTag(nvSpPr, NS_P, 'cNvSpPr')
    if (cNvSpPr && getAttr(cNvSpPr, 'txBox') === '1') return true

    // Has placeholder -> text element
    const nvPr = getFirstChildByTag(nvSpPr, NS_P, 'nvPr')
    if (nvPr) {
      const ph = getFirstChildByTag(nvPr, NS_P, 'ph')
      if (ph) return true
    }
  }

  const spPr = getFirstChildByTag(spEl, NS_P, 'spPr')
  const txBody = getFirstChildByTag(spEl, NS_P, 'txBody')

  // No text body -> not text element
  if (!txBody) return false

  // Check if has text content
  const hasText = hasActualText(txBody)
  if (!hasText) return false

  // Check preset geometry
  if (spPr) {
    const prstGeom = getFirstChildByTag(spPr, NS_A, 'prstGeom')
    if (prstGeom) {
      const prst = getAttr(prstGeom, 'prst')
      // Rectangle with text and no visible fill/outline = text box
      if (prst === 'rect') {
        const solidFill = getFirstChildByTag(spPr, NS_A, 'solidFill')
        const gradFill = getFirstChildByTag(spPr, NS_A, 'gradFill')
        const ln = getFirstChildByTag(spPr, NS_A, 'ln')
        const noFill = getFirstChildByTag(spPr, NS_A, 'noFill')

        const hasFill = solidFill || gradFill
        const hasOutline = ln && !getFirstChildByTag(ln, NS_A, 'noFill')

        // Also check p:style > fillRef for theme-based fill
        let hasStyleFill = false
        const styleEl = getFirstChildByTag(spEl, NS_P, 'style')
        if (styleEl) {
          const fillRef = getFirstChildByTag(styleEl, NS_A, 'fillRef')
          if (fillRef) {
            const fillIdx = Number(getAttr(fillRef, 'idx') || 0)
            if (fillIdx > 0) hasStyleFill = true
          }
        }

        if (!hasFill && !hasOutline && !hasStyleFill) return true
        if (noFill && !hasOutline && !hasStyleFill) return true
      }
      // Non-rect shapes are shapes even with text
      return false
    }
    // No geometry at all -> text box
    return true
  }

  return true
}

function hasActualText(txBody: Element): boolean {
  const paragraphs = getChildrenByTag(txBody, NS_A, 'p')
  for (const p of paragraphs) {
    // Check runs (a:r)
    const runs = getChildrenByTag(p, NS_A, 'r')
    for (const r of runs) {
      const t = getFirstChildByTag(r, NS_A, 't')
      if (t && (t.textContent || '').trim()) return true
    }
    // Check fields (a:fld) — some shapes only have field text (e.g. slide number, date)
    const flds = getChildrenByTag(p, NS_A, 'fld')
    for (const f of flds) {
      const t = getFirstChildByTag(f, NS_A, 't')
      if (t && (t.textContent || '').trim()) return true
    }
  }
  return false
}

/**
 * Parse a p:sp element as a PPTTextElement.
 */
export function parseTextElement(spEl: Element, context: PptxSlideContext): PPTTextElement | null {
  const spPr = getFirstChildByTag(spEl, NS_P, 'spPr')
  const txBody = getFirstChildByTag(spEl, NS_P, 'txBody')

  let transform = parseTransform(spPr, context)

  // Fallback for placeholder elements without their own xfrm
  if (!transform) {
    const nvSpPr = getFirstChildByTag(spEl, NS_P, 'nvSpPr')
    if (nvSpPr) {
      const nvPr = getFirstChildByTag(nvSpPr, NS_P, 'nvPr')
      const ph = nvPr ? getFirstChildByTag(nvPr, NS_P, 'ph') : null
      if (ph) {
        const phType = getAttr(ph, 'type') || 'body'
        const ratio = context.slideHeightEmu / context.slideWidthEmu
        transform = getPlaceholderDefaults(phType, ratio)
      }
    }
  }
  if (!transform) return null
  if (!txBody) return null

  // Extract p:style > fontRef for default text color and font family
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

  const { html, defaultFontName, defaultColor } = parseTextBody(txBody, context, styleDefaults)

  // Fill from shape properties, with fillRef fallback from p:style
  const fillResult = resolveFill(spPr, context.theme)
  let textFill = fillResult.fill
  if (fillResult.grpFill && context.groupFill) {
    textFill = context.groupFill
  }
  if (!textFill && !fillResult.gradient && !fillResult.grpFill && styleEl) {
    const fillRef = getFirstChildByTag(styleEl, NS_A, 'fillRef')
    if (fillRef) {
      const fillIdx = Number(getAttr(fillRef, 'idx') || 0)
      if (fillIdx > 0) {
        const fillColorEl = getColorElement(fillRef)
        if (fillColorEl) textFill = resolveColor(fillColorEl, context.theme, '')
      }
    }
  }

  // Outline
  const lnEl = spPr ? getFirstChildByTag(spPr, NS_A, 'ln') : null
  const outline = resolveOutline(lnEl, context.theme)

  // Shadow
  const effectLst = spPr ? getFirstChildByTag(spPr, NS_A, 'effectLst') : null
  const shadow = resolveShadow(effectLst, context.theme)

  const element: PPTTextElement = {
    id: nanoid(10),
    type: 'text',
    left: transform.left,
    top: transform.top,
    width: transform.width,
    height: transform.height,
    rotate: transform.rotate,
    content: html,
    defaultFontName,
    defaultColor,
  }

  // Parse bodyPr text insets for accurate padding
  const bodyPr = getFirstChildByTag(txBody, NS_A, 'bodyPr')
  if (bodyPr) {
    let tIns = 45720, rIns = 91440, bIns = 45720, lIns = 91440
    const tInsAttr = getAttr(bodyPr, 'tIns')
    const rInsAttr = getAttr(bodyPr, 'rIns')
    const bInsAttr = getAttr(bodyPr, 'bIns')
    const lInsAttr = getAttr(bodyPr, 'lIns')
    if (tInsAttr !== null) tIns = Number(tInsAttr)
    if (rInsAttr !== null) rIns = Number(rInsAttr)
    if (bInsAttr !== null) bIns = Number(bInsAttr)
    if (lInsAttr !== null) lIns = Number(lInsAttr)
    element.textInsets = [
      emuToCanvas(tIns, context.slideWidthEmu),
      emuToCanvas(rIns, context.slideWidthEmu),
      emuToCanvas(bIns, context.slideWidthEmu),
      emuToCanvas(lIns, context.slideWidthEmu),
    ]
  }

  if (textFill && textFill !== 'transparent') element.fill = textFill
  if (fillResult.gradient) element.fill = fillResult.gradient.color[0]
  if (outline) element.outline = outline
  if (shadow) element.shadow = shadow

  return element
}

/**
 * Parse lstStyle level defaults for paragraph properties (alignment, font size, font name, color).
 * OOXML lstStyle contains lvl1pPr through lvl9pPr, each defining defaults for paragraphs at that level.
 * Returns a Map keyed by 0-based level index.
 */
interface LstLevelDefaults {
  align?: string
  sz?: string
  fontName?: string
  color?: string
}

function parseLstStyleDefaults(lstStyle: Element | null, context: PptxSlideContext): Map<number, LstLevelDefaults> {
  const map = new Map<number, LstLevelDefaults>()
  if (!lstStyle) return map

  for (let lvl = 1; lvl <= 9; lvl++) {
    const pPr = getFirstChildByTag(lstStyle, NS_A, `lvl${lvl}pPr`)
    if (!pPr) continue

    const defaults: LstLevelDefaults = {}
    const algn = getAttr(pPr, 'algn')
    if (algn) defaults.align = algn

    const defRPr = getFirstChildByTag(pPr, NS_A, 'defRPr')
    if (defRPr) {
      const sz = getAttr(defRPr, 'sz')
      if (sz) defaults.sz = sz

      // Font name: prefer ea (East Asian) over latin
      const ea = getFirstChildByTag(defRPr, NS_A, 'ea')
      const latin = getFirstChildByTag(defRPr, NS_A, 'latin')
      if (ea) {
        const tf = getAttr(ea, 'typeface')
        if (tf && !tf.startsWith('+')) defaults.fontName = tf
      }
      if (!defaults.fontName && latin) {
        const tf = getAttr(latin, 'typeface')
        if (tf && !tf.startsWith('+')) defaults.fontName = tf
      }

      // Color
      const solidFill = getFirstChildByTag(defRPr, NS_A, 'solidFill')
      if (solidFill) {
        const colorEl = getColorElement(solidFill)
        if (colorEl) defaults.color = resolveColor(colorEl, context.theme, '')
      }
    }

    map.set(lvl - 1, defaults) // 0-based level key
  }

  return map
}

/**
 * Get default transform for common placeholder types when xfrm is missing.
 */
function getPlaceholderDefaults(phType: string, viewportRatio: number): ParsedTransform {
  const w = VIEWPORT_SIZE
  const h = VIEWPORT_SIZE * viewportRatio
  const defaults: Record<string, ParsedTransform> = {
    title: { left: w * 0.05, top: h * 0.05, width: w * 0.9, height: h * 0.15, rotate: 0, flipH: false, flipV: false },
    ctrTitle: { left: w * 0.1, top: h * 0.25, width: w * 0.8, height: h * 0.25, rotate: 0, flipH: false, flipV: false },
    subTitle: { left: w * 0.15, top: h * 0.55, width: w * 0.7, height: h * 0.15, rotate: 0, flipH: false, flipV: false },
    body: { left: w * 0.05, top: h * 0.25, width: w * 0.9, height: h * 0.6, rotate: 0, flipH: false, flipV: false },
    dt: { left: w * 0.05, top: h * 0.92, width: w * 0.2, height: h * 0.06, rotate: 0, flipH: false, flipV: false },
    ftr: { left: w * 0.35, top: h * 0.92, width: w * 0.3, height: h * 0.06, rotate: 0, flipH: false, flipV: false },
    sldNum: { left: w * 0.75, top: h * 0.92, width: w * 0.2, height: h * 0.06, rotate: 0, flipH: false, flipV: false },
  }
  return defaults[phType] || { left: w * 0.05, top: w * 0.05, width: w * 0.9, height: h * 0.3, rotate: 0, flipH: false, flipV: false }
}
