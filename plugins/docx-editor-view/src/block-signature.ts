/**
 * 块签名（用于跨帧复用 bitmap）
 */

import type { BlockNode, DocumentLayout, ParagraphBlock } from './layout-types'

export function chartTableSignature(b: BlockNode, layout: DocumentLayout): string {
  if (b.kind !== 'chart') return ''
  const source = (b.block as unknown as {
    block?: { chartBlock?: { dataSource?: { type?: string; tableId?: string } } }
  }).block?.chartBlock?.dataSource
  if (source?.type !== 'table') return ''
  for (const page of layout.pages) {
    for (const block of page.blocks) {
      if (block.kind === 'table' && block.block.id === source.tableId) return JSON.stringify(block.block)
    }
  }
  return ''
}

/**
 * 计算块的签名（用于跨帧复用 bitmap）：按块类型拼接关键字段为字符串。
 * @param b 块
 * @returns 块签名字符串
 */
export function signBlock(b: BlockNode, layout?: DocumentLayout): string {
  // Include all paint inputs, but not the block's placement on the page.
  // Source objects are mutable, so callers must retain the string, not the object.
  if (b.kind === 'table') {
    const { trList: _rows, ...attrs } = b.block as unknown as Record<string, unknown>
    return JSON.stringify([attrs, b.rect.width, b.rect.height, b.colWidths,
      b.rows.map(row => [row.rect, row.cells.map(cell => {
        const { value: _content, ...cellAttrs } = cell.cell
        return [cellAttrs, cell.rect, cell.contentPaddingTop, cell.contentPaddingLeft,
          cell.verticalOffset, cell.content.map(child => [child.rect, signBlock(child, layout)])]
      })])])
  }
  if (b.kind === 'paragraph') return signParagraph(b)
  if (b.kind === 'image') {
    const img = b.block as unknown as { value?: string; rotate?: number; imgDisplay?: string }
    return `img|${img.value ?? ''}|${b.rect.width}x${b.rect.height}|r${img.rotate ?? 0}|d${img.imgDisplay ?? 'block'}`
  }
  if (b.kind === 'pageBreak') return `pb|${b.parentPath.join('.')}|${b.indexInParent}`
  if (b.kind === 'separator') return JSON.stringify([b.kind, b.block, b.rect.width, b.rect.height])
  if (b.kind === 'block') {
    const el = b.block as unknown as { id?: string }
    return `blk|${el.id ?? ''}|${b.parentPath.join('.')}|${b.indexInParent}|${b.rect.width}x${b.rect.height}`
  }
  if (b.kind === 'chart') {
    const el = b.block as unknown as { id?: string; block?: { chartBlock?: Record<string, unknown> } }
    return `chart|${el.id ?? ''}|${b.rect.width}x${b.rect.height}|${JSON.stringify(el.block?.chartBlock ?? '')}|${layout ? chartTableSignature(b, layout) : ''}`
  }
  return `unk`
}

/**
 * 计算段落块签名：拼接段落属性 + 各 inline 文本/字体/样式 + 项目符号 + 环绕图片关键字段。
 * @param b 段落块
 * @returns 段落签名字符串
 */
export function signParagraph(b: ParagraphBlock): string {
  const attrs = b.block ?? (b.lines[0]?.inlines[0]?.run) ?? null
  const a = attrs as unknown as Record<string, unknown> | null
  const paraKey = a
    ? `${a.rowFlex ?? ''}|${a.paragraphStyleId ?? ''}|${a.lineHeight ?? ''}|${a.lineHeightRule ?? ''}|${a.paragraphFirstLineIndent ?? ''}|${a.paragraphIndentLeft ?? ''}|${a.paragraphIndentRight ?? ''}|${a.indentHanging ?? ''}|${a.paragraphSpacingBefore ?? ''}|${a.paragraphSpacingAfter ?? ''}`
    : ''
  const runsKey: string[] = []
  for (const line of b.lines) {
    for (const inl of line.inlines) {
      const { run, path: _path, ...paint } = inl
      // Revision colors and decorations are painted from the run, not inline styles.
      const revision = run && 'revisionId' in run && run.revisionId
        ? [run.revisionId, run.revisionType, run.revisionAuthor]
        : null
      runsKey.push(JSON.stringify([line.x, line.y, line.height, line.baseline, paint, revision]))
    }
  }
  const bulletKey = b.bulletText
    ? `~b:${b.bulletKind ?? ''}|${b.bulletText ?? ''}|${b.bulletFont ?? ''}|${b.bulletSize ?? ''}|${b.bulletColor ?? ''}|${b.bulletBold ? 1 : 0}|bx=${b.bulletX ?? ''}|bw=${b.bulletWidth ?? ''}`
    : ''
  const si = b.surroundImage
  const surroundKey = si
    ? `~si:${JSON.stringify(si.rect)}|${signBlock(si)}`
    : ''
  return `p|${b.paragraphKind}|${b.rect.width}x${b.rect.height}|${paraKey}|${runsKey.join('~')}${bulletKey}${surroundKey}`
}
