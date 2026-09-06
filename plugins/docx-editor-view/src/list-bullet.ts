/**
 * VerveDocs View —— List Bullet & Numbering
 *
 * 无序符号：直接使用 Wingdings/Symbol 私有区字符，通过字体栈渲染。
 *   Windows 自带 Wingdings 字体 → 原生正确显示。
 *   其它系统 → 通过字体栈回退到 Segoe UI Symbol / Symbola / Noto 等，
 *   或者进一步映射到普通 Unicode（U+27A2 ➢ 等）。
 *
 * 有序编号：按 numFmt 转换数字，替换 lvlText 里的 %1..%9 占位。
 */

import type { IListElement, IListNumbering } from '@vervedoc/docx-editor-schema'

/* ==================== 数字格式转换 ==================== */

/**
 * 将阿拉伯数字转换为罗马数字。
 * @param num - 待转换的正整数（仅支持 1..3999，超出范围直接返回原数字字符串）
 * @param upper - 是否输出大写罗马数字
 * @returns 罗马数字字符串
 */
function toRoman(num: number, upper: boolean): string {
  if (num <= 0 || num >= 4000) return String(num)
  const map: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
  ]
  let n = num, out = ''
  for (const [v, s] of map) { while (n >= v) { out += s; n -= v } }
  return upper ? out : out.toLowerCase()
}

/**
 * 将正整数转换为字母序号（1→A, 26→Z, 27→AA）。
 * @param num - 待转换的正整数（<=0 时直接返回原数字字符串）
 * @param upper - 是否输出大写字母
 * @returns 字母序号字符串
 */
function toLetter(num: number, upper: boolean): string {
  if (num <= 0) return String(num)
  let n = num, out = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    out = String.fromCharCode(65 + rem) + out
    n = Math.floor((n - 1) / 26)
  }
  return upper ? out : out.toLowerCase()
}

/** 中文小写数字字符表（0..9 对应 零..九） */
const CN_DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
/** 中文数位单位（个、十、百、千） */
const CN_UNITS = ['', '十', '百', '千']
/** 中文大分段单位（个、万、亿、兆） */
const CN_BIG_UNITS = ['', '万', '亿', '兆']
/** 中文大写数字字符表（0..9 对应 零..玖，财务用大写） */
const CN_UPPER   = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']

/**
 * 将正整数转换为中文小写计数（如 12 → 十二，23 → 二十三）。
 * @param num - 待转换的正整数（<=0 时直接返回原数字字符串）
 * @returns 中文小写计数字符串
 */
function toChineseCounting(num: number): string {
  if (num <= 0) return String(num)
  if (num < 10) return CN_DIGITS[num]
  if (num < 20) return num === 10 ? '十' : '十' + CN_DIGITS[num - 10]
  if (num < 100) {
    const t = Math.floor(num / 10), o = num % 10
    return CN_DIGITS[t] + '十' + (o ? CN_DIGITS[o] : '')
  }
  return toChineseCountingLarge(num)
}

/**
 * 将任意大正整数转换为中文计数（支持万、亿、兆等大单位）。
 * @param num - 待转换的非负整数
 * @returns 中文计数字符串
 */
function toChineseCountingLarge(num: number): string {
  if (num === 0) return '零'
  let out = ''
  const segs: number[] = []
  let n = num
  while (n > 0) { segs.push(n % 10000); n = Math.floor(n / 10000) }
  for (let s = segs.length - 1; s >= 0; s--) {
    const seg = segs[s]
    if (seg === 0) { if (out && !out.endsWith('零')) out += '零'; continue }
    let segStr = ''
    for (let u = 3; u >= 0; u--) {
      const digit = Math.floor(seg / Math.pow(10, u)) % 10
      if (digit === 0) { if (segStr && !segStr.endsWith('零')) segStr += '零' }
      else segStr += CN_DIGITS[digit] + CN_UNITS[u]
    }
    if (segStr.endsWith('零')) segStr = segStr.slice(0, -1)
    out += segStr + CN_BIG_UNITS[s]
  }
  return out
}

/**
 * 将正整数转换为中文大写计数（财务用，如 12 → 壹拾贰）。
 * @param num - 待转换的正整数
 * @returns 中文大写计数字符串
 */
function toChineseUpper(num: number): string {
  return toChineseCounting(num).split('').map(ch => {
    const i = CN_DIGITS.indexOf(ch)
    return i >= 0 ? CN_UPPER[i] : ch
  }).join('')
}

/**
 * 将正整数转换为逐位中文数字（如 123 → 一二三，不进位）。
 * @param num - 待转换的正整数
 * @returns 逐位中文数字字符串
 */
function toIdeographDigital(num: number): string {
  return String(num).split('').map(d => CN_DIGITS[Number(d)] ?? d).join('')
}

/**
 * 将正整数格式化为两位前导零十进制（如 1 → 01，10 → 10）。
 * @param num - 待格式化的正整数
 * @returns 两位十进制字符串
 */
