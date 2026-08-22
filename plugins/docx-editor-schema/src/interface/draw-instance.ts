import { EditorMode } from '../enum/editor'
import { IElement, ISpliceElementListOption, IElementPosition } from './element'
import { IEditorOption, IEditorData } from './editor'
import { IRange } from './range'
import { DeepRequired } from './common'
import { IDrawOption } from './draw'
import {
  IRangeStyleChange,
  IVisiblePageNoListChange,
  IIntersectionPageNoChange,
  IPageSizeChange,
  IPageScaleChange,
  ISaved,
  IContentChange,
  IControlChange,
  IControlContentChange,
  IPageModeChange,
  IZoneChange,
  ICatalogChange
} from './listener'

export interface ICursorInstance {
  drawCursor(payload?: any): void
  recoveryCursor(): void
  moveCursorToVisible(payload?: any): void
  getAgentDom(): HTMLTextAreaElement | HTMLDivElement | null
}

export interface IPositionInstance {
  getPositionContext(): any
  getCursorPosition(): IElementPosition | null
  setPositionContext(payload: any): void
  computeRowPosition(payload: any): void
  getPositionList(): any[]
  getOriginalPositionList(): any[]
}

export interface IRangeInstance {
  getRange(): IRange
  getRangeClone(): IRange
  clearRange(): void
  setRange(startIndex: number, endIndex: number, tableId?: string, startTdIndex?: number, endTdIndex?: number, startTrIndex?: number, endTrIndex?: number): void
  getIsCollapsed(): boolean
  getIsSelection(): boolean
  shrinkBoundary(): void
  replaceRange(payload: any): void
}

export interface IHistoryManagerInstance {
  execute(fn: () => void): void
  undo(): void
  redo(): void
  isUndo(): boolean
  isRedo(): boolean
  undoStackLen: number
  redoStackLen: number
  popUndo(): any
  recovery(): void
}

export interface ISearchInstance {
  searchMatch(payload: string): void
  searchNavigatePre(): void
  searchNavigateNext(): void
  getSearchMatchResultLength(): number
  getSearchNavigateResultIndex(): number
  getMatchList(keyword?: string, elementList?: any[]): any[]
}

export interface IHeaderInstance {
  getElementList(): IElement[]
  setElementList(payload: IElement[]): void
}

export interface IFooterInstance {
  getElementList(): IElement[]
  setElementList(payload: IElement[]): void
}

export interface IListenerInstance {
  rangeStyleChange: IRangeStyleChange | null
  visiblePageNoListChange: IVisiblePageNoListChange | null
  intersectionPageNoChange: IIntersectionPageNoChange | null
  pageSizeChange: IPageSizeChange | null
  pageScaleChange: IPageScaleChange | null
  saved: ISaved | null
  contentChange: IContentChange | null
  controlChange: IControlChange | null
  controlContentChange: IControlContentChange | null
  pageModeChange: IPageModeChange | null
  zoneChange: IZoneChange | null
  catalogChange: ICatalogChange | null
}

export interface IEventBusInstance {
  on(eventName: any, callback: any): void
  emit(eventName: any, ...args: any[]): void
  off(eventName: any, callback: any): void
}

export interface ITableParticleInstance {
  getRangeRowCol(): any[] | null
}

export interface IDraw {
  getContainer(): HTMLDivElement
  getCursor(): ICursorInstance
  getElementList(): IElement[]
  getOriginalElementList(): IElement[]
  getOriginalMainElementList(): IElement[]
  getHeaderElementList(): IElement[]
  getFooterElementList(): IElement[]
  getHeader(): IHeaderInstance
  getFooter(): IFooterInstance
  getHeight(): number
  getPageGap(): number
  getHistoryManager(): IHistoryManagerInstance
  submitHistory(curIndex: number | undefined): void
  getMode(): EditorMode
  isDesignMode(): boolean
  isPrintMode(): boolean
  isReadonly(): boolean
  getOptions(): DeepRequired<IEditorOption>
  getPageNo(): number
  getPosition(): IPositionInstance
  getRange(): IRangeInstance
  getSearch(): ISearchInstance
  getListener(): IListenerInstance
  getEventBus(): IEventBusInstance
  getTableParticle(): ITableParticleInstance
  render(payload?: IDrawOption): void
  setEditorData(payload: Partial<IEditorData>): void
  spliceElementList(
    elementList: IElement[],
    start: number,
    deleteCount: number,
    items?: IElement[],
    options?: ISpliceElementListOption
  ): void
}
