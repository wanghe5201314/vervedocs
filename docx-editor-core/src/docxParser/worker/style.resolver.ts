import {
  NS, HIGHLIGHT_COLOR_MAP, THEME_COLOR_SEMANTIC_MAP,
  normalizeFont, halfPtToPx, twipToPx
} from '../constants'
import type { ParagraphStyle, RunStyle, ResolvedStyle } from '../types'
import { ThemeData, resolveThemeColor, resolveThemeFont } from './theme.resolver'
import {
  parseXml, getFirstChildByTag, getWVal, hasChild
} from './xml.helper'

interface StyleDefinition {
  id: string
  name: string
  basedOnId: string | null
  paragraphStyle: ParagraphStyle
  runStyle: RunStyle
}

/**
 * 样式解析器：解析 word/styles.xml，提供完整的样式继承链查询
 *
 * 合并优先级（低 → 高）：
 *   docDefaults → basedOn 链（从根祖先到直接父级）→ 当前 styleId → 段落/run 局部属性
 */
export class StyleResolver {
  private styleMap = new Map<string, StyleDefinition>()
  private defaultParagraphStyle: ParagraphStyle = {}
  private defaultRunStyle: RunStyle = {}
  private theme: ThemeData

  constructor(stylesXml: string | null, theme: ThemeData) {
    this.theme = theme
    if (stylesXml) {
      this.parseStylesXml(stylesXml)
    }
  }

  // ---- 公开方法 ----

  /**
   * 解析段落属性 <w:pPr>，返回局部 ParagraphStyle（不含继承链）
   */
  parseParagraphProperties(pPr: Element): ParagraphStyle {
    const style: ParagraphStyle = {}

    // 对齐 <w:jc w:val="center"/>
    const jcEl = getFirstChildByTag(pPr, NS.w, 'jc')
    if (jcEl) {
      const val = getWVal(jcEl)
      if (val) style.rowFlex = val
    }

    // 间距 <w:spacing w:before="X" w:after="Y" w:line="Z" w:lineRule="R"/>
    parseSpacingProperties(pPr, style)

    // 缩进 <w:ind .../>
    parseIndentProperties(pPr, style)

    // 段落底纹 <w:shd .../>
    const shdEl = getFirstChildByTag(pPr, NS.w, 'shd')
    if (shdEl) {
      const fill = resolveShdFill(shdEl, this.theme)
      // 显式赋值（含空字符串），以覆盖继承的 paragraphColor
      style.paragraphColor = fill ?? ''
    }

    // 标题级别 <w:outlineLvl w:val="0"/> (0=一级标题)
    const outlineLvlEl = getFirstChildByTag(pPr, NS.w, 'outlineLvl')
    if (outlineLvlEl) {
      const val = getWVal(outlineLvlEl)
      if (val !== null) {
        const level = parseInt(val, 10)
        if (level >= 0 && level <= 5) {
          style.titleLevel = level + 1
        }
      }
    }

    // 编号引用 <w:numPr><w:numId w:val="1"/><w:ilvl w:val="0"/></w:numPr>
    const numPrEl = getFirstChildByTag(pPr, NS.w, 'numPr')
    if (numPrEl) {
      const numIdEl = getFirstChildByTag(numPrEl, NS.w, 'numId')
      const ilvlEl = getFirstChildByTag(numPrEl, NS.w, 'ilvl')
      if (numIdEl) {
        style.numId = getWVal(numIdEl) ?? undefined
      }
      if (ilvlEl) {
        const levelVal = getWVal(ilvlEl)
        if (levelVal !== null) {
          style.listLevel = parseInt(levelVal, 10)
        }
      }
    }

    // 制表符停止位 <w:tabs><w:tab .../></w:tabs>
    const tabsEl = getFirstChildByTag(pPr, NS.w, 'tabs')
    if (tabsEl) {
      style.tabStops = parseTabStops(tabsEl)
    }

    return style
  }

