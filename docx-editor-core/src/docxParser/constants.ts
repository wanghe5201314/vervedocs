// ---- XML 命名空间 ----

export const NS = {
  w: 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
  r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  a: 'http://schemas.openxmlformats.org/drawingml/2006/main',
  wp: 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
  c: 'http://schemas.openxmlformats.org/drawingml/2006/chart',
  v: 'urn:schemas-microsoft-com:vml',
  pic: 'http://schemas.openxmlformats.org/drawingml/2006/picture',
  mc: 'http://schemas.openxmlformats.org/markup-compatibility/2006',
  wps: 'http://schemas.microsoft.com/office/word/2010/wordprocessingShape',
  rel: 'http://schemas.openxmlformats.org/package/2006/relationships',
  m: 'http://schemas.openxmlformats.org/officeDocument/2006/math'
} as const

// ---- 单位转换 ----

/** Twip（1/1440 英寸）转 px（96dpi） */
export function twipToPx(twip: number): number {
  return (twip / 1440) * 96
}

/** 半磅转磅（字号：Word sz 值 / 2） */
export function halfPtToPt(halfPt: number): number {
  return halfPt / 2
}

/**
 * 半磅转像素（Word sz 单位 → canvas px，96dpi）
 * Word sz = 半磅，pt = sz/2，px = pt × 96/72
 * 即 px = sz × (96 / 144) = sz × (2/3)
 */
export function halfPtToPx(halfPt: number): number {
  return halfPt * (96 / 144)
}

/** EMU 转 px（1 英寸 = 914400 EMU = 96px） */
export function emuToPx(emu: number): number {
  return emu / 9525
}

/** 八分之一磅转 px（边框宽度） */
export function eighthPtToPx(val: number): number {
  return (val / 8) * (96 / 72)
}

// ---- 颜色映射 ----

/** Word 高亮颜色名 → CSS hex */
export const HIGHLIGHT_COLOR_MAP: Record<string, string> = {
  yellow: '#FFFF00',
  green: '#00FF00',
  cyan: '#00FFFF',
  magenta: '#FF00FF',
  blue: '#0000FF',
  red: '#FF0000',
  darkBlue: '#000080',
  darkCyan: '#008080',
  darkGreen: '#008000',
  darkMagenta: '#800080',
  darkRed: '#800000',
  darkYellow: '#808000',
  darkGray: '#808080',
  lightGray: '#C0C0C0',
  black: '#000000',
  white: '#FFFFFF'
}

// ---- 字体规范化 ----

/**
 * Word / WPS 字体名 → Web 安全字体名映射
 * 中文字体优先映射到对应系统字体名
 */
const FONT_NORMALIZE_MAP: Record<string, string> = {
  // 宋体系列
  '宋体': 'SimSun',
  'Song Ti': 'SimSun',
  '新宋体': 'NSimSun',
  // 黑体系列
  '黑体': 'SimHei',
  'Hei Ti': 'SimHei',
  // 楷体系列
  '楷体': 'KaiTi',
  '楷体_GB2312': 'KaiTi',
  'Kai Ti': 'KaiTi',
  // 仿宋系列
  '仿宋': 'FangSong',
  '仿宋_GB2312': 'FangSong',
  'Fang Song': 'FangSong',
  // 微软雅黑
  '微软雅黑': 'Microsoft YaHei',
  'Microsoft YaHei': 'Microsoft YaHei',
  // 等线
  '等线': 'DengXian',
  '等线 Light': 'DengXian Light',
  '等线 Regular': 'DengXian',
  // 幼圆
  '幼圆': 'YouYuan',
  // 华文系列
  '华文细黑': 'STXihei',
  '华文宋体': 'STSong',
  '华文仿宋': 'STFangsong',
  '华文楷体': 'STKaiti',
  '华文中宋': 'STZhongsong',
  '华文琥珀': 'STHupo',
  '华文新魏': 'STXinwei',
  '华文彩云': 'STCaiyun',
  '华文行楷': 'STXingkai',
  '华文隶书': 'STLiti',
  // 方正系列
  '方正舒体': 'FZShuTi',
  '方正姚体': 'FZYaoti',
  // 西文通用（保留原名）
  'Times New Roman': 'Times New Roman',
  'Calibri': 'Calibri',
  'Calibri Light': 'Calibri Light',
  'Arial': 'Arial',
  'Arial Narrow': 'Arial Narrow',
  'Verdana': 'Verdana',
  'Tahoma': 'Tahoma',
  'Courier New': 'Courier New',
  'Georgia': 'Georgia',
  'Comic Sans MS': 'Comic Sans MS',
  'Impact': 'Impact',
  'Trebuchet MS': 'Trebuchet MS',
  'Palatino Linotype': 'Palatino Linotype',
  'Garamond': 'Garamond',
  'Century': 'Century',
  'Cambria': 'Cambria',
  'Cambria Math': 'Cambria Math',
  'Consolas': 'Consolas',
  'Franklin Gothic Medium': 'Franklin Gothic Medium'
}

