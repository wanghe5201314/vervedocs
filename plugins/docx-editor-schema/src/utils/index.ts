import { UNICODE_SYMBOL_REG } from '../constants/regular'
import { IElement, IElementFillRect } from '../interface/element'
import { DeepRequired } from '../interface/common'
import { IEditorOption } from '../interface/editor'
import isEqual from 'fast-deep-equal'
import rfdc from 'rfdc'
import justMerge from 'just-merge'
import justPick from 'just-pick'
import justOmit from 'just-omit'

export { default as debounce } from 'just-debounce-it'
export { default as throttle } from 'just-throttle'
export { nanoid as getUUID } from 'nanoid'

const clone = rfdc()

export function deepCloneOmitKeys<T, K>(obj: T, omitKeys: (keyof K)[]): T {
  if (!obj || typeof obj !== 'object') {
    return obj
  }
  let newObj: any = {}
  if (Array.isArray(obj)) {
    newObj = obj.map(item => deepCloneOmitKeys(item, omitKeys))
  } else {
    // prettier-ignore
    (Object.keys(obj) as (keyof K)[]).forEach(key => {
      if (omitKeys.includes(key)) return
      return (newObj[key] = deepCloneOmitKeys((obj[key as unknown as keyof T] ), omitKeys))
    })
  }
  return newObj
}

export function deepClone<T>(obj: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(obj)
  }
  return clone(obj)
}

export function isBody(node: Element): boolean {
  return node && node.nodeType === 1 && node.tagName.toLowerCase() === 'body'
}

export function findParent(
  node: Element,
  filterFn: Function,
  includeSelf: boolean
) {
  if (node && !isBody(node)) {
    node = includeSelf ? node : (node.parentNode as Element)
    while (node) {
      if (!filterFn || filterFn(node) || isBody(node)) {
        return filterFn && !filterFn(node) && isBody(node) ? null : node
      }
      node = node.parentNode as Element
    }
  }
  return null
}

export function splitText(text: string): string[] {
  const data: string[] = []
  if (Intl.Segmenter) {
    const segmenter = new Intl.Segmenter()
    const segments = segmenter.segment(text)
    for (const { segment } of segments) {
      data.push(segment)
    }
  } else {
    const symbolMap = new Map<number, string>()
    for (const match of text.matchAll(UNICODE_SYMBOL_REG)) {
      symbolMap.set(match.index!, match[0])
    }
    let t = 0
    while (t < text.length) {
      const symbol = symbolMap.get(t)
      if (symbol) {
        data.push(symbol)
        t += symbol.length
      } else {
        data.push(text[t])
        t++
      }
    }
  }
  return data
}

export function downloadFile(href: string, fileName: string) {
  const a = document.createElement('a')
  a.href = href
  a.download = fileName
  a.click()
}

export function handleTripleClick(dom: HTMLElement, fn: (evt: MouseEvent) => any): () => void {
  return nClickEvent(3, dom, fn)
}

function nClickEvent(
  n: number,
  dom: HTMLElement,
  fn: (evt: MouseEvent) => any
): () => void {
  let count = 0
  let lastTime = 0

  const handler = function (evt: MouseEvent) {
    const currentTime = new Date().getTime()
    count = currentTime - lastTime < 300 ? count + 1 : 0
    lastTime = new Date().getTime()
    if (count >= n - 1) {
      fn(evt)
      count = 0
    }
  }

  dom.addEventListener('click', handler)
  return () => {
    dom.removeEventListener('click', handler)
  }
}

export function isObject(type: unknown): type is Record<string, unknown> {
  return Object.prototype.toString.call(type) === '[object Object]'
}

export function isArray(type: unknown): type is Array<unknown> {
  return Array.isArray(type)
}

export function isNumber(type: unknown): type is number {
  return Object.prototype.toString.call(type) === '[object Number]'
}

export function isString(type: unknown): type is string {
  return Object.prototype.toString.call(type) === '[object String]'
}

export function mergeObject<T>(source: T, target: T): T {
  if (isObject(source) && isObject(target)) {
    return justMerge(target, source) as T
  } else if (isArray(source) && isArray(target)) {
    (target as unknown[]).push(...(source as unknown[]))
  }
  return target
}

export function nextTick(fn: Function) {
  queueMicrotask(() => {
    fn()
  })
}

