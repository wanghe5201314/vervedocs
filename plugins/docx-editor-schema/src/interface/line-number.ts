import { LineNumberType } from '../enum/line-number'

export interface ILineNumberOption {
  size?: number
  font?: string
  color?: string
  disabled?: boolean
  right?: number
  type?: LineNumberType
}
