import { NS } from '../../constants'
import type { RunStyle, InlineChunk, BreakChunk } from '../../types'
import { StyleResolver } from '../style.resolver'
import { ThemeData } from '../theme.resolver'
import { getFirstChildByTag, forEachChild } from '../xml.helper'

/**
 * 全局脚注 / 尾注计数器（每次 parseSync 开始前由 DocxParser 重置）
 */
export const footnoteCounter = { value: 0 }

/**
 * 解析 <w:r> 元素，返回 InlineChunk 列表
 *
 * 处理内容：
 *   <w:t>           文本
 *   <w:br>          换行 / 分页 / 分栏符
 *   <w:tab>         制表符
 *   <w:sym>         符号字符
 *   <w:softHyphen>  软连字符（忽略）
 *   <w:noBreakHyphen> 不换行连字符（输出 "-"）
 *   <w:footnoteReference> / <w:endnoteReference>  脚注 / 尾注（输出上标序号）
 */
export function parseRun(
  runEl: Element,
  styleResolver: StyleResolver,
  _theme: ThemeData,
  baseRunStyle: RunStyle
): InlineChunk[] {
  const chunks: InlineChunk[] = []

  // 解析 run 属性 <w:rPr>
  const rPrEl = getFirstChildByTag(runEl, NS.w, 'rPr')
  const localStyle = rPrEl ? styleResolver.parseRunProperties(rPrEl) : {}
  const mergedStyle: RunStyle = mergeRunStyles(baseRunStyle, localStyle)

  // 连续换行合并：跟踪上一个 break 类型
  let lastBreakType: string | null = null

  forEachChild(runEl, (child) => {
    const tag = child.localName

    if (tag === 't') {
      // 文本内容：只过滤完全为空字符串的节点，保留含空格的文本
      const text = child.textContent ?? ''
      if (text !== '') {
        chunks.push({ type: 'text', value: text, style: { ...mergedStyle } })
      }
      lastBreakType = null
    } else if (tag === 'delText') {
      const text = child.textContent ?? ''
      if (text !== '') {

        chunks.push({ type: 'text', value: text, style: { ...mergedStyle } })
      }
      lastBreakType = null
    } else if (tag === 'br') {
      const breakTypeAttr = child.getAttributeNS(NS.w, 'type') ?? child.getAttribute('w:type')
      const resolvedBreakType = resolveBreakType(breakTypeAttr)

      // 连续相同类型换行只保留一个，避免堆叠空行
      if (resolvedBreakType !== lastBreakType) {
        chunks.push({ type: 'break', breakType: resolvedBreakType } as BreakChunk)
        lastBreakType = resolvedBreakType
      }
    } else if (tag === 'tab') {
      chunks.push({ type: 'tab' })
      lastBreakType = null
    } else if (tag === 'sym') {
      // 符号字符：<w:sym w:char="F0B7"/>
      const charCode = child.getAttributeNS(NS.w, 'char') ?? child.getAttribute('w:char')
      if (charCode) {
        const codePoint = parseInt(charCode, 16)
        // 部分 Symbol / Wingdings 字符编码在私有区 (F000-F0FF)，还原为基础字符
        const normalized = codePoint >= 0xF000 && codePoint <= 0xF0FF
          ? codePoint - 0xF000
          : codePoint
        chunks.push({
          type: 'text',
          value: String.fromCharCode(normalized),
          style: { ...mergedStyle }
        })
      }
      lastBreakType = null
    } else if (tag === 'softHyphen') {
      // 软连字符：Web 渲染中忽略（浏览器会自动处理换行）
      lastBreakType = null
    } else if (tag === 'noBreakHyphen') {
      // 不换行连字符：输出普通连字符
      chunks.push({ type: 'text', value: '-', style: { ...mergedStyle } })
      lastBreakType = null
    } else if (tag === 'footnoteReference' || tag === 'endnoteReference') {
      // 脚注 / 尾注引用：输出自增上标序号
      footnoteCounter.value++
      chunks.push({
        type: 'text',
        value: String(footnoteCounter.value),
        style: { ...mergedStyle, vertAlign: 'superscript' }
      })
      lastBreakType = null
    } else if (tag === 'lastRenderedPageBreak') {
      // 渲染引擎插入的分页标记，非文档内容，忽略
    }
    // drawing / pict 由外层 paragraphParser 处理，此处跳过
  })

  return chunks
}

// ---- 工具函数 ----

function resolveBreakType(typeAttr: string | null): 'line' | 'page' | 'column' {
  if (typeAttr === 'page') return 'page'
  if (typeAttr === 'column') return 'column'
  // textWrapping 或无 type 属性 → 行内换行
  return 'line'
}

/**
 * 合并 base 与 local run 样式（local 中非 undefined 的属性覆盖 base）
 */
function mergeRunStyles(base: RunStyle, local: RunStyle): RunStyle {
  const merged: RunStyle = { ...base }
  for (const key of Object.keys(local) as Array<keyof RunStyle>) {
    if (local[key] !== undefined) {
      (merged as any)[key] = local[key]
    }
  }
  return merged
}