  /**
   * 解析 Run 属性 <w:rPr>，返回局部 RunStyle（不含继承链）
   */
  parseRunProperties(rPr: Element): RunStyle {
    const style: RunStyle = {}

    // 粗体 <w:b/>
    if (hasChild(rPr, NS.w, 'b')) {
      const bEl = getFirstChildByTag(rPr, NS.w, 'b')
      const val = bEl ? getWVal(bEl) : null
      style.bold = val !== '0' && val !== 'false'
    }

    // 斜体 <w:i/>
    if (hasChild(rPr, NS.w, 'i')) {
      const iEl = getFirstChildByTag(rPr, NS.w, 'i')
      const val = iEl ? getWVal(iEl) : null
      style.italic = val !== '0' && val !== 'false'
    }

    // 下划线 <w:u w:val="single"/> / <w:u w:val="none"/>
    // 必须显式设置 false，否则子样式无法覆盖父样式的 underline:true
    const uEl = getFirstChildByTag(rPr, NS.w, 'u')
    if (uEl) {
      const val = getWVal(uEl)
      style.underline = val !== 'none' && val !== '0'
    }

    // 删除线 <w:strike/>
    if (hasChild(rPr, NS.w, 'strike')) {
      const sEl = getFirstChildByTag(rPr, NS.w, 'strike')
      const val = sEl ? getWVal(sEl) : null
      style.strikeout = val !== '0' && val !== 'false'
    }

    // 字号 <w:sz w:val="24"/>（半磅）；备选 <w:szCs>（复杂脚本字号）
    const szEl = getFirstChildByTag(rPr, NS.w, 'sz') ??
      getFirstChildByTag(rPr, NS.w, 'szCs')
    if (szEl) {
      const val = getWVal(szEl)
      if (val) style.size = halfPtToPx(parseInt(val, 10))
    }

    // 字体 <w:rFonts .../>
    const rFontsEl = getFirstChildByTag(rPr, NS.w, 'rFonts')
    if (rFontsEl) {
      style.font = resolveRunFont(rFontsEl, this.theme)
    }

    // 颜色 <w:color w:val="FF0000"/> 或 w:themeColor
    const colorEl = getFirstChildByTag(rPr, NS.w, 'color')
    if (colorEl) {
      style.color = resolveRunColor(colorEl, this.theme)
    }

    // 高亮 <w:highlight w:val="yellow"/>
    const highlightEl = getFirstChildByTag(rPr, NS.w, 'highlight')
    if (highlightEl) {
      const val = getWVal(highlightEl)
      if (val && val !== 'none') {
        style.highlight = HIGHLIGHT_COLOR_MAP[val] ?? `#${val}`
      }
    }

    // Run 级底纹 <w:shd .../> → 视为高亮背景色
    if (!style.highlight) {
      const shdEl = getFirstChildByTag(rPr, NS.w, 'shd')
      if (shdEl) {
        const fill = resolveShdFill(shdEl, this.theme)
        if (fill) style.highlight = fill
      }
    }

    // 字符间距 <w:spacing w:val="20"/>（单位 twip，正值加宽，负值收紧）
    const charSpacingEl = getFirstChildByTag(rPr, NS.w, 'spacing')
    if (charSpacingEl) {
      const val = getWVal(charSpacingEl)
      if (val) {
        const twip = parseInt(val, 10)
        const px = twipToPx(twip)
        // 仅在明显可感知时应用（过小的微调值忽略，避免 WPS 打印调整干扰）
        if (Math.abs(px) >= 0.5) {
          style.letterSpacing = px
        }
      }
    }

    // 上标 / 下标 <w:vertAlign w:val="superscript"/>
    const vertAlignEl = getFirstChildByTag(rPr, NS.w, 'vertAlign')
    if (vertAlignEl) {
      const val = getWVal(vertAlignEl)
      if (val === 'superscript' || val === 'subscript') {
        style.vertAlign = val
      }
    }

    return style
  }

