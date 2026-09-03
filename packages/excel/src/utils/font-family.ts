import type { ICellRichTextRun, ICellStyle } from '../types'

export const DEFAULT_FONT_FAMILY = 'Microsoft YaHei'

/**
 * TODO: 与 @vervedoc/excel-parser 的 FONT_FAMILY_ALIASES / normalizeFontFamily 双份维护，后续抽到独立 types 包统一。
 */
const FONT_FAMILY_ALIASES: Record<string, string> = {
  '宋体': 'SimSun',
  'Song Ti': 'SimSun',
  '新宋体': 'NSimSun',
  '黑体': 'SimHei',
  'Hei Ti': 'SimHei',
  '楷体': 'KaiTi',
  '楷体_GB2312': 'KaiTi',
  'Kai Ti': 'KaiTi',
  '仿宋': 'FangSong',
  '仿宋_GB2312': 'FangSong',
  'Fang Song': 'FangSong',
  '微软雅黑': 'Microsoft YaHei',
  'Microsoft YaHei': 'Microsoft YaHei',
  '微软正黑体': 'Microsoft JhengHei',
  'Microsoft JhengHei': 'Microsoft JhengHei',
  '华文新魏': 'STXinwei',
  'STXinwei': 'STXinwei',
  '思源黑体': 'Source Han Sans CN',
  'Source Han Sans CN': 'Source Han Sans CN',
  '思源宋体': 'Source Han Serif CN',
  'Source Han Serif CN': 'Source Han Serif CN',
  'Arial': 'Arial',
  'Times New Roman': 'Times New Roman',
  'Segoe UI': 'Segoe UI',
  'Courier New': 'Courier New',
  'SimSun': 'SimSun',
  'NSimSun': 'NSimSun',
  'SimHei': 'SimHei',
  'KaiTi': 'KaiTi',
  'FangSong': 'FangSong',
}

export function normalizeFontFamily(fontFamily?: string | null): string | undefined {
  const plain = String(fontFamily || '').split(',')[0]?.trim()
  if (!plain) return undefined
  if (FONT_FAMILY_ALIASES[plain]) return FONT_FAMILY_ALIASES[plain]
  const lower = plain.toLowerCase()
  const aliasKey = Object.keys(FONT_FAMILY_ALIASES).find(key => key.toLowerCase() === lower)
  return aliasKey ? FONT_FAMILY_ALIASES[aliasKey] : plain
}

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
