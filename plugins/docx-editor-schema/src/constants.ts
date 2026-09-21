/**
 * VerveDocs Schema —— 常量
 */

import type { IEditorOption } from './types'

/** 当前 Schema 版本号 */
export const SCHEMA_VERSION = '4.0.0-tree'

/** 默认编辑器选项 */
export const DEFAULT_EDITOR_OPTION: Required<Pick<IEditorOption,
  'defaultFont' | 'defaultSize' | 'defaultLineHeight' | 'defaultRowMargin' |
  'pageMode' | 'pageWidth' | 'pageHeight' | 'pageMargins' | 'scale' | 'devicePixelRatio' |
  'historyMaxRecordCount'
>> = {
  defaultFont: 'Microsoft YaHei',
  defaultSize: 16,
  defaultLineHeight: 1.5,
  defaultRowMargin: 5,
  pageMode: 'paging',
  pageWidth: 794,           // A4 @ 96dpi
  pageHeight: 1123,
  pageMargins: [100, 120, 100, 120],
  scale: 1,
  devicePixelRatio: typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1,
  historyMaxRecordCount: 100
}

/** 段落级属性字段名（用于从 run 上剥离/继承） */
export const PARAGRAPH_ATTR_KEYS = [
  'rowFlex',
  'paragraphStyleId',
  'paragraphFirstLineIndent',
  'paragraphIndentLeft',
  'paragraphSpacingBefore',
  'paragraphSpacingAfter',
  'lineHeight',
  'lineHeightRule',
  'groupIds'
] as const

/** 段落容器类型 */
export const PARAGRAPH_CONTAINER_TYPES = new Set(['title', 'list'])

/** 段落级块类型（占独立段） */
export const BLOCK_LEVEL_TYPES = new Set([
  'title', 'list', 'table', 'image', 'pageBreak', 'separator', 'block'
])

/** 列表类型 */
export const LIST_TYPE = {
  UL: 'ul',
  OL: 'ol'
} as const

/** 列表样式（项目符号 16 种 + 编号格式 13 种，对齐 WPS 全量） */
export const LIST_STYLE = {
  // 项目符号
  DISC: 'disc',
  CIRCLE: 'circle',
  SQUARE: 'square',
  EMPTY_SQUARE: 'emptySquare',
  FILLED_DIAMOND: 'filledDiamond',
  DIAMOND: 'diamond',
  ARROW: 'arrow',
  ARROW_FILLED: 'arrowFilled',
  CHECK: 'check',
  CROSS: 'cross',
  BULLET: 'bullet',
  TRIANGLE: 'triangle',
  STAR: 'star',
  HEART: 'heart',
  DASH: 'dash',
  HYPHEN: 'hyphen',
  // 编号格式
  DECIMAL: 'decimal',
  DECIMAL_ZERO: 'decimalZero',
  LOWER_LETTER: 'lowerLetter',
  UPPER_LETTER: 'upperLetter',
  LOWER_ROMAN: 'lowerRoman',
  UPPER_ROMAN: 'upperRoman',
  CHINESE_COUNTING: 'chineseCounting',
  CHINESE_COUNTING_THOUSAND: 'chineseCountingThousand',
  IDEOGRAPH_DIGITAL: 'ideographDigital',
  JAPANESE_COUNTING: 'japaneseCounting',
  KOREAN_COUNTING: 'koreanCounting',
  TAIWANESE_COUNTING: 'taiwaneseCounting'
} as const

/** 段落对齐方式 */
export const ROW_FLEX = {
  LEFT: 'left',
  CENTER: 'center',
  RIGHT: 'right',
  JUSTIFY: 'justify',
  ALIGNMENT: 'alignment',
  DISTRIBUTE: 'distribute'
} as const

/** 标题级别 */
export const TITLE_LEVEL = {
  FIRST: 'first',
  SECOND: 'second',
  THIRD: 'third',
  FOURTH: 'fourth',
  FIFTH: 'fifth',
  SIXTH: 'sixth'
} as const

