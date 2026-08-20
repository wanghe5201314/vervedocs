import { NS, emuToPx } from '../../constants'
import type { ImageChunk } from '../../types'
import { RelationshipEntry } from '../relationship.resolver'
import {
  getFirstChildByTag
} from '../xml.helper'

export interface PageMargins {
  top: number
  bottom: number
  left: number
  right: number
}

/**
 * 解析 <w:drawing> 元素
 */
export function parseImage(
  drawingEl: Element,
  rels: Map<string, RelationshipEntry>,
  mediaMap: Record<string, string>,
  pageMargins?: PageMargins
): ImageChunk | null {
  // 查找 <wp:inline> 或 <wp:anchor>
  const inline = getFirstChildByTag(drawingEl, NS.wp, 'inline')
  const anchor = getFirstChildByTag(drawingEl, NS.wp, 'anchor')
  const container = inline || anchor

  if (!container) {
    return null
  }

  // 获取尺寸 <wp:extent cx="..." cy="..."/>
  const extent = getFirstChildByTag(container, NS.wp, 'extent')
  let width = 100
  let height = 100
  if (extent) {
    const cx = extent.getAttribute('cx')
    const cy = extent.getAttribute('cy')
    if (cx) width = emuToPx(parseInt(cx, 10))
    if (cy) height = emuToPx(parseInt(cy, 10))
  }

  // 查找 <a:blip r:embed="rIdX"/>
  const blips = container.getElementsByTagNameNS(NS.a, 'blip')
  if (blips.length === 0) {
    return null
  }

  const blip = blips[0]
  const rId =
    blip.getAttributeNS(NS.r, 'embed') ||
    blip.getAttribute('r:embed') ||
    blip.getAttributeNS(NS.r, 'link') ||
    blip.getAttribute('r:link') ||
    ''

  if (!rId) {
    return null
  }

  const rel = rels.get(rId)
  if (!rel) {
    return null
  }

  // 解析路径
  const target = rel.target.replace(/^\.\.\//, '')
  const mediaPath = target.startsWith('word/') ? target : `word/${target}`
  const src = mediaMap[mediaPath] || mediaMap[target]
  if (!src) {
    return null
  }

  // 图片显示方式
  let display: string | undefined
  let floatPosition: { x: number; y: number } | undefined
  if (anchor) {
    // 检测 wrap type 和 behindDoc 属性，映射到编辑器 display 模式
    display = resolveAnchorDisplay(anchor)
    const margins = pageMargins || { top: 72, bottom: 72, left: 90, right: 90 }

    const posH = getFirstChildByTag(anchor, NS.wp, 'positionH')
    const posV = getFirstChildByTag(anchor, NS.wp, 'positionV')
    let x = margins.left
    let y = margins.top

    if (posH) {
      const relFrom = posH.getAttribute('relativeFrom') || 'column'
      const posOffset = getFirstChildByTag(posH, NS.wp, 'posOffset')
      if (posOffset?.textContent) {
        const offset = emuToPx(parseInt(posOffset.textContent, 10))
        if (relFrom === 'page') {
          x = offset
        } else {
          // margin / column / character / paragraph → offset from content area
          x = margins.left + offset
        }
      } else {
        // <wp:align> fallback
        const align = getFirstChildByTag(posH, NS.wp, 'align')
        if (align?.textContent) {
          x = resolveHAlign(align.textContent.trim(), margins, Math.round(width))
        }
      }
    }

    if (posV) {
      const relFrom = posV.getAttribute('relativeFrom') || 'paragraph'
      const posOffset = getFirstChildByTag(posV, NS.wp, 'posOffset')
      if (posOffset?.textContent) {
        const offset = emuToPx(parseInt(posOffset.textContent, 10))
        if (relFrom === 'page') {
          y = offset
        } else {
          // margin / paragraph / line → offset from content area
          y = margins.top + offset
        }
      } else {
        const align = getFirstChildByTag(posV, NS.wp, 'align')
        if (align?.textContent) {
          y = resolveVAlign(align.textContent.trim(), margins, Math.round(height))
        }
      }
    }

    floatPosition = { x, y }
  } else if (inline) {
    display = 'inline'
  }

  return {
    type: 'image',
    src,
    width: Math.round(width),
    height: Math.round(height),
    display,
    floatPosition
  }
}

function resolveHAlign(
  align: string,
  margins: PageMargins,
  imgWidth: number
): number {
  // 默认 A4 页面宽度 794px
  const pageWidth = 794
  const contentWidth = pageWidth - margins.left - margins.right
  switch (align) {
    case 'left':
      return margins.left
    case 'center':
      return margins.left + (contentWidth - imgWidth) / 2
    case 'right':
      return margins.left + contentWidth - imgWidth
    default:
      return margins.left
  }
}

function resolveVAlign(
  align: string,
  margins: PageMargins,
  imgHeight: number
): number {
  // 默认 A4 页面高度 1123px
  const pageHeight = 1123
  const contentHeight = pageHeight - margins.top - margins.bottom
  switch (align) {
    case 'top':
      return margins.top
    case 'center':
      return margins.top + (contentHeight - imgHeight) / 2
    case 'bottom':
      return margins.top + contentHeight - imgHeight
    default:
      return margins.top
  }
}

/**
 * 根据 anchor 的 wrap type 和 behindDoc 属性，映射到编辑器的 display 模式
 * 编辑器支持: 'inline' | 'block' | 'surround' | 'float-top' | 'float-bottom'
 */
function resolveAnchorDisplay(anchor: Element): string {
  const behindDoc = anchor.getAttribute('behindDoc') === '1'

  // 检测 wrap type 子元素
  const wrapNone = getFirstChildByTag(anchor, NS.wp, 'wrapNone')
  const wrapSquare = getFirstChildByTag(anchor, NS.wp, 'wrapSquare')
  const wrapTight = getFirstChildByTag(anchor, NS.wp, 'wrapTight')
  const wrapThrough = getFirstChildByTag(anchor, NS.wp, 'wrapThrough')
  const wrapTopAndBottom = getFirstChildByTag(anchor, NS.wp, 'wrapTopAndBottom')

  if (wrapSquare || wrapTight || wrapThrough) {
    // 文字环绕模式
    return 'surround'
  }
  if (wrapTopAndBottom) {
    // 上下环绕 → 作为块级浮动处理
    return behindDoc ? 'float-bottom' : 'float-top'
  }
  if (wrapNone) {
    // 无环绕：根据 behindDoc 决定浮于文字上方/下方
    return behindDoc ? 'float-bottom' : 'float-top'
  }

  // 默认：浮于文字上方
  return behindDoc ? 'float-bottom' : 'float-top'
}
