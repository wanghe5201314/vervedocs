import { RowFlex } from '../enum/row'
import { IElement, IElementMetrics } from './element'

export type IRowElement = IElement & {
  metrics: IElementMetrics
  style: string
  left?: number
}

export interface IRow {
  width: number
  height: number
  ascent: number
  rowFlex?: RowFlex
  startIndex: number
  isPageBreak?: boolean
  isList?: boolean
  listIndex?: number
  offsetX?: number
  offsetY?: number
  elementList: IRowElement[]
  isWidthNotEnough?: boolean
  rowIndex: number
  isSurround?: boolean
  // 分栏容器行属性
  isColumnContainer?: boolean
  columnRowLists?: IRow[][]
  columnWidths?: number[]
  columnGap?: number
  columnSeparator?: boolean
  columnId?: string
  columnIndex?: number
}
