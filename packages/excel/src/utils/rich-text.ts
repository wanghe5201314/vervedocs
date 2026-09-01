import { BooleanNumber, type IDocumentData, type ITextRun } from '@univerjs/core'
import type { ICellRichTextRun, ICellStyle } from '@vervedoc/excel-parser'

function normalizeColor(color?: string): string | undefined {
  const value = String(color || '').trim()
  if (!value) return
  return value.startsWith('#') ? value : `#${value}`
}

function runToTextStyle(run: ICellRichTextRun) {
  const ts: Record<string, any> = {}
  if (run.fontFamily) ts.ff = run.fontFamily
  if (Number.isFinite(run.fontSize)) ts.fs = Number(run.fontSize)
  if (run.bold !== undefined) ts.bl = run.bold ? BooleanNumber.TRUE : BooleanNumber.FALSE
  if (run.italic !== undefined) ts.it = run.italic ? BooleanNumber.TRUE : BooleanNumber.FALSE
  if (run.underline) ts.ul = { s: BooleanNumber.TRUE }
  if (run.strikethrough) ts.st = { s: BooleanNumber.TRUE }
  const color = normalizeColor(run.fontColor)
  if (color) ts.cl = { rgb: color }
  return Object.keys(ts).length ? ts : undefined
}

function textStyleToRun(text: string, ts?: Record<string, any>): ICellRichTextRun {
  const run: ICellRichTextRun = { text }
  if (!ts) return run
  if (ts.ff) run.fontFamily = String(ts.ff)
  if (Number.isFinite(ts.fs)) run.fontSize = Number(ts.fs)
  if (ts.bl !== undefined) run.bold = ts.bl === BooleanNumber.TRUE
  if (ts.it !== undefined) run.italic = ts.it === BooleanNumber.TRUE
  if (ts.ul?.s === BooleanNumber.TRUE) run.underline = true
  if (ts.st?.s === BooleanNumber.TRUE) run.strikethrough = true
  const color = normalizeColor(ts.cl?.rgb)
  if (color) run.fontColor = color
  return run
}

export function internalRichTextToUniver(
  runs: ICellRichTextRun[],
  cellKey: string,
): IDocumentData {
  const plainText = runs.map((run) => run.text).join('')
  const dataStream = `${plainText}\r\n`
  const textRuns: ITextRun[] = []
  let offset = 0
  runs.forEach((run) => {
    const length = run.text.length
    if (!length) return
    const ts = runToTextStyle(run)
    if (ts) {
      textRuns.push({
        st: offset,
        ed: offset + length,
        ts,
      })
    }
    offset += length
  })
  return {
    id: cellKey.replace(':', '_'),
    body: {
      dataStream,
      textRuns: textRuns.length ? textRuns : undefined,
    },
    documentStyle: {
      pageSize: { width: 0, height: 0 },
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
    },
  }
}

export function univerRichTextToInternal(document?: IDocumentData | null): ICellRichTextRun[] | undefined {
  const dataStream = String(document?.body?.dataStream || '')
  if (!dataStream) return
  const plainText = dataStream.replace(/\r\n$/, '').replace(/\n$/, '')
  const textRuns = Array.isArray(document?.body?.textRuns) ? document!.body!.textRuns! : []
  if (!plainText) return
  if (!textRuns.length) return [{ text: plainText }]

  const runs: ICellRichTextRun[] = []
  let cursor = 0
  const sorted = [...textRuns].sort((a, b) => Number(a.st) - Number(b.st))
  sorted.forEach((item) => {
    const start = Math.max(0, Number(item.st))
    const end = Math.max(start, Number(item.ed))
    if (start > cursor) {
      runs.push({ text: plainText.slice(cursor, start) })
    }
    const text = plainText.slice(start, end)
    if (text) runs.push(textStyleToRun(text, item.ts as Record<string, any> | undefined))
    cursor = end
  })
  if (cursor < plainText.length) {
    runs.push({ text: plainText.slice(cursor) })
  }
  return runs.length ? runs : undefined
}

export function stripRunLevelFontStyle(style?: ICellStyle): ICellStyle | undefined {
  if (!style) return
  const next = { ...style }
  delete next.bold
  delete next.italic
  delete next.underline
  delete next.strikethrough
  delete next.fontFamily
  delete next.fontSize
  delete next.fontColor
  return Object.keys(next).length ? next : undefined
}
