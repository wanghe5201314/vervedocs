import { EDITOR_SIZE_OPTIONS } from '@vervedoc/core'
import { UI_FONT_FAMILY, UI_FONT_SIZE_BASE } from './constants'

/**
 * 字号数值转换为标签
 * @param {number} value 字号数值
 * @returns {string} 对应的字号标签，未匹配时返回数值字符串
 */
export function sizeValueToLabel(value: number): string {
  const found = EDITOR_SIZE_OPTIONS.find(o => o.value === value)
  return found ? found.label : String(value)
}

/**
 * 字号标签转换为数值
 * @param {string} label 字号标签
 * @returns {number} 对应的字号数值，无法解析时返回 12
 */
export function sizeLabelToValue(label: string): number {
  const sizeValueMap = new Map(EDITOR_SIZE_OPTIONS.map(o => [o.label, o.value]))
  if (sizeValueMap.has(label as any)) return sizeValueMap.get(label as any)!
  const num = parseFloat(label)
  return isNaN(num) ? 12 : num
}

/**
 * 磅（pt）转像素（px）
 * @param {number} pt 磅值
 * @returns {number} 转换后的像素值（保留两位小数）
 */
export function ptToPx(pt: number): number {
  return Math.round(pt * (96 / 72) * 100) / 100
}

/**
 * 像素（px）转磅（pt）
 * @param {number} px 像素值
 * @returns {number} 转换后的磅值（保留一位小数）
 */
export function pxToPt(px: number): number {
  return Math.round(px * (72 / 96) * 2) / 2
}

/**
 * 将 UI 常量应用到根元素的 CSS 变量
 * @returns {void} 无返回值
 */
export const applyUiConstants = () => {
  const root = document.documentElement
  root.style.setProperty('--app-ui-font-family', UI_FONT_FAMILY)
  root.style.setProperty('--app-ui-font-size', UI_FONT_SIZE_BASE)
}