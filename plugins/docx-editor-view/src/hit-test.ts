/**
 * VerveDocs View —— HitTest
 *
 * 屏幕坐标 -> IPosition。
 * 新坐标系：block/table/cell 均使用相对父容器坐标；命中时递归传入原点。
 */

import type { IPosition, Path } from '@vervedoc/docx-editor-schema'
import type { BlockNode, DocumentLayout, LineBox, ParagraphBlock, TableBlock } from './layout-types'
import type { Zone } from './widgets/header-footer-widget'
import { getSharedMeasure } from './text-measure'

/**
 * 命中测试主入口：根据文档坐标（未减 scrollY）返回对应位置。
 * @param layout 文档布局
 * @param docX 文档 X 坐标
 * @param docY 文档 Y 坐标
 * @param zone 当前编辑区域，默认 'main'；'header'/'footer' 时仅命中对应区域块
 * @returns 命中位置；未命中返回 null
 */
export function hitTest(layout: DocumentLayout, docX: number, docY: number, zone: Zone = 'main'): IPosition | null {
  for (const page of layout.pages) {
    if (docY < page.rect.y || docY > page.rect.y + page.rect.height) continue
    let blocks: BlockNode[]
    let originX: number
    let originY: number
    if (zone === 'header' && page.headerBlocks && page.headerRect) {
      if (docY < page.headerRect.y || docY > page.headerRect.y + page.headerRect.height) return null
      blocks = page.headerBlocks
      originX = page.headerRect.x
      originY = page.headerRect.y
    } else if (zone === 'footer' && page.footerBlocks && page.footerRect) {
      if (docY < page.footerRect.y || docY > page.footerRect.y + page.footerRect.height) return null
      blocks = page.footerBlocks
      originX = page.footerRect.x
      originY = page.footerRect.y
    } else {
      blocks = page.blocks
      originX = page.contentRect.x
      originY = page.contentRect.y
    }
    const p = hitBlocks(blocks, docX, docY, originX, originY)
    if (p) return p
  }
  return null
}

/**
 * 在指定原点偏移下遍历块列表进行命中测试。
 * @param blocks 块节点列表
 * @param x 文档 X 坐标
 * @param y 文档 Y 坐标
 * @param ox 父容器原点 X
 * @param oy 父容器原点 Y
 * @returns 命中位置；未命中返回 null
 */
function hitBlocks(blocks: BlockNode[], x: number, y: number, ox: number, oy: number): IPosition | null {
  for (const b of blocks) {
    const bx = ox + b.rect.x
    const by = oy + b.rect.y
    if (y < by || y > by + b.rect.height) continue
    if (b.kind === 'paragraph') {
      if (b.surroundImage) {
        const si = b.surroundImage
        const six = bx + si.rect.x
        if (x >= six && x <= six + si.rect.width && y >= by && y <= by + si.rect.height) {
          const p: Path = [...si.parentPath, si.indexInParent]
          return { path: p, offset: 0 }
        }
      }
      const r = hitParagraph(b, x - bx, y - by, b)
      if (r) return r
    } else if (b.kind === 'table') {
      const r = hitTable(b, x, y, bx, by)
      if (r) return r
    } else if (b.kind === 'image') {
      const p: Path = [...b.parentPath, b.indexInParent]
      return { path: p, offset: 0 }
    }
  }
  return null
}

/**
 * 在段落内进行命中测试，返回所在行的命中位置。
 * @param b 段落块
 * @param lx 相对块本地 X 坐标
 * @param ly 相对块本地 Y 坐标
 * @param _pb 段落块（保留参数，当前未使用）
 * @returns 命中位置；未命中返回 null
 */
function hitParagraph(b: ParagraphBlock, lx: number, ly: number, _pb: ParagraphBlock): IPosition | null {
  for (const line of b.lines) {
    if (ly < line.y || ly > line.y + line.height) continue
    return hitLine(line, lx)
  }
  const last = b.lines[b.lines.length - 1]
  if (last) return hitLine(last, lx)
  return null
}

/**
 * 在单行内进行命中测试，按字符宽度逐字定位光标偏移。
 * @param line 行盒
 * @param lx 相对块本地 X 坐标
 * @returns 命中位置；空行返回 null
 */
function hitLine(line: LineBox, lx: number): IPosition | null {
  if (line.inlines.length === 0) return null
  const measure = getSharedMeasure()
  for (const inl of line.inlines) {
    if (lx >= inl.x && lx <= inl.x + inl.width) {
      let cursor = inl.x
      const ls = inl.letterSpacing ?? 0
      for (let i = 0; i < inl.text.length; i++) {
        const ch = inl.text[i]
        const cw = measure.charWidth(ch, inl.font, inl.size, inl.bold, inl.italic) + ls
        if (lx < cursor + cw / 2) return { path: inl.path, offset: inl.startOffset + i }
        cursor += cw
      }
      return { path: inl.path, offset: inl.endOffset }
    }
  }
  const first = line.inlines[0]
  const last = line.inlines[line.inlines.length - 1]
  if (lx < first.x) return { path: first.path, offset: first.startOffset }
  return { path: last.path, offset: last.endOffset }
}

/**
 * 在表格内进行命中测试，递归进入命中的单元格内容。
 * @param b 表格块
 * @param x 文档 X 坐标
 * @param y 文档 Y 坐标
 * @param tbx 表格原点 X
 * @param tby 表格原点 Y
 * @returns 命中位置；未命中返回 null
 */
function hitTable(b: TableBlock, x: number, y: number, tbx: number, tby: number): IPosition | null {
  for (const row of b.rows) {
    const ry = tby + row.rect.y
    if (y < ry || y > ry + row.rect.height) continue
    for (const cell of row.cells) {
      const cx = tbx + cell.rect.x
      if (x < cx || x > cx + cell.rect.width) continue
      const contentOX = cx + cell.contentPaddingLeft
      const contentOY = ry + cell.contentPaddingTop + cell.verticalOffset
      const r = hitBlocks(cell.content, x, y, contentOX, contentOY)
      if (r) return r
      return { path: cell.contentPath.concat(0), offset: 0 }
    }
  }
  return null
}