/** 字体族常量（对齐 WPS 常用字体，代码内引用用） */
export const FONT_FAMILY = {
  SIM_SUN: 'SimSun',
  SIM_HEI: 'SimHei',
  KAI_TI: 'KaiTi',
  FANG_SONG: 'FangSong',
  MICROSOFT_YAHEI: 'Microsoft YaHei',
  DENG_XIAN: 'DengXian',
  ST_SONG: 'STSong',
  ST_HEITI: 'STHeiti',
  ST_KAITI: 'STKaiti',
  ST_FANGSONG: 'STFangsong',
  ST_ZHONGSONG: 'STZhongsong',
  ST_XIHEI: 'STXihei',
  ST_XINGKAI: 'STXingkai',
  ST_LITI: 'STLiti',
  ST_XINWEI: 'STXinwei',
  ST_CAIYUN: 'STCaiyun',
  TIMES_NEW_ROMAN: 'Times New Roman',
  ARIAL: 'Arial',
  CALIBRI: 'Calibri',
  COURIER_NEW: 'Courier New',
  VERDANA: 'Verdana'
} as const

/**
 * 字体映射条目（三层结构）
 * - label: 显示名（工具栏下拉显示）
 * - value: 存储名（文档里存的，WPS/Office 兼容）
 * - css:   CSS font-family 值（带跨平台 fallback，引用系统字体不侵权 + 开源字体兜底）
 * - aliases: 文档里可能存的其他名字（中文名、大小写变体等）
 */
export interface FontFamilyEntry {
  label: string
  value: string
  css: string
  aliases?: string[]
}

/**
 * WPS 常用字体完整映射表（16 中文字体 + 5 英文字体）
 * CSS fallback 策略：Windows 系统字体 → macOS 对应字体 → 开源字体兜底 → 通用字体族
 */
export const FONT_FAMILY_MAP: FontFamilyEntry[] = [
  { label: '宋体', value: 'SimSun', css: '"SimSun", "Songti SC", "Noto Serif CJK SC", serif', aliases: ['宋体', 'simsun'] },
  { label: '黑体', value: 'SimHei', css: '"SimHei", "STHeiti", "PingFang SC", "Noto Sans CJK SC", sans-serif', aliases: ['黑体', 'simhei'] },
  { label: '楷体', value: 'KaiTi', css: '"KaiTi", "Kaiti SC", "STKaiti", "LXGW WenKai", serif', aliases: ['楷体', 'kaiti'] },
  { label: '仿宋', value: 'FangSong', css: '"FangSong", "STFangsong", "Noto Serif CJK SC", serif', aliases: ['仿宋', 'fangsong'] },
  { label: '微软雅黑', value: 'Microsoft YaHei', css: '"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif', aliases: ['微软雅黑', 'microsoft yahei'] },
  { label: '等线', value: 'DengXian', css: '"DengXian", "Noto Sans CJK SC", sans-serif', aliases: ['等线', 'dengxian'] },
  { label: '华文宋体', value: 'STSong', css: '"STSong", "SimSun", "Songti SC", "Noto Serif CJK SC", serif', aliases: ['华文宋体'] },
  { label: '华文黑体', value: 'STHeiti', css: '"STHeiti", "SimHei", "PingFang SC", "Noto Sans CJK SC", sans-serif', aliases: ['华文黑体'] },
  { label: '华文楷体', value: 'STKaiti', css: '"STKaiti", "KaiTi", "Kaiti SC", "LXGW WenKai", serif', aliases: ['华文楷体'] },
  { label: '华文仿宋', value: 'STFangsong', css: '"STFangsong", "FangSong", "Noto Serif CJK SC", serif', aliases: ['华文仿宋'] },
  { label: '华文中宋', value: 'STZhongsong', css: '"STZhongsong", "STSong", "SimSun", "Noto Serif CJK SC", serif', aliases: ['华文中宋'] },
  { label: '华文细黑', value: 'STXihei', css: '"STXihei", "STHeiti", "SimHei", "Noto Sans CJK SC", sans-serif', aliases: ['华文细黑'] },
  { label: '华文行楷', value: 'STXingkai', css: '"STXingkai", "STKaiti", "KaiTi", "LXGW WenKai", serif', aliases: ['华文行楷'] },
  { label: '华文隶书', value: 'STLiti', css: '"STLiti", "STFangsong", "FangSong", "Noto Serif CJK SC", serif', aliases: ['华文隶书'] },
  { label: '华文新魏', value: 'STXinwei', css: '"STXinwei", "STXihei", "SimHei", "Noto Sans CJK SC", sans-serif', aliases: ['华文新魏'] },
  { label: '华文彩云', value: 'STCaiyun', css: '"STCaiyun", "STSong", "SimSun", "Noto Serif CJK SC", serif', aliases: ['华文彩云'] },
  { label: 'Times New Roman', value: 'Times New Roman', css: '"Times New Roman", "Liberation Serif", serif' },
  { label: 'Arial', value: 'Arial', css: 'Arial, "Liberation Sans", sans-serif' },
  { label: 'Calibri', value: 'Calibri', css: 'Calibri, "Liberation Sans", sans-serif' },
  { label: 'Courier New', value: 'Courier New', css: '"Courier New", "Liberation Mono", monospace' },
  { label: 'Verdana', value: 'Verdana', css: 'Verdana, "DejaVu Sans", sans-serif' }
]

