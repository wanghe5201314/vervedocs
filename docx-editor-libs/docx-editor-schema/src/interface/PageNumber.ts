import { NumberType } from '../enum/Common'
import { RowFlex } from '../enum/Row'

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
