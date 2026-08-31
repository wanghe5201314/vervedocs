import { EditorContext } from '../enum/editor'
import { IElementPosition } from './element'
import { IRange } from './range'

export interface ISearchResultBasic {
  type: EditorContext
  index: number
  groupId: string
}

export interface ISearchResultRestArgs {
  tableId?: string
  tableIndex?: number
  trIndex?: number
  tdIndex?: number
  tdId?: string
  startIndex?: number
}

export type ISearchResult = ISearchResultBasic & ISearchResultRestArgs

export interface ISearchResultRect {
  pageNo: number
  rowNo: number
  x: number
  y: number
  width: number
  height: number
}

export interface ISearchResultItem {
  resultIndex: number
  groupId: string
  keyword: string
  context: EditorContext
  text: string
  previewText: string
  pageNo: number
  range: IRange
  startPosition: IElementPosition
  endPosition: IElementPosition
  rects: ISearchResultRect[]
}

export interface ISearchResultContext {
  range: IRange
  startPosition: IElementPosition
  endPosition: IElementPosition
}

export interface IReplaceOption {
  index?: number
}
