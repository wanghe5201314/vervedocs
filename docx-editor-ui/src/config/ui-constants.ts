import { EDITOR_FONT_OPTIONS, EDITOR_SIZE_OPTIONS } from '@wanghe1995/docx-editor-core'

export const UI_FONT_FAMILY =
  '\'Microsoft YaHei\', \'PingFang SC\', \'Helvetica Neue\', Arial, \'Noto Sans CJK SC\', sans-serif'

export const UI_FONT_SIZE_BASE = '13px'

export const UI_EL_SIZE = 'small' as const

export const UI_FONT_OPTIONS = EDITOR_FONT_OPTIONS

export const UI_SIZE_OPTIONS = EDITOR_SIZE_OPTIONS

/** 磅 → 像素（96dpi：1pt = 96/72 px） */
export function ptToPx(pt: number): number {
  return Math.round(pt * (96 / 72) * 100) / 100
}

/** 像素 → 磅（四舍五入到 0.5pt） */
export function pxToPt(px: number): number {
  return Math.round(px * (72 / 96) * 2) / 2
}

export const applyUiConstants = () => {
  const root = document.documentElement
  root.style.setProperty('--app-ui-font-family', UI_FONT_FAMILY)
  root.style.setProperty('--app-ui-font-size', UI_FONT_SIZE_BASE)
  root.style.setProperty('--el-font-family', UI_FONT_FAMILY)
  root.style.setProperty('--el-font-size-base', UI_FONT_SIZE_BASE)
}
