import { NumberType } from '../enum/common'
import { RowFlex } from '../enum/row'

export interface IPageNumber {
  bottom?: number
  size?: number
  font?: string
  color?: string
  rowFlex?: RowFlex
  format?: string
  numberType?: NumberType
  disabled?: boolean
  startPageNo?: number
  fromPageNo?: number
  maxPageNo?: number | null
}
