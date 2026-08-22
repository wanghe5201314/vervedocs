import { IHeader } from '../interface/header'
import { MaxHeightRatio } from '../enum/common'

export const defaultHeaderOption: Readonly<Required<IHeader>> = {
  top: 30,
  inactiveAlpha: 1,
  maxHeightRadio: MaxHeightRatio.HALF,
  disabled: false,
  editable: true
}