  /**
   * 根据 styleId 解析完整样式（含 docDefaults + 完整继承链）
   */
  resolveStyle(styleId: string | null): ResolvedStyle {
    const result: ResolvedStyle = {
      paragraph: { ...this.defaultParagraphStyle },
      run: { ...this.defaultRunStyle }
    }
    if (!styleId) return result

    // 收集继承链（从当前 styleId 向上追溯，unshift 保证从祖先到子的顺序）
    const chain: StyleDefinition[] = []
    let currentId: string | null = styleId
    const visited = new Set<string>()

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId)
      const def = this.styleMap.get(currentId)
      if (!def) break
      chain.unshift(def) // 祖先排前面
      currentId = def.basedOnId
    }

    // 从祖先到子依次合并，后者覆盖前者
    for (const def of chain) {
      mergeInto(result.paragraph, def.paragraphStyle)
      mergeInto(result.run, def.runStyle)
    }

    return result
  }

  getDefaultRunStyle(): RunStyle {
    return { ...this.defaultRunStyle }
  }

  getDefaultParagraphStyle(): ParagraphStyle {
    return { ...this.defaultParagraphStyle }
  }

  // ---- 私有方法 ----

  private parseStylesXml(xml: string): void {
    const doc = parseXml(xml)
    const root = doc.documentElement

    // docDefaults
    const docDefaultsEl = getFirstChildByTag(root, NS.w, 'docDefaults')
    if (docDefaultsEl) {
      this.parseDocDefaults(docDefaultsEl)
    }

    // 所有 <w:style> 元素
    const styleEls = root.getElementsByTagNameNS(NS.w, 'style')
    for (let i = 0; i < styleEls.length; i++) {
      this.parseStyleElement(styleEls[i])
    }
  }

  private parseDocDefaults(docDefaultsEl: Element): void {
    const rPrDefaultEl = getFirstChildByTag(docDefaultsEl, NS.w, 'rPrDefault')
    if (rPrDefaultEl) {
      const rPrEl = getFirstChildByTag(rPrDefaultEl, NS.w, 'rPr')
      if (rPrEl) {
        this.defaultRunStyle = this.parseRunProperties(rPrEl)
      }
    }

    const pPrDefaultEl = getFirstChildByTag(docDefaultsEl, NS.w, 'pPrDefault')
    if (pPrDefaultEl) {
      const pPrEl = getFirstChildByTag(pPrDefaultEl, NS.w, 'pPr')
      if (pPrEl) {
        this.defaultParagraphStyle = this.parseParagraphProperties(pPrEl)
      }
    }
  }

  private parseStyleElement(styleEl: Element): void {
    const id = styleEl.getAttributeNS(NS.w, 'styleId')
      ?? styleEl.getAttribute('w:styleId')
      ?? styleEl.getAttribute('styleId')
      ?? ''
    if (!id) return

    const nameEl = getFirstChildByTag(styleEl, NS.w, 'name')
    const name = getWVal(nameEl) ?? ''
    const basedOnEl = getFirstChildByTag(styleEl, NS.w, 'basedOn')
    const basedOnId = getWVal(basedOnEl)

    let paragraphStyle: ParagraphStyle = {}
    let runStyle: RunStyle = {}

    const pPrEl = getFirstChildByTag(styleEl, NS.w, 'pPr')
    if (pPrEl) {
      paragraphStyle = this.parseParagraphProperties(pPrEl)
    }

    // 通过样式名称兜底检测标题级别
    if (paragraphStyle.titleLevel === undefined) {
      const level = detectHeadingLevel(name, id)
      if (level !== undefined) {
        paragraphStyle.titleLevel = level
      }
    }

    const rPrEl = getFirstChildByTag(styleEl, NS.w, 'rPr')
    if (rPrEl) {
      runStyle = this.parseRunProperties(rPrEl)
    }

    this.styleMap.set(id, { id, name, basedOnId, paragraphStyle, runStyle })
  }
}

// ---- 段落属性解析工具函数 ----

function parseSpacingProperties(pPr: Element, style: ParagraphStyle): void {
  const spacingEl = getFirstChildByTag(pPr, NS.w, 'spacing')
  if (!spacingEl) return

  const before = spacingEl.getAttributeNS(NS.w, 'before') ?? spacingEl.getAttribute('w:before')
  const after = spacingEl.getAttributeNS(NS.w, 'after') ?? spacingEl.getAttribute('w:after')
  const line = spacingEl.getAttributeNS(NS.w, 'line') ?? spacingEl.getAttribute('w:line')
  const lineRule = spacingEl.getAttributeNS(NS.w, 'lineRule') ?? spacingEl.getAttribute('w:lineRule')

  if (before) style.spacingBefore = twipToPx(parseInt(before, 10))
  if (after) style.spacingAfter = twipToPx(parseInt(after, 10))

  if (line) {
    const lineVal = parseInt(line, 10)
    if (!lineRule || lineRule === 'auto') {
      // auto：line / 240 = 行高倍率（240 = 单倍行距）
      style.lineHeight = lineVal / 240
      style.lineHeightRule = 'auto'
    } else if (lineRule === 'exact') {
      // exact：绝对行高（twip），内容不可超出
      style.lineHeight = twipToPx(lineVal)
      style.lineHeightRule = 'exact'
    } else if (lineRule === 'atLeast') {
      // atLeast：最小行高（twip），实际可更大
      style.lineHeight = twipToPx(lineVal)
      style.lineHeightRule = 'atLeast'
    }
  }
}

