import { KeyMap } from '../../enum/key-map'

export interface IRegisterShortcut<T = any> {
  key: KeyMap
  ctrl?: boolean
  meta?: boolean
  mod?: boolean
  shift?: boolean
  alt?: boolean
  isGlobal?: boolean
  callback?: (command: T) => any
  disable?: boolean
}
