import { NS } from '../../constants'
import type {
  ParagraphNode, ParagraphStyle, InlineChunk, RunStyle, ImageChunk
} from '../../types'
import { StyleResolver } from '../style.resolver'
import { ThemeData } from '../theme.resolver'
import { NumberingResolver } from '../numbering.resolver'
import { RelationshipEntry } from '../relationship.resolver'
import { parseRun } from './run.parser'
import { parseImage } from './image.parser'
import type { PageMargins } from './image.parser'
import { isChartDrawing } from './chart.parser'
import { parseHyperlink } from './hyperlink.parser'
import {
  getFirstChildByTag, getWVal, forEachChild
} from '../xml.helper'

/** 域代码状态机状态 */
type FieldState = 'none' | 'instr' | 'cached'

/**
 * 解析 <w:p> 元素为 ParagraphNode
 */
export function parseParagraph(
  paragraphEl: Element,
  styleResolver: StyleResolver,
  theme: ThemeData,
  numberingResolver: NumberingResolver,
  rels: Map<string, RelationshipEntry>,
  mediaMap: Record<string, string>,
  pageMargins?: PageMargins,
  defaultFontSize?: number
): ParagraphNode {
  // 1. 解析段落属性 <w:pPr>
  const pPrEl = getFirstChildByTag(paragraphEl, NS.w, 'pPr')
  let paragraphStyle: ParagraphStyle = {}
  let baseRunStyle: RunStyle = {}

  // 从样式继承链解析
  let styleId: string | null = null
  if (pPrEl) {
    const pStyleEl = getFirstChildByTag(pPrEl, NS.w, 'pStyle')
    styleId = getWVal(pStyleEl)
  }

  if (styleId) {
    const resolved = styleResolver.resolveStyle(styleId)
    paragraphStyle = { ...resolved.paragraph }
    baseRunStyle = { ...resolved.run }
  }

  // 合并段落本地属性（本地属性覆盖继承样式）
  if (pPrEl) {
    const localParaStyle = styleResolver.parseParagraphProperties(pPrEl)
    mergeDefinedProps(paragraphStyle, localParaStyle)

    // 段落内 run 默认属性 <w:rPr>（应用于该段所有 run 的基准）
    const rPrEl = getFirstChildByTag(pPrEl, NS.w, 'rPr')
    if (rPrEl) {
      const localRunStyle = styleResolver.parseRunProperties(rPrEl)
      mergeDefinedProps(baseRunStyle, localRunStyle)
    }
  }

  // 兜底：通过 pStyle id 直接检测标题（样式链未能解析 titleLevel 时）
  if (!paragraphStyle.titleLevel && styleId) {
    const level = detectHeadingByStyleId(styleId)
    if (level !== undefined) {
      paragraphStyle.titleLevel = level
    }
  }

  // 2. 解析列表信息
  if (paragraphStyle.numId && paragraphStyle.numId !== '0') {
    const level = paragraphStyle.listLevel ?? 0
    const numInfo = numberingResolver.resolve(paragraphStyle.numId, level)
    if (numInfo) {
      paragraphStyle.listType = numInfo.listType
      paragraphStyle.listStyle = numInfo.listStyle
      paragraphStyle.listLevel = numInfo.level
    }
  }

  // 3. 遍历 <w:p> 子节点，收集 inline chunks
  const chunks: InlineChunk[] = []
  // 域代码状态机
  let fieldState: FieldState = 'none'

  forEachChild(paragraphEl, (child) => {
    const tag = child.localName
    const childNs = child.namespaceURI

    if (tag === 'pPr') {
      // 段落属性已处理
    } else if (tag === 'r' && childNs === NS.w) {
      // 处理域代码状态机
      if (processFieldChar(child, fieldState, (newState) => { fieldState = newState })) {
        return // 域代码控制 run，跳过正常 run 处理
      }
      // 在 cached 状态（fldChar separate ~ end 之间）输出缓存显示值
      if (fieldState === 'cached') {
        const cachedChunks = collectCachedFieldText(child, mergedStyle => {
          return { type: 'text' as const, value: mergedStyle, style: { ...baseRunStyle } }
        }, styleResolver, theme, baseRunStyle)
        chunks.push(...cachedChunks)
        return
      }
      processRunElement(child, chunks, rels, mediaMap, styleResolver, theme, baseRunStyle, pageMargins)
    } else if (tag === 'ins' && childNs === NS.w) {
      const rawRevId = child.getAttributeNS(NS.w, 'id') ?? child.getAttribute('w:id') ?? ''
      const revAuthor = child.getAttributeNS(NS.w, 'author') ?? child.getAttribute('w:author') ?? ''
      const revDate = child.getAttributeNS(NS.w, 'date') ?? child.getAttribute('w:date') ?? ''

      let revId = rawRevId || `rev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      for (let ci = chunks.length - 1; ci >= 0; ci--) {
        const c = chunks[ci]
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

      forEachChild(child, (insChild) => {
        if (insChild.localName === 'r' && insChild.namespaceURI === NS.w) {
          processRunElement(insChild, chunks, rels, mediaMap, styleResolver, theme, baseRunStyle, pageMargins, { id: revId, type: 'insert', author: revAuthor, date: revDate })
        }
      })
    } else if (tag === 'del' && childNs === NS.w) {
      const revId = child.getAttributeNS(NS.w, 'id') ?? child.getAttribute('w:id') ?? `rev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const revAuthor = child.getAttributeNS(NS.w, 'author') ?? child.getAttribute('w:author') ?? ''
      const revDate = child.getAttributeNS(NS.w, 'date') ?? child.getAttribute('w:date') ?? ''

      forEachChild(child, (delChild) => {
        if (delChild.localName === 'r' && delChild.namespaceURI === NS.w) {
          processRunElement(delChild, chunks, rels, mediaMap, styleResolver, theme, baseRunStyle, pageMargins, { id: revId, type: 'delete', author: revAuthor, date: revDate })
        }
      })
    } else if (tag === 'hyperlink' && childNs === NS.w) {
      const hlChunk = parseHyperlink(child, styleResolver, theme, baseRunStyle, rels)
      if (hlChunk) chunks.push(hlChunk)
    } else if (tag === 'AlternateContent' && childNs === NS.mc) {
      // <mc:AlternateContent> 直接出现在段落级别
      processAlternateContentElement(child, chunks, rels, mediaMap, styleResolver, theme, baseRunStyle, pageMargins)
    } else if (tag === 'oMath' && childNs === NS.m) {
      // 数学公式：提取文本降级
      const mathChunks = extractMathText(child, baseRunStyle)
      chunks.push(...mathChunks)
    } else if (tag === 'commentRangeStart' && childNs === NS.w) {
      const commentId = child.getAttributeNS(NS.w, 'id') ?? child.getAttribute('w:id') ?? ''
      if (commentId) chunks.push({ type: 'commentMarker', markType: 'start', commentId })
    } else if (tag === 'commentRangeEnd' && childNs === NS.w) {
      const commentId = child.getAttributeNS(NS.w, 'id') ?? child.getAttribute('w:id') ?? ''
      if (commentId) chunks.push({ type: 'commentMarker', markType: 'end', commentId })
    } else if (tag === 'bookmarkStart' || tag === 'bookmarkEnd') {
      // 书签：忽略
    }
  })

  // 空段落：插入占位符，字号明确继承（避免编辑器从上下文继承大字号标题行高）
  if (chunks.length === 0) {
    const placeholderSize = baseRunStyle.size ?? defaultFontSize ?? 12
    chunks.push({
      type: 'text',
      value: '\u200B',
      style: { ...baseRunStyle, size: placeholderSize }
    })
  }

  return {
    type: 'paragraph',
    chunks,
    style: paragraphStyle
  }
}