export function convertNumberToChinese(num: number) {
  const chineseNum = [
    '零',
    '一',
    '二',
    '三',
    '四',
    '五',
    '六',
    '七',
    '八',
    '九'
  ]
  const chineseUnit = [
    '',
    '十',
    '百',
    '千',
    '万',
    '十',
    '百',
    '千',
    '亿',
    '十',
    '百',
    '千',
    '万',
    '十',
    '百',
    '千',
    '亿'
  ]
  if (!num || isNaN(num)) return '零'
  const numStr = num.toString().split('')
  let result = ''
  for (let i = 0; i < numStr.length; i++) {
    const desIndex = numStr.length - 1 - i
    result = `${chineseUnit[i]}${result}`
    result = `${chineseNum[Number(numStr[desIndex])]}${result}`
  }
  result = result.replace(/零(千|百|十)/g, '零').replace(/十零/g, '十')
  result = result.replace(/零+/g, '零')
  result = result.replace(/零亿/g, '亿').replace(/零万/g, '万')
  result = result.replace(/亿万/g, '亿')
  result = result.replace(/零+$/, '')
  result = result.replace(/^一十/g, '十')
  return result
}

export function cloneProperty<T>(
  properties: (keyof T)[],
  sourceElement: T,
  targetElement: T
) {
  for (let i = 0; i < properties.length; i++) {
    const property = properties[i]
    const value = sourceElement[property]
    if (value !== undefined) {
      targetElement[property] = value
    } else {
      delete targetElement[property]
    }
  }
}

export function pickObject<T extends object, K extends keyof T>(
  object: T,
  pickKeys: K[]
): Pick<T, K> {
  return justPick(object, pickKeys) as Pick<T, K>
}

export function omitObject<T extends object, K extends keyof T>(
  object: T,
  omitKeys: K[]
): T {
  return justOmit(object, omitKeys) as T
}

export function convertStringToBase64(input: string) {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const charArray = Array.from(data, byte => String.fromCharCode(byte))
  const base64 = window.btoa(charArray.join(''))
  return base64
}

export function findScrollContainer(element: HTMLElement) {
  let parent = element.parentElement
  while (parent) {
    const style = window.getComputedStyle(parent)
    const overflowY = style.getPropertyValue('overflow-y')
    if (
      parent.scrollHeight > parent.clientHeight &&
      (overflowY === 'auto' || overflowY === 'scroll')
    ) {
      return parent
    }
    parent = parent.parentElement
  }
  return document.documentElement
}

export { isEqual as isArrayEqual, isEqual as isObjectEqual }

export function isRectIntersect(
  rect1: IElementFillRect,
  rect2: IElementFillRect
): boolean {
  const rect1Left = rect1.x
  const rect1Right = rect1.x + rect1.width
  const rect1Top = rect1.y
  const rect1Bottom = rect1.y + rect1.height
  const rect2Left = rect2.x
  const rect2Right = rect2.x + rect2.width
  const rect2Top = rect2.y
  const rect2Bottom = rect2.y + rect2.height
  if (
    rect1Left > rect2Right ||
    rect1Right < rect2Left ||
    rect1Top > rect2Bottom ||
    rect1Bottom < rect2Top
  ) {
    return false
  }
  return true
}

export function isNonValue(value: unknown): boolean {
  return value === undefined || value === null
}

export function normalizeLineBreak(text: string): string {
  return text.replace(/\r\n|\r/g, '\n')
}

// Type Guards
export function isElement(value: unknown): value is IElement {
  return (
    value !== null &&
    typeof value === 'object' &&
    'value' in value &&
    typeof (value as IElement).value === 'string'
  )
}

export function isElementList(value: unknown): value is IElement[] {
  return Array.isArray(value) && value.every(isElement)
}

export const isApple =
  typeof navigator !== 'undefined' && /Mac OS X/.test(navigator.userAgent)
export const isIOS =
  typeof navigator !== 'undefined' && /iPad|iPhone/.test(navigator.userAgent)
export const isMobile =
  typeof navigator !== 'undefined' && /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

export function isMod(evt: KeyboardEvent | MouseEvent) {
  return isApple ? evt.metaKey : evt.ctrlKey
}

export function writeElementList(
  elementList: IElement[],
  _options: DeepRequired<IEditorOption>
): string {
  return JSON.stringify(elementList)
}
