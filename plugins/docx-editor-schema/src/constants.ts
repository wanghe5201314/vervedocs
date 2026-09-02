/**
 * VerveDocs Schema —— 常量
 */

import type { IEditorOption } from './types'

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
  'title', 'list', 'table', 'image', 'pageBreak'
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
  ALIGNMENT: 'alignment'
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
