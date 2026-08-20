import { LineNumberType } from '../enum/LineNumber'

export interface ILineNumberOption {
  size?: number
  font?: string
  color?: string
  disabled?: boolean
  right?: number
  type?: LineNumberType
}
