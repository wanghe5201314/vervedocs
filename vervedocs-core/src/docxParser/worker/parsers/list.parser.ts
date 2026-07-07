import type { ParagraphStyle } from '../../types'
import { NumberingResolver } from '../numbering.resolver'

/**
 * 检测段落是否为列表项，并填充列表信息
 */
export function resolveListInfo(
  style: ParagraphStyle,
  numberingResolver: NumberingResolver
): void {
  if (!style.numId || style.numId === '0') return

  const level = style.listLevel ?? 0
  const numInfo = numberingResolver.resolve(style.numId, level)
  if (numInfo) {
    style.listType = numInfo.listType
    style.listStyle = numInfo.listStyle
    style.listLevel = numInfo.level
  }
}
