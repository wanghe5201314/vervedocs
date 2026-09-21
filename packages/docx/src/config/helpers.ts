import { UI_FONT_FAMILY, UI_FONT_SIZE_BASE } from './constants'

/**
 * 将 UI 常量应用到根元素的 CSS 变量
 * @returns {void} 无返回值
 */
export const applyUiConstants = () => {
  const root = document.documentElement
  root.style.setProperty('--app-ui-font-family', UI_FONT_FAMILY)
  root.style.setProperty('--app-ui-font-size', UI_FONT_SIZE_BASE)
}