function toDecimalZero(num: number): string {
  return num < 10 ? '0' + num : String(num)
}

/**
 * 按 OOXML numFmt 编号格式将计数值转换为展示字符串。
 * @param num - 当前层级的计数值
 * @param numFmt - 编号格式名称（decimal / lowerLetter / upperRoman / chineseCounting 等）
 * @returns 格式化后的编号字符串
 */
export function formatCounter(num: number, numFmt: string): string {
  switch (numFmt) {
    case 'decimal':                    return String(num)
    case 'decimalZero':                return toDecimalZero(num)
    case 'lowerLetter':                return toLetter(num, false)
    case 'upperLetter':                return toLetter(num, true)
    case 'lowerRoman':                 return toRoman(num, false)
    case 'upperRoman':                 return toRoman(num, true)
    case 'chineseCounting':            return toChineseCounting(num)
    case 'chineseCountingThousand':    return toChineseUpper(num)
    case 'ideographDigital':           return toIdeographDigital(num)
    case 'japaneseCounting':
    case 'koreanCounting':
    case 'taiwaneseCounting':          return toChineseCounting(num)
    case 'bullet':                     return ''
    default:                            return String(num)
  }
}

/* ==================== Wingdings PUA → Unicode 回退表 ==================== */

/**
 * 当系统没有 Wingdings 字体时，把 Wingdings 私有区字符换成能被通用符号字体
 * （Segoe UI Symbol / Apple Color Emoji / Symbola）覆盖的 Unicode 字符。
 */
const WINGDINGS_FALLBACK: Record<string, string> = {
  '\uF020': ' ',
  '\uF021': '✏',   // 铅笔
  '\uF022': '✂',   // 剪刀
  '\uF025': '📞',
  '\uF029': '📁',
  '\uF04A': '☺',
  '\uF04B': '😐',
  '\uF04C': '☹',
  '\uF06C': '●',
  '\uF06D': '❍',
  '\uF06E': '■',
  '\uF06F': '□',
  '\uF070': '◘',
  '\uF071': '❑',
  '\uF072': '❒',
  '\uF073': '⬧',
  '\uF074': '⬨',
  '\uF075': '◆',
  '\uF076': '❖',
  '\uF077': '⬥',
  '\uF078': '⧫',
  '\uF07C': '•',
  '\uF0A7': '▪',
  '\uF0A8': '◆',
  '\uF0A2': '○',
  '\uF0B7': '•',
  '\uF0D2': '❑',
  '\uF0D8': '➢',   // ★★ 常用的中空右箭头（Word "TAB页" 项目符号）
  '\uF0E0': '➔',
  '\uF0E8': '➢',
  '\uF0F0': '⇒',
  '\uF0FC': '✓',
  '\uF0FB': '✗',
  '\uF0FE': '❑'
}

/** 常用符号字体栈：Wingdings 优先，其次系统符号字体，最后 sans-serif */
export const BULLET_FONT_STACK =
  'Wingdings, "Segoe UI Symbol", "Apple Symbols", "Apple Color Emoji", "Noto Sans Symbols", "Noto Sans Symbols 2", Symbola, "DejaVu Sans", "Arial Unicode MS", sans-serif'

/** 无 Wingdings 字体时的字符栈（跳过 Wingdings） */
export const BULLET_FONT_STACK_FALLBACK =
  '"Segoe UI Symbol", "Apple Symbols", "Apple Color Emoji", "Noto Sans Symbols", "Noto Sans Symbols 2", Symbola, "DejaVu Sans", "Arial Unicode MS", sans-serif'

/**
 * 环境检测：当前浏览器是否安装了 Wingdings 字体。
 * 通过测量特定字符宽度对比 sans-serif 判断。缓存结果。
 */
/** Wingdings 字体检测结果缓存（null 表示尚未检测） */
let _hasWingdings: boolean | null = null
export function detectWingdings(): boolean {
  if (_hasWingdings != null) return _hasWingdings
  if (typeof document === 'undefined') { _hasWingdings = false; return false }
  try {
    const c = document.createElement('canvas')
    const ctx = c.getContext('2d')!
    ctx.font = '20px sans-serif'
    const w1 = ctx.measureText('\uF0D8').width
    ctx.font = '20px Wingdings, sans-serif'
    const w2 = ctx.measureText('\uF0D8').width
    _hasWingdings = Math.abs(w1 - w2) > 0.5
  } catch { _hasWingdings = false }
  return _hasWingdings
}

