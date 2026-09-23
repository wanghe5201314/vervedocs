/* ============================================================
 * UI 基础常量
 * ============================================================ */

import { t } from '@/i18n'

/**
 * UI 字体族字符串，包含中文及西文回退字体
 */
export const UI_FONT_FAMILY =
  '\'Microsoft YaHei\', \'PingFang SC\', \'Helvetica Neue\', Arial, \'Noto Sans CJK SC\', sans-serif'

/**
 * UI 基础字号（用于根元素 CSS 变量）
 */
export const UI_FONT_SIZE_BASE = '13px'

/**
 * UI 组件默认尺寸（Element Plus 等组件库尺寸取值）
 */
export const UI_EL_SIZE = 'small' as const

/**
 * 编辑器模式列表，含模式值、显示文本、图标与描述
 */
export const getEditorModeList = () => [
  { value: 'edit', label: t('constants.editorMode.edit'), icon: 'cursor-default', title: t('constants.editorMode.editTitle') },
  { value: 'readonly', label: t('constants.editorMode.readonly'), icon: 'eye-outline', title: t('constants.editorMode.readonlyTitle') },
  { value: 'form', label: t('constants.editorMode.form'), icon: 'form-select', title: t('constants.editorMode.formTitle') }
]

/**
 * 字符缩放比例可选值列表（百分比）
 */
export const CHARACTER_SCALE_OPTIONS = [200, 150, 100, 90, 80, 66, 50, 33]

/**
 * 首行缩进可选项列表，含显示标签与字符数
 */
export const getFirstLineIndentOptions = () => [
  { label: t('constants.indent.none'), value: 0 },
  { label: t('constants.indent.two'), value: 2 },
  { label: t('constants.indent.three'), value: 3 },
  { label: t('constants.indent.four'), value: 4 }
]

/**
 * 缩放级别可选值列表（百分比）
 */
export const ZOOM_LEVELS = [50, 75, 100, 125, 150, 200]

/* ============================================================
 * 工具栏常量
 * ============================================================ */

/**
 * 字体颜色调色板（HEX 颜色值数组）
 */
export const COLOR_PALETTE = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
  '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
  '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd',
  '#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0',
  '#a61c00', '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3c78d8', '#3d85c6', '#674ea7', '#a64d79',
  '#85200c', '#990000', '#b45f06', '#bf9000', '#38761d', '#134f5c', '#1155cc', '#0b5394', '#351c75', '#741b47',
  '#5b0f00', '#660000', '#783f04', '#7f6000', '#274e13', '#0c343d', '#1c4587', '#073763', '#20124d', '#4c1130'
]

/**
 * 背景色调色板（HEX 颜色值数组）
 */
export const BG_COLOR_PALETTE = [
  '#FFFFFF', '#000000', '#E7E6E6', '#44546A', '#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47',
  '#F2F2F2', '#7F7F7F', '#D0CECE', '#D6DCE4', '#D9E2F3', '#FCE4D6', '#EDEDED', '#FFF2CC', '#DEEAF6', '#E2EFD9',
  '#D9D9D9', '#595959', '#AFABAB', '#ADB9CA', '#B4C6E7', '#F8CBAD', '#DBDBDB', '#FFE599', '#BDD7EE', '#C5E0B3',
  '#BFBFBF', '#404040', '#757070', '#8496B0', '#8EAADB', '#F4B183', '#C0C0C0', '#FFD966', '#9CC3E5', '#A8D08D',
  '#A6A6A6', '#262626', '#3A3838', '#323F4F', '#2F5496', '#C65911', '#7B7B7B', '#BF9000', '#2E75B5', '#538135'
]

/**
 * 水印预设列表，含名称与水印选项
 */
export const getWatermarkPresets = () => [
  { name: t('constants.watermark.confidential'), options: { data: t('constants.watermark.confidential'), color: '#AEB5C0', opacity: 0.3, size: 120, font: 'Microsoft YaHei', repeat: false } },
  { name: t('constants.watermark.noCopy'), options: { data: t('constants.watermark.noCopy'), color: '#AEB5C0', opacity: 0.3, size: 120, font: 'Microsoft YaHei', repeat: false } },
  { name: t('constants.watermark.original'), options: { data: t('constants.watermark.original'), color: '#AEB5C0', opacity: 0.3, size: 120, font: 'Microsoft YaHei', repeat: false } },
  { name: t('constants.watermark.sample'), options: { data: t('constants.watermark.sample'), color: '#AEB5C0', opacity: 0.3, size: 120, font: 'Microsoft YaHei', repeat: false } },
  { name: t('constants.watermark.topSecret'), options: { data: t('constants.watermark.topSecret'), color: '#AEB5C0', opacity: 0.3, size: 120, font: 'Microsoft YaHei', repeat: false } },
  { name: t('constants.watermark.urgent'), options: { data: t('constants.watermark.urgent'), color: '#AEB5C0', opacity: 0.3, size: 120, font: 'Microsoft YaHei', repeat: false } }
]

/**
 * 公式分类列表，含分类名、图标及该分类下的公式集合
 */
export const getFormulaCategories = () => [
  {
    name: t('constants.formula.math'), icon: 'functions',
    formulas: [
      { name: t('constants.formula.quadratic'), latex: 'x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}', preview: 'x = (-b ± √(b²-4ac)) / 2a' },
      { name: t('constants.formula.pythagorean'), latex: 'a^2+b^2=c^2', preview: 'a² + b² = c²' },
      { name: t('constants.formula.circumference'), latex: 'C=2\\pi r', preview: 'C = 2πr' }
    ]
  },
  {
    name: t('constants.formula.physics'), icon: 'bolt',
    formulas: [
      { name: t('constants.formula.massEnergy'), latex: 'E=mc^2', preview: 'E = mc²' },
      { name: t('constants.formula.newtonSecond'), latex: 'F=ma', preview: 'F = ma' },
      { name: t('constants.formula.kineticEnergy'), latex: 'E_k=\\frac{1}{2}mv^2', preview: 'Eₖ = ½mv²' }
    ]
  },
  {
    name: t('constants.formula.chemistry'), icon: 'science',
    formulas: [
      { name: t('constants.formula.idealGas'), latex: 'PV=nRT', preview: 'PV = nRT' },
      { name: t('constants.formula.waterDissociation'), latex: 'H_2O\\rightleftharpoons H^++OH^-', preview: 'H₂O ⇌ H⁺ + OH⁻' }
    ]
  }
]

