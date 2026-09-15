/**
 * VerveDocs Schema —— 段落解析（辅助 view 层）
 *
 * 段落切分：将同层的 elements 按"段落分隔"划分成段落数组。
 * 规则：
 *  - title/list/table/image/pageBreak 各自独立成段。
 *  - 连续 text 归到同一段，遇到"段落终止符"或块级节点即断段。
 *  - 段落容器（title/list）自身即为一段，其内 valueList 作为 runs。
 *
 * 段落终止符：docx-parser 在每个段落末尾插入一个仅由零宽字符
 * (`\u200B` / `\uFEFF`) 组成的 text run 作为段落结束标记。
 *  - 遇到该标记就切段（不并入下一段）。
 *  - 空段落载体（`{ type:'text', value:'', ...段落属性 }`）保留为一段的 run，
 *    以维持视觉空行与其行高等属性。
 *  - 若某段仅由终止符组成（无任何载体），才作为块间分隔符跳过。
 */

import type { IElement } from './types'
import { BLOCK_LEVEL_TYPES } from './constants'

export interface IParagraphGroup {
  /** 段落类型：normal / title / list / table / image / pageBreak / separator / block */
  kind: 'normal' | 'title' | 'list' | 'table' | 'image' | 'pageBreak' | 'separator' | 'block'
  /** 段落对应的父节点（当 kind !== 'normal' 时即为该节点自身；kind='normal' 时为 null） */
  block: IElement | null
  /** 段落包含的顶层节点在父数组中的索引区间 [start, end)（含 start 不含 end） */
  start: number
  end: number
  /** 段落使用的 runs（对 normal 是原数组切片，对 title/list 是 valueList 切片） */
  runs: IElement[]
  /** runs 在原数组中的起始索引（对 title/list valueList 切片，用于 path 计算；normal 默认 0） */
  runStartIndex?: number
}

/** 判断某个 text run 是否为"段落终止符"（仅由零宽字符构成的 text） */
function isParagraphTerminator(el: IElement): boolean {
  if (el.type !== 'text') return false
  const v = (el as unknown as { value?: string }).value ?? ''
  if (!v) return false
  return /^[\u200B\uFEFF]+$/.test(v)
}

/**
 * 将同层 elements 切分为段落数组。
 * - 块级节点（title/list/table/image/pageBreak/separator）各自独立成段
 * - 普通连续 text 归到同一段，遇到段落终止符或块级节点即断段
 * - title/list 内部按零宽分隔符切段以支持段内换行
 * @param elements 顶层元素数组
 * @returns 段落分组数组
 */
export function splitParagraphs(elements: IElement[]): IParagraphGroup[] {
  const out: IParagraphGroup[] = []
  let i = 0
  while (i < elements.length) {
    const node = elements[i]
    if (BLOCK_LEVEL_TYPES.has(node.type)) {
      const kind = node.type as IParagraphGroup['kind']
      const valueList = (node as unknown as { valueList?: IElement[] }).valueList ?? []
      // title/list 内部也按零宽分隔符切段（与普通段落一致），支持段内换行
      if (kind === 'title' || kind === 'list') {
        const segs = splitValueList(valueList)
        for (const { runs, startIndex } of segs) {
          out.push({ kind, block: node, start: i, end: i + 1, runs, runStartIndex: startIndex })
        }
      } else {
        out.push({ kind, block: node, start: i, end: i + 1, runs: valueList })
      }
      i++
      continue
    }
    // 普通段落：收集非块级节点，遇到段落终止符即切段
    const start = i
    while (i < elements.length && !BLOCK_LEVEL_TYPES.has(elements[i].type)) {
      if (isParagraphTerminator(elements[i])) {
        i++ // 消费终止符
        break
      }
      i++
    }
    // 段内 runs 保留原切片（含终止符），以保证 ri 与原 elements 索引对齐；
    // 终止符在排版时跳过（不产出 inline），但占位以保持索引一致。
    const runs = elements.slice(start, i)
    // 若段落仅有终止符（无任何载体/内容），视为块间分隔符，跳过
    if (runs.every(isParagraphTerminator)) continue
    out.push({ kind: 'normal', block: null, start, end: i, runs })
  }
  return out
}

/** 将 valueList 按零宽分隔符切成多段（与顶层 elements 切段逻辑一致） */
function splitValueList(valueList: IElement[]): { runs: IElement[]; startIndex: number }[] {
  const result: { runs: IElement[]; startIndex: number }[] = []
  let vi = 0
  while (vi < valueList.length) {
    const vStart = vi
    while (vi < valueList.length) {
      if (isParagraphTerminator(valueList[vi])) {
        vi++
        break
      }
      vi++
    }
    const runs = valueList.slice(vStart, vi)
    if (runs.every(isParagraphTerminator)) continue
    result.push({ runs, startIndex: vStart })
  }
  if (result.length === 0) {
    result.push({ runs: [], startIndex: 0 })
  }
  return result
}
