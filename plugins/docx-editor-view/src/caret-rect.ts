/**
 * VerveDocs View —— CaretRect
 *
 * 由 IPosition -> 屏幕坐标的光标矩形（文档坐标系，未减 scrollY）。
 * 用于绘制光标闪烁与选区。
 */

import type { IPosition, Path } from '@vervedoc/docx-editor-schema'
import { isSamePath, comparePosition } from '@vervedoc/docx-editor-schema'
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

export interface SelectionRect {
  /** 文档坐标（未减 scrollY） */
  x: number
  y: number
  width: number
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
      // 光标高度按字形（字号 * 1.15），顶部对齐文字 ascent，上下各多延伸一点，符合 Word 风格
      return {
        x: bx + localX,
        y: by + line.y + line.baseline - inl.size * 0.875,
        height: inl.size * 1.15
      }
    }
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
  const ls = inl.letterSpacing ?? 0
  for (let i = 0; i < offsetInInline; i++) {
    x += charWidthApprox(inl.text[i], inl.size, inl.bold) + ls
  }
  return x
}

function charWidthApprox(ch: string, size: number, bold?: boolean): number {
  const isCJK = /[\u3000-\u9fff\uac00-\ud7af\uf900-\ufaff]/.test(ch)
  const base = isCJK ? size : size * 0.55
  return bold ? base * 1.02 : base
}

/* -------------------- 选区矩形 -------------------- */

/**
 * 计算从 start 到 end（文档顺序）的选区矩形列表（文档坐标，未减 scrollY）。
 * 遍历所有 inline，收集与 [start, end] 相交的部分，同行 inline 合并为一个矩形。
 */
export function computeSelectionRects(layout: DocumentLayout, start: IPosition, end: IPosition): SelectionRect[] {
  const rects: SelectionRect[] = []
  for (const page of layout.pages) {
    collectSelectionInBlocks(page.blocks, page.contentRect.x, page.contentRect.y, start, end, rects)
  }
  return rects
}

function collectSelectionInBlocks(
  blocks: BlockNode[], ox: number, oy: number,
  start: IPosition, end: IPosition, rects: SelectionRect[]
): void {
  for (const b of blocks) {
    const bx = ox + b.rect.x
    const by = oy + b.rect.y
    if (b.kind === 'paragraph') {
      collectSelectionInParagraph(b, bx, by, start, end, rects)
    } else if (b.kind === 'table') {
      for (const row of b.rows) {
        for (const cell of row.cells) {
          const cx = bx + cell.rect.x + cell.contentPaddingLeft
          const cy = by + cell.rect.y + cell.contentPaddingTop + cell.verticalOffset
          collectSelectionInBlocks(cell.content, cx, cy, start, end, rects)
        }
      }
    }
  }
}

function collectSelectionInParagraph(
  b: ParagraphBlock, bx: number, by: number,
  start: IPosition, end: IPosition, rects: SelectionRect[]
): void {
  for (const line of b.lines) {
    // 同行选中片段合并：记录当前合并段的 [leftX, rightX]
    let segLeft: number | null = null
    let segRight = 0
    const flush = () => {
      if (segLeft != null) {
        rects.push({ x: segLeft, y: by + line.y, width: segRight - segLeft, height: line.height })
        segLeft = null
      }
    }
    for (const inl of line.inlines) {
      const inlStart: IPosition = { path: inl.path, offset: inl.startOffset }
      const inlEnd: IPosition = { path: inl.path, offset: inl.endOffset }
      // 不相交
      if (comparePosition(inlEnd, start) <= 0) continue
      if (comparePosition(inlStart, end) >= 0) { flush(); continue }
      // 裁剪起点
      let clipStartOff: number
      if (comparePosition(inlStart, start) >= 0) {
        clipStartOff = inl.startOffset
      } else {
        clipStartOff = isSamePath(inl.path, start.path) ? start.offset : inl.startOffset
      }
      // 裁剪终点
      let clipEndOff: number
      if (comparePosition(inlEnd, end) <= 0) {
        clipEndOff = inl.endOffset
      } else {
        clipEndOff = isSamePath(inl.path, end.path) ? end.offset : inl.endOffset
      }
      const x1 = bx + charOffsetToX(inl, clipStartOff - inl.startOffset)
      const x2 = bx + charOffsetToX(inl, clipEndOff - inl.startOffset)
      if (segLeft == null) {
        segLeft = x1
        segRight = x2
      } else {
        // 同行连续 inline 合并（若有间隙也合并，视觉为整块高亮）
        if (x1 <= segRight) segRight = Math.max(segRight, x2)
        else { flush(); segLeft = x1; segRight = x2 }
      }
    }
    flush()
  }
}
