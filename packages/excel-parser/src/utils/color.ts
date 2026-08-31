export function normalizeArgbToHex(argb: unknown): string | undefined {
  const text = String(argb || '').trim()
  if (!text) return
  const normalized = text.length === 8 ? text.slice(2) : text
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return
  return `#${normalized.toUpperCase()}`
}

export type ExcelColorContext = 'font' | 'fill' | 'border'

export type ThemeColorResolver = (color: unknown, context?: ExcelColorContext) => string | undefined

const DEFAULT_INDEXED: Record<number, string> = {
  8: '#000000',
  9: '#FFFFFF',
  10: '#FF0000',
  11: '#00FF00',
  12: '#0000FF',
  13: '#FFFF00',
  14: '#FF00FF',
  15: '#00FFFF',
  64: '#000000',
}

function parseHexComponent(value: string): number {
  return Number.parseInt(value, 16)
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

function applyTint(hex: string, tint: number): string {
  if (!Number.isFinite(tint) || tint === 0) return hex
  const normalized = hex.replace('#', '')
  const r = parseHexComponent(normalized.slice(0, 2))
  const g = parseHexComponent(normalized.slice(2, 4))
  const b = parseHexComponent(normalized.slice(4, 6))
  const apply = (channel: number) => {
    if (tint < 0) return channel * (1 + tint)
    return channel * (1 - tint) + 255 * tint
  }
  return rgbToHex(apply(r), apply(g), apply(b))
}

function readThemeColorValue(xml: string, tag: string): string | undefined {
  const blockMatch = xml.match(new RegExp(`<a:${tag}[^>]*>([\\s\\S]*?)</a:${tag}>`, 'i'))
  if (!blockMatch?.[1]) return
  const block = blockMatch[1]
  const srgb = block.match(/<a:srgbClr[^>]*val="([0-9A-Fa-f]{6})"/i)
  if (srgb?.[1]) return `#${srgb[1].toUpperCase()}`
  const sys = block.match(/<a:sysClr[^>]*lastClr="([0-9A-Fa-f]{6})"/i)
  if (sys?.[1]) return `#${sys[1].toUpperCase()}`
  return
}

function parseThemePalette(themeXml: string): string[] {
  const tags = [
    'dk1', 'lt1', 'dk2', 'lt2',
    'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6',
    'hlink', 'folHlink',
  ]
  return tags.map((tag) => readThemeColorValue(themeXml, tag) || '#000000')
}

function themeIndex(color: { theme?: number }, context: ExcelColorContext): number | undefined {
  if (!Number.isFinite(color.theme)) return
  const theme = Number(color.theme)
  if (context === 'font') {
    return theme > 0 ? theme - 1 : 0
  }
  return theme
}

export function createThemeColorResolver(workbook: { model?: { themes?: Record<string, string> } }): ThemeColorResolver {
  const themeXml = Object.values(workbook?.model?.themes || {}).find((item) => typeof item === 'string' && item.includes('clrScheme'))
  const palette = themeXml ? parseThemePalette(themeXml) : []

  return (input: unknown, context: ExcelColorContext = 'fill') => {
    if (!input || typeof input !== 'object') return
    const color = input as { argb?: string; theme?: number; tint?: number; indexed?: number }
    const argb = normalizeArgbToHex(color.argb)
    if (argb) {
      if (Number.isFinite(color.tint)) return applyTint(argb, Number(color.tint))
      return argb
    }
    if (Number.isFinite(color.indexed)) {
      const indexed = DEFAULT_INDEXED[Number(color.indexed)]
      if (indexed) return indexed
    }
    const index = themeIndex(color, context)
    if (index === undefined || !palette.length) return
    const base = palette[Math.max(0, Math.min(palette.length - 1, index))]
    if (Number.isFinite(color.tint)) return applyTint(base, Number(color.tint))
    return base
  }
}

export function resolveExcelColor(
  input: unknown,
  resolver: ThemeColorResolver,
  context: ExcelColorContext = 'fill',
): string | undefined {
  return resolver(input, context)
}