/** 字体下拉选项（显示名列表，有序） */
export const FONT_FAMILY_LIST: string[] = FONT_FAMILY_MAP.map(e => e.label)

/** 显示名 → 存储名（工具栏选中后存文档用） */
export const FONT_FAMILY_VALUE: Record<string, string> = Object.fromEntries(
  FONT_FAMILY_MAP.map(e => [e.label, e.value])
)

/** 存储名/别名 → 显示名（用于回显，认中文名和英文名） */
export const FONT_FAMILY_LABEL: Record<string, string> = Object.fromEntries(
  FONT_FAMILY_MAP.flatMap(e => [
    [e.value, e.label],
    ...(e.aliases ?? []).map(a => [a, e.label] as [string, string])
  ])
)

/** 存储名/别名 → CSS font-family 值（用于渲染，带跨平台 fallback） */
export const FONT_FAMILY_CSS: Record<string, string> = Object.fromEntries(
  FONT_FAMILY_MAP.flatMap(e => [
    [e.value, e.css],
    ...(e.aliases ?? []).map(a => [a, e.css] as [string, string])
  ])
)

/**
 * WPS 字号表（中文字号名 → pt 值）
 * 完整覆盖 WPS 全部预设字号：初号~八号 + 小初~小六
 */
export const FONT_SIZE: Record<string, number> = {
  '初号': 42,
  '小初': 36,
  '一号': 26,
  '小一': 24,
  '二号': 22,
  '小二': 18,
  '三号': 16,
  '小三': 15,
  '四号': 14,
  '小四': 12,
  '五号': 10.5,
  '小五': 9,
  '六号': 7.5,
  '小六': 6.5,
  '七号': 5.5,
  '八号': 5
}

/**
 * 字号下拉选项（有序，中文字号 + 常用数字字号）
 * WPS 风格：先列中文字号，再列常用数字字号
 */
export const FONT_SIZE_LIST = [
  '初号', '小初', '一号', '小一', '二号', '小二', '三号', '小三', '四号', '小四',
  '五号', '小五', '六号', '小六', '七号', '八号',
  '5', '5.5', '6.5', '7.5', '8', '9', '10', '10.5', '11', '12', '14', '15', '16',
  '18', '20', '22', '24', '26', '28', '30', '36', '42', '48', '54', '60', '72'
] as const

/* ========== 纸张方向 / 表格边框 ========== */

