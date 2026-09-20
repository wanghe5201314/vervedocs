/**
 * AnchorCollector —— 锚点收集纯函数
 *
 * 遍历 layout 收集批注组/修订锚点坐标，供批注/修订 overlay 绘制竖线。
 */

import type { BlockNode } from './layout-types'

/** 锚点坐标信息 */
export interface AnchorInfo {
  startX: number
  startY: number
  endX: number
  endY: number
  lineHeight: number
  endLineHeight?: number
  glyphHeight: number
  startGlyphTop: number
  endGlyphTop: number
}

/**
 * 遍历 block 列表，收集每个 groupId 所对应的锚点坐标（文档绝对坐标）。
 * @param blocks 块列表
 * @param originX 块列表原点 x
 * @param originY 块列表原点 y
 * @param result 收集结果的 Map
 */
export function collectGroupAnchors(
  blocks: BlockNode[],
  originX: number,
  originY: number,
  result: Map<string, AnchorInfo>
): void {
  for (const b of blocks) {
    if (b.kind === 'table') {
      for (const row of b.rows) {
        for (const cell of row.cells) {
          const cx = originX + b.rect.x + cell.rect.x + cell.contentPaddingLeft
          const cy = originY + b.rect.y + cell.rect.y + cell.contentPaddingTop + cell.verticalOffset
          collectGroupAnchors(cell.content, cx, cy, result)
        }
      }
      continue
    }
    if (b.kind !== 'paragraph') continue
    const bx = originX + b.rect.x
    const by = originY + b.rect.y
    for (const line of b.lines) {
      for (const inl of line.inlines) {
        if (!inl.groupIds?.length) continue
        const absX = bx + inl.x
        const absY = by + line.y
        const absEndX = absX + inl.width
        const absEndY = absY + line.height
        const glyphHeight = inl.size * 1.15
        const absGlyphTop = absY + line.baseline - inl.size * 0.875
        for (const gid of inl.groupIds) {
          const existing = result.get(gid)
          if (!existing) {
            result.set(gid, { startX: absX, startY: absY, endX: absEndX, endY: absEndY, lineHeight: line.height, endLineHeight: line.height, glyphHeight, startGlyphTop: absGlyphTop, endGlyphTop: absGlyphTop })
          } else {
            if (absY < existing.startY || (absY === existing.startY && absX < existing.startX)) {
              existing.startX = absX
              existing.startY = absY
              existing.lineHeight = line.height
              existing.startGlyphTop = absGlyphTop
            }
            if (absEndY > existing.endY || (absEndY === existing.endY && absEndX > existing.endX)) {
              existing.endX = absEndX
              existing.endY = absEndY
              existing.endLineHeight = line.height
              existing.endGlyphTop = absGlyphTop
            }
          }
        }
      }
    }
  }
}

/**
 * 遍历 block 列表，收集每个 revisionId 所对应的锚点坐标（文档绝对坐标）。
 * @param blocks 块列表
 * @param originX 块列表原点 x
 * @param originY 块列表原点 y
 * @param result 收集结果的 Map
 */
export function collectRevisionAnchors(
  blocks: BlockNode[],
  originX: number,
  originY: number,
  result: Map<string, AnchorInfo>
): void {
  for (const b of blocks) {
    if (b.kind === 'table') {
      for (const row of b.rows) {
        for (const cell of row.cells) {
          const cx = originX + b.rect.x + cell.rect.x + cell.contentPaddingLeft
          const cy = originY + b.rect.y + cell.rect.y + cell.contentPaddingTop + cell.verticalOffset
          collectRevisionAnchors(cell.content, cx, cy, result)
        }
      }
      continue
    }
    if (b.kind !== 'paragraph') continue
    const bx = originX + b.rect.x
    const by = originY + b.rect.y
    for (const line of b.lines) {
      for (const inl of line.inlines) {
        const revisionId = (inl.run as any)?.revisionId
        if (!revisionId) continue
        const absX = bx + inl.x
        const absY = by + line.y
        const absEndX = absX + inl.width
        const absEndY = absY + line.height
        const glyphHeight = inl.size * 1.15
        const absGlyphTop = absY + line.baseline - inl.size * 0.875
        const existing = result.get(revisionId)
        if (!existing) {
          result.set(revisionId, {
            startX: absX,
            startY: absY,
            endX: absEndX,
            endY: absEndY,
            lineHeight: line.height,
            endLineHeight: line.height,
            glyphHeight,
            startGlyphTop: absGlyphTop,
            endGlyphTop: absGlyphTop
          })
        } else {
          if (absY < existing.startY || (absY === existing.startY && absX < existing.startX)) {
            existing.startX = absX
            existing.startY = absY
            existing.lineHeight = line.height
            existing.startGlyphTop = absGlyphTop
          }
          if (absEndY > existing.endY || (absEndY === existing.endY && absEndX > existing.endX)) {
            existing.endX = absEndX
            existing.endY = absEndY
            existing.endLineHeight = line.height
            existing.endGlyphTop = absGlyphTop
          }
        }
      }
    }
  }
}
