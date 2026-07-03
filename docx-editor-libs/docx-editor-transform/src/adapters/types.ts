import type {
  DeepRequired,
  IEditorOption,
  IElement,
  IInsertElementListOption
} from '@wanghe1995/docx-editor-schema'
import type { RangeManager } from '@wanghe1995/docx-editor-state'
import type { IDrawContext } from '../IDrawContext'
import { deepClone, formatElementContext } from '@wanghe1995/docx-editor-schema'

// TODO: 以下类型在 view 层或插件层实现，暂用 any 占位
type Position = any
type HistoryManager = any
type CanvasEvent = any
type Control = any
type WorkerManager = any
type Search = any
type I18n = any
type Zone = any
type TableOperate = any
type PasteByApiFn = (canvasEvent: CanvasEvent, payload?: any) => void
type PrintImageBase64Fn = (
  base64List: string[],
  options: { width: number; height: number; direction?: any }
) => void

export interface IAdapterContext {
  draw: IDrawContext
  range: RangeManager
  position: Position
  historyManager: HistoryManager
  canvasEvent: CanvasEvent
  options: DeepRequired<IEditorOption>
  control: Control
  workerManager: WorkerManager
  searchManager: Search
  i18n: I18n
  zone: Zone
  tableOperate: TableOperate
  pasteByApi?: PasteByApiFn
  printImageBase64?: PrintImageBase64Fn
}

const SAFE_URL_PROTOCOLS = ['https:', 'http:', 'data:', 'blob:', 'file:']

export function isSafeUrl(src: string): boolean {
  try {
    const url = new URL(src, 'https://placeholder.local')
    return SAFE_URL_PROTOCOLS.includes(url.protocol)
  } catch {
    return false
  }
}

export function sanitizePropertyName(key: string): boolean {
  return key !== '__proto__' && key !== 'constructor' && key !== 'prototype'
}

export interface IActivateCanvasOption {
  syncRange?: boolean
  requireAgentActive?: boolean
}

export abstract class BaseCommandAdapter {
  protected draw: IDrawContext
  protected range: RangeManager
  protected position: Position
  protected historyManager: HistoryManager
  protected canvasEvent: CanvasEvent
  protected options: DeepRequired<IEditorOption>
  protected control: Control
  protected workerManager: WorkerManager
  protected searchManager: Search
  protected i18n: I18n
  protected zone: Zone
  protected tableOperate: TableOperate
  protected _pasteByApi: PasteByApiFn | null
  protected _printImageBase64: PrintImageBase64Fn | null

  constructor(context: IAdapterContext) {
    this.draw = context.draw
    this.range = context.range
    this.position = context.position
    this.historyManager = context.historyManager
    this.canvasEvent = context.canvasEvent
    this.options = context.options
    this.control = context.control
    this.workerManager = context.workerManager
    this.searchManager = context.searchManager
    this.i18n = context.i18n
    this.zone = context.zone
    this.tableOperate = context.tableOperate
    this._pasteByApi = context.pasteByApi ?? null
    this._printImageBase64 = context.printImageBase64 ?? null
  }

  protected isReadonly(): boolean {
    return this.draw.isReadonly()
  }

  protected isDisabled(): boolean {
    return this.draw.isReadonly() || this.draw.isDisabled()
  }

  protected insertFormattedElementList(
    payload: IElement[],
    options: IInsertElementListOption = {}
  ): void {
    if (!payload.length) return
    if (this.isDisabled()) return
    const { isReplace = true } = options
    if (!isReplace) {
      this.range.shrinkRange()
    }
    const cloneElementList = deepClone(payload)
    const { startIndex } = this.range.getRange()
    const elementList = this.draw.getElementList()
    formatElementContext(elementList, cloneElementList, startIndex, {
      isBreakWhenWrap: true,
      editorOptions: this.options
    })
    this.draw.insertElementList(cloneElementList, options)
  }

  protected requirePasteByApi(): PasteByApiFn {
    if (!this._pasteByApi) {
      throw new Error('pasteByApi not initialized - interaction layer not loaded')
    }
    return this._pasteByApi
  }

  protected requirePrintImageBase64(): PrintImageBase64Fn {
    if (!this._printImageBase64) {
      throw new Error('printImageBase64 not initialized - interaction layer not loaded')
    }
    return this._printImageBase64
  }

  protected activateCanvas(option: IActivateCanvasOption = {}): boolean {
    const {
      syncRange = false,
      requireAgentActive = false
    } = option
    const cursor = this.draw.getCursor()
    if (syncRange) {
      const { startIndex, endIndex } = this.range.getRange()
      const elementList = this.draw.getElementList()
      if (elementList.length) {
        const fallbackIndex = Math.max(0, elementList.length - 1)
        const curIndex = endIndex >= 0
          ? endIndex
          : startIndex >= 0
            ? startIndex
            : fallbackIndex
        this.range.setRange(curIndex, curIndex)
        this.draw.render({
          curIndex,
          isCompute: false,
          isSetCursor: true,
          isSubmitHistory: false
        })
      }
    }
    cursor.focus()
    return !requireAgentActive || cursor.getAgentIsActive()
  }
}
