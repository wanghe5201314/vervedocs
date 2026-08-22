import { ICheckboxOption } from '../interface/checkbox'
import { VerticalAlign } from '../enum/vertical-align'

export const defaultCheckboxOption: Readonly<Required<ICheckboxOption>> = {
  width: 14,
  height: 14,
  gap: 5,
  lineWidth: 1,
  fillStyle: '#5175f4',
  strokeStyle: '#ffffff',
  verticalAlign: VerticalAlign.BOTTOM
}