// ---- 域代码状态机 ----

/**
 * 处理 run 中的 <w:fldChar>，更新域代码状态机
 * 返回 true 表示该 run 是纯域代码控制 run（不应输出文字）
 */
function processFieldChar(
  runEl: Element,
  currentState: FieldState,
  setState: (s: FieldState) => void
): boolean {
  const fldChar = getFirstChildByTag(runEl, NS.w, 'fldChar')
  const instrText = getFirstChildByTag(runEl, NS.w, 'instrText')

  if (fldChar) {
    const fldCharType = fldChar.getAttributeNS(NS.w, 'fldCharType') ?? fldChar.getAttribute('w:fldCharType')
    if (fldCharType === 'begin') {
      setState('instr')
      return true
    } else if (fldCharType === 'separate') {
      setState('cached')
      return true
    } else if (fldCharType === 'end') {
      setState('none')
      return true
    }
    return true
  }

  if (instrText && currentState === 'instr') {
    return true // 忽略域代码指令文本
  }

  return false
}

/**
 * 从 cached 状态的 run 中提取显示文本
 */
function collectCachedFieldText(
  runEl: Element,
  _createChunk: (text: string) => InlineChunk,
  styleResolver: StyleResolver,
  theme: ThemeData,
  baseRunStyle: RunStyle
): InlineChunk[] {
  return parseRun(runEl, styleResolver, theme, baseRunStyle)
}

