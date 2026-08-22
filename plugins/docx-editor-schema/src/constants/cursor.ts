import { ICursorOption } from '../interface/cursor'

export const CURSOR_AGENT_OFFSET_HEIGHT = 12

export const defaultCursorOption: Readonly<Required<ICursorOption>> = {
  width: 1,
  color: '#000000',
  dragWidth: 2,
  dragColor: '#0000FF',
  dragFloatImageDisabled: false
}