function parseIndentProperties(pPr: Element, style: ParagraphStyle): void {
  const indEl = getFirstChildByTag(pPr, NS.w, 'ind')
  if (!indEl) return

  const left = indEl.getAttributeNS(NS.w, 'left') ?? indEl.getAttribute('w:left')
  const right = indEl.getAttributeNS(NS.w, 'right') ?? indEl.getAttribute('w:right')
  const firstLine = indEl.getAttributeNS(NS.w, 'firstLine') ?? indEl.getAttribute('w:firstLine')
  const hanging = indEl.getAttributeNS(NS.w, 'hanging') ?? indEl.getAttribute('w:hanging')

  const leftPx = left ? twipToPx(parseInt(left, 10)) : 0
  const hangingPx = hanging ? twipToPx(parseInt(hanging, 10)) : 0

  // WPS 打印微调：left 与 hanging 几乎抵消时（净缩进 < 2px）忽略两者
  if (left && hanging && Math.abs(leftPx - hangingPx) < 2) {
    return
  }

  if (left) style.indentLeft = leftPx
  if (right) style.indentRight = twipToPx(parseInt(right, 10))

  if (firstLine) {
    // 首行缩进（在 indentLeft 基础上额外增加）
    style.firstLineIndent = twipToPx(parseInt(firstLine, 10))
  } else if (hanging) {
    // 悬挂缩进：indentLeft 需加上 hanging，首行为负缩进
    style.indentLeft = (leftPx + hangingPx)
    style.firstLineIndent = -hangingPx
  }
}

function parseTabStops(tabsEl: Element): Array<{ pos: number; type: string }> {
  const stops: Array<{ pos: number; type: string }> = []
  const tabEls = tabsEl.getElementsByTagNameNS(NS.w, 'tab')
  for (let i = 0; i < tabEls.length; i++) {
    const tabEl = tabEls[i]
    const val = tabEl.getAttributeNS(NS.w, 'val') ?? tabEl.getAttribute('w:val') ?? 'left'
    const pos = tabEl.getAttributeNS(NS.w, 'pos') ?? tabEl.getAttribute('w:pos')
    if (pos) {
      stops.push({ pos: twipToPx(parseInt(pos, 10)), type: val })
    }
  }
  return stops
}

// ---- Run 属性解析工具函数 ----

function resolveRunFont(rFontsEl: Element, theme: ThemeData): string | undefined {
  // 优先东亚字体（中文文档）
  const eastAsia = rFontsEl.getAttributeNS(NS.w, 'eastAsia') ?? rFontsEl.getAttribute('w:eastAsia')
  if (eastAsia) return normalizeFont(eastAsia)

  // 西文字体
  const ascii = rFontsEl.getAttributeNS(NS.w, 'ascii') ?? rFontsEl.getAttribute('w:ascii')
  if (ascii) return normalizeFont(ascii)

  const hAnsi = rFontsEl.getAttributeNS(NS.w, 'hAnsi') ?? rFontsEl.getAttribute('w:hAnsi')
  if (hAnsi) return normalizeFont(hAnsi)

  // 主题字体引用（东亚优先）
  const eastAsiaTheme = rFontsEl.getAttributeNS(NS.w, 'eastAsiaTheme') ?? rFontsEl.getAttribute('w:eastAsiaTheme')
  const asciiTheme = rFontsEl.getAttributeNS(NS.w, 'asciiTheme') ?? rFontsEl.getAttribute('w:asciiTheme')
  const themeFont = resolveThemeFont(theme, eastAsiaTheme ?? asciiTheme)
  if (themeFont) return normalizeFont(themeFont)

  return undefined
}

