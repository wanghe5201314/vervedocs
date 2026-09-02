/**
 * VerveDocs View —— CaretRect
 *
 * 由 IPosition -> 屏幕坐标的光标矩形（文档坐标系，未减 scrollY）。
 * 用于绘制光标闪烁与选区。
 */

import type { IPosition, Path } from '@vervedoc/docx-editor-schema'
import { isSamePath } from '@vervedoc/docx-editor-schema'
import type {
  BlockNode, DocumentLayout, ParagraphBlock, TableBlock, InlineBox
} from './layout-types'

export interface CaretRect {
  /** 文档坐标（未减 scrollY） */
  x: number
  y: number
  /** 光标高度 = line.height */
  height: number
}

export function locateCaret(layout: DocumentLayout, pos: IPosition): CaretRect | null {
  for (const page of layout.pages) {
    const originX = page.contentRect.x
    const originY = page.contentRect.y
    const r = locateInBlocks(page.blocks, pos, originX, originY)
    if (r) return r
  }
  return null
}

function locateInBlocks(blocks: BlockNode[], pos: IPosition, ox: number, oy: number): CaretRect | null {
  for (const b of blocks) {
    const bx = ox + b.rect.x
    const by = oy + b.rect.y
    if (b.kind === 'paragraph') {
      const r = locateInParagraph(b, pos, bx, by)
      if (r) return r
    } else if (b.kind === 'table') {
      const r = locateInTable(b, pos, bx, by)
      if (r) return r
    }
  }
  return null
}

function locateInParagraph(b: ParagraphBlock, pos: IPosition, bx: number, by: number): CaretRect | null {
  for (const line of b.lines) {
    for (const inl of line.inlines) {
      if (!isSamePath(inl.path, pos.path)) continue
      if (pos.offset < inl.startOffset || pos.offset > inl.endOffset) continue
      const localX = charOffsetToX(inl, pos.offset - inl.startOffset)
      return {
        x: bx + localX,
        y: by + line.y,
        height: line.height
      }
    }
  }
  // 段落有一个 line 但没匹配到任何 inline（空段）
  const first = b.lines[0]
  if (first && b.lines.every(ln => ln.inlines.length === 0)) {
    return { x: bx + first.x, y: by + first.y, height: first.height }
  }
  return null
}

function locateInTable(b: TableBlock, pos: IPosition, tbx: number, tby: number): CaretRect | null {
  for (const row of b.rows) {
    for (const cell of row.cells) {
      // 光标 path 必须以 cell.contentPath 为前缀
      if (!pathStartsWith(pos.path, cell.contentPath)) continue
      const cx = tbx + cell.rect.x
      const cy = tby + row.rect.y
      const contentOX = cx + cell.contentPaddingLeft
      const contentOY = cy + cell.contentPaddingTop + cell.verticalOffset
      const r = locateInBlocks(cell.content, pos, contentOX, contentOY)
      if (r) return r
    }
  }
  return null
}

function pathStartsWith(path: Path, prefix: Path): boolean {
  if (path.length < prefix.length) return false
  for (let i = 0; i < prefix.length; i++) {
    if (path[i] !== prefix[i]) return false
  }
  return true
}

/**
 * 在 inline 内部按 offset 求 x（相对块本地）。
 * 简化：按字符累加 charWidthApprox
 */
function charOffsetToX(inl: InlineBox, offsetInInline: number): number {
  if (offsetInInline <= 0) return inl.x
  if (offsetInInline >= inl.text.length) return inl.x + inl.width
  let x = inl.x
  for (let i = 0; i < offsetInInline; i++) {
    x += charWidthApprox(inl.text[i], inl.size, inl.bold)
  }
  return x
}

function charWidthApprox(ch: string, size: number, bold?: boolean): number {
  const isCJK = /[\u3000-\u9fff\uac00-\ud7af\uf900-\ufaff]/.test(ch)
  const base = isCJK ? size : size * 0.55
  return bold ? base * 1.02 : base
}
