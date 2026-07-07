import type {
  IElement,
  IElementStyle,
  IEditorOption,
  IEditorResult,
  IEditorData,
  ISetValueOption,
  IDrawOption,
  IGetValueOption,
  IGetImageOption,
  IAppendElementListOption,
  IInsertElementListOption,
  DeepRequired,
  IRow,
  EditorMode,
  PageMode,
  PaperDirection,
  IMargin,
  EditorZone
} from '@vervedoc/docx-editor-schema'
import type { RangeManager } from '@vervedoc/docx-editor-state'

// TODO: 以下类型在 view 层或插件层实现，暂用 any 占位
type Position = any
type HistoryManager = any
type CanvasEvent = any
type I18n = any
type TableOperate = any

export interface ICursorContext {
  recoveryCursor(): void
  getHitLineStartIndex(): number | null
  drawCursor(option?: { isShow?: boolean; hitLineStartIndex?: number }): void
  moveCursorToVisible(option: { cursorPosition: any; direction: any }): void
  getAgentIsActive(): boolean
  focus(): void
}

export interface IBadgeContext {
  setMainBadge(payload: any): void
  setAreaBadgeMap(payload: any[]): void
}

export interface IZoneContext {
  setZone(zone: EditorZone): void
  getZone(): EditorZone
}

export interface IListParticleContext {
  setList(listType: any, listStyle?: any): void
}

export interface IHyperlinkParticleContext {
  clearHyperlinkPopup(): void
}

export interface IGroupContext {
  setGroup(): string | null
  deleteGroup(groupId: string): void
  getContextByGroupId(elementList: IElement[], groupId: string): any
}

export interface IAreaContext {
  getAreaValue(options?: any): any
  insertArea(payload: any): any
  setAreaProperties(payload: any): void
  getContextByAreaId(areaId: string, options?: any): any
}

export interface IRegisterContext {
  getChartRenderer(): any
}

export interface IPreviewerContext {
  clearResizer(): void
}

export interface ISearchContext {
  replace(payload: string, option?: any): void
}

export interface IEventBusContext {
  emit(event: string, ...args: any[]): void
  on(event: string, handler: any): void
  off(event: string, handler: any): void
  hasSubscribers(event: string): boolean
}

export interface IControlContext {
  getActiveControl(): any
  getValueById(payload: any): any
  setValueListById(payload: any[]): void
  setExtensionListById(payload: any[]): void
  setPropertiesListById(payload: any[]): void
  setHighlightList(payload: any): void
  getList(): IElement[]
  removeControl(startIndex: number): number | null
}

export interface IWorkerManagerContext {
  getValue(options?: IGetValueOption): Promise<IEditorResult>
  getGroupIds(): Promise<string[]>
  getWordCount(): Promise<number>
  getCatalog(): Promise<any>
}

export interface IDrawContext {
  // 状态查询
  isReadonly(): boolean
  isDisabled(): boolean
  getMode(): EditorMode
  getListener(): { saved?: (data: IEditorResult) => void }

  // 元素操作
  getElementList(): IElement[]
  getOriginalElementList(): IElement[]
  getOriginalMainElementList(): IElement[]
  getMainElementList(): IElement[]
  getHeaderElementList(): IElement[]
  getFooterElementList(): IElement[]
  getWidth(): number
  getHeight(): number
  getPageGap(): number
  spliceElementList(
    elementList: IElement[],
    start: number,
    deleteCount?: number,
    newItems?: IElement[],
    options?: any
  ): void
  insertElementList(
    elementList: IElement[],
    options?: IInsertElementListOption
  ): void
  appendElementList(
    elementList: IElement[],
    options?: IAppendElementListOption
  ): void

  // 渲染
  render(options?: IDrawOption): void

  // 模式设置
  setMode(mode: EditorMode): void
  setPageMode(pageMode: PageMode): void
  setPageScale(scale: number): void
  setPaperSize(width: number, height: number): void
  setPaperDirection(direction: PaperDirection): void
  setPaperMargin(margin: IMargin): void

  // 样式
  getPainterStyle(): IElementStyle | null
  setPainterStyle(style: IElementStyle, options: any): void

  // 尺寸
  getWidth(): number
  getHeight(): number
  getOriginalHeight(): number
  getOriginalPageGap(): number
  getOriginalInnerWidth(): number

  // 数据
  getValue(options?: IGetValueOption): IEditorResult
  setValue(payload: Partial<IEditorData>, options?: ISetValueOption): void
  getDataURL(payload?: IGetImageOption): Promise<string[]>

  // 行数据
  getRowList(): IRow[]
  getOriginalRowList(): IRow[]

  // 选项
  getOptions(): DeepRequired<IEditorOption>

  // 容器
  getContainer(): HTMLDivElement

  // 子系统获取（返回接口类型）
  getRange(): RangeManager
  getCursor(): ICursorContext
  getPosition(): Position
  getHistoryManager(): HistoryManager
  getCanvasEvent(): CanvasEvent
  getControl(): IControlContext
  getWorkerManager(): IWorkerManagerContext
  getSearch(): ISearchContext
  getI18n(): I18n
  getZone(): IZoneContext
  getTableOperate(): TableOperate
  getRegister(): IRegisterContext | null
  getPreviewer(): IPreviewerContext
  getBadge(): IBadgeContext
  getListParticle(): IListParticleContext
  getHyperlinkParticle(): IHyperlinkParticleContext
  getGroup(): IGroupContext
  getArea(): IAreaContext
  getEventBus(): IEventBusContext
  initRevisionOverlay(callbacks?: { onAccept?: (id: string) => void; onReject?: (id: string) => void }): void
  setRevisionOverlay(overlay: any): void
  setCommentOverlay(overlay: any): void
  getRevisionOverlay(): any
  destroyRevisionOverlay(): void
}
