import type { ICellRichTextRun, ICellStyle } from '../types'
import { normalizeFontFamily } from './font-family'
import type { ThemeColorResolver } from './color'
import { resolveExcelColor } from './color'

const RUN_FONT_KEYS = ['bold', 'italic', 'underline', 'strikethrough', 'fontFamily', 'fontSize', 'fontColor'] as const

export function stripRunLevelFontStyle(style?: ICellStyle): ICellStyle | undefined {
  if (!style) return
  const next = { ...style }
  for (const key of RUN_FONT_KEYS) {
    delete next[key]
  }
  return Object.keys(next).length ? next : undefined
}

function parseFontRun(font: any, defaults: ICellStyle | undefined, resolver: ThemeColorResolver): ICellRichTextRun {
  const run: ICellRichTextRun = { text: '' }
  if (font?.bold || defaults?.bold) run.bold = !!(font?.bold ?? defaults?.bold)
  if (font?.italic || defaults?.italic) run.italic = !!(font?.italic ?? defaults?.italic)
  if (font?.underline || defaults?.underline) run.underline = !!(font?.underline ?? defaults?.underline)
  if (font?.strike || defaults?.strikethrough) run.strikethrough = !!(font?.strike ?? defaults?.strikethrough)
  const fontFamily = normalizeFontFamily(font?.name || defaults?.fontFamily)
  if (fontFamily) run.fontFamily = fontFamily
  const fontSize = Number.isFinite(font?.sz) ? Number(font.sz) : defaults?.fontSize
  if (Number.isFinite(fontSize)) run.fontSize = Number(fontSize)
  const fontColor = font?.color
    ? resolveExcelColor(font.color, resolver, 'font')
    : defaults?.fontColor
  if (fontColor) run.fontColor = fontColor
  return run
}

export function parseExcelRichText(
  value: unknown,
  cellStyle: ICellStyle | undefined,
  resolver: ThemeColorResolver,
): ICellRichTextRun[] | undefined {
  if (!value || typeof value !== 'object') return
  const richText = (value as { richText?: unknown }).richText
  if (!Array.isArray(richText) || richText.length === 0) return
  const runs = richText
    .map((part: any) => {
      const text = String(part?.text ?? '')
      if (!text) return null
      const run = parseFontRun(part?.font, cellStyle, resolver)
      run.text = text
      return run
    })
    .filter((run): run is ICellRichTextRun => !!run)
  return runs.length ? runs : undefined
}

export function richTextToPlainText(runs?: ICellRichTextRun[]): string {
  if (!Array.isArray(runs) || !runs.length) return ''
  return runs.map((run) => run.text).join('')
}

export function hexToExcelArgb(hex?: string): string | undefined {
  const normalized = String(hex || '').replace('#', '').trim()
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return
  return `FF${normalized.toUpperCase()}`
}

export function runToExcelFont(run: ICellRichTextRun) {
  const fontName = String(run.fontFamily || '').split(',')[0]?.trim()
  const color = hexToExcelArgb(run.fontColor)
  return {
    bold: !!run.bold,
    italic: !!run.italic,
    underline: run.underline ? 'single' : undefined,
    strike: !!run.strikethrough,
    name: fontName || undefined,
    size: Number.isFinite(run.fontSize) ? Number(run.fontSize) : undefined,
    color: color ? { argb: color } : undefined,
  }
}
