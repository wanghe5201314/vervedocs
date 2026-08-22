import { BackgroundRepeat, BackgroundSize } from '../enum/background'

export interface IBackgroundOption {
  color?: string
  image?: string
  size?: BackgroundSize
  repeat?: BackgroundRepeat
  applyPageNumbers?: number[]
}
