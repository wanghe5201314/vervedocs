import { EditorZone, PageMode } from '../enum/Editor'
import { ElementType } from '../enum/Element'
import { ListStyle, ListType } from '../enum/List'
import { RowFlex } from '../enum/Row'
import { SeparatorType } from './Separator'
import { TitleLevel } from '../enum/Title'
import { ICatalog } from './Catalog'
import { IControlChangeResult, IControlContentChangeResult } from './Control'
import { IEditorResult } from './Editor'
import { IElement } from './Element'
import { IPositionContext } from './Position'
import { ITextDecoration } from './Text'

export interface IRangeStyle {
  type: ElementType | null
  hasSelection: boolean
  undo: boolean
  redo: boolean
  painter: boolean
  font: string
  size: number
  characterScale: number
  bold: boolean
  italic: boolean
  underline: boolean
  strikeout: boolean
  color: string | null
  highlight: string | null
  paragraphColor: string | null
  rowFlex: RowFlex | null
  rowMargin: number
  lineHeight: number
  dashArray: number[]
  separatorType: SeparatorType | null
  separatorLineWidth: number | null
  level: TitleLevel | null
  listType: ListType | null
  listStyle: ListStyle | null
  groupIds: string[] | null
  textDecoration: ITextDecoration | null
  paragraphFirstLineIndent: number
  extension?: unknown | null
}

export type IRangeStyleChange = (payload: IRangeStyle) => void

export type IVisiblePageNoListChange = (payload: number[]) => void

export type IIntersectionPageNoChange = (payload: number) => void

export type IPageSizeChange = (payload: number) => void

export type IPageScaleChange = (payload: number) => void

export type ISaved = (payload: IEditorResult) => void

export type IContentChange = () => void

export type IControlChange = (payload: IControlChangeResult) => void

export type IControlContentChange = (
  payload: IControlContentChangeResult
) => void

export type IPageModeChange = (payload: PageMode) => void

export type IZoneChange = (payload: EditorZone) => void

export type IMouseEventChange = (evt: MouseEvent) => void

export type IInputEventChange = (evt: Event) => void

export interface IPositionContextChangePayload {
  value: IPositionContext
  oldValue: IPositionContext
}

export type IPositionContextChange = (
  payload: IPositionContextChangePayload
) => void

export type IImageSizeChange = (payload: { element: IElement }) => void

export type IImageMousedown = (payload: {
  evt: MouseEvent
  element: IElement
}) => void

export type ICatalogChange = (payload: ICatalog) => void
