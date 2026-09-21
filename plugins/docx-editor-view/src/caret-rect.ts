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
import type { Zone } from './widgets/header-footer-widget'
import { getSharedMeasure } from './text-measure'

/**
 * 光标矩形（文档坐标系，未减 scrollY），用于绘制光标闪烁。
 */
export interface CaretRect {
  /** 文档坐标（未减 scrollY） */
  x: number
  y: number
  /** 光标高度 = line.height */
  height: number
}

/**
 * 选区矩形（文档坐标系，未减 scrollY），用于绘制选区高亮。
 */
export interface SelectionRect {
  /** 文档坐标 X（未减 scrollY） */
  x: number
  /** 文档坐标 Y（未减 scrollY） */
  y: number
  /** 矩形宽度 */
  width: number
  /** 矩形高度 = line.height */
  height: number
}

/**
 * 定位光标矩形：根据位置返回光标在文档坐标系中的矩形。
 * @param layout 文档布局
 * @param pos 光标位置
 * @param zone 当前编辑区域，默认 'main'；'header'/'footer' 时在对应区域块中定位
 * @returns 光标矩形；未找到返回 null
 */
export function locateCaret(layout: DocumentLayout, pos: IPosition, zone: Zone = 'main'): CaretRect | null {
  for (const page of layout.pages) {
    let blocks: BlockNode[]
    let originX: number
    let originY: number
    if (zone === 'header' && page.headerBlocks && page.headerRect) {
      blocks = page.headerBlocks
      originX = page.headerRect.x
      originY = page.headerRect.y
    } else if (zone === 'footer' && page.footerBlocks && page.footerRect) {
      blocks = page.footerBlocks
      originX = page.footerRect.x
      originY = page.footerRect.y
    } else {
      blocks = page.blocks
      originX = page.contentRect.x
      originY = page.contentRect.y
    }
    const r = locateInBlocks(blocks, pos, originX, originY)
    if (r) return r
  }
  return null
}

/**
 * 在指定原点偏移下遍历块列表定位光标矩形。
 * @param blocks 块节点列表
 * @param pos 光标位置
 * @param ox 父容器原点 X
 * @param oy 父容器原点 Y
 * @returns 光标矩形；未找到返回 null
 */
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

/**
 * 在段落内定位光标矩形，按行和 inline 匹配位置。
 * @param b 段落块
 * @param pos 光标位置
 * @param bx 段落原点 X
 * @param by 段落原点 Y
 * @returns 光标矩形；未找到返回 null
 */
function locateInParagraph(b: ParagraphBlock, pos: IPosition, bx: number, by: number): CaretRect | null {
  for (const line of b.lines) {
    for (const inl of line.inlines) {
      if (!isSamePath(inl.path, pos.path)) continue
      if (pos.offset < inl.startOffset || pos.offset > inl.endOffset) continue
      const localX = charOffsetToX(inl, pos.offset - inl.startOffset)
      // 光标高度按行高，顶部对齐行顶
      return {
        x: bx + localX,
        y: by + line.y,
        height: line.height
      }
    }
  }
  return null
}


/**
 * 在表格内定位光标矩形，递归进入匹配的单元格内容。
 * @param b 表格块
 * @param pos 光标位置
 * @param tbx 表格原点 X
 * @param tby 表格原点 Y
 * @returns 光标矩形；未找到返回 null
 */
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

/**
 * 判断路径 path 是否以 prefix 为前缀。
 * @param path 待判断路径
 * @param prefix 前缀路径
 * @returns 是前缀返回 true，否则返回 false
 */
function pathStartsWith(path: Path, prefix: Path): boolean {
  if (path.length < prefix.length) return false
  for (let i = 0; i < prefix.length; i++) {
    if (path[i] !== prefix[i]) return false
  }
  return true
}

/**
 * 在 inline 内部按 offset 求 x（相对块本地）。
 * 使用真实 measureText 度量（与 layout 阶段一致），避免估算错位。
 */
function charOffsetToX(inl: InlineBox, offsetInInline: number): number {
  if (offsetInInline <= 0) return inl.x
  if (offsetInInline >= inl.text.length) return inl.x + inl.width
  const measure = getSharedMeasure()
  let x = inl.x
  const ls = inl.letterSpacing ?? 0
  for (let i = 0; i < offsetInInline; i++) {
    x += measure.charWidth(inl.text[i], inl.font, inl.size, inl.bold, inl.italic) + ls
  }
  return x
}

/* -------------------- 选区矩形 -------------------- */

/**
 * 计算从 start 到 end（文档顺序）的选区矩形列表（文档坐标，未减 scrollY）。
 * 遍历所有 inline，收集与 [start, end] 相交的部分，同行 inline 合并为一个矩形。
 * @param layout 文档布局
 * @param start 选区起点
 * @param end 选区终点
 * @param zone 当前编辑区域，默认 'main'；'header'/'footer' 时在对应区域块中收集
 * @returns 选区矩形列表
 */
export function computeSelectionRects(layout: DocumentLayout, start: IPosition, end: IPosition, zone: Zone = 'main'): SelectionRect[] {
  const rects: SelectionRect[] = []
  for (const page of layout.pages) {
    let blocks: BlockNode[]
    let originX: number
    let originY: number
    if (zone === 'header' && page.headerBlocks && page.headerRect) {
      blocks = page.headerBlocks
      originX = page.headerRect.x
      originY = page.headerRect.y
    } else if (zone === 'footer' && page.footerBlocks && page.footerRect) {
      blocks = page.footerBlocks
      originX = page.footerRect.x
      originY = page.footerRect.y
    } else {
      blocks = page.blocks
      originX = page.contentRect.x
      originY = page.contentRect.y
    }
    collectSelectionInBlocks(blocks, originX, originY, start, end, rects)
  }
  return rects
}

/**
 * 在指定原点偏移下遍历块列表收集选区矩形。
 * @param blocks 块节点列表
 * @param ox 父容器原点 X
 * @param oy 父容器原点 Y
 * @param start 选区起点
 * @param end 选区终点
 * @param rects 收集结果数组
 */
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

/**
 * 在段落内收集选区矩形，同行 inline 合并为一个矩形。
 * @param b 段落块
 * @param bx 段落原点 X
 * @param by 段落原点 Y
 * @param start 选区起点
 * @param end 选区终点
 * @param rects 收集结果数组
 */
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
