import { NS } from '../../constants'
import type { HyperlinkChunk, TextChunk, RunStyle } from '../../types'
import { StyleResolver } from '../style.resolver'
import { ThemeData } from '../theme.resolver'
import { RelationshipEntry } from '../relationship.resolver'
import { parseRun } from './run.parser'
import { forEachChild, getFirstChildByTag } from '../xml.helper'

/** Word 标准超链接蓝色 */
const DEFAULT_HYPERLINK_COLOR = '#0563C1'

/**
 * 解析 <w:hyperlink> 元素
 *
 * 支持：
 *   - 外部链接（r:id → rels 中的目标 URL）
 *   - 内部书签锚点（w:anchor → "#anchorName"）
 *
 * 默认样式：rPr 未明确设置颜色时使用超链接蓝色，未明确设置下划线时添加下划线
 */
export function parseHyperlink(
  hyperlinkEl: Element,
  styleResolver: StyleResolver,
  theme: ThemeData,
  baseRunStyle: RunStyle,
  rels: Map<string, RelationshipEntry>
): HyperlinkChunk | null {
  // 解析目标 URL
  const url = resolveHyperlinkUrl(hyperlinkEl, rels)

  // 收集子 run 文本
  const children: TextChunk[] = []
  forEachChild(hyperlinkEl, (child) => {
    if (child.localName === 'r' && child.namespaceURI === NS.w) {
      const runChunks = parseRun(child, styleResolver, theme, baseRunStyle)
      for (const chunk of runChunks) {
        if (chunk.type === 'text') {
          children.push(applyHyperlinkDefaults(chunk, child, styleResolver))
        }
      }
    } else if (child.localName === 'ins' && child.namespaceURI === NS.w) {
      const rawRevId = child.getAttributeNS(NS.w, 'id') ?? child.getAttribute('w:id') ?? ''
      const revAuthor = child.getAttributeNS(NS.w, 'author') ?? child.getAttribute('w:author') ?? ''
      const revDate = child.getAttributeNS(NS.w, 'date') ?? child.getAttribute('w:date') ?? ''

      let revId = rawRevId || `rev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      for (let ci = children.length - 1; ci >= 0; ci--) {
        const c = children[ci]
        if (c.type === 'text' && c.revision?.type === 'delete' && c.revision.author === revAuthor && c.revision.date === revDate) {
          if (c.revision.id !== revId) {
            revId = c.revision.id
          }
          break
        }
        if (c.type === 'text' && c.revision?.type === 'delete') continue
        if (c.type === 'text' && !c.revision) continue
        break
      }
      const revision = { id: revId, type: 'insert' as const, author: revAuthor, date: revDate }
      forEachChild(child, (insChild) => {
        if (insChild.localName === 'r' && insChild.namespaceURI === NS.w) {
          const runChunks = parseRun(insChild, styleResolver, theme, baseRunStyle)
          for (const chunk of runChunks) {
            if (chunk.type === 'text') {
              chunk.revision = revision
              children.push(applyHyperlinkDefaults(chunk, insChild, styleResolver))
            }
          }
        }
      })
    } else if (child.localName === 'del' && child.namespaceURI === NS.w) {
      const revId = child.getAttributeNS(NS.w, 'id') ?? child.getAttribute('w:id') ?? `rev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const revAuthor = child.getAttributeNS(NS.w, 'author') ?? child.getAttribute('w:author') ?? ''
      const revDate = child.getAttributeNS(NS.w, 'date') ?? child.getAttribute('w:date') ?? ''
      const revision = { id: revId, type: 'delete' as const, author: revAuthor, date: revDate }
      forEachChild(child, (delChild) => {
        if (delChild.localName === 'r' && delChild.namespaceURI === NS.w) {
          const runChunks = parseRun(delChild, styleResolver, theme, baseRunStyle)
          for (const chunk of runChunks) {
            if (chunk.type === 'text') {
              chunk.revision = revision
              children.push(applyHyperlinkDefaults(chunk, delChild, styleResolver))
            }
          }
        }
      })
    }
  })

  if (children.length === 0) return null

  return { type: 'hyperlink', url, children }
}

// ---- 工具函数 ----

function resolveHyperlinkUrl(
  hyperlinkEl: Element,
  rels: Map<string, RelationshipEntry>
): string {
  // 外部链接：通过 r:id 在 rels 中查找
  const rId = hyperlinkEl.getAttributeNS(NS.r, 'id') ?? hyperlinkEl.getAttribute('r:id') ?? ''
  if (rId) {
    const rel = rels.get(rId)
    if (rel?.target) return rel.target
  }

  // 内部书签锚点：w:anchor
  const anchor = hyperlinkEl.getAttributeNS(NS.w, 'anchor') ?? hyperlinkEl.getAttribute('w:anchor')
  if (anchor) return `#${anchor}`

  return ''
}

/**
 * 为超链接文字应用默认颜色和下划线
 * 仅在 rPr 中未显式声明时才应用默认值
 */
function applyHyperlinkDefaults(
  chunk: TextChunk,
  runEl: Element,
  styleResolver: StyleResolver
): TextChunk {
  const rPrEl = getFirstChildByTag(runEl, NS.w, 'rPr')
  const localStyle = rPrEl ? styleResolver.parseRunProperties(rPrEl) : {}

  const style: RunStyle = { ...chunk.style }

  // 未显式设置颜色 → 使用超链接默认蓝色
  if (localStyle.color === undefined && !style.color) {
    style.color = DEFAULT_HYPERLINK_COLOR
  }

  // 未显式设置下划线 → 添加下划线
  if (localStyle.underline === undefined && style.underline === undefined) {
    style.underline = true
  }

  return { ...chunk, style }
}
