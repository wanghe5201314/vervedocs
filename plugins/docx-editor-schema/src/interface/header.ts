import { MaxHeightRatio } from '../enum/common'

export interface IHeader {
  top?: number
  inactiveAlpha?: number
  maxHeightRadio?: MaxHeightRatio
  disabled?: boolean
  editable?: boolean
}
