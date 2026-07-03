import { IElement, IRowElement, SeparatorType } from '@wanghe1995/docx-editor-schema'

type SeparatorLikeElement = Pick<IElement, 'dashArray' | 'separatorType' | 'separatorLineWidth'> | Pick<IRowElement, 'dashArray' | 'separatorType' | 'separatorLineWidth'>

const DEFAULT_SEPARATOR_TYPE: SeparatorType = 'solid'
const DEFAULT_DASH_ARRAY: number[] = [0, 0]

export function getSeparatorType(element: SeparatorLikeElement): SeparatorType {
  return element.separatorType || DEFAULT_SEPARATOR_TYPE
}

export function getSeparatorLineWidth(element: SeparatorLikeElement, defaultLineWidth: number): number {
  const lineWidth = Number(element.separatorLineWidth)
  if (Number.isFinite(lineWidth) && lineWidth > 0) {
    return lineWidth
  }
  return defaultLineWidth
}

export function getSeparatorDashArray(element: SeparatorLikeElement, type = getSeparatorType(element)): number[] {
  if (Array.isArray(element.dashArray) && element.dashArray.length) {
    return element.dashArray
  }
  if (type === 'dotted') return [1, 1]
  if (type === 'dashed') return [6, 3]
  return DEFAULT_DASH_ARRAY
}

export function getSeparatorRenderHeight(element: SeparatorLikeElement, defaultLineWidth: number): number {
  const lineWidth = getSeparatorLineWidth(element, defaultLineWidth)
  const type = getSeparatorType(element)
  switch (type) {
    case 'double':
      return lineWidth * 3 + 2
    case 'triple':
      return lineWidth * 5 + 4
    case 'wavy':
      return Math.max(lineWidth * 4, 8)
    case 'shadow':
      return lineWidth + 3
    case 'emboss':
      return lineWidth * 2 + 3
    default:
      return Math.max(lineWidth, 1)
  }
}
