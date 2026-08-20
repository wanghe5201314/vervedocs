import tinycolor from 'tinycolor2'
import { NS_A, PRESET_COLORS, stToPercent, angleToDeg, emuToPx } from './constants'
import { getAttr, getFirstChildByTag, forEachChild, getColorElement } from './xml.helper'
import type { PptxThemeData } from './types'
import type { PPTElementOutline, PPTElementShadow, ShapeGradient } from '@/types/slides'

/**
 * Resolve a color element to a hex color string.
 * Handles srgbClr, schemeClr, sysClr, prstClr, scrgbClr with modifiers.
 */
export function resolveColor(colorEl: Element | null, theme: PptxThemeData, defaultColor: string = '#000000'): string {
  if (!colorEl) return defaultColor

  let baseColor = defaultColor
  const localName = colorEl.localName

  if (localName === 'srgbClr') {
    baseColor = '#' + (getAttr(colorEl, 'val') || '000000')
  } else if (localName === 'schemeClr') {
    const val = getAttr(colorEl, 'val') || ''
    // Map scheme color names to theme color keys
    const schemeMap: Record<string, string> = {
      dk1: 'dk1', lt1: 'lt1', dk2: 'dk2', lt2: 'lt2',
      accent1: 'accent1', accent2: 'accent2', accent3: 'accent3',
      accent4: 'accent4', accent5: 'accent5', accent6: 'accent6',
      hlink: 'hlink', folHlink: 'folHlink',
      tx1: 'dk1', tx2: 'dk2', bg1: 'lt1', bg2: 'lt2',
      phClr: 'accent1', // placeholder color defaults to accent1
    }
    const themeKey = schemeMap[val] || val
    baseColor = theme.colors[themeKey] || defaultColor
  } else if (localName === 'sysClr') {
    baseColor = '#' + (getAttr(colorEl, 'lastClr') || getAttr(colorEl, 'val') || '000000')
  } else if (localName === 'prstClr') {
    const val = getAttr(colorEl, 'val') || ''
    baseColor = PRESET_COLORS[val] || defaultColor
  } else if (localName === 'scrgbClr') {
    // scRGB color: r, g, b as percentages (0-100000)
    const r = Math.round(Number(getAttr(colorEl, 'r') || 0) / 100000 * 255)
    const g = Math.round(Number(getAttr(colorEl, 'g') || 0) / 100000 * 255)
    const b = Math.round(Number(getAttr(colorEl, 'b') || 0) / 100000 * 255)
    baseColor = tinycolor({ r, g, b }).toHexString()
  }

  // Apply color modifiers
  return applyColorModifiers(baseColor, colorEl)
}

function applyColorModifiers(baseColor: string, colorEl: Element): string {
  let color = tinycolor(baseColor)
  let alpha = 1

  forEachChild(colorEl, (child) => {
    const name = child.localName
    const val = Number(getAttr(child, 'val') || 0)

    if (name === 'alpha') {
      alpha = val / 100000
    } else if (name === 'tint') {
      const percent = val / 100000
      const hsl = color.toHsl()
      hsl.l = hsl.l + (1 - hsl.l) * percent
      color = tinycolor(hsl)
    } else if (name === 'shade') {
      const percent = val / 100000
      const hsl = color.toHsl()
      hsl.l = hsl.l * percent
      color = tinycolor(hsl)
    } else if (name === 'satMod') {
      const percent = val / 100000
      const hsl = color.toHsl()
      hsl.s = hsl.s * percent
      color = tinycolor(hsl)
    } else if (name === 'satOff') {
      const offset = val / 100000
      const hsl = color.toHsl()
      hsl.s = Math.max(0, Math.min(1, hsl.s + offset))
      color = tinycolor(hsl)
    } else if (name === 'lumMod') {
      const percent = val / 100000
      const hsl = color.toHsl()
      hsl.l = hsl.l * percent
      color = tinycolor(hsl)
    } else if (name === 'lumOff') {
      const offset = val / 100000
      const hsl = color.toHsl()
      hsl.l = Math.max(0, Math.min(1, hsl.l + offset))
      color = tinycolor(hsl)
    } else if (name === 'hueMod') {
      const percent = val / 100000
      const hsl = color.toHsl()
      hsl.h = (hsl.h * percent) % 360
      color = tinycolor(hsl)
    } else if (name === 'hueOff') {
      const offset = val / 60000 // hue offset is in 60000ths of a degree
      const hsl = color.toHsl()
      hsl.h = (hsl.h + offset) % 360
      color = tinycolor(hsl)
    }
  })

  if (alpha < 1) {
    return color.setAlpha(alpha).toRgbString()
  }
  return color.toHexString()
}

/**
 * Resolve a fill from a shape properties element.
 * Looks for a:solidFill, a:gradFill, a:noFill
 */
