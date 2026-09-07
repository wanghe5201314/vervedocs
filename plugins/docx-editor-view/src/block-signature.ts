/**
 * 块签名（用于跨帧复用 bitmap）
 */

import type { BlockNode, ParagraphBlock } from './layout-types'

/**
 * 计算块的签名（用于跨帧复用 bitmap）：按块类型拼接关键字段为字符串。
 * @param b 块
 * @returns 块签名字符串
 */
export function signBlock(b: BlockNode): string {
  if (b.kind === 'paragraph') return signParagraph(b)
  if (b.kind === 'image') {
    const img = b.block as unknown as { value?: string; rotate?: number; imgDisplay?: string }
    return `img|${img.value ?? ''}|${b.rect.width}x${b.rect.height}|r${img.rotate ?? 0}|d${img.imgDisplay ?? 'block'}`
  }
  if (b.kind === 'pageBreak') return `pb|${b.parentPath.join('.')}|${b.indexInParent}`
  if (b.kind === 'separator') return `sep|${b.parentPath.join('.')}|${b.indexInParent}|${b.rect.width}x${b.rect.height}`
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
      runsKey.push(`${inl.text}#${inl.font}|${inl.size}|${inl.bold ? 1 : 0}|${inl.italic ? 1 : 0}|${inl.color}|${inl.bgColor ?? ''}|${inl.strikeout ? 1 : 0}|${inl.underline ? 1 : 0}|ls=${inl.letterSpacing ?? 0}`)
    }
  }
  const bulletKey = b.bulletText
    ? `~b:${b.bulletKind ?? ''}|${b.bulletText ?? ''}|${b.bulletFont ?? ''}|${b.bulletSize ?? ''}|${b.bulletColor ?? ''}|${b.bulletBold ? 1 : 0}|bx=${b.bulletX ?? ''}`
    : ''
  const si = b.surroundImage
  const surroundKey = si
    ? `~si:${(si.block as unknown as { value?: string }).value ?? ''}|${si.rect.width}x${si.rect.height}|r${(si.block as unknown as { rotate?: number }).rotate ?? 0}`
    : ''
  return `p|${b.paragraphKind}|w=${Math.round(b.rect.width)}|${paraKey}|${runsKey.join('~')}${bulletKey}${surroundKey}`
}