/** 纸张方向 */
export const PaperDirection = {
  VERTICAL: 'vertical',
  HORIZONTAL: 'horizontal'
} as const

/** 表格边框类型 */
export const TableBorder = {
  NONE: 'none',
  OUTSIDE: 'outside',
  ALL: 'all',
  INSIDE: 'inside',
  INSIDE_HORIZONTAL: 'inside-horizontal',
  INSIDE_VERTICAL: 'inside-vertical',
  TOP: 'top',
  BOTTOM: 'bottom',
  LEFT: 'left',
  RIGHT: 'right'
} as const

export type TableBorderPreset = typeof TableBorder[keyof typeof TableBorder]

/* ========== 单位换算（96 DPI） ========== */

/** 屏幕 DPI 常量 */
export const DPI = 96

/**
 * 磅（pt）转像素（px）
 * @param pt 磅值
 * @returns 像素值（保留两位小数）
 */
export function ptToPx(pt: number): number {
  return Math.round(pt * (DPI / 72) * 100) / 100
}

/**
 * 像素（px）转磅（pt）
 * @param px 像素值
 * @returns 磅值（保留一位小数，0.5 步进）
 */
export function pxToPt(px: number): number {
  return Math.round(px * (72 / DPI) * 2) / 2
}

/* ========== 纸张大小（对齐 WPS/Office，96 DPI） ========== */

export interface PaperSize {
  /** 纸张标识（唯一 key） */
  key: string
  /** 显示名称 */
  label: string
  /** 纸张宽度（px @ 96dpi） */
  width: number
  /** 纸张高度（px @ 96dpi） */
  height: number
  /** 分类 */
  category: 'a-series' | 'b-series' | 'us' | 'cn' | 'envelope' | 'other'
}

/**
 * WPS/Office 纸张预设列表（覆盖 80%+ 常用纸张）
 * 像素值按 96 DPI 换算：px = mm * 96 / 25.4
 */
export const PAPER_SIZE_LIST: PaperSize[] = [
  // A 系列（ISO 216）
  { key: 'a0', label: 'A0 (84.1×118.9cm)', width: 3179, height: 4494, category: 'a-series' },
  { key: 'a1', label: 'A1 (59.4×84.1cm)', width: 2245, height: 3179, category: 'a-series' },
  { key: 'a2', label: 'A2 (42×59.4cm)', width: 1587, height: 2245, category: 'a-series' },
  { key: 'a3', label: 'A3 (29.7×42cm)', width: 1123, height: 1587, category: 'a-series' },
  { key: 'a4', label: 'A4 (21×29.7cm)', width: 794, height: 1123, category: 'a-series' },
  { key: 'a5', label: 'A5 (14.8×21cm)', width: 559, height: 794, category: 'a-series' },
  { key: 'a6', label: 'A6 (10.5×14.8cm)', width: 397, height: 559, category: 'a-series' },
  // B 系列（JIS）
  { key: 'b4', label: 'B4 (25.7×36.4cm)', width: 971, height: 1376, category: 'b-series' },
  { key: 'b5', label: 'B5 (18.2×25.7cm)', width: 688, height: 971, category: 'b-series' },
  { key: 'b6', label: 'B6 (12.8×18.2cm)', width: 484, height: 688, category: 'b-series' },
  // 美式
  { key: 'letter', label: 'Letter (21.6×27.9cm)', width: 816, height: 1056, category: 'us' },
  { key: 'legal', label: 'Legal (21.6×35.6cm)', width: 816, height: 1344, category: 'us' },
  { key: 'tabloid', label: 'Tabloid (27.9×43.2cm)', width: 1056, height: 1633, category: 'us' },
  { key: 'executive', label: 'Executive (18.4×26.7cm)', width: 696, height: 1009, category: 'us' },
  { key: 'statement', label: 'Statement (14×21.6cm)', width: 529, height: 816, category: 'us' },
  { key: 'folio', label: 'Folio (21.6×33cm)', width: 816, height: 1247, category: 'us' },
  // 中式
  { key: '16k', label: '16K (19.5×27cm)', width: 737, height: 1020, category: 'cn' },
  { key: '32k', label: '32K (13×19cm)', width: 491, height: 718, category: 'cn' },
  { key: '32k-large', label: '大32K (14×20.3cm)', width: 529, height: 767, category: 'cn' },
  // 信封
  { key: 'env-10', label: '信封 #10 (10.5×24.1cm)', width: 397, height: 910, category: 'envelope' },
  { key: 'env-dl', label: '信封 DL (11×22cm)', width: 416, height: 831, category: 'envelope' },
  { key: 'env-c5', label: '信封 C5 (16.2×22.9cm)', width: 612, height: 865, category: 'envelope' },
  { key: 'env-c6', label: '信封 C6 (11.4×16.2cm)', width: 430, height: 612, category: 'envelope' },
  { key: 'env-monarch', label: '信封 Monarch (9.8×19cm)', width: 370, height: 718, category: 'envelope' },
  // 其他
  { key: 'photo-4x6', label: '照片 4×6 (10.2×15.2cm)', width: 386, height: 574, category: 'other' },
  { key: 'postcard', label: '明信片 (10×14.8cm)', width: 378, height: 559, category: 'other' }
]

