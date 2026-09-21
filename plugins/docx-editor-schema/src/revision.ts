import type { IElement, ITextElement } from './types'

export interface RevisionMeta {
  revisionId: string
  revisionType: 'insert' | 'delete' | 'format'
  revisionAuthor: string
  revisionDate: string
}

type FormatValue = string | number | boolean | null
export type RevisionFormat = Record<string, FormatValue>

const FORMAT_KEYS = [
  'font', 'size', 'bold', 'italic', 'underline', 'strikeout', 'doubleStrikeout',
  'hidden', 'superscript', 'subscript', 'color', 'highlight', 'characterScale',
  'letterSpacing', 'textDecoration', 'characterStyleId', 'paragraphStyleId',
  'paragraphColor', 'rowFlex', 'lineHeight', 'lineHeightRule', 'rowMargin',
  'paragraphIndentLeft', 'paragraphIndentRight', 'paragraphFirstLineIndent',
  'indentHanging', 'paragraphSpacingBefore', 'paragraphSpacingAfter'
] as const

const BOOLEAN_TAGS = {
  bold: 'b', italic: 'i', strikeout: 'strike', doubleStrikeout: 'dstrike', hidden: 'vanish'
} as const

export function snapshotRevisionFormat(element: IElement): RevisionFormat {
  const source = element as unknown as Record<string, unknown>
  return Object.fromEntries(FORMAT_KEYS.map(key => [key, source[key] ?? null])) as RevisionFormat
}

export function clearRevision(element: IElement): void {
  const run = element as ITextElement
  delete run.revisionId
  delete run.revisionType
  delete run.revisionAuthor
  delete run.revisionDate
  delete run.revisionOldRPr
  if (run.extension) {
    // Do not mutate extension objects that may be shared by split runs.
    const extension = { ...run.extension }
    delete extension.revisionOldProps
    delete extension.revisionPrevious
    if (Object.keys(extension).length) run.extension = extension
    else delete run.extension
  }
}

function decodeXml(value: string): string {
  return value.replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
}

function escapeXml(value: FormatValue): string {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function readRunProperties(xml: string): RevisionFormat {
  const result: RevisionFormat = {}
  const tag = (name: string) => xml.match(new RegExp(`<(?:\\w+:)?${name}(?=[\\s/>])([^>]*)>`))?.[1]
  const attr = (source: string | undefined, name = 'val') =>
    source?.match(new RegExp(`(?:^|\\s)(?:\\w+:)?${name}\\s*=\\s*["']([^"']*)["']`))?.[1]
  for (const [key, name] of Object.entries(BOOLEAN_TAGS)) {
    const source = tag(name)
    result[key] = source === undefined ? null : !/^(0|false|off)$/.test(attr(source) ?? '')
  }
  const underline = tag('u')
  result.underline = underline === undefined ? null : attr(underline) !== 'none'
  result.textDecoration = underline === undefined ? null : ({
    single: 'solid', double: 'double', dash: 'dashed', dotted: 'dotted', wave: 'wavy'
  } as Record<string, string>)[attr(underline) ?? 'single'] ?? 'solid'
  const fonts = tag('rFonts')
  const font = attr(fonts, 'eastAsia') ?? attr(fonts, 'ascii') ?? attr(fonts, 'hAnsi')
  result.font = font === undefined ? null : decodeXml(font)
  for (const [key, name, scale] of [
    ['size', 'sz', 0.5], ['characterScale', 'w', 1], ['letterSpacing', 'spacing', 1 / 15]
  ] as const) {
    const value = attr(tag(name))
    result[key] = value !== undefined && Number.isFinite(Number(value)) ? Number(value) * scale : null
  }
  const color = attr(tag('color'))
  result.color = color && color !== 'auto' ? `#${color}` : null
  result.highlight = attr(tag('highlight')) ?? null
  result.characterStyleId = attr(tag('rStyle')) ?? null
  const vertical = attr(tag('vertAlign'))
  result.superscript = vertical === 'superscript' ? true : null
  result.subscript = vertical === 'subscript' ? true : null
  return result
}

export function getRevisionOldProps(element: IElement): RevisionFormat {
  const stored = element.extension?.revisionOldProps
  if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
    const source = stored as Record<string, unknown>
    const result: RevisionFormat = {}
    for (const key of FORMAT_KEYS) {
      if (!Object.prototype.hasOwnProperty.call(source, key)) continue
      const value = source[key]
      if (value == null || ['string', 'number', 'boolean'].includes(typeof value)) {
        result[key] = (value ?? null) as FormatValue
      }
    }
    return result
  }
  const xml = (element as ITextElement).revisionOldRPr
  return xml === undefined ? {} : readRunProperties(xml)
}

function serializeRunProperties(format: RevisionFormat): string {
  const parts: string[] = []
  const add = (tag: string, value: FormatValue) => {
    if (value !== null && value !== undefined) parts.push(`<w:${tag} w:val="${escapeXml(value)}"/>`)
  }
  for (const [key, tag] of Object.entries(BOOLEAN_TAGS)) {
    if (format[key] != null) add(tag, format[key] ? 1 : 0)
  }
  if (format.font != null) {
    const font = escapeXml(format.font)
    parts.push(`<w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:eastAsia="${font}"/>`)
  }
  if (typeof format.size === 'number') add('sz', format.size * 2)
  if (typeof format.letterSpacing === 'number') add('spacing', Math.round(format.letterSpacing * 15))
  add('w', format.characterScale)
  add('rStyle', format.characterStyleId)
  add('color', typeof format.color === 'string' ? format.color.replace(/^#/, '') : null)
  add('highlight', format.highlight)
  if (format.underline != null) {
    const style = ({ solid: 'single', double: 'double', dashed: 'dash', dotted: 'dotted', wavy: 'wave' } as Record<string, string>)[String(format.textDecoration)] ?? 'single'
    add('u', format.underline ? style : 'none')
  }
  if (format.superscript || format.subscript) add('vertAlign', format.superscript ? 'superscript' : 'subscript')
  return parts.join('')
}

export function recordFormatRevision(element: IElement, before: RevisionFormat, meta: RevisionMeta): void {
  const run = element as ITextElement
  // A run has one revision slot: formatting must not replace insertion/deletion identity.
  if (run.revisionType === 'insert' || run.revisionType === 'delete') return
  const after = snapshotRevisionFormat(element)
  const changed = FORMAT_KEYS.filter(key => before[key] !== after[key])
  if (!changed.length) return
  const existing = run.revisionType === 'format'
  const oldProps = existing ? getRevisionOldProps(element) : {}
  for (const key of changed) {
    if (!(key in oldProps)) oldProps[key] = before[key] ?? null
  }
  if (Object.entries(oldProps).every(([key, value]) => after[key] === value)) {
    clearRevision(element)
    return
  }
  if (!existing) {
    Object.assign(run, meta)
    run.revisionOldRPr = serializeRunProperties(before)
  }
  run.extension = { ...run.extension, revisionOldProps: oldProps }
}

export function restoreRevisionFormat(element: IElement): void {
  const target = element as unknown as Record<string, unknown>
  for (const [key, value] of Object.entries(getRevisionOldProps(element))) {
    if (value === null) delete target[key]
    else target[key] = value
  }
}
