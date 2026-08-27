import { NS, NUM_FMT_MAP, twipToPx } from '../constants'
import { parseXml, getFirstChildByTag, getWVal } from './xml.helper'

interface LevelDefinition {
  numFmt: string
  lvlText: string
  start: number
  indentLeft?: number
  indentHanging?: number
}

interface AbstractNumbering {
  abstractNumId: string
  levels: Map<number, LevelDefinition>
}

interface LevelOverride {
  ilvl: number
  startOverride?: number
  overrideLevelDef?: LevelDefinition
}

interface NumberingReference {
  numId: string
  abstractNumId: string
  levelOverrides: Map<number, LevelOverride>
}

export interface NumberingInfo {
  listType: string
  listStyle: string
  level: number
  indentLeft?: number
  indentHanging?: number
}

/**
 * 列表编号解析器：解析 word/numbering.xml
 *
 * 支持：
 *   - <w:abstractNum>：抽象编号定义（含各级格式）
 *   - <w:num>：具体编号实例（引用 abstractNum）
 *   - <w:lvlOverride>：级别覆盖（如 startOverride 重置起始值）
 */
export class NumberingResolver {
  private abstractNums = new Map<string, AbstractNumbering>()
  private numRefs = new Map<string, NumberingReference>()

  constructor(numberingXml: string | null) {
    if (numberingXml) {
      this.parseNumberingXml(numberingXml)
    }
  }

  /**
   * 根据 numId 和列表层级解析编号信息
   * 返回 null 表示找不到对应定义
   */
  resolve(numId: string, level: number): NumberingInfo | null {
    const numRef = this.numRefs.get(numId)
    if (!numRef) return null

    const abstractNum = this.abstractNums.get(numRef.abstractNumId)
    if (!abstractNum) return null

    // 检查该 num 是否有对应层级的 lvlOverride
    const override = numRef.levelOverrides.get(level)
    if (override?.overrideLevelDef) {
      return this.mapLevelToInfo(override.overrideLevelDef, level)
    }

    // 使用 abstractNum 的级别定义
    const levelDef = abstractNum.levels.get(level)
    if (!levelDef) {
      // 找不到该层级，回退到 level 0
      const fallback = abstractNum.levels.get(0)
      if (!fallback) return null
      return this.mapLevelToInfo(fallback, level)
    }

    return this.mapLevelToInfo(levelDef, level)
  }

  // ---- 私有方法 ----

  private parseNumberingXml(xml: string): void {
    const doc = parseXml(xml)
    const root = doc.documentElement

    this.parseAbstractNums(root)
    this.parseNumReferences(root)
  }

  private parseAbstractNums(root: Element): void {
    const abstractNumEls = root.getElementsByTagNameNS(NS.w, 'abstractNum')
    for (let i = 0; i < abstractNumEls.length; i++) {
      const el = abstractNumEls[i]
      const abstractNumId = el.getAttributeNS(NS.w, 'abstractNumId')
        ?? el.getAttribute('w:abstractNumId')
        ?? ''

      const levels = new Map<number, LevelDefinition>()
      const lvlEls = el.getElementsByTagNameNS(NS.w, 'lvl')

      for (let j = 0; j < lvlEls.length; j++) {
        const lvlEl = lvlEls[j]
        // 只处理直接子 lvl（避免嵌套 abstractNum 干扰）
        if (lvlEl.parentElement !== el) continue

        const ilvlAttr = lvlEl.getAttributeNS(NS.w, 'ilvl') ?? lvlEl.getAttribute('w:ilvl') ?? '0'
        const ilvl = parseInt(ilvlAttr, 10)
        levels.set(ilvl, parseLevelDefinition(lvlEl))
      }

      this.abstractNums.set(abstractNumId, { abstractNumId, levels })
    }
  }