/** 默认纸张大小（A4） */
export const DEFAULT_PAPER_SIZE: PaperSize = PAPER_SIZE_LIST[4]

/* ========== 项目符号 / 编号样式 ========== */

/** 项目符号样式 */
export const BULLET_STYLES = [
  { style: 'disc', icon: '●', label: '实心圆点' },
  { style: 'circle', icon: '○', label: '空心圆点' },
  { style: 'square', icon: '■', label: '实心方块' },
  { style: 'hollow-square', icon: '□', label: '空心方块' },
  { style: 'diamond', icon: '◆', label: '实心菱形' },
  { style: 'hollow-diamond', icon: '◇', label: '空心菱形' },
  { style: 'arrow', icon: '▶', label: '箭头' },
  { style: 'check', icon: '✓', label: '对勾' }
]

/** 编号样式 */
export const NUMBER_STYLES = [
  { style: 'decimal', numFmt: 'decimal', lvlText: '%1.', samples: ['1.', '2.', '3.'], label: '阿拉伯数字' },
  { style: 'decimal-bracket', numFmt: 'decimal', lvlText: '%1)', samples: ['1)', '2)', '3)'], label: '数字右括号' },
  { style: 'decimal-paren', numFmt: 'decimal', lvlText: '(%1)', samples: ['(1)', '(2)', '(3)'], label: '数字括号' },
  { style: 'upper-alpha', numFmt: 'upperLetter', lvlText: '%1.', samples: ['A.', 'B.', 'C.'], label: '大写字母' },
  { style: 'lower-alpha-dot', numFmt: 'lowerLetter', lvlText: '%1.', samples: ['a.', 'b.', 'c.'], label: '小写字母' },
  { style: 'chinese', numFmt: 'chineseCounting', lvlText: '%1、', samples: ['一、', '二、', '三、'], label: '中文数字' },
  { style: 'chinese-bracket', numFmt: 'chineseCounting', lvlText: '（%1）', samples: ['（一）', '（二）', '（三）'], label: '中文括号' },
  { style: 'decimal-circle', numFmt: 'decimalEnclosedCircle', lvlText: '%1', samples: ['①', '②', '③'], label: '圈码' }
]

/* ========== 行距 / 页边距 / 缩放 ========== */

/** 行距选项 */
export const LINE_HEIGHT_OPTIONS = [
  { value: 1, label: '单倍行距' },
  { value: 1.15, label: '1.15 倍行距' },
  { value: 1.5, label: '1.5 倍行距' },
  { value: 2, label: '双倍行距' },
  { value: 2.5, label: '2.5 倍行距' },
  { value: 3, label: '三倍行距' }
]

