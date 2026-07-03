import { NS } from '../../constants'
import type { DocxCommentMeta } from '../../types'
import { parseXml, forEachChild } from '../xml.helper'

/**
 * 解析 word/comments.xml，返回 commentId → DocxCommentMeta 映射
 */
export function parseComments(commentsXml: string | null): Map<string, DocxCommentMeta> {
  const map = new Map<string, DocxCommentMeta>()
  if (!commentsXml) return map

  const doc = parseXml(commentsXml)
  const root = doc.documentElement

  // 遍历 <w:comment> 元素
  const commentEls = root.getElementsByTagNameNS(NS.w, 'comment')
  for (let i = 0; i < commentEls.length; i++) {
    const commentEl = commentEls[i]
    const id = commentEl.getAttributeNS(NS.w, 'id') || commentEl.getAttribute('w:id') || ''
    const author = commentEl.getAttributeNS(NS.w, 'author') || commentEl.getAttribute('w:author') || ''
    const date = commentEl.getAttributeNS(NS.w, 'date') || commentEl.getAttribute('w:date') || ''
    const initials = commentEl.getAttributeNS(NS.w, 'initials') || commentEl.getAttribute('w:initials') || undefined

    if (!id) continue

    // 提取批注正文：遍历 <w:p> → <w:r> → <w:t>
    const content = extractCommentText(commentEl)

    map.set(id, { id, author, date, initials, content })
  }

  return map
}

/**
 * 从 <w:comment> 元素中提取纯文本内容
 */
function extractCommentText(commentEl: Element): string {
  const paragraphs: string[] = []

  forEachChild(commentEl, (child) => {
    if (child.localName === 'p' && child.namespaceURI === NS.w) {
      const texts: string[] = []
      forEachChild(child, (pChild) => {
        if (pChild.localName === 'r' && pChild.namespaceURI === NS.w) {
          forEachChild(pChild, (rChild) => {
            if (rChild.localName === 't' && rChild.namespaceURI === NS.w) {
              texts.push(rChild.textContent || '')
            }
          })
        }
      })
      paragraphs.push(texts.join(''))
    }
  })

  return paragraphs.join('\n')
}