export function resolveFill(
  spPrEl: Element | null,
  theme: PptxThemeData,
): { fill?: string; gradient?: ShapeGradient; grpFill?: boolean } {
  if (!spPrEl) return {}

  const noFill = getFirstChildByTag(spPrEl, NS_A, 'noFill')
  if (noFill) return { fill: 'transparent' }

  // Check for grpFill (inherit from parent group)
  const grpFillEl = getFirstChildByTag(spPrEl, NS_A, 'grpFill')
  if (grpFillEl) return { grpFill: true }

  const solidFill = getFirstChildByTag(spPrEl, NS_A, 'solidFill')
  if (solidFill) {
    const colorEl = getColorElement(solidFill)
    return { fill: resolveColor(colorEl, theme, '#000000') }
  }

  const gradFill = getFirstChildByTag(spPrEl, NS_A, 'gradFill')
  if (gradFill) {
    const gradient = resolveGradient(gradFill, theme)
    if (gradient) return { gradient }
  }

  return {}
}

/**
 * Parse gradient fill
 */
export function resolveGradient(gradFillEl: Element, theme: PptxThemeData): ShapeGradient | null {
  const gsLst = getFirstChildByTag(gradFillEl, NS_A, 'gsLst')
  if (!gsLst) return null

  const stops: { pos: number; color: string }[] = []
  forEachChild(gsLst, (gs) => {
    if (gs.localName === 'gs') {
      const pos = Number(getAttr(gs, 'pos') || 0) / 100000
      const colorEl = getColorElement(gs)
      const color = resolveColor(colorEl, theme, '#000000')
      stops.push({ pos, color })
    }
  })

  if (stops.length < 2) return null

  // Determine gradient type
  const linEl = getFirstChildByTag(gradFillEl, NS_A, 'lin')
  let gradientType: 'linear' | 'radial' = 'linear'
  let rotate = 0

  if (linEl) {
    const ang = getAttr(linEl, 'ang')
    if (ang) rotate = angleToDeg(ang)
  } else {
    const pathEl = getFirstChildByTag(gradFillEl, NS_A, 'path')
    if (pathEl) gradientType = 'radial'
  }

  // Take first and last colors
  const sortedStops = stops.sort((a, b) => a.pos - b.pos)
  const color1 = sortedStops[0].color
  const color2 = sortedStops[sortedStops.length - 1].color

  return {
    type: gradientType,
    color: [color1, color2],
    rotate,
  }
}

/**
 * Parse outline from a:ln element
 */
export function resolveOutline(lnEl: Element | null, theme: PptxThemeData): PPTElementOutline | undefined {
  if (!lnEl) return undefined

  const wAttr = getAttr(lnEl, 'w')
  const width = wAttr ? emuToPx(Number(wAttr)) : 1

  if (width <= 0) return undefined

  // Check for noFill
  const noFill = getFirstChildByTag(lnEl, NS_A, 'noFill')
  if (noFill) return undefined

  let color = '#000000'
  const solidFill = getFirstChildByTag(lnEl, NS_A, 'solidFill')
  if (solidFill) {
    const colorEl = getColorElement(solidFill)
    color = resolveColor(colorEl, theme, '#000000')
  }

  let style: 'solid' | 'dashed' = 'solid'
  const prstDash = getFirstChildByTag(lnEl, NS_A, 'prstDash')
  if (prstDash) {
    const dashVal = getAttr(prstDash, 'val')
    if (dashVal && dashVal !== 'solid') {
      style = 'dashed'
    }
  }

  return {
    style,
    width: Math.max(1, Math.round(width)),
    color,
  }
}

/**
 * Parse shadow from a:effectLst -> a:outerShdw
 */
export function resolveShadow(effectLstEl: Element | null, theme: PptxThemeData): PPTElementShadow | undefined {
  if (!effectLstEl) return undefined

  const outerShdw = getFirstChildByTag(effectLstEl, NS_A, 'outerShdw')
  if (!outerShdw) return undefined

  const distAttr = getAttr(outerShdw, 'dist')
  const dirAttr = getAttr(outerShdw, 'dir')
  const blurRadAttr = getAttr(outerShdw, 'blurRad')

  const dist = distAttr ? emuToPx(Number(distAttr)) : 0
  const dir = dirAttr ? Number(dirAttr) / 60000 : 0
  const blurRad = blurRadAttr ? emuToPx(Number(blurRadAttr)) : 0

  const dirRad = dir * Math.PI / 180
  const h = Math.round(dist * Math.cos(dirRad))
  const v = Math.round(dist * Math.sin(dirRad))

  let color = 'rgba(0,0,0,0.3)'
  const colorEl = getColorElement(outerShdw)
  if (colorEl) {
    color = resolveColor(colorEl, theme, 'rgba(0,0,0,0.3)')
  }

  return {
    h,
    v,
    blur: Math.round(blurRad),
    color,
  }
}
