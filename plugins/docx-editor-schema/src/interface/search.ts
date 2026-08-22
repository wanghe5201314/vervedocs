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

export interface ISearchResultContext {
  range: IRange
  startPosition: IElementPosition
  endPosition: IElementPosition
}

export interface IReplaceOption {
  index?: number
}
