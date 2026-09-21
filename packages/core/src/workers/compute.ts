import { walkTree } from '@vervedoc/docx-editor-schema'
import type { IElement, ITitleElement, ITextElement, PathSegment } from '@vervedoc/docx-editor-schema'

const levelMap: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6 }

export function computeToc(elements: IElement[]) {
  const toc: { id: string; level: number; name: string; number?: string }[] = []
  const counters = new Map<string, number>()
  walkTree(elements, (node, ctx) => {
    if (node.type !== 'title') return
    const t = node as ITitleElement
    const name = (t.valueList ?? []).map(v => v.type === 'text' ? (v as ITextElement).value : '').join('')
    const level = levelMap[t.level] ?? 1
    let number: string | undefined
    const num = (t as unknown as { listNumbering?: { numFmt: string; lvlText: string; start: number; numId?: string; abstractNumId?: string; level?: number } }).listNumbering
    if (num && num.numFmt !== 'bullet') {
      const numId = num.numId ?? num.abstractNumId ?? 'default'
      const numLevel = num.level ?? 0
      const key = `${numId}:${numLevel}`
      const prev = counters.get(key)
      const current = (prev == null ? (num.start ?? 1) - 1 : prev) + 1
      counters.set(key, current)
      for (const k of counters.keys()) {
        if (k.startsWith(`${numId}:`) && Number(k.slice(numId.length + 1)) > numLevel) counters.delete(k)
      }
      number = (num.lvlText ?? '%1.').replace(/%([1-9])/g, (_, d: string) => {
        const lvl = Number(d) - 1
        return String(lvl === numLevel ? current : counters.get(`${numId}:${lvl}`) ?? (num.start ?? 1))
      })
    }
    toc.push({ id: JSON.stringify(ctx.path), level, name, number })
  })
  return { toc }
}

export function computeSearch(elements: IElement[], keyword: string) {
  const results: { path: PathSegment[]; offset: number; length: number }[] = []
  if (!keyword) return { results, count: 0 }
  const lowerKeyword = keyword.toLowerCase()
  walkTree(elements, (node, ctx) => {
    if (node.type !== 'text') return
    const text = ((node as ITextElement).value || '').toLowerCase()
    let idx = text.indexOf(lowerKeyword)
    while (idx !== -1) {
      results.push({ path: [...ctx.path], offset: idx, length: keyword.length })
      idx = text.indexOf(lowerKeyword, idx + 1)
    }
  })
  return { results, count: results.length }
}
