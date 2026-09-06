import type { IParagraphStyle, IListNumbering, IDocxTheme } from '@vervedoc/docx-editor-schema'

interface ValWrapper<T = string | number | boolean> {
  val?: T
}

interface RFonts {
  ascii?: string
  eastAsia?: string
  hAnsi?: string
  cs?: string
  asciiTheme?: string
  hAnsiTheme?: string
  csTheme?: string
  eastAsiaTheme?: string
}

interface RPr {
  rFonts?: RFonts
  sz?: ValWrapper<number>
  b?: ValWrapper<boolean> | Record<string, never>
  i?: ValWrapper<boolean> | Record<string, never>
  color?: ValWrapper<string>
}

interface Ind {
  left?: number
  hanging?: number
  firstLine?: number
}

interface Spacing {
  line?: number
  lineRule?: string
  before?: number
  after?: number
}

interface PPr {
  ind?: Ind
  spacing?: Spacing
  jc?: ValWrapper<string>
}

interface StyleEntry {
  styleId?: string
  type?: string
  name?: ValWrapper<string>
  basedOn?: ValWrapper<string>
  pPr?: PPr
  rPr?: RPr
}

interface StylesPOJO {
  style?: StyleEntry[]
  docDefaults?: {
    rPrDefault?: { rPr?: RPr }
    pPrDefault?: { pPr?: PPr }
  }
}

interface LevelEntry {
  ilvl?: string
  start?: ValWrapper<number>
  numFmt?: ValWrapper<string>
  lvlText?: ValWrapper<string>
  lvlJc?: ValWrapper<string>
  pPr?: {
    ind?: Ind
  }
}

interface AbstractNumEntry {
  abstractNumId?: string
  lvl?: LevelEntry[]
}

interface NumEntry {
  numId?: string
  abstractNumId?: ValWrapper<string>
}

interface NumberingPOJO {
  abstractNum?: AbstractNumEntry[]
  num?: NumEntry[]
}

interface ClrEntry {
  srgbClr?: ValWrapper<string>
  sysClr?: ValWrapper<string>
}

interface ThemePOJO {
  themeElements?: {
    clrScheme?: Record<string, ClrEntry>
    fontScheme?: {
      majorFont?: { latin?: { typeface?: string } }
      minorFont?: { latin?: { typeface?: string } }
    }
  }
}

const TWIP_TO_PX = 1 / 15
const HALF_PT_TO_PT = 0.5

function unwrap<T>(v: ValWrapper<T> | undefined): T | undefined {
  return v?.val as T | undefined
}

function isPresent(v: object | undefined | null): boolean {
  return v != null && typeof v === 'object'
}

export function adaptStyles(raw: unknown): Record<string, IParagraphStyle> | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const pojo = raw as StylesPOJO
  const result: Record<string, IParagraphStyle> = {}

  const defaults = pojo.docDefaults
  if (defaults?.rPrDefault?.rPr) {
    const dr = defaults.rPrDefault.rPr
    if (dr.rFonts?.ascii) result['__default__'] = { id: '__default__', font: dr.rFonts.ascii, size: unwrap(dr.sz) ? unwrap(dr.sz)! * HALF_PT_TO_PT : undefined }
  }

  for (const s of pojo.style ?? []) {
    if (!s.styleId) continue
    const id = s.styleId
    const entry: IParagraphStyle = { id }
    if (s.name?.val) entry.name = s.name.val
    if (s.basedOn?.val) entry.basedOn = s.basedOn.val
    if (s.rPr) {
      const r = s.rPr
      if (r.rFonts?.ascii) entry.font = r.rFonts.ascii
      else if (r.rFonts?.eastAsia) entry.font = r.rFonts.eastAsia
      const sz = unwrap(r.sz)
      if (sz != null) entry.size = sz * HALF_PT_TO_PT
      if (isPresent(r.b)) entry.bold = unwrap(r.b as ValWrapper<boolean>) ?? true
      const color = unwrap(r.color)
      if (color) entry.color = color
    }
    if (s.pPr) {
      const p = s.pPr
      if (p.ind?.firstLine != null) entry.paragraphFirstLineIndent = p.ind.firstLine * TWIP_TO_PX
      if (p.ind?.left != null) entry.paragraphIndentLeft = p.ind.left * TWIP_TO_PX
      if (p.spacing?.before != null) entry.paragraphSpacingBefore = p.spacing.before * TWIP_TO_PX
      if (p.spacing?.after != null) entry.paragraphSpacingAfter = p.spacing.after * TWIP_TO_PX
      if (p.spacing?.line != null) entry.lineHeight = p.spacing.line / 240
      if (p.spacing?.lineRule) entry.lineHeightRule = p.spacing.lineRule as 'auto' | 'exact' | 'atLeast'
      if (p.jc?.val) entry.rowFlex = p.jc.val as any
    }
    result[id] = entry
  }

  return Object.keys(result).length > 0 ? result : undefined
}

export function adaptNumbering(raw: unknown): Record<string, IListNumbering> | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const pojo = raw as NumberingPOJO
  const abstractMap = new Map<string, AbstractNumEntry>()
  for (const a of pojo.abstractNum ?? []) {
    if (a.abstractNumId != null) abstractMap.set(a.abstractNumId, a)
  }

  const result: Record<string, IListNumbering> = {}
  for (const n of pojo.num ?? []) {
    if (!n.numId) continue
    const absId = unwrap(n.abstractNumId)
    if (absId == null) continue
    const abs = abstractMap.get(absId)
    if (!abs?.lvl) continue

    for (const lvl of abs.lvl) {
      const level = parseInt(lvl.ilvl ?? '0', 10)
      const key = level === 0 ? n.numId : `${n.numId}:${level}`
      result[key] = {
        numId: n.numId,
        abstractNumId: absId,
        level,
        numFmt: unwrap(lvl.numFmt) ?? 'decimal',
        lvlText: unwrap(lvl.lvlText) ?? '',
        start: unwrap(lvl.start) ?? 1,
        indentLeft: (lvl.pPr?.ind?.left ?? 0) * TWIP_TO_PX,
        indentHanging: (lvl.pPr?.ind?.hanging ?? 0) * TWIP_TO_PX,
        lvlJc: (unwrap(lvl.lvlJc) as 'left' | 'center' | 'right') ?? 'left',
      }
    }
  }

  return Object.keys(result).length > 0 ? result : undefined
}

export function adaptTheme(raw: unknown): IDocxTheme | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const pojo = raw as ThemePOJO
  const te = pojo.themeElements
  if (!te) return undefined

  const theme: IDocxTheme = {}

  if (te.fontScheme) {
    theme.fontScheme = {
      majorFont: te.fontScheme.majorFont?.latin?.typeface,
      minorFont: te.fontScheme.minorFont?.latin?.typeface,
    }
  }

  if (te.clrScheme) {
    const cs: Record<string, string> = {}
    for (const [key, entry] of Object.entries(te.clrScheme)) {
      const color = entry.srgbClr?.val ?? entry.sysClr?.val
      if (color) cs[key] = color
    }
    if (Object.keys(cs).length > 0) theme.colorScheme = cs
  }

  return Object.keys(theme).length > 0 ? theme : undefined
}