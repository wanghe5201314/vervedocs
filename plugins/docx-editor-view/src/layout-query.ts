/**
 * LayoutQuery —— 布局查询纯函数
 *
 * 提供按 position 定位 inline / paragraph / line / hyperlink 等布局节点的工具函数。
 * 所有函数均不持有状态，调用方传入 DocumentLayout / blocks 即可。
 */

import type { DocumentLayout, BlockNode, InlineBox, LineBox, ParagraphBlock } from './layout-types'
import type { IPosition } from '@vervedoc/docx-editor-schema'
import { isSamePath } from '@vervedoc/docx-editor-schema'

/**
 * 按 position 在 layout 中查找所属 inline。
 * @param layout 文档布局
 * @param pos 待定位位置
 * @returns 命中的 InlineBox；未命中返回 null
 */
export function findInlineByPos(layout: DocumentLayout | null, pos: IPosition): InlineBox | null {
  if (!layout) return null
  for (const page of layout.pages) {
    const r = findInlineInBlocks(page.blocks, pos)
    if (r) return r
  }
  return null
}

/**
 * 在 block 列表中递归查找所属 inline（含表格单元格递归）。
 * @param blocks 块列表
 * @param pos 待定位位置
 * @returns 命中的 InlineBox；未命中返回 null
 */
export function findInlineInBlocks(blocks: BlockNode[], pos: IPosition): InlineBox | null {
  for (const b of blocks) {
    if (b.kind === 'paragraph') {
      for (const line of b.lines) {
        for (const inl of line.inlines) {
          if (isSamePath(inl.path, pos.path) && pos.offset >= inl.startOffset && pos.offset <= inl.endOffset) {
            return inl
          }
        }
      }
    } else if (b.kind === 'table') {
      for (const row of b.rows) {
        for (const cell of row.cells) {
          const r = findInlineInBlocks(cell.content, pos)
          if (r) return r
        }
      }
    }
  }
  return null
}

/**
 * 按 position 在 layout 中查找所属段落块。
 * @param layout 文档布局
 * @param pos 待定位位置
 * @returns 命中的 ParagraphBlock；未命中返回 null
 */
export function findParagraphByPos(layout: DocumentLayout | null, pos: IPosition): ParagraphBlock | null {
  if (!layout) return null
  for (const page of layout.pages) {
    const r = findParagraphInBlocks(page.blocks, pos)
    if (r) return r
  }
  return null
}

/**
 * 在 block 列表中递归查找所属段落块（含表格单元格递归）。
 * @param blocks 块列表
 * @param pos 待定位位置
 * @returns 命中的 ParagraphBlock；未命中返回 null
 */
export function findParagraphInBlocks(blocks: BlockNode[], pos: IPosition): ParagraphBlock | null {
  for (const b of blocks) {
    if (b.kind === 'paragraph') {
      for (const line of b.lines) {
        for (const inl of line.inlines) {
          if (isSamePath(inl.path, pos.path)) return b
        }
      }
    } else if (b.kind === 'table') {
      for (const row of b.rows) {
        for (const cell of row.cells) {
          const r = findParagraphInBlocks(cell.content, pos)
          if (r) return r
        }
      }
    }
  }
  return null
}

/**
 * 按 position 在 layout 中查找所属行盒。
 * @param layout 文档布局
 * @param pos 待定位位置
 * @returns 命中的 LineBox；未命中返回 null
 */
export function findLineByPos(layout: DocumentLayout | null, pos: IPosition): LineBox | null {
  if (!layout) return null
  for (const page of layout.pages) {
    const r = findLineInBlocks(page.blocks, pos)
    if (r) return r
  }
  return null
}

/**
 * 在 block 列表中递归查找所属行盒（含表格单元格递归）。
 * @param blocks 块列表
 * @param pos 待定位位置
 * @returns 命中的 LineBox；未命中返回 null
 */
export function findLineInBlocks(blocks: BlockNode[], pos: IPosition): LineBox | null {
  for (const b of blocks) {
    if (b.kind === 'paragraph') {
      for (const line of b.lines) {
        for (const inl of line.inlines) {
          if (isSamePath(inl.path, pos.path) && pos.offset >= inl.startOffset && pos.offset <= inl.endOffset) {
            return line
          }
        }
      }
    } else if (b.kind === 'table') {
      for (const row of b.rows) {
        for (const cell of row.cells) {
          const r = findLineInBlocks(cell.content, pos)
          if (r) return r
        }
      }
    }
  }
  return null
}

/**
 * 查找文档首个 inline（用于光标兜底定位到文档首）。
 * @param layout 文档布局
 * @returns 首个 InlineBox；空文档返回 null
 */
export function findFirstInline(layout: DocumentLayout | null): InlineBox | null {
  if (!layout) return null
  for (const page of layout.pages) {
    const r = findFirstInlineInBlocks(page.blocks)
    if (r) return r
  }
  return null
}

/**
 * 在 block 列表中递归查找首个 inline（含表格单元格递归）。
 * @param blocks 块列表
 * @returns 首个 InlineBox；未命中返回 null
 */
export function findFirstInlineInBlocks(blocks: BlockNode[]): InlineBox | null {
  for (const b of blocks) {
    if (b.kind === 'paragraph') {
      for (const line of b.lines) {
        if (line.inlines[0]) return line.inlines[0]
      }
    } else if (b.kind === 'table') {
      for (const row of b.rows) {
        for (const cell of row.cells) {
          const r = findFirstInlineInBlocks(cell.content)
          if (r) return r
        }
      }
    }
  }
  return null
}

/**
 * 查找文档末个 inline（用于光标定位到文档尾/全选终点）。
 * @param layout 文档布局
 * @returns 末个 InlineBox；空文档返回 null
 */
export function findLastInline(layout: DocumentLayout | null): InlineBox | null {
  if (!layout) return null
  let last: InlineBox | null = null
  for (const page of layout.pages) {
    findLastInlineInBlocks(page.blocks, (inl) => { last = inl })
  }
  return last
}

/**
 * 在 block 列表中递归遍历所有 inline，对每个 inline 调用回调（含表格单元格递归）。
 * @param blocks 块列表
 * @param onInline 每个 inline 的回调
 */
export function findLastInlineInBlocks(blocks: BlockNode[], onInline: (inl: InlineBox) => void): void {
  for (const b of blocks) {
    if (b.kind === 'paragraph') {
      for (const line of b.lines) {
        for (const inl of line.inlines) onInline(inl)
      }
    } else if (b.kind === 'table') {
      for (const row of b.rows) {
        for (const cell of row.cells) {
          findLastInlineInBlocks(cell.content, onInline)
        }
      }
    }
  }
}

/** 按 position 定位 inline，若属于超链接则返回其 URL（供 Ctrl+点击跳转） */
export function findHyperlinkByPos(layout: DocumentLayout | null, pos: IPosition): string | null {
  return findInlineByPos(layout, pos)?.hyperlink ?? null
}