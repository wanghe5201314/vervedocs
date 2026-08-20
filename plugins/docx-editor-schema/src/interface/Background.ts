import { BackgroundRepeat, BackgroundSize } from '../enum/Background'

export interface IBackgroundOption {
  color?: string
  image?: string
  size?: BackgroundSize
  repeat?: BackgroundRepeat
  applyPageNumbers?: number[]
}
