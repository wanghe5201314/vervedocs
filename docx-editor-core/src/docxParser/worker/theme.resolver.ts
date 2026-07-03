import { NS, THEME_COLOR_SEMANTIC_MAP } from '../constants'
import { parseXml, getFirstChildByTag, forEachChild } from './xml.helper'

export interface ThemeData {
  colors: Map<string, string>   // slotName → RRGGBB (大写，不含 #)
  majorFont: string | null
  minorFont: string | null
}

/**
 * 解析 word/theme/theme1.xml，提取颜色方案和字体方案
 */
export function parseTheme(themeXml: string | null): ThemeData {
  const result: ThemeData = {
    colors: new Map(),
    majorFont: null,
    minorFont: null
  }
  if (!themeXml) return result

  const doc = parseXml(themeXml)
  const root = doc.documentElement

  parseColorScheme(root, result)
  parseFontScheme(root, result)

  return result
}

function parseColorScheme(root: Element, result: ThemeData): void {
  const clrSchemes = root.getElementsByTagNameNS(NS.a, 'clrScheme')
  if (clrSchemes.length === 0) return

  const clrScheme = clrSchemes[0]
  forEachChild(clrScheme, (slotEl) => {
    const slotName = slotEl.localName

    // <a:srgbClr val="RRGGBB"/>
    const srgbClr = getFirstChildByTag(slotEl, NS.a, 'srgbClr')
    if (srgbClr) {
      const val = srgbClr.getAttribute('val')
      if (val) {
        result.colors.set(slotName, val.toUpperCase())
        return
      }
    }

    // <a:sysClr lastClr="RRGGBB"/> — 系统颜色用 lastClr 作为实际渲染值
    const sysClr = getFirstChildByTag(slotEl, NS.a, 'sysClr')
    if (sysClr) {
      const lastClr = sysClr.getAttribute('lastClr')
      if (lastClr) {
        result.colors.set(slotName, lastClr.toUpperCase())
      }
    }
  })
}

function parseFontScheme(root: Element, result: ThemeData): void {
  const fontSchemes = root.getElementsByTagNameNS(NS.a, 'fontScheme')
  if (fontSchemes.length === 0) return

  const fontScheme = fontSchemes[0]

  const majorFontEl = getFirstChildByTag(fontScheme, NS.a, 'majorFont')
  if (majorFontEl) {
    result.majorFont = resolveFontFromSchemeElement(majorFontEl)
  }

  const minorFontEl = getFirstChildByTag(fontScheme, NS.a, 'minorFont')
  if (minorFontEl) {
    result.minorFont = resolveFontFromSchemeElement(minorFontEl)
  }
}

/**
 * 从 <a:majorFont> / <a:minorFont> 提取字体名
 * 优先取东亚字体 <a:ea>，其次西文 <a:latin>
 */
function resolveFontFromSchemeElement(schemeEl: Element): string | null {
  const ea = getFirstChildByTag(schemeEl, NS.a, 'ea')
  if (ea) {
    const typeface = ea.getAttribute('typeface')
    if (typeface && typeface !== '') return typeface
  }
  const latin = getFirstChildByTag(schemeEl, NS.a, 'latin')
  if (latin) {
    const typeface = latin.getAttribute('typeface')
    if (typeface && typeface !== '') return typeface
  }
  return null
}

/**
 * 将主题颜色名（含语义别名）解析为 #RRGGBB 颜色字符串
 *
 * tint / shade 为 OOXML 十六进制字符串（0x00-0xFF），在 HSL 色彩空间运算：
 *   tint：L_new = L + (1 - L) * factor   (变亮)
 *   shade：L_new = L * factor             (变暗)
 */
export function resolveThemeColor(
  theme: ThemeData,
  themeColorName: string,
  themeTint?: string,
  themeShade?: string
): string | null {
  // 语义名映射到槽位名
  const slotName = THEME_COLOR_SEMANTIC_MAP[themeColorName] ?? themeColorName
  const hex = theme.colors.get(slotName)
  if (!hex) return null

  // 无 tint/shade 时直接返回
  if (!themeTint && !themeShade) {
    return `#${hex}`
  }

  // RGB → HSL → 应用 tint/shade → HSL → RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255

  const [h, s, l] = rgbToHsl(r, g, b)
  let lightness = l

  if (themeTint) {
    const factor = parseInt(themeTint, 16) / 255
    lightness = l + (1 - l) * factor
  }

  if (themeShade) {
    const factor = parseInt(themeShade, 16) / 255
    lightness = l * factor
  }

  lightness = Math.min(1, Math.max(0, lightness))

  const [nr, ng, nb] = hslToRgb(h, s, lightness)
  return `#${toHex2(nr)}${toHex2(ng)}${toHex2(nb)}`.toUpperCase()
}

/**
 * 解析主题字体引用（asciiTheme / eastAsiaTheme 属性值）
 */
export function resolveThemeFont(
  theme: ThemeData,
  fontRef: string | null | undefined
): string | null {
  if (!fontRef) return null
  const lower = fontRef.toLowerCase()
  if (lower.startsWith('major')) return theme.majorFont
  if (lower.startsWith('minor')) return theme.minorFont
  return null
}

// ---- 颜色空间转换工具 ----

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min)
    if (max === r) {
      h = ((g - b) / delta + (g < b ? 6 : 0)) / 6
    } else if (max === g) {
      h = ((b - r) / delta + 2) / 6
    } else {
      h = ((r - g) / delta + 4) / 6
    }
  }

  return [h, s, l]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255)
    return [v, v, v]
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return [
    Math.round(hueToRgbChannel(p, q, h + 1 / 3) * 255),
    Math.round(hueToRgbChannel(p, q, h) * 255),
    Math.round(hueToRgbChannel(p, q, h - 1 / 3) * 255)
  ]
}

function hueToRgbChannel(p: number, q: number, t: number): number {
  if (t < 0) t += 1
  if (t > 1) t -= 1
  if (t < 1 / 6) return p + (q - p) * 6 * t
  if (t < 1 / 2) return q
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
  return p
}

function toHex2(value: number): string {
  return Math.min(255, Math.max(0, value)).toString(16).padStart(2, '0')
}
