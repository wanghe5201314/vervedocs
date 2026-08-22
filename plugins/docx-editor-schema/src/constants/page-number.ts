import { IPageNumber } from '../interface/page-number'
import { NumberType } from '../enum/common'
import { RowFlex } from '../enum/row'

export const FORMAT_PLACEHOLDER = {
  PAGE_NO: '{pageNo}',
  PAGE_COUNT: '{pageCount}'
}

export const defaultPageNumberOption: Readonly<Required<IPageNumber>> = {
  bottom: 60,
  size: 12,
  font: 'Microsoft YaHei',
  color: '#000000',
  rowFlex: RowFlex.CENTER,
  format: FORMAT_PLACEHOLDER.PAGE_NO,
  numberType: NumberType.ARABIC,
  disabled: false,
  startPageNo: 1,
  fromPageNo: 0,
  maxPageNo: null
}

export const PAGE_NUMBER_STYLES = [
  { value: '{pageNo}', label: '1, 2, 3 ...', numberType: NumberType.ARABIC },
  { value: '- {pageNo} -', label: '- 1 -, - 2 -, - 3 - ...', numberType: NumberType.ARABIC },
  { value: '— {pageNo} —', label: '— 1 —, — 2 —, — 3 — ...', numberType: NumberType.ARABIC },
  { value: '第 {pageNo} 页', label: '第 1 页', numberType: NumberType.ARABIC },
  { value: '第 {pageNo} 页 共 {pageCount} 页', label: '第 1 页 共 X 页', numberType: NumberType.ARABIC },
  { value: '{pageNo} / {pageCount}', label: '1 / X', numberType: NumberType.ARABIC },
  { value: '{pageNo} of {pageCount}', label: '1 of X', numberType: NumberType.ARABIC },
  { value: '第{pageNo}页', label: '第一页', numberType: NumberType.CHINESE },
  { value: '第{pageNo}页 共 {pageCount} 页', label: '第一页 共 X 页', numberType: NumberType.CHINESE },
  { value: '{pageNo}', label: 'I, II, III ...', numberType: 'roman-upper' },
  { value: '{pageNo}', label: 'i, ii, iii ...', numberType: 'roman-lower' },
  { value: '{pageNo}', label: '①, ②, ③ ...', numberType: 'circled-number' },
  { value: '{pageNo}', label: '一, 二, 三 ...', numberType: 'chinese-number' },
  { value: '{pageNo}', label: '壹, 贰, 叁 ...', numberType: 'chinese-formal-number' },
  { value: '{pageNo}', label: 'A, B, C ...', numberType: 'alphabet-upper' },
  { value: '{pageNo}', label: 'a, b, c ...', numberType: 'alphabet-lower' }
]