/** 从 lvlText / listStyle 解析无序符号字符（原始 PUA 或回退 Unicode） */
export function resolveUnorderedChar(list: IListElement): string {
  const num = list.listNumbering
  const style = (list.listStyle || '').toString()
  const bulletFont = (num as unknown as { font?: string } | undefined)?.font ?? ''
  const isWingdings = /wingdings/i.test(bulletFont)

  // 1. lvlText 首字符（Word 里就是原始 Wingdings PUA 字符）
  if (num?.lvlText) {
    const trimmed = num.lvlText.trim()
    if (trimmed && !/%[1-9]/.test(trimmed)) {
      const ch = trimmed.charAt(0)
      // 若 numbering 声明了 Wingdings 字体但 lvlText 是 ASCII，则把它当 Wingdings 私有区处理
      if (isWingdings && ch.charCodeAt(0) < 0x80) {
        return String.fromCharCode(0xF000 + ch.charCodeAt(0))
      }
      return ch
    }
  }

  // 2. numbering 字体为 Wingdings 但 lvlText 为空 → Word 默认使用箭头 U+F0D8（➢）
  if (isWingdings) return '\uF0D8'

  // 3. listStyle 命名 → Wingdings PUA 或 Unicode 默认
  const styleMap: Record<string, string> = {
    disc:        '\uF0B7',
    circle:      '\uF0A2',
    square:      '\uF0A7',
    emptySquare: '\uF0D2',
    filledDiamond: '\uF0A8',
    diamond:     '\uF076',
    arrow:       '\uF0D8',
    arrowFilled: '\uF0E0',
    check:       '\uF0FC',
    cross:       '\uF0FB',
    bullet:      '\uF0B7',
    triangle:    '▶',
    star:        '★',
    heart:       '♥',
    dash:        '–',
    hyphen:      '-'
  }
  if (styleMap[style]) return styleMap[style]

  // 4. 层级默认循环
  const level = Math.max(0, list.listLevel ?? 0)
  const fallback = ['\uF0B7', '\uF0A2', '\uF0A7']
  return fallback[level % fallback.length]
}

/** 若无 Wingdings，就把 PUA 转为通用 Unicode 字符 */
export function normalizeBulletChar(ch: string, hasWingdings: boolean): string {
  if (hasWingdings) return ch
  return WINGDINGS_FALLBACK[ch] ?? ch
}

/* ==================== 顶层入口 ==================== */

/**
 * 项目符号解析结果。
 * 描述一个列表项最终要绘制的符号/编号文本及其渲染方式。
 */
export interface BulletResult {
  /** 无序符号 or 有序编号，最终要绘制的字符串 */
  text: string
  /** 是否是无序符号（用符号字体栈） */
  isSymbol: boolean
  /** 编号在其"编号列"内的对齐方式（来自 numbering.lvlJc） */
  lvlJc?: 'left' | 'center' | 'right'
}

/**
 * 解析列表项的项目符号或编号文本（顶层入口）。
 * 无序列表返回符号字符；有序列表根据计数器计算当前编号并替换 lvlText 占位符。
 * @param list - 列表元素数据
 * @param counters - 跨列表项的编号计数器（按 "groupId:level" 索引），可选
 * @returns 项目符号解析结果
 */
export function resolveBullet(
  list: IListElement,
  counters?: Map<string, number>
): BulletResult {
  const num: IListNumbering | undefined = list.listNumbering
  const listType = list.listType
  const level = Math.max(0, list.listLevel ?? 0)

  const isUnordered =
    listType === 'ul' ||
    num?.numFmt === 'bullet' ||
    (num == null && !isOrderedStyle(list.listStyle))

  if (isUnordered) {
    const raw = resolveUnorderedChar(list)
    const hasWD = detectWingdings()
    const ch = normalizeBulletChar(raw, hasWD)
    return { text: ch, isSymbol: true, lvlJc: num?.lvlJc }
  }

  const fmt = num?.numFmt ?? list.listStyle ?? 'decimal'
  const start = num?.start ?? 1
  const tpl = num?.lvlText ?? '%1.'
  // 计数隔离键：优先使用 listId（独立列表实例），回退 numId，再回退 listStyle
  const groupId = list.listId ?? num?.numId ?? list.listStyle ?? 'default'
  const numId = groupId
  const key = `${numId}:${level}`

  let current = start
  if (counters) {
    const prev = counters.get(key)
    current = (prev == null ? start - 1 : prev) + 1
    counters.set(key, current)
    for (const k of counters.keys()) {
      if (!k.startsWith(`${numId}:`)) continue
      const l = Number(k.split(':')[1])
      if (l > level) counters.delete(k)
    }
  }

  const text = tpl.replace(/%([1-9])/g, (_, d: string) => {
    const lvl = Number(d) - 1
    if (lvl === level) return formatCounter(current, fmt)
    const val = counters?.get(`${numId}:${lvl}`) ?? start
    return formatCounter(val, fmt)
  })

  return { text, isSymbol: false, lvlJc: num?.lvlJc }
}

/**
 * 判断给定的 listStyle 是否属于有序编号样式。
 * @param s - listStyle 字符串
 * @returns 若为有序编号样式返回 true，否则 false
 */
function isOrderedStyle(s?: string): boolean {
  if (!s) return false
  return [
    'decimal', 'decimalZero',
    'lowerLetter', 'upperLetter',
    'lowerRoman', 'upperRoman',
    'chineseCounting', 'chineseCountingThousand',
    'ideographDigital', 'japaneseCounting', 'koreanCounting', 'taiwaneseCounting'
  ].includes(s)
}