/** 页边距预设 */
export const MARGIN_PRESETS = [
  { name: '普通', margins: [96, 120, 96, 120], style: { margin: '14px 18px' } },
  { name: '窄', margins: [48, 48, 48, 48], style: { margin: '7px 7px' } },
  { name: '适中', margins: [96, 72, 96, 72], style: { margin: '14px 11px' } },
  { name: '宽', margins: [96, 192, 96, 192], style: { margin: '14px 28px' } }
]

/** 缩放级别 */
export const ZOOM_LEVELS = [50, 75, 100, 125, 150, 200]

/* ========== 分割线样式 ========== */

/** 分割线样式 */
export const SEPARATOR_STYLES = [
  { name: '极细实线', type: 'solid', width: 0.5, dashArray: [0, 0] },
  { name: '细实线', type: 'solid', width: 1, dashArray: [0, 0] },
  { name: '中实线', type: 'solid', width: 2, dashArray: [0, 0] },
  { name: '粗实线', type: 'solid', width: 3, dashArray: [0, 0] },
  { name: '特粗实线', type: 'solid', width: 4, dashArray: [0, 0] },
  { name: '细点线', type: 'dotted', width: 0.5, dashArray: [1, 1] },
  { name: '点线', type: 'dotted', width: 1, dashArray: [1, 1] },
  { name: '粗点线', type: 'dotted', width: 2, dashArray: [1, 1] },
  { name: '大点线', type: 'dotted', width: 3, dashArray: [2, 2] },
  { name: '细短虚线', type: 'dashed', width: 0.5, dashArray: [3, 2] },
  { name: '短虚线', type: 'dashed', width: 1, dashArray: [3, 2] },
  { name: '粗短虚线', type: 'dashed', width: 2, dashArray: [3, 2] },
  { name: '细长虚线', type: 'dashed', width: 0.5, dashArray: [6, 3] },
  { name: '长虚线', type: 'dashed', width: 1, dashArray: [6, 3] },
  { name: '粗长虚线', type: 'dashed', width: 2, dashArray: [6, 3] },
  { name: '特长虚线', type: 'dashed', width: 1, dashArray: [10, 5] },
  { name: '点划线', type: 'dashed', width: 1, dashArray: [6, 2, 1, 2] },
  { name: '粗点划线', type: 'dashed', width: 2, dashArray: [6, 2, 1, 2] },
  { name: '双点划线', type: 'dashed', width: 1, dashArray: [6, 2, 1, 2, 1, 2] },
  { name: '粗双点划线', type: 'dashed', width: 2, dashArray: [6, 2, 1, 2, 1, 2] },
  { name: '细双线', type: 'double', width: 2, dashArray: [0, 0] },
  { name: '双线', type: 'double', width: 3, dashArray: [0, 0] },
  { name: '粗双线', type: 'double', width: 4, dashArray: [0, 0] },
  { name: '特粗双线', type: 'double', width: 5, dashArray: [0, 0] },
  { name: '三线', type: 'triple', width: 4, dashArray: [0, 0] },
  { name: '细波浪线', type: 'wavy', width: 0.5, dashArray: [0, 0] },
  { name: '波浪线', type: 'wavy', width: 1, dashArray: [0, 0] },
  { name: '粗波浪线', type: 'wavy', width: 2, dashArray: [0, 0] },
  { name: '渐变线', type: 'gradient', width: 2, dashArray: [0, 0] },
  { name: '阴影线', type: 'shadow', width: 2, dashArray: [0, 0] },
  { name: '浮雕线', type: 'emboss', width: 3, dashArray: [0, 0] }
]

/* ========== 标题级别映射 ========== */

/** 标题级别映射 */
export const TITLE_LEVEL_MAP: Record<string, string> = {
  first: '标题1',
  second: '标题2',
  third: '标题3',
  fourth: '标题4',
  fifth: '标题5',
  sixth: '标题6'
}