// ---- Run / Drawing 处理 ----

function processRunElement(
  runEl: Element,
  chunks: InlineChunk[],
  rels: Map<string, RelationshipEntry>,
  mediaMap: Record<string, string>,
  styleResolver: StyleResolver,
  theme: ThemeData,
  baseRunStyle: RunStyle,
  pageMargins?: PageMargins,
  revision?: { id: string; type: 'insert' | 'delete'; author: string; date: string }
): void {
  // 优先检测 drawing，再检测 pict，最后作为普通文字 run 处理
  let drawingEl = getFirstChildByTag(runEl, NS.w, 'drawing')
  let pictEl = getFirstChildByTag(runEl, NS.w, 'pict')

  // 兼容 WPS：drawing / pict 可能封装在 mc:AlternateContent 内
  if (!drawingEl && !pictEl) {
    const mcEl = getFirstChildByTag(runEl, NS.mc, 'AlternateContent')
    if (mcEl) {
      const choiceEl = getFirstChildByTag(mcEl, NS.mc, 'Choice')
      if (choiceEl) drawingEl = getFirstChildByTag(choiceEl, NS.w, 'drawing')
      if (!drawingEl) {
        const fallbackEl = getFirstChildByTag(mcEl, NS.mc, 'Fallback')
        if (fallbackEl) pictEl = getFirstChildByTag(fallbackEl, NS.w, 'pict')
      }
    }
  }

  if (drawingEl) {
    if (!isChartDrawing(drawingEl)) {
      const imgChunk = parseImage(drawingEl, rels, mediaMap, pageMargins)
      if (imgChunk) {
        chunks.push(imgChunk)
      } else {
        // 非图片 drawing → 尝试提取文本框内容
        chunks.push(...extractTextBoxContent(drawingEl, styleResolver, theme, baseRunStyle))
      }
    }
    // 图表由 DocxParser 顶层统一处理，此处跳过
  } else if (pictEl) {
    const imgChunk = parsePictureImage(pictEl, rels, mediaMap)
    if (imgChunk) {
      chunks.push(imgChunk)
    } else {
      chunks.push(...extractTextBoxContent(pictEl, styleResolver, theme, baseRunStyle))
    }
  } else {
    // 普通文字 run
    const runChunks = parseRun(runEl, styleResolver, theme, baseRunStyle)
    if (revision) {

      for (const chunk of runChunks) {
        if (chunk.type === 'text') {
          chunk.revision = revision
        }
      }
    }
    chunks.push(...runChunks)
  }
}

/**
 * 处理段落级别的 <mc:AlternateContent>
 * WPS 将一些特殊内容封装在 mc:AlternateContent 中
 */
function processAlternateContentElement(
  mcEl: Element,
  chunks: InlineChunk[],
  rels: Map<string, RelationshipEntry>,
  mediaMap: Record<string, string>,
  styleResolver: StyleResolver,
  theme: ThemeData,
  baseRunStyle: RunStyle,
  pageMargins?: PageMargins
): void {
  const choiceEl = getFirstChildByTag(mcEl, NS.mc, 'Choice')
  if (choiceEl) {
    let handled = false
    forEachChild(choiceEl, (child) => {
      if (child.localName === 'r' && child.namespaceURI === NS.w) {
        processRunElement(child, chunks, rels, mediaMap, styleResolver, theme, baseRunStyle, pageMargins)
        handled = true
      } else if (child.localName === 'drawing' && child.namespaceURI === NS.w) {
        if (!isChartDrawing(child)) {
          const imgChunk = parseImage(child, rels, mediaMap, pageMargins)
          if (imgChunk) {
            chunks.push(imgChunk)
          } else {
            chunks.push(...extractTextBoxContent(child, styleResolver, theme, baseRunStyle))
          }
        }
        handled = true
      }
    })
    if (handled) return
  }

  // 回退到 Fallback 内容
  const fallbackEl = getFirstChildByTag(mcEl, NS.mc, 'Fallback')
  if (fallbackEl) {
    forEachChild(fallbackEl, (child) => {
      if (child.localName === 'r' && child.namespaceURI === NS.w) {
        processRunElement(child, chunks, rels, mediaMap, styleResolver, theme, baseRunStyle, pageMargins)
      } else if (child.localName === 'pict' && child.namespaceURI === NS.w) {
        const imgChunk = parsePictureImage(child, rels, mediaMap)
        if (imgChunk) {
          chunks.push(imgChunk)
        } else {
          chunks.push(...extractTextBoxContent(child, styleResolver, theme, baseRunStyle))
        }
      }
    })
  }
}

