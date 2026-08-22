import { IBackgroundOption } from '../interface/background'
import { BackgroundRepeat, BackgroundSize } from '../enum/background'

export const defaultBackground: Readonly<Required<IBackgroundOption>> = {
  color: '#FFFFFF',
  image: '',
  size: BackgroundSize.COVER,
  repeat: BackgroundRepeat.NO_REPEAT,
  applyPageNumbers: []
}
