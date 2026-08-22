import { IRadioOption } from '../interface/radio'
import { VerticalAlign } from '../enum/vertical-align'

export const defaultRadioOption: Readonly<Required<IRadioOption>> = {
  width: 14,
  height: 14,
  gap: 5,
  lineWidth: 1,
  fillStyle: '#5175f4',
  strokeStyle: '#000000',
  verticalAlign: VerticalAlign.BOTTOM
}
