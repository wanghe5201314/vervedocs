import { TextDecorationStyle } from '../enum/text'

export interface ITextMetrics {
  width: number
  actualBoundingBoxAscent: number
  actualBoundingBoxDescent: number
  actualBoundingBoxLeft: number
  actualBoundingBoxRight: number
  fontBoundingBoxAscent: number
  fontBoundingBoxDescent: number
}

export interface ITextDecoration {
  style?: TextDecorationStyle
}
