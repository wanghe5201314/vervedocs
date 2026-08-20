import { NS } from '../../constants'
import type { ParagraphNode } from '../../types'
import { StyleResolver } from '../style.resolver'
import { ThemeData } from '../theme.resolver'
import { NumberingResolver } from '../numbering.resolver'
import { RelationshipEntry } from '../relationship.resolver'
import { parseParagraph } from './paragraph.parser'
import {
  getFirstChildByTag, forEachChild, getWVal
} from '../xml.helper'

/**
 * 检测元素是否为 TOC（目录）结构化文档标签
 */
export function isTocSdt(sdtEl: Element): boolean {
  const sdtPr = getFirstChildByTag(sdtEl, NS.w, 'sdtPr')
  if (!sdtPr) return false

  // 方式1: docPartGallery 包含 "Table of Contents"（不区分大小写）
  const docPartObj = getFirstChildByTag(sdtPr, NS.w, 'docPartObj')
  if (docPartObj) {
    const gallery = getFirstChildByTag(docPartObj, NS.w, 'docPartGallery')
    const val = getWVal(gallery)
    if (val && val.toLowerCase().includes('table of contents')) return true
  }

  // 方式2: alias 包含目录关键词
  const alias = getFirstChildByTag(sdtPr, NS.w, 'alias')
  const aliasVal = getWVal(alias)
  if (aliasVal) {
    const lower = aliasVal.toLowerCase()
    if (lower.includes('目录') || lower.includes('toc') || lower.includes('table of contents')) return true
  }

  // 方式3: tag 包含目录关键词
  const tag = getFirstChildByTag(sdtPr, NS.w, 'tag')
  const tagVal = getWVal(tag)
  if (tagVal) {
    const lower = tagVal.toLowerCase()
    if (lower.includes('目录') || lower.includes('toc')) return true
  }

  // 方式4: 检查内容中是否有 TOC 域代码
  const sdtContent = getFirstChildByTag(sdtEl, NS.w, 'sdtContent')
  if (sdtContent) {
    const instrTexts = sdtContent.getElementsByTagNameNS(NS.w, 'instrText')
    for (let i = 0; i < instrTexts.length; i++) {
      const text = instrTexts[i].textContent || ''
      if (text.trim().startsWith('TOC')) return true
    }
  }

  return false
}

/**
 * 解析 TOC SDT 为段落列表（当作普通段落处理）
 */
export function parseTocContent(
  sdtEl: Element,
  styleResolver: StyleResolver,
  theme: ThemeData,
  numberingResolver: NumberingResolver,
  rels: Map<string, RelationshipEntry>,
  mediaMap: Record<string, string>
): ParagraphNode[] {
  const result: ParagraphNode[] = []

  const sdtContent = getFirstChildByTag(sdtEl, NS.w, 'sdtContent')
  if (!sdtContent) return result

  forEachChild(sdtContent, (child) => {
    if (child.localName === 'p' && child.namespaceURI === NS.w) {
      result.push(
        parseParagraph(child, styleResolver, theme, numberingResolver, rels, mediaMap)
      )
    }
  })

  return result
}
