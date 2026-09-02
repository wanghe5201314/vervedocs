/**
 * VerveDocs Schema —— 段落解析（辅助 view 层）
 *
 * 段落切分：将同层的 elements 按"段落分隔"划分成段落数组。
 * 规则：
 *  - title/list/table/image/pageBreak 各自独立成段。
 *  - 连续 text 归到同一段（普通段落），遇到分隔类型即断段。
 *  - 段落容器（title/list）自身即为一段，其内 valueList 作为 runs。
 *
 * 空段过滤：docx-parser 常在块级元素之间插入 `{ type:'text', value:'\u200B' }`
 * 作为段落分隔标记。这些"独立零宽段"没有实际内容，直接跳过，避免视觉空行。
 */

import type { IElement } from './types'
import { BLOCK_LEVEL_TYPES } from './constants'

export interface IParagraphGroup {
  /** 段落类型：normal / title / list / table / image / pageBreak */
  kind: 'normal' | 'title' | 'list' | 'table' | 'image' | 'pageBreak'
  /** 段落对应的父节点（当 kind !== 'normal' 时即为该节点自身；kind='normal' 时为 null） */
  block: IElement | null
  /** 段落包含的顶层节点在父数组中的索引区间 [start, end)（含 start 不含 end） */
  start: number
  end: number
  /** 段落使用的 runs（对 normal 是原数组切片，对 title/list 是 valueList） */
  runs: IElement[]
}

/** 判断某个 text 段是不是"纯零宽/空白"的分隔标记（应被跳过） */
function isBlankParagraphMarker(el: IElement): boolean {
  if (el.type !== 'text') return false
  const v = (el as unknown as { value?: string }).value ?? ''
  // 只允许零宽字符 U+200B / U+FEFF / 空白 → 视为分隔标记
  return /^[\s\u200B\uFEFF]*$/.test(v)
}

export function splitParagraphs(elements: IElement[]): IParagraphGroup[] {
  const out: IParagraphGroup[] = []
  let i = 0
  while (i < elements.length) {
    const node = elements[i]
    if (BLOCK_LEVEL_TYPES.has(node.type)) {
      const kind = node.type as IParagraphGroup['kind']
      const runs = (node as unknown as { valueList?: IElement[] }).valueList ?? []
      out.push({ kind, block: node, start: i, end: i + 1, runs })
      i++
      continue
    }
    // 普通段落：连续收集非块级节点
    const start = i
    while (i < elements.length && !BLOCK_LEVEL_TYPES.has(elements[i].type)) i++
    const runs = elements.slice(start, i)
    // 若整段全是"空白/零宽"文本，视为分隔标记，跳过
    const allBlank = runs.every(isBlankParagraphMarker)
    if (allBlank) continue
    out.push({ kind: 'normal', block: null, start, end: i, runs })
  }
  return out
}
