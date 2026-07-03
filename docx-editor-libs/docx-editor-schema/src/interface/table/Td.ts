import { VerticalAlign } from '../../enum/VerticalAlign'
import { TdBorder, TdSlash } from '../../enum/table/Table'
import { IPadding } from '../Common'
import { IElement, IElementPosition } from '../Element'
import { IRow } from '../Row'

export type IBorderLineStyle = 'solid' | 'dashed' | 'dotted' | 'double' | 'none'

export interface IBorderLine {
  width: number
  color: string
  style: IBorderLineStyle
}

export type ITdBorderStyle = Partial<Record<TdBorder, IBorderLine>>

export interface ITd {
  conceptId?: string
  id?: string
  extension?: unknown
  externalId?: string
  x?: number
  y?: number
  width?: number
  height?: number
  colspan: number
  rowspan: number
  value: IElement[]
  trIndex?: number
  tdIndex?: number
  isLastRowTd?: boolean
  isLastColTd?: boolean
  isLastTd?: boolean
  rowIndex?: number
  colIndex?: number
  rowList?: IRow[]
  positionList?: IElementPosition[]
  verticalAlign?: VerticalAlign
  backgroundColor?: string
  borderTypes?: TdBorder[]
  borderStyle?: ITdBorderStyle
  slashTypes?: TdSlash[]
  padding?: IPadding
  mainHeight?: number // 内容 + 内边距高度
  realHeight?: number // 真实高度（包含跨列）
  realMinHeight?: number // 真实最小高度（包含跨列）
  disabled?: boolean // 内容不可编辑
  deletable?: boolean // 内容不可删除
}
