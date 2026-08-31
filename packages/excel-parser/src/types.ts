export type Align = 'left' | 'center' | 'right'
export type VerticalAlign = 'top' | 'middle' | 'bottom'
export type WrapMode = 'clip' | 'overflow' | 'wrap'

export interface ICellStyle {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  align?: Align
  verticalAlign?: VerticalAlign
  fontFamily?: string
  fontSize?: number
  fontColor?: string
  bgColor?: string
  wrap?: WrapMode
  numberFormat?: string
  decimalPlaces?: number
  rotation?: number
  borderTop?: string
  borderBottom?: string
  borderLeft?: string
  borderRight?: string
}

export interface ICellMeta {
  hyperlink?: string
  comment?: string
}

export interface IUiSheet {
  id: string
  name: string
  rowCount: number
  colCount: number
  cells: Record<string, string>
  styles: Record<string, ICellStyle>
  cellMeta?: Record<string, ICellMeta>
  merges?: string[]
  colWidths?: Record<number, number>
  rowHeights?: Record<number, number>
  hiddenCols?: Record<number, boolean>
  hiddenRows?: Record<number, boolean>
  frozenCols?: number
  frozenRows?: number
  filterColumn?: number | null
  filterKeyword?: string
  filterSelectedValues?: Record<string, boolean>
  filterActive?: boolean
}

export interface IWorkbook {
  version: number
  resources?: Record<string, any>
  sheets: IUiSheet[]
}
