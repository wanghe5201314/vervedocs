import {
  DOCX_EDITOR_SCHEMA_VERSION,
  EDITOR_CLIPBOARD,
  createDomFromElementList,
  zipElementList
} from '@wanghe1995/docx-editor-schema'
import type {
  DeepRequired,
  IEditorOption,
  IElement
} from '@wanghe1995/docx-editor-schema'

export const version = DOCX_EDITOR_SCHEMA_VERSION

export class HistoryManager {
  constructor(..._: any[]) {}
  undo(..._: any[]) {}
  redo(..._: any[]) {}
  recovery(..._: any[]) {}
  clear(..._: any[]) {}
  popUndo(..._: any[]): any { return undefined }
  isStackEmpty(..._: any[]): boolean { return true }
  isCanUndo(..._: any[]): boolean { return false }
  isCanRedo(..._: any[]): boolean { return false }
  execute(..._: any[]) {}
  destroy(..._: any[]) {}
}

export class WorkerManager {
  constructor(..._: any[]) {}
  destroy(..._: any[]) {}
}

export class I18n {
  constructor(..._: any[]) {}
  t(key: string, ..._args: any[]): string { return key }
  registerLangMap(..._: any[]) {}
  destroy(..._: any[]) {}
}

export class Actuator {
  constructor(..._: any[]) {}
}

export class LaTexParticle {
  constructor(..._: any[]) {}
  render(..._: any[]) {}
}

export class DateParticle {
  constructor(..._: any[]) {}
  render(..._: any[]) {}
  renderDatePicker(..._: any[]) {}
  clearDatePicker(..._: any[]) {}
  destroy(..._: any[]) {}
}

export class BlockParticle {
  constructor(..._: any[]) {}
  render(..._: any[]) {}
  clear(..._: any[]) {}
  destroy(..._: any[]) {}
}

export class DatePicker {
  constructor(..._: any[]) {}
  render(..._: any[]) {}
  destroy(..._: any[]) {}
}

export interface IClipboardData {
  text: string
  elementList: IElement[]
}

function setClipboardData(data: IClipboardData) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(
      EDITOR_CLIPBOARD,
      JSON.stringify({
        text: data.text,
        elementList: data.elementList
      })
    )
  } catch {
    // Ignore storage failures and still allow the system clipboard path.
  }
}

export function getClipboardData(): IClipboardData | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const clipboardText = localStorage.getItem(EDITOR_CLIPBOARD)
    if (!clipboardText) return null
    const clipboardData = JSON.parse(clipboardText)
    if (
      typeof clipboardData?.text === 'string' &&
      Array.isArray(clipboardData?.elementList)
    ) {
      return clipboardData
    }
  } catch {
    // Ignore malformed clipboard cache.
  }
  return null
}

export function getIsClipboardContainFile(clipboardData: DataTransfer): boolean {
  return Array.from(clipboardData.items).some(item => item.kind === 'file')
}

export function removeClipboardData(): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(EDITOR_CLIPBOARD)
  } catch {
    // Ignore storage failures.
  }
}

function fallbackWriteClipboardItem(html: string) {
  if (typeof document === 'undefined' || typeof window === 'undefined') return
  const fakeElement = document.createElement('div')
  fakeElement.setAttribute('contenteditable', 'true')
  fakeElement.style.position = 'fixed'
  fakeElement.style.left = '-9999px'
  fakeElement.style.top = '0'
  fakeElement.style.opacity = '0'
  fakeElement.innerHTML = html
  const selection = window.getSelection()
  const ranges: Range[] = []
  if (selection) {
    for (let i = 0; i < selection.rangeCount; i++) {
      ranges.push(selection.getRangeAt(i).cloneRange())
    }
  }
  const range = document.createRange()
  const br = document.createElement('span')
  br.innerText = '\n'
  fakeElement.append(br)
  document.body.append(fakeElement)
  range.selectNodeContents(fakeElement)
  selection?.removeAllRanges()
  selection?.addRange(range)
  try {
    document.execCommand('copy')
  } finally {
    selection?.removeAllRanges()
    ranges.forEach(savedRange => selection?.addRange(savedRange))
    fakeElement.remove()
  }
}

function writeClipboardItem(
  text: string,
  html: string,
  elementList: IElement[]
) {
  if (!text && !html && !elementList.length) return
  setClipboardData({ text, elementList })
  if (typeof window === 'undefined') return
  const clipboard = window.navigator?.clipboard
  const ClipboardItemCtor = window.ClipboardItem
  if (clipboard?.write && ClipboardItemCtor) {
    const plainText = new Blob([text], { type: 'text/plain' })
    const htmlText = new Blob([html], { type: 'text/html' })
    // @ts-ignore Browser ClipboardItem typing differs across runtimes.
    const item = new ClipboardItemCtor({
      [plainText.type]: plainText,
      [htmlText.type]: htmlText
    })
    void clipboard.write([item]).catch(() => fallbackWriteClipboardItem(html))
    return
  }
  fallbackWriteClipboardItem(html)
}

export function writeElementList(
  elementList: IElement[],
  options: DeepRequired<IEditorOption>
): string {
  if (typeof document === 'undefined') {
    return JSON.stringify(elementList)
  }
  const clipboardDom = createDomFromElementList(elementList, options)
  document.body.append(clipboardDom)
  const text = clipboardDom.innerText
  const html = clipboardDom.innerHTML
  clipboardDom.remove()
  if (!text && !html && !elementList.length) return ''
  writeClipboardItem(text, html, zipElementList(elementList))
  return text
}

export class Shortcut {
  constructor(..._: any[]) {}
  registerShortcutList(..._: any[]) {}
  removeEvent() {}
}
