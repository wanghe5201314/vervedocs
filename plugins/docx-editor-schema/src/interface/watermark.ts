import { NumberType } from '../enum/common'
import { WatermarkType } from '../enum/watermark'

export interface IWatermark {
  data: string
  type?: WatermarkType
  width?: number
  height?: number
  color?: string
  opacity?: number
  size?: number
  font?: string
  repeat?: boolean
  numberType?: NumberType
  gap?: [horizontal: number, vertical: number]
}
