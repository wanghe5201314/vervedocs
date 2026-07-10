import { EDITOR_FONT_OPTIONS, EDITOR_SIZE_OPTIONS } from '@vervedoc/core'

export const UI_FONT_FAMILY =
  '\'Microsoft YaHei\', \'PingFang SC\', \'Helvetica Neue\', Arial, \'Noto Sans CJK SC\', sans-serif'

export const UI_FONT_SIZE_BASE = '13px'

export const UI_EL_SIZE = 'small' as const

export const UI_FONT_OPTIONS = EDITOR_FONT_OPTIONS

export const UI_SIZE_OPTIONS = EDITOR_SIZE_OPTIONS

export const UI_SIZE_VALUE_MAP = new Map(EDITOR_SIZE_OPTIONS.map(o => [o.label, o.value]))

export function sizeValueToLabel(value: number): string {
  const found = EDITOR_SIZE_OPTIONS.find(o => o.value === value)
  return found ? found.label : String(value)
}

export function sizeLabelToValue(label: string): number {
  if (UI_SIZE_VALUE_MAP.has(label as any)) return UI_SIZE_VALUE_MAP.get(label as any)!
  const num = parseFloat(label)
  return isNaN(num) ? 12 : num
}

export function ptToPx(pt: number): number {
  return Math.round(pt * (96 / 72) * 100) / 100
}

export function pxToPt(px: number): number {
  return Math.round(px * (72 / 96) * 2) / 2
}

export const applyUiConstants = () => {
  const root = document.documentElement
  root.style.setProperty('--app-ui-font-family', UI_FONT_FAMILY)
  root.style.setProperty('--app-ui-font-size', UI_FONT_SIZE_BASE)
}