// ---- 文本框内容提取 ----

/**
 * 提取 <wps:txbx> 或 <v:textbox> 内的 <w:txbxContent> 文本
 * 段落间插入换行符，作为 inline chunks 返回
 */
function extractTextBoxContent(
  containerEl: Element,
  styleResolver: StyleResolver,
  theme: ThemeData,
  baseRunStyle: RunStyle
): InlineChunk[] {
  const txbxContents = containerEl.getElementsByTagNameNS(NS.w, 'txbxContent')
  if (txbxContents.length === 0) return []

  const chunks: InlineChunk[] = []
  const txbxContent = txbxContents[0]
  let isFirstParagraph = true

  forEachChild(txbxContent, (child) => {
    if (child.localName === 'p' && child.namespaceURI === NS.w) {
      if (!isFirstParagraph) {
        chunks.push({ type: 'break', breakType: 'line' })
      }
      isFirstParagraph = false

      forEachChild(child, (pChild) => {
        if (pChild.localName === 'r' && pChild.namespaceURI === NS.w) {
          chunks.push(...parseRun(pChild, styleResolver, theme, baseRunStyle))
        }
      })
    }
  })

  return chunks
}

// ---- VML 图片解析 ----

/**
 * 从 <w:pict> 中解析 <v:imagedata> 图片
 */
function parsePictureImage(
  pictEl: Element,
  rels: Map<string, RelationshipEntry>,
  mediaMap: Record<string, string>
): ImageChunk | null {
  const NS_VML = 'urn:schemas-microsoft-com:vml'
  const imageDataList = pictEl.getElementsByTagNameNS(NS_VML, 'imagedata')
  if (imageDataList.length === 0) return null

  const imageData = imageDataList[0]
  const rId = imageData.getAttributeNS(NS.r, 'id')
    ?? imageData.getAttribute('r:id')
    ?? imageData.getAttributeNS(NS.r, 'href')
    ?? ''
  if (!rId) return null

  const rel = rels.get(rId)
  if (!rel) return null

  const target = rel.target.replace(/^\.\.\//, '')
  const mediaPath = target.startsWith('word/') ? target : `word/${target}`
  const src = mediaMap[mediaPath] ?? mediaMap[target]
  if (!src) return null

  // 从 <v:shape> 的 style 属性解析尺寸
  const shapeEls = pictEl.getElementsByTagNameNS(NS_VML, 'shape')
  let width = 100
  let height = 100
  if (shapeEls.length > 0) {
    const styleStr = shapeEls[0].getAttribute('style') ?? ''
    const widthMatch = styleStr.match(/width:\s*([\d.]+)pt/)
    const heightMatch = styleStr.match(/height:\s*([\d.]+)pt/)
    // pt → px（96dpi）
    if (widthMatch) width = parseFloat(widthMatch[1]) * (96 / 72)
    if (heightMatch) height = parseFloat(heightMatch[1]) * (96 / 72)
  }

  return { type: 'image', src, width: Math.round(width), height: Math.round(height) }
}

// ---- 数学公式降级处理 ----

/**
 * 从 <m:oMath> 提取纯文本作为近似表示
 * 无法提取时输出 "[公式]" 占位
 */
function extractMathText(oMathEl: Element, baseRunStyle: RunStyle): InlineChunk[] {
  const mathTextEls = oMathEl.getElementsByTagNameNS(NS.m, 't')
  const parts: string[] = []
  for (let i = 0; i < mathTextEls.length; i++) {
    const text = mathTextEls[i].textContent ?? ''
    if (text.trim()) parts.push(text)
  }

  const displayText = parts.length > 0 ? parts.join('') : '[公式]'
  return [{
    type: 'text',
    value: displayText,
    style: { ...baseRunStyle, italic: true }
  }]
}

// ---- 标题检测 ----

function detectHeadingByStyleId(styleId: string): number | undefined {
  const m1 = styleId.match(/^heading\s*(\d+)$/i)
  if (m1) {
    const level = parseInt(m1[1], 10)
    if (level >= 1 && level <= 6) return level
  }
  const m2 = styleId.match(/^标题\s*(\d+)$/)
  if (m2) {
    const level = parseInt(m2[1], 10)
    if (level >= 1 && level <= 6) return level
  }
  return undefined
}

// ---- 工具函数 ----

/**
 * 将 source 中非 undefined 的属性合并到 target
 */
function mergeDefinedProps<T extends object>(target: T, source: Partial<T>): void {
  for (const key of Object.keys(source) as Array<keyof T>) {
    if (source[key] !== undefined) {
      target[key] = source[key]!
    }
  }
}
