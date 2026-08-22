import { IFooter } from '../interface/footer'
import { MaxHeightRatio } from '../enum/common'

export const defaultFooterOption: Readonly<Required<IFooter>> = {
  bottom: 30,
  inactiveAlpha: 1,
  maxHeightRadio: MaxHeightRatio.HALF,
  disabled: false,
  editable: true
}
