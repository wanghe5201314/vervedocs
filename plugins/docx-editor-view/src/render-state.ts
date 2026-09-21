import type { BlockNode, DocumentLayout, Rect } from './layout-types'
import { signBlock } from './block-signature'

interface BlockState {
  id: number
  signature: string
  rect: Rect
}

export interface RenderState {
  blocks: Map<string, BlockState>
  pageBlocks: Map<number, BlockState>
  pageSignatures: Map<number, string>
  geometry: string
}

let nextRenderId = 0

/** Separate a block's stable identity from its mutable paint signature. */
export function prepareRenderState(layout: DocumentLayout, previous?: RenderState): {
  state: RenderState
  dirty: number[]
} {
  const state: RenderState = {
    blocks: new Map(),
    pageBlocks: new Map(),
    pageSignatures: new Map(),
    geometry: JSON.stringify(layout.pages.map(p => [p.rect, p.contentRect, p.headerRect, p.footerRect]))
  }
  const dirty: number[] = []
  const visit = (source: BlockNode, key: string, x: number, y: number, topLevel: boolean): BlockNode => {
    // Header/footer and repeated table fragments can share source layout objects.
    // Never assign occurrence IDs into those shared objects or cached geometry.
    const b = { ...source, rect: { ...source.rect } }
    if (b.kind === 'table') {
      b.rows = b.rows.map((row, ri) => ({
        ...row,
        cells: row.cells.map((cell, ci) => ({
          ...cell,
          content: cell.content.map((child, bi) =>
            visit(child, `${key}/${ri}/${ci}/${bi}`, 0, 0, false))
        }))
      }))
    }
    const old = previous?.blocks.get(key)
    b.id = old?.id ?? ++nextRenderId
    const signature = signBlock(b, layout)
    const entry = {
      id: b.id, signature,
      rect: { ...b.rect, x: x + b.rect.x, y: y + b.rect.y }
    }
    state.blocks.set(key, entry)
    if (topLevel) state.pageBlocks.set(b.id, entry)
    if (!old || old.signature !== signature) dirty.push(b.id)
    return b
  }
  for (const page of layout.pages) {
    const parts: unknown[] = [page.rect, page.contentRect, page.headerRect, page.footerRect]
    const zone = (blocks: BlockNode[], name: string, origin: Rect) => blocks.map((block, index) => {
      const b = visit(block, `${page.index}/${name}/${index}`, origin.x, origin.y, true)
      parts.push([b.rect, state.pageBlocks.get(b.id)!.signature])
      return b
    })
    page.blocks = zone(page.blocks, 'main', page.contentRect)
    if (page.headerBlocks && page.headerRect) page.headerBlocks = zone(page.headerBlocks, 'header', page.headerRect)
    if (page.footerBlocks && page.footerRect) page.footerBlocks = zone(page.footerBlocks, 'footer', page.footerRect)
    state.pageSignatures.set(page.index, JSON.stringify(parts))
  }
  return { state, dirty }
}

/** Diff against the last painted frame, not the last edit queued in that frame. */
export function computeDirtyRect(
  painted: RenderState | undefined,
  next: RenderState,
  viewport: Rect
): Rect | null {
  if (!painted || painted.geometry !== next.geometry) return null
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity
  const include = (rect: Rect) => {
    left = Math.min(left, rect.x - 2)
    top = Math.min(top, rect.y - 2)
    right = Math.max(right, rect.x + rect.width + 2)
    bottom = Math.max(bottom, rect.y + rect.height + 2)
  }
  const ids = new Set([...painted.pageBlocks.keys(), ...next.pageBlocks.keys()])
  for (const id of ids) {
    const old = painted.pageBlocks.get(id)
    const current = next.pageBlocks.get(id)
    if (old && current && old.signature === current.signature &&
        JSON.stringify(old.rect) === JSON.stringify(current.rect)) continue
    if (old) include(old.rect)
    if (current) include(current.rect)
  }
  left = Math.max(left, viewport.x)
  top = Math.max(top, viewport.y)
  right = Math.min(right, viewport.x + viewport.width)
  bottom = Math.min(bottom, viewport.y + viewport.height)
  if (right <= left || bottom <= top) return { x: 0, y: 0, width: 0, height: 0 }
  return { x: left, y: top, width: right - left, height: bottom - top }
}
