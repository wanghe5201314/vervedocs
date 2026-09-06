/**
 * VerveDocs Schema —— 快捷键类型与工具
 *
 * 定义键盘按键映射常量、快捷键注册接口及平台判断工具函数。
 */

/** 键盘按键映射常量（使用 KeyboardEvent.key 值） */
export const KeyMap = {
  A: 'a',
  B: 'b',
  C: 'c',
  D: 'd',
  E: 'e',
  F: 'f',
  G: 'g',
  H: 'h',
  I: 'i',
  J: 'j',
  K: 'k',
  L: 'l',
  M: 'm',
  N: 'n',
  O: 'o',
  P: 'p',
  Q: 'q',
  R: 'r',
  S: 's',
  T: 't',
  U: 'u',
  V: 'v',
  W: 'w',
  X: 'x',
  Y: 'y',
  Z: 'z',
  ZERO: '0',
  ONE: '1',
  TWO: '2',
  THREE: '3',
  FOUR: '4',
  FIVE: '5',
  SIX: '6',
  SEVEN: '7',
  EIGHT: '8',
  NINE: '9',
  MINUS: '-',
  EQUAL: '=',
  LEFT_BRACKET: '[',
  RIGHT_BRACKET: ']',
  BACKSLASH: '\\',
  SEMICOLON: ';',
  QUOTE: "'",
  COMMA: ',',
  PERIOD: '.',
  SLASH: '/',
  LEFT_ANGLE_BRACKET: '<',
  RIGHT_ANGLE_BRACKET: '>',
  ENTER: 'Enter',
  SPACE: ' ',
  TAB: 'Tab',
  BACKSPACE: 'Backspace',
  DELETE: 'Delete',
  ESCAPE: 'Escape',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown'
} as const

/** 快捷键注册配置接口 */
export interface IRegisterShortcut {
  /** 按键值（对应 KeyboardEvent.key） */
  key: string
  /** Ctrl/Cmd 组合键（跨平台修饰键） */
  mod?: boolean
  /** Ctrl 键 */
  ctrl?: boolean
  /** Meta（Cmd）键 */
  meta?: boolean
  /** Shift 键 */
  shift?: boolean
  /** Alt 键 */
  alt?: boolean
  /** 是否为全局快捷键（在 document 上监听） */
  isGlobal?: boolean
  /** 是否禁用 */
  disable?: boolean
  /** 命中时执行的回调 */
  callback?: (command: any) => void
}

/** 判断当前运行环境是否为 Apple 平台（macOS / iOS） */
export const isApple =
  typeof navigator !== 'undefined' &&
  /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '')

/**
 * 判断键盘事件是否按下了跨平台修饰键（macOS 为 Cmd，其他为 Ctrl）
 * @param evt 键盘事件
 * @returns 是否按下了修饰键
 */
export function isMod(evt: KeyboardEvent): boolean {
  return isApple ? evt.metaKey : evt.ctrlKey
}