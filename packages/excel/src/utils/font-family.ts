import { normalizeFontFamily, type ICellRichTextRun, type ICellStyle } from '@vervedoc/excel-parser'

export const DEFAULT_FONT_FAMILY = 'Microsoft YaHei'

export type FontOption = {
  label: string
  value: string
  cssFamily?: string
}

export function toUniverFontFamily(fontFamily?: string, fallback = DEFAULT_FONT_FAMILY): string {
  return normalizeFontFamily(fontFamily) || fallback
}

export function resolveToolbarFontFamily(
  fontFamily: string | undefined,
  fontOptions: FontOption[],
  fallback = DEFAULT_FONT_FAMILY,
): string {
  const raw = String(fontFamily || '').split(',')[0]?.trim()
  const canonical = normalizeFontFamily(raw) || fallback
  const matched = fontOptions.find(option =>
    option.value === canonical
    || option.label === raw
    || normalizeFontFamily(option.value) === canonical,
  )
  return matched?.value || canonical
}

export function readFontFamilyFromUniverCellData(cellData?: Record<string, any> | null): string | undefined {
  if (!cellData) return undefined
  const style = cellData.s
  if (style && typeof style === 'object' && style.ff) {
    return normalizeFontFamily(String(style.ff))
  }
  const textRuns = cellData.p?.body?.textRuns
  if (Array.isArray(textRuns)) {
    for (const run of textRuns) {
      const ff = run?.ts?.ff
      if (ff) return normalizeFontFamily(String(ff))
    }
  }
  return undefined
}

export function readFontFamilyFromSheetState(
  styles?: Record<string, ICellStyle>,
  cellRichTexts?: Record<string, ICellRichTextRun[]>,
  key?: string,
): string | undefined {
  if (!key) return undefined
  const styleFont = styles?.[key]?.fontFamily
  if (styleFont) return normalizeFontFamily(styleFont)
  const richRuns = cellRichTexts?.[key]
  if (Array.isArray(richRuns)) {
    for (const run of richRuns) {
      if (run.fontFamily) return normalizeFontFamily(run.fontFamily)
    }
  }
  return undefined
}
