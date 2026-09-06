/* ============================================================
 * UI 基础常量
 * ============================================================ */

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

/* ============================================================
 * Ribbon Tab 配置
 * ============================================================ */

/**
 * Ribbon 选项卡元数据接口
 */
export interface RibbonTabMeta {
  /** 选项卡唯一键名 */
  key: string
  /** 选项卡显示文本 */
  label: string
  /** 选项卡图标名称 */
  icon: string
  /** 是否可见，缺省视为可见 */
  visible?: boolean
}

/**
 * Ribbon 选项卡配置列表
 */
export const RIBBON_TABS: RibbonTabMeta[] = [
  { key: 'file', label: '文件', icon: 'file-outline' },
  { key: 'home', label: '开始', icon: 'view-headline' },
  { key: 'insert', label: '插入', icon: 'plus-thick' },
  { key: 'layout', label: '页面', icon: 'page-layout-body' },
  { key: 'reference', label: '引用', icon: 'table-of-contents' },
  { key: 'review', label: '审阅', icon: 'comment-check-outline' },
  { key: 'view', label: '视图', icon: 'eye-outline' },
  { key: 'collaboration', label: '协同', icon: 'account-multiple-outline', visible: false },
  { key: 'help', label: '帮助', icon: 'help-circle-outline' }
]

/**
 * 编辑器模式列表，含模式值、显示文本、图标与描述
 */
export const EDITOR_MODE_LIST = [
  { value: 'edit', label: '常规模式', icon: 'cursor-default', title: '常规编辑模式，可自由编辑文档内容' },
  { value: 'revision', label: '修订模式', icon: 'pencil-plus', title: '修订模式，所有编辑操作将记录为修订' },
  { value: 'readonly', label: '只读模式', icon: 'eye-outline', title: '只读模式，仅可查看文档不可编辑' },
  { value: 'clean', label: '清洁模式', icon: 'eye-off-outline', title: '清洁模式，隐藏所有标记和批注' },
  { value: 'form', label: '表单模式', icon: 'form-select', title: '表单模式，仅可编辑表单域' }
]

/**
 * 字符缩放比例可选值列表（百分比）
 */
export const CHARACTER_SCALE_OPTIONS = [200, 150, 100, 90, 80, 66, 50, 33]

/**
 * 首行缩进可选项列表，含显示标签与字符数
 */
export const FIRST_LINE_INDENT_OPTIONS = [
  { label: '无缩进', value: 0 },
  { label: '2字符', value: 2 },
  { label: '3字符', value: 3 },
  { label: '4字符', value: 4 }
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
export const WATERMARK_PRESETS = [
  { name: '保密', options: { data: '保密' } },
  { name: '严禁复制', options: { data: '严禁复制' } },
  { name: '原件', options: { data: '原件' } },
  { name: '样本', options: { data: '样本' } },
  { name: '绝密', options: { data: '绝密' } },
  { name: '紧急', options: { data: '紧急' } }
]

/**
 * 公式分类列表，含分类名、图标及该分类下的公式集合
 */
export const FORMULA_CATEGORIES = [
  {
    name: '数学公式', icon: 'functions',
    formulas: [
      { name: '二次公式', latex: 'x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}', preview: 'x = (-b ± √(b²-4ac)) / 2a' },
      { name: '勾股定理', latex: 'a^2+b^2=c^2', preview: 'a² + b² = c²' },
      { name: '圆的周长', latex: 'C=2\\pi r', preview: 'C = 2πr' }
    ]
  },
  {
    name: '物理公式', icon: 'bolt',
    formulas: [
      { name: '质能方程', latex: 'E=mc^2', preview: 'E = mc²' },
      { name: '牛顿第二定律', latex: 'F=ma', preview: 'F = ma' },
      { name: '动能公式', latex: 'E_k=\\frac{1}{2}mv^2', preview: 'Eₖ = ½mv²' }
    ]
  },
  {
    name: '化学公式', icon: 'science',
    formulas: [
      { name: '理想气体方程', latex: 'PV=nRT', preview: 'PV = nRT' },
      { name: '水的电离', latex: 'H_2O\\rightleftharpoons H^++OH^-', preview: 'H₂O ⇌ H⁺ + OH⁻' }
    ]
  }
]

