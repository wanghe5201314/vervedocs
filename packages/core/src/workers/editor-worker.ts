/// <reference lib="webworker" />

/**
 * VerveDocs Core —— 编辑器 Worker 核心引擎
 *
 * 在后台线程执行耗时计算：目录生成、搜索、文档树深拷贝。
 * Worker 主动推送计算结果，主线程通过监听器订阅。
 */

import { walkTree, cloneTree } from '@vervedoc/docx-editor-schema'
import type { IElement, ITitleElement, ITextElement, PathSegment } from '@vervedoc/docx-editor-schema'

/** 主线程 → Worker 消息 */
type WorkerRequest =
  | { type: 'update'; elements: IElement[] }
  | { type: 'search'; keyword: string }
  | { type: 'clone'; data: unknown }

/** Worker → 主线程 消息 */
type WorkerResponse =
  | { type: 'toc-result'; toc: { id: string; level: number; name: string; number?: string }[] }
  | { type: 'search-result'; results: { path: PathSegment[]; offset: number; length: number }[]; count: number }
  | { type: 'clone-result'; data: unknown }
  | { type: 'error'; message: string }

/** 当前文档元素列表 */
let currentElements: IElement[] | null = null

/** 标题级别映射 */
const levelMap: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6 }

/** 向主线程发送消息 */
function post(msg: WorkerResponse): void {
  ;(self as unknown as { postMessage: (msg: WorkerResponse) => void }).postMessage(msg)
}

/** 计算目录并推送结果 */
function computeToc(): void {
  if (!currentElements || currentElements.length === 0) {
    post({ type: 'toc-result', toc: [] })
    return
  }
  const toc: { id: string; level: number; name: string; number?: string }[] = []
  // 编号计数器：key = `${numId}:${level}` → current count
  const counters = new Map<string, number>()
  walkTree(currentElements, (node, ctx) => {
    if (node.type === 'title') {
      const t = node as ITitleElement
      const name = (t.valueList ?? []).map(v => v.type === 'text' ? (v as ITextElement).value : '').join('')
      const level = levelMap[t.level] ?? 1
      // 从 listNumbering 计算编号文本
      let number: string | undefined
      const num = (t as unknown as { listNumbering?: { numFmt: string; lvlText: string; start: number; numId?: string; abstractNumId?: string; level?: number } }).listNumbering
      if (num && num.numFmt !== 'bullet') {
        const numId = num.numId ?? num.abstractNumId ?? 'default'
        const numLevel = num.level ?? 0
        const key = `${numId}:${numLevel}`
        const prev = counters.get(key)
        const current = (prev == null ? (num.start ?? 1) - 1 : prev) + 1
        counters.set(key, current)
        for (const k of Array.from(counters.keys())) {
          if (!k.startsWith(`${numId}:`)) continue
          const l = Number(k.split(':')[1])
          if (l > numLevel) counters.delete(k)
        }
        const tpl = num.lvlText ?? '%1.'
        number = tpl.replace(/%([1-9])/g, (_, d: string) => {
          const lvl = Number(d) - 1
          if (lvl === numLevel) return String(current)
          return String(counters.get(`${numId}:${lvl}`) ?? (num.start ?? 1))
        })
      }

      toc.push({ id: JSON.stringify(ctx.path), level, name, number })
    }
  })
  post({ type: 'toc-result', toc })
}

/** 计算搜索并推送结果 */
function computeSearch(keyword: string): void {
  if (!currentElements || !keyword) {
    post({ type: 'search-result', results: [], count: 0 })
    return
  }
  const results: { path: PathSegment[]; offset: number; length: number }[] = []
  const lowerKeyword = keyword.toLowerCase()
  walkTree(currentElements, (node, ctx) => {
    if (node.type === 'text') {
      const text = (node as ITextElement).value || ''
      let idx = text.toLowerCase().indexOf(lowerKeyword)
      while (idx !== -1) {
        results.push({ path: [...ctx.path], offset: idx, length: keyword.length })
        idx = text.toLowerCase().indexOf(lowerKeyword, idx + 1)
      }
    }
  })
  post({ type: 'search-result', results, count: results.length })
}

/** 深拷贝并推送结果 */
function computeClone(data: unknown): void {
  post({ type: 'clone-result', data: cloneTree(data) })
}

self.onmessage = function (e: MessageEvent<WorkerRequest>): void {
  try {
    const req = e.data
    switch (req.type) {
      case 'update':
        currentElements = req.elements
        computeToc()
        break
      case 'search':
        computeSearch(req.keyword)
        break
      case 'clone':
        computeClone(req.data)
        break
    }
  } catch (error: any) {
    post({ type: 'error', message: error?.message || String(error) })
  }
}