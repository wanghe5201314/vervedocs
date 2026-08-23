import { EDITOR_FONT_OPTIONS, EDITOR_SIZE_OPTIONS } from '@vervedoc/core'

/**
 * UI 默认字体族
 */
export const UI_FONT_FAMILY =
  '\'Microsoft YaHei\', \'PingFang SC\', \'Helvetica Neue\', Arial, \'Noto Sans CJK SC\', sans-serif'

/**
 * UI 基础字号
 */
export const UI_FONT_SIZE_BASE = '13px'

/**
 * ant-design-vue 组件尺寸
 */
export const UI_EL_SIZE = 'small' as const

/**
 * UI 字体选项（与编辑器字体保持一致）
 */
export const UI_FONT_OPTIONS = EDITOR_FONT_OPTIONS

/**
 * UI 字号选项（与编辑器字号保持一致）
 */
export const UI_SIZE_OPTIONS = EDITOR_SIZE_OPTIONS

/**
 * 字号标签到数值的映射表
 */
export const UI_SIZE_VALUE_MAP = new Map(EDITOR_SIZE_OPTIONS.map(o => [o.label, o.value]))

/**
 * 字号数值转换为标签
 * @param value 字号数值
 * @returns 字号标签字符串
 */
export function sizeValueToLabel(value: number): string {
  const found = EDITOR_SIZE_OPTIONS.find(o => o.value === value)
  return found ? found.label : String(value)
}

/**
 * 字号标签转换为数值
 * @param label 字号标签
 * @returns 字号数值，无法解析时返回 12
 */
export function sizeLabelToValue(label: string): number {
  if (UI_SIZE_VALUE_MAP.has(label as any)) return UI_SIZE_VALUE_MAP.get(label as any)!
  const num = parseFloat(label)
  return isNaN(num) ? 12 : num
}

/**
 * 磅（pt）转像素（px），保留两位小数
 * @param pt 磅值
 * @returns 像素值
 */
export function ptToPx(pt: number): number {
  return Math.round(pt * (96 / 72) * 100) / 100
}

/**
 * 像素（px）转磅（pt），保留 0.5 磅精度
 * @param px 像素值
 * @returns 磅值
 */
export function pxToPt(px: number): number {
  return Math.round(px * (72 / 96) * 2) / 2
}

/**
 * 将 UI 常量应用到根元素的 CSS 变量
 */
export const applyUiConstants = () => {
  const root = document.documentElement
  root.style.setProperty('--app-ui-font-family', UI_FONT_FAMILY)
  root.style.setProperty('--app-ui-font-size', UI_FONT_SIZE_BASE)
}
