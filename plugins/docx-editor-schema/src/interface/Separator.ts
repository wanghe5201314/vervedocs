export type SeparatorType =
  | 'solid'
  | 'dotted'
  | 'dashed'
  | 'double'
  | 'triple'
  | 'wavy'
  | 'gradient'
  | 'shadow'
  | 'emboss'

export interface ISeparatorPayload {
  lineType?: SeparatorType
  lineWidth?: number
  dashArray?: number[]
  color?: string
}

export interface ISeparatorOption {
  strokeStyle?: string
  lineWidth?: number
}
