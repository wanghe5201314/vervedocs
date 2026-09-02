/**
 * VerveDocs View —— HitTest
 *
 * 屏幕坐标 -> IPosition。
 * 新坐标系：block/table/cell 均使用相对父容器坐标；命中时递归传入原点。
 */

import type { IPosition, Path } from '@vervedoc/docx-editor-schema'
import type { BlockNode, DocumentLayout, LineBox, ParagraphBlock, TableBlock } from './layout-types'

export function hitTest(layout: DocumentLayout, docX: number, docY: number): IPosition | null {
  for (const page of layout.pages) {
    if (docY < page.rect.y || docY > page.rect.y + page.rect.height) continue
    const originX = page.contentRect.x
    const originY = page.contentRect.y
    const p = hitBlocks(page.blocks, docX, docY, originX, originY)
    if (p) return p
  }
  return null
}

function hitBlocks(blocks: BlockNode[], x: number, y: number, ox: number, oy: number): IPosition | null {
  for (const b of blocks) {
    const bx = ox + b.rect.x
    const by = oy + b.rect.y
    if (y < by || y > by + b.rect.height) continue
    if (b.kind === 'paragraph') {
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

function hitParagraph(b: ParagraphBlock, lx: number, ly: number, _pb: ParagraphBlock): IPosition | null {
  for (const line of b.lines) {
    if (ly < line.y || ly > line.y + line.height) continue
    return hitLine(line, lx)
  }
  const last = b.lines[b.lines.length - 1]
  if (last) return hitLine(last, lx)
  return null
}

function hitLine(line: LineBox, lx: number): IPosition | null {
  if (line.inlines.length === 0) return null
  for (const inl of line.inlines) {
    if (lx >= inl.x && lx <= inl.x + inl.width) {
      let cursor = inl.x
      for (let i = 0; i < inl.text.length; i++) {
        const ch = inl.text[i]
        const cw = charWidthApprox(ch, inl.size, inl.bold)
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

function charWidthApprox(ch: string, size: number, bold?: boolean): number {
  const isCJK = /[\u3000-\u9fff\uac00-\ud7af\uf900-\ufaff]/.test(ch)
  const base = isCJK ? size : size * 0.55
  return bold ? base * 1.02 : base
}
