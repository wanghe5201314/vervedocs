import { AreaMode } from '../enum/area'
import { LocationPosition } from '../enum/common'
import { IElement, IElementPosition } from './element'
import { IPlaceholder } from './placeholder'

export interface IAreaBasic {
  extension?: unknown
  placeholder?: IPlaceholder
}

export interface IAreaStyle {
  top?: number
  borderColor?: string
  backgroundColor?: string
}

export interface IAreaRule {
  mode?: AreaMode
  hide?: boolean
  deletable?: boolean
}

export type IArea = IAreaBasic & IAreaStyle & IAreaRule

export interface IInsertAreaOption {
  id?: string
  area: IArea
  value: IElement[]
  position?: LocationPosition
}

export interface ISetAreaPropertiesOption {
  id?: string
  properties: IArea
}

export interface IGetAreaValueOption {
  id?: string
}

export interface IGetAreaValueResult {
  id?: string
  area: IArea
  startPageNo: number
  endPageNo: number
  value: IElement[]
}

export interface IAreaInfo {
  id: string
  area: IArea
  elementList: IElement[]
  positionList: IElementPosition[]
}

export interface ILocationAreaOption {
  position: LocationPosition
}
