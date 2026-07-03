import { NS_A } from './constants'
import { parseXml, getFirstChildByTag, forEachChild, getAttr, getColorElement } from './xml.helper'
import type { PptxThemeData, PptxThemeColors } from './types'

const DEFAULT_THEME_COLORS: PptxThemeColors = {
  dk1: '#000000',
  lt1: '#FFFFFF',
  dk2: '#44546A',
  lt2: '#E7E6E6',
  accent1: '#4472C4',
  accent2: '#ED7D31',
  accent3: '#A5A5A5',
  accent4: '#FFC000',
  accent5: '#5B9BD5',
  accent6: '#70AD47',
  hlink: '#0563C1',
  folHlink: '#954F72',
}

function extractColorValue(colorEl: Element): string {
  if (!colorEl) return ''
  const name = colorEl.localName
  if (name === 'srgbClr') {
    return '#' + (getAttr(colorEl, 'val') || '000000')
  }
  if (name === 'sysClr') {
    return '#' + (getAttr(colorEl, 'lastClr') || getAttr(colorEl, 'val') || '000000')
  }
  return ''
}

export function parseTheme(themeXml: string): PptxThemeData {
  const defaultResult: PptxThemeData = {
    colors: { ...DEFAULT_THEME_COLORS },
    majorFont: 'Microsoft YaHei',
    minorFont: 'Microsoft YaHei',
  }

  if (!themeXml) return defaultResult

  const doc = parseXml(themeXml)
  const themeEl = doc.documentElement

  // Parse color scheme
  const themeElements = themeEl.getElementsByTagNameNS(NS_A, 'themeElements')
  if (themeElements.length === 0) return defaultResult

  const themeElementsEl = themeElements[0]
  const clrSchemeEl = getFirstChildByTag(themeElementsEl, NS_A, 'clrScheme')
  
  if (clrSchemeEl) {
    const colorNames = ['dk1', 'lt1', 'dk2', 'lt2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink']
    for (const colorName of colorNames) {
      const colorGroupEl = getFirstChildByTag(clrSchemeEl, NS_A, colorName)
      if (colorGroupEl) {
        const colorEl = getColorElement(colorGroupEl)
        if (colorEl) {
          const val = extractColorValue(colorEl)
          if (val) {
            defaultResult.colors[colorName] = val
          }
        }
      }
    }
  }

  // Parse font scheme
  const fontSchemeEl = getFirstChildByTag(themeElementsEl, NS_A, 'fontScheme')
  if (fontSchemeEl) {
    const majorFontEl = getFirstChildByTag(fontSchemeEl, NS_A, 'majorFont')
    const minorFontEl = getFirstChildByTag(fontSchemeEl, NS_A, 'minorFont')

    if (majorFontEl) {
      defaultResult.majorFont = extractFontName(majorFontEl)
    }
    if (minorFontEl) {
      defaultResult.minorFont = extractFontName(minorFontEl)
    }
  }

  return defaultResult
}

function extractFontName(fontEl: Element): string {
  // Prefer East Asian font (CJK), fallback to Latin
  const eaEl = getFirstChildByTag(fontEl, NS_A, 'ea')
  if (eaEl) {
    const typeface = getAttr(eaEl, 'typeface')
    if (typeface && typeface !== '') return typeface
  }
  const latinEl = getFirstChildByTag(fontEl, NS_A, 'latin')
  if (latinEl) {
    const typeface = getAttr(latinEl, 'typeface')
    if (typeface && typeface !== '') return typeface
  }
  return 'Microsoft YaHei'
}
