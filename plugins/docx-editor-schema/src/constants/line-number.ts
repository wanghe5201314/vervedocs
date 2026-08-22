import { ILineNumberOption } from '../interface/line-number'
import { LineNumberType } from '../enum/line-number'

export const defaultLineNumberOption: Readonly<Required<ILineNumberOption>> = {
  size: 12,
  font: 'Microsoft YaHei',
  color: '#000000',
  disabled: true,
  right: 20,
  type: LineNumberType.CONTINUITY
}