  private parseNumReferences(root: Element): void {
    const numEls = root.getElementsByTagNameNS(NS.w, 'num')
    for (let i = 0; i < numEls.length; i++) {
      const el = numEls[i]
      const numId = el.getAttributeNS(NS.w, 'numId') ?? el.getAttribute('w:numId') ?? ''

      const abstractNumIdEl = getFirstChildByTag(el, NS.w, 'abstractNumId')
      const abstractNumId = getWVal(abstractNumIdEl) ?? ''

      const levelOverrides = new Map<number, LevelOverride>()
      const lvlOverrideEls = el.getElementsByTagNameNS(NS.w, 'lvlOverride')
      for (let j = 0; j < lvlOverrideEls.length; j++) {
        const lvlOverrideEl = lvlOverrideEls[j]
        const ilvlAttr = lvlOverrideEl.getAttributeNS(NS.w, 'ilvl') ?? lvlOverrideEl.getAttribute('w:ilvl') ?? '0'
        const ilvl = parseInt(ilvlAttr, 10)

        const override: LevelOverride = { ilvl }

        // startOverride：覆盖起始编号
        const startOverrideEl = getFirstChildByTag(lvlOverrideEl, NS.w, 'startOverride')
        if (startOverrideEl) {
          const val = getWVal(startOverrideEl)
          if (val) override.startOverride = parseInt(val, 10)
        }

        // lvl：完整级别定义覆盖
        const lvlEl = getFirstChildByTag(lvlOverrideEl, NS.w, 'lvl')
        if (lvlEl) {
          override.overrideLevelDef = parseLevelDefinition(lvlEl)
          if (override.startOverride !== undefined) {
            override.overrideLevelDef.start = override.startOverride
          }
        }

        levelOverrides.set(ilvl, override)
      }

      this.numRefs.set(numId, { numId, abstractNumId, levelOverrides })
    }
  }

  private mapLevelToInfo(levelDef: LevelDefinition, level: number): NumberingInfo {
    const mapped = NUM_FMT_MAP[levelDef.numFmt]
    if (mapped) {
      return {
        listType: mapped.listType,
        listStyle: mapped.listStyle,
        level,
        indentLeft: levelDef.indentLeft,
        indentHanging: levelDef.indentHanging
      }
    }

    // 未映射格式：通过 lvlText 判断是否为项目符号
    if (isBulletLvlText(levelDef.lvlText)) {
      return { listType: 'ul', listStyle: 'disc', level }
    }

    return { listType: 'ol', listStyle: 'decimal', level }
  }
}

// ---- 工具函数 ----

function parseLevelDefinition(lvlEl: Element): LevelDefinition {
  const numFmtEl = getFirstChildByTag(lvlEl, NS.w, 'numFmt')
  const numFmt = getWVal(numFmtEl) ?? 'decimal'

  const lvlTextEl = getFirstChildByTag(lvlEl, NS.w, 'lvlText')
  const lvlText = getWVal(lvlTextEl) ?? ''

  const startEl = getFirstChildByTag(lvlEl, NS.w, 'start')
  const start = startEl ? parseInt(getWVal(startEl) ?? '1', 10) : 1

  // 列表缩进 <w:pPr><w:ind .../>
  let indentLeft: number | undefined
  let indentHanging: number | undefined
  const pPrEl = getFirstChildByTag(lvlEl, NS.w, 'pPr')
  if (pPrEl) {
    const indEl = getFirstChildByTag(pPrEl, NS.w, 'ind')
    if (indEl) {
      const left = indEl.getAttributeNS(NS.w, 'left') ?? indEl.getAttribute('w:left')
      const hanging = indEl.getAttributeNS(NS.w, 'hanging') ?? indEl.getAttribute('w:hanging')
      if (left) indentLeft = twipToPx(parseInt(left, 10))
      if (hanging) indentHanging = twipToPx(parseInt(hanging, 10))
    }
  }

  return { numFmt, lvlText, start, indentLeft, indentHanging }
}

/**
 * 判断 lvlText 是否为项目符号（无序列表）
 * 常见的项目符号字符：'·', 'o', '', '–', '•', '-'
 */
function isBulletLvlText(lvlText: string): boolean {
  if (lvlText === '') return true
  const bulletChars = ['·', 'o', '–', '•', '-', '●', '○', '■', '□', '◆', '◇', '★', '☆']
  return bulletChars.includes(lvlText.trim())
}
