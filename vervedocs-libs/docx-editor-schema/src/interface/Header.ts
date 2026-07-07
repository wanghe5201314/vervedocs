import { MaxHeightRatio } from '../enum/Common'

export interface IHeader {
  top?: number
  inactiveAlpha?: number
  maxHeightRadio?: MaxHeightRatio
  disabled?: boolean
  editable?: boolean
}
