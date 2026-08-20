import { ImageDisplay } from '../enum/Common'
import { ControlComponent } from '../enum/Control'
import { ElementType } from '../enum/Element'
import { ListStyle, ListType } from '../enum/List'
import { RowFlex } from '../enum/Row'
import { TitleLevel } from '../enum/Title'
import { TableBorder } from '../enum/table/Table'
import { IArea } from './Area'
import { IBlock } from './Block'
import { ICheckbox } from './Checkbox'
import { IPadding } from './Common'
import { IControl } from './Control'
import { IRadio } from './Radio'
import { SeparatorType } from './Separator'
import { ITextDecoration } from './Text'
import { ITitle } from './Title'
import { IColgroup } from './table/Colgroup'
import { ITr } from './table/Tr'

export interface IElementBasic {
  id?: string
  type?: ElementType
  value: string
  extension?: unknown
  externalId?: string
}

export interface IElementStyle {
  font?: string
  size?: number
  characterScale?: number
  width?: number
  height?: number
  bold?: boolean
  color?: string
  highlight?: string
  paragraphColor?: string
  italic?: boolean
  underline?: boolean
  strikeout?: boolean
  rowFlex?: RowFlex
  rowMargin?: number
  paragraphSpacingBefore?: number
  paragraphSpacingAfter?: number
  paragraphIndentLeft?: number
  paragraphFirstLineIndent?: number
  lineHeight?: number
  letterSpacing?: number
  textDecoration?: ITextDecoration
}

export interface IElementGroup {
  groupIds?: string[]
}

export interface ITitleElement {
  valueList?: IElement[]
  level?: TitleLevel
  titleId?: string
  title?: ITitle
}

export interface IListElement {
  valueList?: IElement[]
  listType?: ListType
  listStyle?: ListStyle
  listId?: string
  listWrap?: boolean
  listLevel?: number
  listIndent?: number
  listHanging?: number
}

export interface ITableAttr {
  colgroup?: IColgroup[]
  trList?: ITr[]
  borderType?: TableBorder
  borderColor?: string
  borderWidth?: number
  borderExternalWidth?: number
  tdPadding?: IPadding
}

export interface ITableRule {
  tableToolDisabled?: boolean
}

export interface ITableElement {
  tdId?: string
  trId?: string
  tableId?: string
  conceptId?: string
  pagingId?: string // 用于区分拆分的表格同属一个源表格
  pagingIndex?: number // 拆分的表格索引
}

export type ITable = ITableAttr & ITableRule & ITableElement

export interface IHyperlinkElement {
  valueList?: IElement[]
  url?: string
  hyperlinkId?: string
}

export interface ISuperscriptSubscript {
  actualSize?: number
}

export interface ISeparator {
  dashArray?: number[]
  separatorType?: SeparatorType
  separatorLineWidth?: number
}

export interface IControlElement {
  control?: IControl
  controlId?: string
  controlComponent?: ControlComponent
}

export interface ICheckboxElement {
  checkbox?: ICheckbox
}

export interface IRadioElement {
  radio?: IRadio
}

export interface ILaTexElement {
  laTexSVG?: string
}

export interface IDateElement {
  dateFormat?: string
  dateId?: string
}

export interface IImageRule {
  imgToolDisabled?: boolean
}

export interface IImageBasic {
  imgDisplay?: ImageDisplay
  imgFloatPosition?: {
    x: number
    y: number
    pageNo?: number
  }
}

export type IImageElement = IImageBasic & IImageRule

export interface IBlockElement {
  block?: IBlock
}

export interface IAreaElement {
  valueList?: IElement[]
  areaId?: string
  areaIndex?: number
  area?: IArea
}

export interface IFootnoteElement {
  footnoteId?: string
  footnoteNumber?: number
}

export interface IColumnElement {
  columnId?: string
  columnCount?: number
  columnGap?: number
  columnSeparator?: boolean
  columnWidths?: number[]
}

export interface IRevisionElement {
  revisionId?: string
  revisionType?: 'insert' | 'delete'
  revisionAuthor?: string
  revisionDate?: string
}

export interface IShapeElement {
  shapeType?: string
  viewBox?: [number, number]
  path?: string
  pathFormula?: string
  fillColor?: string
  strokeColor?: string
  strokeWidth?: number
}

export type IElement = IElementBasic &
  IElementStyle &
  IElementGroup &
  ITable &
  IHyperlinkElement &
  ISuperscriptSubscript &
  ISeparator &
  IControlElement &
  ICheckboxElement &
  IRadioElement &
  ILaTexElement &
  IDateElement &
  IImageElement &
  IBlockElement &
  ITitleElement &
  IListElement &
  IAreaElement &
  IFootnoteElement &
  IColumnElement &
  IRevisionElement &
  IShapeElement

export interface IElementMetrics {
  width: number
  height: number
  boundingBoxAscent: number
  boundingBoxDescent: number
}

export interface IElementPosition {
  pageNo: number
  index: number
  value: string
  rowIndex: number
  rowNo: number
  ascent: number
  lineHeight: number
  left: number
  metrics: IElementMetrics
  isFirstLetter: boolean
  isLastLetter: boolean
  coordinate: {
    leftTop: number[]
    leftBottom: number[]
    rightTop: number[]
    rightBottom: number[]
  }
}

export interface IElementFillRect {
  x: number
  y: number
  width: number
  height: number
}

export interface IUpdateElementByIdOption {
  id?: string
  conceptId?: string
  properties: Omit<Partial<IElement>, 'id'>
}

export interface IDeleteElementByIdOption {
  id?: string
  conceptId?: string
}

export interface IGetElementByIdOption {
  id?: string
  conceptId?: string
}

export interface IInsertElementListOption {
  isReplace?: boolean
  isSubmitHistory?: boolean
}

export interface ISpliceElementListOption {
  isIgnoreDeletedRule?: boolean
}