function resolveRunColor(colorEl: Element, theme: ThemeData): string | undefined {
  const themeColorName = colorEl.getAttributeNS(NS.w, 'themeColor') ?? colorEl.getAttribute('w:themeColor')
  if (themeColorName) {
    const slotName = THEME_COLOR_SEMANTIC_MAP[themeColorName] ?? themeColorName
    const tint = colorEl.getAttributeNS(NS.w, 'themeTint') ?? colorEl.getAttribute('w:themeTint') ?? undefined
    const shade = colorEl.getAttributeNS(NS.w, 'themeShade') ?? colorEl.getAttribute('w:themeShade') ?? undefined
    const resolved = resolveThemeColor(theme, slotName, tint, shade)
    return resolved ?? undefined
  }

  const val = getWVal(colorEl)
  if (!val || val === 'auto') return undefined  // auto → 使用编辑器默认颜色
  return `#${val}`
}

// ---- 底纹填充色解析（段落 shd / 单元格 shd 通用） ----

export function resolveShdFill(shd: Element, theme: ThemeData): string | null {
  const shdVal = shd.getAttributeNS(NS.w, 'val') ?? shd.getAttribute('w:val')

  // nil = 无底纹
  if (shdVal === 'nil') return null

  // solid = 前景色覆盖背景：使用 themeColor 或 w:color
  if (shdVal === 'solid') {
    return resolveShdForegroundColor(shd, theme)
  }

  // 优先使用 themeFill（主题填充色）
  const themeFill = shd.getAttributeNS(NS.w, 'themeFill') ?? shd.getAttribute('w:themeFill')
  if (themeFill) {
    const slotName = THEME_COLOR_SEMANTIC_MAP[themeFill] ?? themeFill
    const tint = shd.getAttributeNS(NS.w, 'themeFillTint') ?? shd.getAttribute('w:themeFillTint') ?? undefined
    const shade = shd.getAttributeNS(NS.w, 'themeFillShade') ?? shd.getAttribute('w:themeFillShade') ?? undefined
    const resolved = resolveThemeColor(theme, slotName, tint, shade)
    if (resolved) {
      return isWhiteOrTransparent(resolved) ? null : resolved
    }
    // themeFill 存在但解析失败：不回退到 w:fill（w:fill 可能是错误的黑色默认值）
    return null
  }

  // 无 themeFill 时使用 w:fill
  const fill = shd.getAttributeNS(NS.w, 'fill') ?? shd.getAttribute('w:fill')
  if (!fill || fill === 'auto') return null
  if (isWhiteOrTransparent(`#${fill}`)) return null
  return `#${fill}`
}

function resolveShdForegroundColor(shd: Element, theme: ThemeData): string | null {
  const themeColor = shd.getAttributeNS(NS.w, 'themeColor') ?? shd.getAttribute('w:themeColor')
  if (themeColor) {
    const slotName = THEME_COLOR_SEMANTIC_MAP[themeColor] ?? themeColor
    const tint = shd.getAttributeNS(NS.w, 'themeTint') ?? shd.getAttribute('w:themeTint') ?? undefined
    const shade = shd.getAttributeNS(NS.w, 'themeShade') ?? shd.getAttribute('w:themeShade') ?? undefined
    const resolved = resolveThemeColor(theme, slotName, tint, shade)
    if (resolved) return isWhiteOrTransparent(resolved) ? null : resolved
    return null
  }
  const color = shd.getAttributeNS(NS.w, 'color') ?? shd.getAttribute('w:color')
  if (!color || color === 'auto') return null
  if (isWhiteOrTransparent(`#${color}`)) return null
  return `#${color}`
}

function isWhiteOrTransparent(color: string): boolean {
  const c = color.toUpperCase().replace('#', '')
  return c === 'FFFFFF' || c === 'FFF' || c === 'AUTO'
}

// ---- 标题级别检测 ----

function detectHeadingLevel(styleName: string, styleId: string): number | undefined {
  const patterns = [
    /^heading\s*(\d+)$/i,
    /^标题\s*(\d+)$/,
  ]
  for (const re of patterns) {
    const m = styleName.match(re) ?? styleId.match(re)
    if (m) {
      const level = parseInt(m[1], 10)
      if (level >= 1 && level <= 6) return level
    }
  }
  return undefined
}

// ---- 工具函数 ----

/**
 * 将 source 中非 undefined 的属性合并到 target（浅合并，source 覆盖 target）
 */
function mergeInto<T extends object>(target: T, source: Partial<T>): void {
  for (const key of Object.keys(source) as Array<keyof T>) {
    if (source[key] !== undefined) {
      target[key] = source[key]!
    }
  }
}