export function normalizeFont(rawFontName: string | undefined): string | undefined {
  if (!rawFontName) return undefined
  return FONT_NORMALIZE_MAP[rawFontName] ?? rawFontName
}

// ---- 列表格式映射 ----

export const NUM_FMT_MAP: Record<string, { listType: string; listStyle: string }> = {
  bullet: { listType: 'ul', listStyle: 'disc' },
  decimal: { listType: 'ol', listStyle: 'decimal' },
  lowerLetter: { listType: 'ol', listStyle: 'lower-alpha' },
  upperLetter: { listType: 'ol', listStyle: 'upper-alpha' },
  lowerRoman: { listType: 'ol', listStyle: 'lower-roman' },
  upperRoman: { listType: 'ol', listStyle: 'upper-roman' },
  chineseCounting: { listType: 'ol', listStyle: 'cjk-ideographic' },
  chineseCountingThousand: { listType: 'ol', listStyle: 'cjk-ideographic' },
  ideographTraditional: { listType: 'ol', listStyle: 'cjk-ideographic' },
  japaneseCounting: { listType: 'ol', listStyle: 'decimal' },
  ordinal: { listType: 'ol', listStyle: 'decimal' },
  cardinalText: { listType: 'ol', listStyle: 'decimal' },
  none: { listType: 'ul', listStyle: 'none' }
}

// ---- 对齐方式映射 ----

export const ALIGNMENT_MAP: Record<string, string> = {
  left: 'left',
  center: 'center',
  right: 'right',
  both: 'justify',
  justify: 'justify',
  distribute: 'justify',
  numTab: 'left',
  highKashida: 'left',
  lowKashida: 'left',
  thaiDistribute: 'justify'
}

// ---- 边框类型映射 ----

export const BORDER_TYPE_MAP: Record<string, number> = {
  none: 0,
  nil: 0,
  single: 1,
  thick: 1,
  double: 2,
  dotted: 3,
  dashed: 4,
  dashSmallGap: 4,
  dotDash: 5,
  dotDotDash: 6,
  triple: 7,
  wave: 8,
  thinThickSmallGap: 1,
  thickThinSmallGap: 1,
  thinThickThinSmallGap: 1
}

// ---- 主题色语义名映射到槽位名 ----

/**
 * OOXML 中 themeFill / themeColor 可能使用语义名（如 background1），
 * 需映射到 clrScheme 中的实际槽位名（如 lt1）
 */
export const THEME_COLOR_SEMANTIC_MAP: Record<string, string> = {
  background1: 'lt1',
  background2: 'lt2',
  text1: 'dk1',
  text2: 'dk2',
  // 以下为别名，部分文档直接用语义名
  light1: 'lt1',
  light2: 'lt2',
  dark1: 'dk1',
  dark2: 'dk2'
}

// ---- 1x1 透明占位图（用于不可渲染格式降级） ----

export const TRANSPARENT_1PX_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
