import { version } from '../plugin-stubs'
import { DOCX_EDITOR_DATA_VERSION, ZERO } from '@vervedoc/docx-editor-schema'
import { RowFlex } from '@vervedoc/docx-editor-schema'
import {
  IAppendElementListOption,
  IComputeRowListPayload,
  IDrawFloatPayload,
  IDrawOption,
  IDrawPagePayload,
  IDrawRowPayload,
  IGetImageOption,
  IGetOriginValueOption,
  IGetValueOption,
  IPainterOption
} from '@vervedoc/docx-editor-schema'
import {
  IEditorData,
  IEditorOption,
  IEditorResult,
  ISetValueOption
} from '@vervedoc/docx-editor-schema'
import {
  IElement,
  IElementMetrics,
  IElementFillRect,
  IElementPosition,
  IElementStyle,
  ISpliceElementListOption,
  IInsertElementListOption
} from '@vervedoc/docx-editor-schema'
import { IRow, IRowElement } from '@vervedoc/docx-editor-schema'
import { deepClone, getUUID, nextTick } from '@vervedoc/docx-editor-schema'
import { Cursor } from './cursor'
import { CanvasEvent } from '../events/canvas-event'
import { GlobalEvent } from '../events/global-event'
import { HistoryManager } from '../plugin-stubs'
import { Listener } from '@vervedoc/docx-editor-state'
import { Position } from '../position'
import { RangeManager } from '@vervedoc/docx-editor-state'
import { Background } from '../layouts/background'
import { getSeparatorRenderHeight } from '../separator'

import { Highlight } from '../richtexts/highlight'
import { ParagraphColor } from '../richtexts/paragraph-color'
import { Margin } from '../layouts/margin'
import { Search } from '../layouts/search'
import { Strikeout } from '../richtexts/strikeout'
import { Underline } from '../richtexts/underline'
import { ElementType } from '@vervedoc/docx-editor-schema'
import { ImageParticle } from '../renderers/image'
import { LaTexParticle } from '../plugin-stubs'
import { TextParticle } from '../renderers/text'
import { PageNumber } from '../layouts/page-number'
import { ScrollObserver } from '../events/scroll-observer'
import { SelectionObserver } from '../events/selection-observer'
import { TableParticle } from '../renderers/table'
import { TableTool } from '../renderers/table-tool'
import { HyperlinkParticle } from '../renderers/hyperlink'
import { Header } from '../layouts/header'
import { SuperscriptParticle } from '../renderers/superscript'
import { SubscriptParticle } from '../renderers/subscript'
import { SeparatorParticle } from '../renderers/separator'
import { PageBreakParticle } from '../renderers/page-break'
import { Watermark } from '../layouts/watermark'
import {
  EditorComponent,
  EditorMode,
  EditorZone,
  PageMode,
  PaperDirection,
  WordBreak
} from '@vervedoc/docx-editor-schema'
import { Control } from '../widgets/control'
import {
  deleteSurroundElementList,
  getIsBlockElement,
  getSlimCloneElementList,
  pickSurroundElementList,
  zipElementList
} from '@vervedoc/docx-editor-schema'
import { CheckboxParticle } from '../renderers/checkbox'
import { RadioParticle } from '../renderers/radio'
import { DeepRequired, IPadding } from '@vervedoc/docx-editor-schema'
import {
  ControlComponent,
  ControlIndentation
} from '@vervedoc/docx-editor-schema'
import { formatElementList, isParagraphSeparator, isTableElement, isImageElement } from '@vervedoc/docx-editor-schema'
import { WorkerManager } from '../plugin-stubs'
import { Previewer } from '../renderers/previewer'
import { DateParticle } from '../plugin-stubs'
import { IMargin } from '@vervedoc/docx-editor-schema'
import { BlockParticle } from '../plugin-stubs'
import { EDITOR_COMPONENT, EDITOR_PREFIX } from '@vervedoc/docx-editor-schema'
import { I18n } from '../plugin-stubs'
import { ImageObserver } from '../events/image-observer'
import { Zone } from '../layouts/region'
import { Footer } from '../layouts/footer'
import {
  IMAGE_ELEMENT_TYPE,
  TEXTLIKE_ELEMENT_TYPE
} from '@vervedoc/docx-editor-schema'
import { ListParticle } from '../renderers/list'
import { Placeholder } from '../layouts/placeholder'
import { EventBus } from '@vervedoc/docx-editor-state'
import { EventBusMap } from '@vervedoc/docx-editor-schema'
import { Group } from '../layouts/group'

import { Override } from '../plugins/override'
import { FlexDirection, ImageDisplay } from '@vervedoc/docx-editor-schema'
import { PUNCTUATION_REG } from '@vervedoc/docx-editor-schema'
import { LineBreakParticle } from '../renderers/line-break'
import { MouseObserver } from '../events/mouse-observer'
import { LineNumber } from '../layouts/line-number'
import { PageBorder } from '../layouts/page-border'
import { ITd, ITr } from '@vervedoc/docx-editor-schema'
import { Actuator } from '../plugin-stubs'
import { TableOperate } from '../renderers/table-ops'
import { Area } from '../layouts/area'
import { Badge } from '../layouts/badge'


export class Draw {
  private container: HTMLDivElement
  private pageContainer: HTMLDivElement
  private pageList: HTMLCanvasElement[]
  private ctxList: CanvasRenderingContext2D[]
  private pageNo: number
  private renderCount: number
  private pagePixelRatio: number | null
  private mode: EditorMode
  private options: DeepRequired<IEditorOption>
  private position: Position
  private zone: Zone
  private elementList: IElement[]
  private listener: Listener
  private eventBus: EventBus<EventBusMap>
  private override: Override

  private i18n: I18n
  private canvasEvent: CanvasEvent
  private globalEvent: GlobalEvent
  private cursor: Cursor
  private range: RangeManager
  private margin: Margin
  private background: Background
  private badge: Badge
  private search: Search
  private group: Group

  private area: Area
  private underline: Underline
  private strikeout: Strikeout
  private highlight: Highlight

  private paragraphColor: ParagraphColor
  private historyManager: HistoryManager
  private previewer: Previewer
  private imageParticle: ImageParticle
  private laTexParticle: LaTexParticle
  private textParticle: TextParticle
  private tableParticle: TableParticle
  private tableTool: TableTool
  private tableOperate: TableOperate
  private pageNumber: PageNumber
  private lineNumber: LineNumber
  private waterMark: Watermark
  private placeholder: Placeholder
  private header: Header
  private footer: Footer
  private hyperlinkParticle: HyperlinkParticle
  private dateParticle: DateParticle
  private separatorParticle: SeparatorParticle
  private pageBreakParticle: PageBreakParticle
  private superscriptParticle: SuperscriptParticle
  private subscriptParticle: SubscriptParticle
  private checkboxParticle: CheckboxParticle
  private radioParticle: RadioParticle
  private blockParticle: BlockParticle
  private listParticle: ListParticle
  private lineBreakParticle: LineBreakParticle
  private control: Control
  private pageBorder: PageBorder
  private revisionOverlay: any | null
  private commentOverlay: any | null
  private workerManager: WorkerManager
  private scrollObserver: ScrollObserver
  private selectionObserver: SelectionObserver
  private imageObserver: ImageObserver
  private mouseObserver: MouseObserver
  private loadingOverlay: HTMLDivElement | null

  private LETTER_REG: RegExp
  private WORD_LIKE_REG: RegExp
  private rowList: IRow[]
  private pageRowList: IRow[][]
  private painterStyle: IElementStyle | null
  private painterOptions: IPainterOption | null
  private visiblePageNoList: number[]
  private intersectionPageNo: number
  private lazyRenderIntersectionObserver: IntersectionObserver | null
  private printModeData: Required<IEditorData> | null
  private _register: any | null = null
  private readonly HEADER_DEFAULT_SIZE = 10

  constructor(
    rootContainer: HTMLElement,
    options: DeepRequired<IEditorOption>,
    data: IEditorData,
    listener: Listener,
    eventBus: EventBus<EventBusMap>,
    override: Override
  ) {
    this._normalizeHeaderElementList(data.header)
    this.container = this._wrapContainer(rootContainer)
    this.pageList = []
    this.ctxList = []
    this.pageNo = 0
    this.renderCount = 0
    this.pagePixelRatio = null
    this.loadingOverlay = null
    this.mode = options.mode
    this.options = options
    this.elementList = data.main
    this.listener = listener
    this.eventBus = eventBus
    this.override = override

    this._formatContainer()
    this.pageContainer = this._createPageContainer()
    this._createPage(0)

    this.i18n = new I18n(options.locale)
    this.historyManager = new HistoryManager(this)
    this.position = new Position(this)
    this.zone = new Zone(this)
    this.range = new RangeManager(this)
    this.margin = new Margin(this)
    this.background = new Background(this)
    this.badge = new Badge(this)
    this.search = new Search(this)
    this.group = new Group(this)

    this.area = new Area(this)
    this.underline = new Underline(this)
    this.strikeout = new Strikeout(this)
    this.highlight = new Highlight(this)

    this.paragraphColor = new ParagraphColor()
    this.previewer = new Previewer(this)
    this.imageParticle = new ImageParticle(this)
    this.laTexParticle = new LaTexParticle(this)
    this.textParticle = new TextParticle(this)
    this.tableParticle = new TableParticle(this)
    this.tableTool = new TableTool(this)
    this.tableOperate = new TableOperate(this)
    this.pageNumber = new PageNumber(this)
    this.lineNumber = new LineNumber(this)
    this.waterMark = new Watermark(this)
    this.placeholder = new Placeholder(this)
    this.header = new Header(this, data.header)
    this.footer = new Footer(this, data.footer)
    this.hyperlinkParticle = new HyperlinkParticle(this)
    this.dateParticle = new DateParticle(this)
    this.separatorParticle = new SeparatorParticle(this)
    this.pageBreakParticle = new PageBreakParticle(this)
    this.superscriptParticle = new SuperscriptParticle()
    this.subscriptParticle = new SubscriptParticle()
    this.checkboxParticle = new CheckboxParticle(this)
    this.radioParticle = new RadioParticle(this)
    this.blockParticle = new BlockParticle(this)
    this.listParticle = new ListParticle(this)
    this.lineBreakParticle = new LineBreakParticle(this)
    this.control = new Control(this)
    this.pageBorder = new PageBorder(this)
    this.revisionOverlay = null

    this.scrollObserver = new ScrollObserver(this)
    this.selectionObserver = new SelectionObserver(this)
    this.imageObserver = new ImageObserver()
    this.mouseObserver = new MouseObserver(this)

    this.canvasEvent = new CanvasEvent(this)
    this.cursor = new Cursor(this, this.canvasEvent)
    this.canvasEvent.register()
    this.globalEvent = new GlobalEvent(this, this.canvasEvent)
    this.globalEvent.register()

    this.workerManager = new WorkerManager(this)
    new Actuator(this)

    const { letterClass } = options
    this.LETTER_REG = new RegExp(`[${letterClass.join('')}]`)
    this.WORD_LIKE_REG = new RegExp(
      `${letterClass.map(letter => `[^${letter}][${letter}]`).join('|')}`
    )
    this.rowList = []
    this.pageRowList = []
    this.painterStyle = null
    this.painterOptions = null
    this.visiblePageNoList = []
    this.intersectionPageNo = 0
    this.lazyRenderIntersectionObserver = null
    this.printModeData = null

    // 打印模式优先设置打印数据
    if (this.mode === EditorMode.PRINT) {
      this.setPrintData()
    }
    this.render({
      isInit: true,
      isSetCursor: false,
      isFirstRender: true
    })
  }

  // 设置打印数据
  public setPrintData() {
    this.printModeData = {
      header: this.header.getElementList(),
      main: this.elementList,
      footer: this.footer.getElementList()
    }
    // 过滤控件辅助元素
    const clonePrintModeData = deepClone(this.printModeData)
    const editorDataKeys: (keyof IEditorData)[] = ['header', 'main', 'footer']
    editorDataKeys.forEach(key => {
      clonePrintModeData[key] = this.control.filterAssistElement(
        clonePrintModeData[key]
      )
    })
    this.setEditorData(clonePrintModeData)
  }

  // 还原打印数据
  public clearPrintData() {
    if (this.printModeData) {
      this.setEditorData(this.printModeData)
      this.printModeData = null
    }
  }

  public getLetterReg(): RegExp {
    return this.LETTER_REG
  }

  public getMode(): EditorMode {
    return this.mode
  }

  public setRegister(register: any) {
    this._register = register
  }

  public getRegister(): any | null {
    return this._register
  }

  public setMode(payload: EditorMode) {
    if (this.mode === payload) return
    // 设置打印模式
    if (payload === EditorMode.PRINT) {
      this.setPrintData()
    }
    // 取消打印模式
    if (this.mode === EditorMode.PRINT) {
      this.clearPrintData()
    }
    this.clearSideEffect()
    this.range.clearRange()
    this.mode = payload
    this.options.mode = payload
    this.render({
      isSetCursor: false,
      isSubmitHistory: false
    })
  }

  public isReadonly() {
    if (this.area.getActiveAreaInfo()?.area?.mode) {
      return this.area.isReadonly()
    }
    switch (this.mode) {
      case EditorMode.DESIGN:
        return false
      case EditorMode.READONLY:
      case EditorMode.PRINT:
        return true
      case EditorMode.FORM:
        return !this.control.getIsRangeWithinControl()
      default:
        return false
    }
  }

  public isDisabled() {
    if (this.mode === EditorMode.DESIGN) return false
    const { startIndex, endIndex } = this.range.getRange()
    const elementList = this.getElementList()
    // 优先判断表格单元格
    if (this.getTd()?.disabled) return true
    if (startIndex === endIndex) {
      const startElement = elementList[startIndex]
      const nextElement = elementList[startIndex + 1]
      return !!(
        (startElement?.title?.disabled &&
          nextElement?.title?.disabled &&
          startElement.titleId === nextElement.titleId) ||
        (startElement?.control?.disabled &&
          nextElement?.control?.disabled &&
          startElement.controlId === nextElement.controlId)
      )
    }
    const selectionElementList = elementList.slice(startIndex + 1, endIndex + 1)
    return selectionElementList.some(
      element => element.title?.disabled || element.control?.disabled
    )
  }

  public isDesignMode() {
    return this.mode === EditorMode.DESIGN
  }

  public isPrintMode() {
    return this.mode === EditorMode.PRINT
  }

  public getOriginalWidth(): number {
    const { paperDirection, width, height } = this.options
    return paperDirection === PaperDirection.VERTICAL ? width : height
  }

  public getOriginalHeight(): number {
    const { paperDirection, width, height } = this.options
    return paperDirection === PaperDirection.VERTICAL ? height : width
  }

  public getWidth(): number {
    return Math.floor(this.getOriginalWidth() * this.options.scale)
  }

  public getHeight(): number {
    return Math.floor(this.getOriginalHeight() * this.options.scale)
  }

  public getMainHeight(): number {
    const pageHeight = this.getHeight()
    return pageHeight - this.getMainOuterHeight()
  }

  public getMainOuterHeight(): number {
    const margins = this.getMargins()
    const headerExtraHeight = this.header.getExtraHeight()
    const footerExtraHeight = this.footer.getExtraHeight()
    return margins[0] + margins[2] + headerExtraHeight + footerExtraHeight
  }

  public getCanvasWidth(pageNo = -1): number {
    const page = this.getPage(pageNo)
    return page.width
  }

  public getCanvasHeight(pageNo = -1): number {
    const page = this.getPage(pageNo)
    return page.height
  }

  public getInnerWidth(): number {
    const width = this.getWidth()
    const margins = this.getMargins()
    return width - margins[1] - margins[3]
  }

  public getOriginalInnerWidth(): number {
    const width = this.getOriginalWidth()
    const margins = this.getOriginalMargins()
    return width - margins[1] - margins[3]
  }

  public getContextInnerWidth(): number {
    const positionContext = this.position.getPositionContext()
    if (positionContext.isTable) {
      const { index, trIndex, tdIndex } = positionContext
      const elementList = this.getOriginalElementList()
      const td = elementList[index!].trList![trIndex!].tdList[tdIndex!]
      const tdPadding = this.getTdPadding()
      return td!.width! - tdPadding[1] - tdPadding[3]
    }
    return this.getOriginalInnerWidth()
  }

  public getMargins(): IMargin {
    return <IMargin>this.getOriginalMargins().map(m => m * this.options.scale)
  }

  public getOriginalMargins(): number[] {
    const { margins, paperDirection } = this.options
    return paperDirection === PaperDirection.VERTICAL
      ? margins
      : [margins[1], margins[2], margins[3], margins[0]]
  }

  public getPageGap(): number {
    return this.options.pageGap * this.options.scale
  }

  public getOriginalPageGap(): number {
    return this.options.pageGap
  }

  public getPageNumberBottom(): number {
    const {
      pageNumber: { bottom },
      scale
    } = this.options
    return bottom * scale
  }

  public getMarginIndicatorSize(): number {
    return this.options.marginIndicatorSize * this.options.scale
  }

  public getDefaultBasicRowMarginHeight(): number {
    return this.options.defaultBasicRowMarginHeight * this.options.scale
  }


  public getTdPadding(): IPadding {
    const {
      table: { tdPadding },
      scale
    } = this.options
    const positionContext = this.position.getPositionContext()
    if (positionContext.isTable) {
      const { index, trIndex, tdIndex } = positionContext
      const elementList = this.getOriginalElementList()
      const element = elementList[index!]
      const td = element.trList?.[trIndex!]?.tdList?.[tdIndex!]
      const base = td?.padding || element.tdPadding || tdPadding
      return <IPadding>base.map(m => m * scale)
    }
    return <IPadding>tdPadding.map(m => m * scale)
  }

  public getContainer(): HTMLDivElement {
    return this.container
  }

  public getPageContainer(): HTMLDivElement {
    return this.pageContainer
  }

  public setLoading(visible: boolean, text?: string): void {
    if (visible) {
      if (this.loadingOverlay) {
        const textEl = this.loadingOverlay.querySelector('.ce-loading-text')
        if (textEl && text) textEl.textContent = text
        return
      }
      if (!document.getElementById('ce-loading-spin-keyframes')) {
        const style = document.createElement('style')
        style.id = 'ce-loading-spin-keyframes'
        style.textContent = '@keyframes ce-loading-spin{to{transform:rotate(360deg)}}'
        document.head.appendChild(style)
      }
      const overlay = document.createElement('div')
      overlay.className = `${EDITOR_PREFIX}-loading-overlay`
      const rect = this.container.getBoundingClientRect()
      overlay.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;background:rgba(255,255,255,0.6);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:99999;pointer-events:none;`
      const card = document.createElement('div')
      card.style.cssText = 'background:#000;border-radius:8px;padding:24px 56px;display:flex;flex-direction:column;align-items:center;gap:14px;box-shadow:0 4px 20px rgba(0,0,0,0.3);'
      const spinner = document.createElement('div')
      spinner.style.cssText = 'width:32px;height:32px;border:3px solid rgba(255,255,255,0.2);border-top-color:#fff;border-radius:50%;animation:ce-loading-spin 0.8s linear infinite;'
      const textEl = document.createElement('span')
      textEl.className = 'ce-loading-text'
      textEl.style.cssText = 'font-size:14px;color:#fff;font-weight:400;'
      textEl.textContent = text || '加载中...'
      card.appendChild(spinner)
      card.appendChild(textEl)
      overlay.appendChild(card)
      document.body.appendChild(overlay)
      this.loadingOverlay = overlay
    } else {
      if (this.loadingOverlay) {
        this.loadingOverlay.remove()
        this.loadingOverlay = null
      }
    }
  }

  public getVisiblePageNoList(): number[] {
    return this.visiblePageNoList
  }

  public setVisiblePageNoList(payload: number[]) {
    this.visiblePageNoList = payload
    if (this.listener.visiblePageNoListChange) {
      this.listener.visiblePageNoListChange(this.visiblePageNoList)
    }
    if (this.eventBus.hasSubscribers('visiblePageNoListChange')) {
      this.eventBus.emit('visiblePageNoListChange', this.visiblePageNoList)
    }
  }

  public getIntersectionPageNo(): number {
    return this.intersectionPageNo
  }

  public setIntersectionPageNo(payload: number) {
    this.intersectionPageNo = payload
    if (this.listener.intersectionPageNoChange) {
      this.listener.intersectionPageNoChange(this.intersectionPageNo)
    }
    if (this.eventBus.hasSubscribers('intersectionPageNoChange')) {
      this.eventBus.emit('intersectionPageNoChange', this.intersectionPageNo)
    }
  }

  public getPageNo(): number {
    return this.pageNo
  }

  public setPageNo(payload: number) {
    this.pageNo = payload
  }

  public getRenderCount(): number {
    return this.renderCount
  }

  public getPage(pageNo = -1): HTMLCanvasElement {
    return this.pageList[~pageNo ? pageNo : this.pageNo]
  }

  public getPageList(): HTMLCanvasElement[] {
    return this.pageList
  }

  public getPageCount(): number {
    return this.pageList.length
  }

  public getTableRowList(sourceElementList: IElement[]): IRow[] {
    const positionContext = this.position.getPositionContext()
    const { index, trIndex, tdIndex } = positionContext
    return sourceElementList[index!].trList![trIndex!].tdList[tdIndex!].rowList!
  }

  public getOriginalRowList() {
    const zoneManager = this.getZone()
    if (zoneManager.isHeaderActive()) {
      return this.header.getRowList()
    }
    if (zoneManager.isFooterActive()) {
      return this.footer.getRowList()
    }
    return this.rowList
  }

  public getRowList(): IRow[] {
    const positionContext = this.position.getPositionContext()
    return positionContext.isTable
      ? this.getTableRowList(this.getOriginalElementList())
      : this.getOriginalRowList()
  }

  public getPageRowList(): IRow[][] {
    return this.pageRowList
  }

  public getCtx(): CanvasRenderingContext2D {
    return this.ctxList[this.pageNo]
  }

  public getOptions(): DeepRequired<IEditorOption> {

    return this.options
  }

  public getSearch(): Search {
    return this.search
  }

  public getGroup(): Group {
    return this.group
  }

  public getArea(): Area {
    return this.area
  }

  public getBadge(): Badge {
    return this.badge
  }

  public getHistoryManager(): HistoryManager {
    return this.historyManager
  }

  public setHistoryManager(historyManager: HistoryManager) {
    this.historyManager = historyManager
  }

  public getPosition(): Position {
    return this.position
  }

  public getZone(): Zone {
    return this.zone
  }

  public getRange(): RangeManager {
    return this.range
  }

  public getLineBreakParticle(): LineBreakParticle {
    return this.lineBreakParticle
  }

  public getTextParticle(): TextParticle {
    return this.textParticle
  }

  public getHeaderElementList(): IElement[] {
    return this.header.getElementList()
  }

  public getTableElementList(sourceElementList: IElement[]): IElement[] {
    const positionContext = this.position.getPositionContext()
    const { index, trIndex, tdIndex } = positionContext
    return (
      sourceElementList[index!].trList?.[trIndex!].tdList[tdIndex!].value || []
    )
  }

  public getElementList(): IElement[] {
    const positionContext = this.position.getPositionContext()
    const elementList = this.getOriginalElementList()
    return positionContext.isTable
      ? this.getTableElementList(elementList)
      : elementList
  }

  public getMainElementList(): IElement[] {
    const positionContext = this.position.getPositionContext()
    return positionContext.isTable
      ? this.getTableElementList(this.elementList)
      : this.elementList
  }

  public getOriginalElementList() {
    const zoneManager = this.getZone()
    if (zoneManager.isHeaderActive()) {
      return this.getHeaderElementList()
    }
    if (zoneManager.isFooterActive()) {
      return this.getFooterElementList()
    }
    return this.elementList
  }

  public getOriginalMainElementList(): IElement[] {
    return this.elementList
  }

  public getFooterElementList(): IElement[] {
    return this.footer.getElementList()
  }

  public getTd(): ITd | null {
    const positionContext = this.position.getPositionContext()
    const { index, trIndex, tdIndex, isTable } = positionContext
    if (isTable) {
      const elementList = this.getOriginalElementList()
      return elementList[index!].trList![trIndex!].tdList[tdIndex!]
    }
    return null
  }

  public insertElementList(
    payload: IElement[],
    options: IInsertElementListOption = {}
  ) {
    if (!payload.length || !this.range.canInput()) return
    const { startIndex, endIndex } = this.range.getRange()
    if (!~startIndex && !~endIndex) return
    const { isSubmitHistory = true } = options
    formatElementList(payload, {
      isHandleFirstElement: false,
      editorOptions: this.options
    })
    let curIndex = -1
    // 判断是否在控件内
    let activeControl = this.control.getActiveControl()
    // 光标在控件内如果当前没有被激活，需要手动激活
    if (!activeControl && this.control.getIsRangeWithinControl()) {
      this.control.initControl()
      activeControl = this.control.getActiveControl()
    }
    if (activeControl && this.control.getIsRangeWithinControl()) {
      curIndex = activeControl.setValue(payload, undefined, {
        isIgnoreDisabledRule: true
      })
      this.control.emitControlContentChange()
    } else {
      const elementList = this.getElementList()
      const isCollapsed = startIndex === endIndex
      const start = startIndex + 1
      if (!isCollapsed) {
        this.spliceElementList(elementList, start, endIndex - startIndex)
      }
      this.spliceElementList(elementList, start, 0, payload)
      curIndex = startIndex + payload.length
      // 列表前如有换行符则删除-因为列表内已存在
      const preElement = elementList[start - 1]
      if (
        payload[0].listId &&
        preElement &&
        !preElement.listId &&
        preElement?.value === ZERO &&
        (!preElement.type || preElement.type === ElementType.TEXT)
      ) {
        elementList.splice(startIndex, 1)
        curIndex -= 1
      }
    }
    if (~curIndex) {
      this.range.setRange(curIndex, curIndex)
      this.render({
        curIndex,
        isSubmitHistory
      })
    }
  }

  public appendElementList(
    elementList: IElement[],
    options: IAppendElementListOption = {}
  ) {
    if (!elementList.length) return
    formatElementList(elementList, {
      isHandleFirstElement: false,
      editorOptions: this.options
    })
    let curIndex: number
    const { isPrepend, isSubmitHistory = true } = options
    if (isPrepend) {
      this.elementList.splice(1, 0, ...elementList)
      curIndex = elementList.length
    } else {
      this.elementList.push(...elementList)
      curIndex = this.elementList.length - 1
    }
    this.range.setRange(curIndex, curIndex)
    this.render({
      curIndex,
      isSubmitHistory
    })
  }

  public spliceElementList(
    elementList: IElement[],
    start: number,
    deleteCount: number,
    items?: IElement[],
    options?: ISpliceElementListOption
  ) {
    const { isIgnoreDeletedRule = false } = options || {}
    const { group, modeRule } = this.options
    if (deleteCount > 0) {
      // 当最后元素与开始元素列表信息不一致时：清除当前列表信息
      const endIndex = start + deleteCount
      const endElement = elementList[endIndex]
      const endElementListId = endElement?.listId
      if (
        endElementListId &&
        elementList[start - 1]?.listId !== endElementListId
      ) {
        let startIndex = endIndex
        while (startIndex < elementList.length) {
          const curElement = elementList[startIndex]
          if (
            curElement.listId !== endElementListId ||
            curElement.value === ZERO
          ) {
            break
          }
          delete curElement.listId
          delete curElement.listType
          delete curElement.listStyle
          startIndex++
        }
      }
      // 非明确忽略删除规则 && 非设计模式 && 非光标在控件内(控件内控制) =》 校验删除规则
      if (
        !isIgnoreDeletedRule &&
        !this.isDesignMode() &&
        !this.control.getIsRangeWithinControl()
      ) {
        const tdDeletable = this.getTd()?.deletable
        let deleteIndex = endIndex - 1
        while (deleteIndex >= start) {
          const deleteElement = elementList[deleteIndex]
          if (
            deleteElement?.control?.hide ||
            deleteElement?.area?.hide ||
            (tdDeletable !== false &&
              deleteElement?.control?.deletable !== false &&
              (!deleteElement.controlId ||
                this.mode !== EditorMode.FORM ||
                !modeRule[this.mode].controlDeletableDisabled) &&
              deleteElement?.title?.deletable !== false &&
              (group.deletable !== false || !deleteElement.groupIds?.length) &&
              (deleteElement?.area?.deletable !== false ||
                deleteElement?.areaIndex !== 0))
          ) {
            elementList.splice(deleteIndex, 1)
          }
          deleteIndex--
        }
      } else {
        elementList.splice(start, deleteCount)
      }
    }
    // 循环添加，避免使用解构影响性能
    if (items?.length) {
      for (let i = 0; i < items.length; i++) {
        elementList.splice(start + i, 0, items[i])
      }
    }
  }

  public getCanvasEvent(): CanvasEvent {
    return this.canvasEvent
  }

  public getGlobalEvent(): GlobalEvent {
    return this.globalEvent
  }

  public getListener(): Listener {
    return this.listener
  }

  public getEventBus(): EventBus<EventBusMap> {
    return this.eventBus
  }

  public getOverride(): Override {
    return this.override
  }

  public initRevisionOverlay(_callbacks?: { onAccept?: (id: string) => void; onReject?: (id: string) => void }) {
    if (!this.revisionOverlay) {
      this.revisionOverlay = { update: () => {} }
    }
    this.revisionOverlay.update()
  }

  public setRevisionOverlay(overlay: any) {
    this.revisionOverlay = overlay
  }

  public setCommentOverlay(overlay: any) {
    this.commentOverlay = overlay
  }

  public destroyRevisionOverlay() {
    if (this.revisionOverlay) {
      this.revisionOverlay.destroy()
    this.revisionOverlay = null
    this.commentOverlay = null
    }
  }

  public getRevisionOverlay(): any | null {
    return this.revisionOverlay
  }

  public getCursor(): Cursor {
    return this.cursor
  }

  public getPreviewer(): Previewer {
    return this.previewer
  }

  public getImageParticle(): ImageParticle {
    return this.imageParticle
  }

  public getLaTexParticle(): LaTexParticle {
    return this.laTexParticle
  }

  public setLaTexParticle(laTexParticle: LaTexParticle) {
    this.laTexParticle = laTexParticle
  }

  public getBlockParticle(): BlockParticle {
    return this.blockParticle
  }

  public setBlockParticle(blockParticle: BlockParticle) {
    this.blockParticle = blockParticle
  }

  public getTableTool(): TableTool {
    return this.tableTool
  }

  public getTableOperate(): TableOperate {
    return this.tableOperate
  }

  public getTableParticle(): TableParticle {
    return this.tableParticle
  }

  public getHeader(): Header {
    return this.header
  }

  public getFooter(): Footer {
    return this.footer
  }

  public getHyperlinkParticle(): HyperlinkParticle {
    return this.hyperlinkParticle
  }

  public getDateParticle(): DateParticle {
    return this.dateParticle
  }

  public setDateParticle(dateParticle: DateParticle) {
    this.dateParticle = dateParticle
  }

  public getListParticle(): ListParticle {
    return this.listParticle
  }

  public getCheckboxParticle(): CheckboxParticle {
    return this.checkboxParticle
  }

  public getRadioParticle(): RadioParticle {
    return this.radioParticle
  }

  public getControl(): Control {
    return this.control
  }

  public setControl(control: Control) {
    this.control = control
  }

  public getWorkerManager(): WorkerManager {
    return this.workerManager
  }

  public setWorkerManager(workerManager: WorkerManager) {
    this.workerManager = workerManager
  }

  public getImageObserver(): ImageObserver {
    return this.imageObserver
  }

  public getI18n(): I18n {
    return this.i18n
  }

  public getRowCount(): number {
    return this.getRowList().length
  }

  public async getDataURL(payload: IGetImageOption = {}): Promise<string[]> {
    const { pixelRatio, mode } = payload
    // 放大像素比
    if (pixelRatio) {
      this.setPagePixelRatio(pixelRatio)
    }
    // 不同模式
    const currentMode = this.mode
    const isSwitchMode = !!mode && currentMode !== mode
    if (isSwitchMode) {
      this.setMode(mode)
    }
    this.render({
      isLazy: false,
      isCompute: false,
      isSetCursor: false,
      isSubmitHistory: false
    })
    await this.imageObserver.allSettled()
    const dataUrlList = this.pageList.map(c => c.toDataURL())
    // 还原
    if (pixelRatio) {
      this.setPagePixelRatio(null)
    }
    if (isSwitchMode) {
      this.setMode(currentMode)
    }
    return dataUrlList
  }

  public getPainterStyle(): IElementStyle | null {
    return this.painterStyle && Object.keys(this.painterStyle).length
      ? this.painterStyle
      : null
  }

  public getPainterOptions(): IPainterOption | null {
    return this.painterOptions
  }

  public setPainterStyle(
    payload: IElementStyle | null,
    options?: IPainterOption
  ) {
    this.painterStyle = payload
    this.painterOptions = options || null
    if (this.getPainterStyle()) {
      this.pageList.forEach(c => (c.style.cursor = 'copy'))
    }
  }

  public setDefaultRange() {
    if (!this.elementList.length) return
    setTimeout(() => {
      const curIndex = this.elementList.length - 1
      this.range.setRange(curIndex, curIndex)
      this.range.setRangeStyle()
    })
  }

  public getIsPagingMode(): boolean {
    return this.options.pageMode === PageMode.PAGING
  }

  public setPageMode(payload: PageMode) {
    if (!payload || this.options.pageMode === payload) return
    this.options.pageMode = payload
    // 纸张大小重置
    if (payload === PageMode.PAGING) {
      const { height } = this.options
      const dpr = this.getPagePixelRatio()
      const canvas = this.pageList[0]
      canvas.style.height = `${height}px`
      canvas.height = height * dpr
      // canvas尺寸发生变化，上下文被重置
      this._initPageContext(this.ctxList[0])
    } else {
      // 连页模式：移除懒加载监听&清空页眉页脚计算数据
      this._disconnectLazyRender()
      this.header.recovery()
      this.footer.recovery()
      this.zone.setZone(EditorZone.MAIN)
    }
    const { startIndex } = this.range.getRange()
    const isCollapsed = this.range.getIsCollapsed()
    this.render({
      isSetCursor: true,
      curIndex: startIndex,
      isSubmitHistory: false
    })
    // 重新定位避免事件监听丢失
    if (!isCollapsed) {
      this.cursor.drawCursor({
        isShow: false
      })
    }
    // 回调
    setTimeout(() => {
      if (this.listener.pageModeChange) {
        this.listener.pageModeChange(payload)
      }
      if (this.eventBus.hasSubscribers('pageModeChange')) {
        this.eventBus.emit('pageModeChange', payload)
      }
    })
  }

  public setPageScale(payload: number) {
    const dpr = this.getPagePixelRatio()
    this.options.scale = payload
    const width = this.getWidth()
    const height = this.getHeight()
    this.container.style.width = `${width}px`
    this.pageList.forEach((p, i) => {
      p.width = width * dpr
      p.height = height * dpr
      p.style.width = `${width}px`
      p.style.height = `${height}px`
      p.style.marginBottom = `${this.getPageGap()}px`
      this._initPageContext(this.ctxList[i])
    })
    const cursorPosition = this.position.getCursorPosition()
    this.render({
      isSubmitHistory: false,
      isSetCursor: !!cursorPosition,
      curIndex: cursorPosition?.index
    })
    if (this.listener.pageScaleChange) {
      this.listener.pageScaleChange(payload)
    }
    if (this.eventBus.hasSubscribers('pageScaleChange')) {
      this.eventBus.emit('pageScaleChange', payload)
    }
  }

  public getPagePixelRatio(): number {
    return this.pagePixelRatio || Math.max(window.devicePixelRatio, 2)
  }

  public setPagePixelRatio(payload: number | null) {
    if (
      (!this.pagePixelRatio && payload === Math.max(window.devicePixelRatio, 2)) ||
      payload === this.pagePixelRatio
    ) {
      return
    }
    this.pagePixelRatio = payload
    this.setPageDevicePixel()
  }

  public setPageDevicePixel() {
    const dpr = this.getPagePixelRatio()
    const width = this.getWidth()
    const height = this.getHeight()
    this.pageList.forEach((p, i) => {
      p.width = width * dpr
      p.height = height * dpr
      this._initPageContext(this.ctxList[i])
    })
    this.render({
      isSubmitHistory: false,
      isSetCursor: false
    })
  }

  public setPaperSize(width: number, height: number) {
    this.options.width = width
    this.options.height = height
    const dpr = this.getPagePixelRatio()
    const realWidth = this.getWidth()
    const realHeight = this.getHeight()
    this.container.style.width = `${realWidth}px`
    this.pageList.forEach((p, i) => {
      p.width = realWidth * dpr
      p.height = realHeight * dpr
      p.style.width = `${realWidth}px`
      p.style.height = `${realHeight}px`
      this._initPageContext(this.ctxList[i])
    })
    this.render({
      isSubmitHistory: false,
      isSetCursor: false
    })
  }

  public setPaperDirection(payload: PaperDirection) {
    const dpr = this.getPagePixelRatio()
    this.options.paperDirection = payload
    const width = this.getWidth()
    const height = this.getHeight()
    this.container.style.width = `${width}px`
    this.pageList.forEach((p, i) => {
      p.width = width * dpr
      p.height = height * dpr
      p.style.width = `${width}px`
      p.style.height = `${height}px`
      this._initPageContext(this.ctxList[i])
    })
    this.render({
      isSubmitHistory: false,
      isSetCursor: false
    })
  }

  public setPaperMargin(payload: IMargin) {
    this.options.margins = payload
    this.render({
      isSubmitHistory: false,
      isSetCursor: false
    })
  }

  public getOriginValue(
    options: IGetOriginValueOption = {}
  ): Required<IEditorData> {
    const { pageNo } = options
    let mainElementList = this.elementList
    if (
      Number.isInteger(pageNo) &&
      pageNo! >= 0 &&
      pageNo! < this.pageRowList.length
    ) {
      mainElementList = this.pageRowList[pageNo!].flatMap(
        row => row.elementList
      )
    }
    const data: Required<IEditorData> = {
      header: this.getHeaderElementList(),
      main: mainElementList,
      footer: this.getFooterElementList()
    }
    return data
  }

  public getValue(options: IGetValueOption = {}): IEditorResult {
    const originData = this.getOriginValue(options)
    const { extraPickAttrs } = options
    const data: IEditorData = {
      header: zipElementList(originData.header, {
        extraPickAttrs
      }),
      main: zipElementList(originData.main, {
        extraPickAttrs,
        isClassifyArea: true
      }),
      footer: zipElementList(originData.footer, {
        extraPickAttrs
      })
    }
    return {
      dataVersion: DOCX_EDITOR_DATA_VERSION,
      schemaVersion: version,
      data,
      options: deepClone(this.options)
    }
  }

  public setValue(payload: Partial<IEditorData>, options?: ISetValueOption) {
    const { header, main, footer } = deepClone(payload)
    if (!header && !main && !footer) return
    const { isSetCursor = false } = options || {}
    const pageComponentData = [header, main, footer]
    pageComponentData.forEach(data => {
      if (!data) return
      formatElementList(data, {
        editorOptions: this.options,
        isForceCompensation: true
      })
    })
    this.setEditorData({
      header,
      main,
      footer
    })
    this.historyManager.recovery()
    const curIndex = isSetCursor
      ? main?.length
        ? main.length - 1
        : 0
      : undefined
    if (curIndex !== undefined) {
      this.range.setRange(curIndex, curIndex)
    }
    this.render({
      curIndex,
      isSetCursor,
      isFirstRender: true
    })
  }

  public setEditorData(payload: Partial<IEditorData>) {
    const { header, main, footer } = payload
    if (header) {
      this._normalizeHeaderElementList(header)
      this.header.setElementList(header)
    }
    if (main) {
      this.elementList = main
    }
    if (footer) {
      this.footer.setElementList(footer)
    }
  }

  private _normalizeHeaderElementList(elementList?: IElement[]) {
    const firstElement = elementList?.[0]
    if (!firstElement) return
    // 空页眉首个补偿元素没有显式字号时，按八号作为默认字号。
    if (firstElement.value === ZERO && firstElement.size === undefined) {
      firstElement.size = this.HEADER_DEFAULT_SIZE
    }
  }

  private _wrapContainer(rootContainer: HTMLElement): HTMLDivElement {
    const container = document.createElement('div')
    rootContainer.append(container)
    return container
  }

  private _formatContainer() {
    // 容器宽度需跟随纸张宽度
    this.container.style.position = 'relative'
    this.container.style.width = `${this.getWidth()}px`
    this.container.setAttribute(EDITOR_COMPONENT, EditorComponent.MAIN)
  }

  private _createPageContainer(): HTMLDivElement {
    const pageContainer = document.createElement('div')
    pageContainer.classList.add(`${EDITOR_PREFIX}-page-container`)
    this.container.append(pageContainer)
    return pageContainer
  }

  private _createPage(pageNo: number) {
    const width = this.getWidth()
    const height = this.getHeight()
    const canvas = document.createElement('canvas')
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    canvas.style.display = 'block'
    canvas.style.backgroundColor = '#ffffff'
    canvas.style.border = '1px solid #e0e0e0'
    canvas.style.marginBottom = `${this.getPageGap()}px`
    canvas.setAttribute('data-index', String(pageNo))
    this.pageContainer.append(canvas)
    // 调整分辨率
    const dpr = this.getPagePixelRatio()
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.cursor = 'text'
    const ctx = canvas.getContext('2d')!
    // 初始化上下文配置
    this._initPageContext(ctx)
    // 缓存上下文
    this.pageList.push(canvas)
    this.ctxList.push(ctx)
  }

  private _initPageContext(ctx: CanvasRenderingContext2D) {
    const dpr = this.getPagePixelRatio()
    ctx.scale(dpr, dpr)
    // 重置以下属性是因部分浏览器(chrome)会应用css样式
    ctx.letterSpacing = '0px'
    ctx.wordSpacing = '0px'
    ctx.direction = 'ltr'
    // 抗锯齿与文字渲染优化
    ctx.textRendering = 'geometricPrecision'
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
  }

  public getElementFont(el: IElement, scale = 1): string {
    const { defaultSize, defaultFont } = this.options
    const expandFontFamily = (fontFamily: string) => {
      const f = (fontFamily || '').trim()
      if (!f) return f
      if (/^fangsong/i.test(f) || /仿宋/i.test(f)) {
        return 'FangSong,"FangSong_GB2312","仿宋",SimSun,"宋体",serif'
      }
      if (/^kaiti/i.test(f) || /楷体/i.test(f)) {
        return 'KaiTi,"KaiTi_GB2312","楷体",SimSun,"宋体",serif'
      }
      if (/^simsun/i.test(f) || /宋体/i.test(f)) {
        return 'SimSun,"宋体",serif'
      }
      if (/^simhei/i.test(f) || /黑体/i.test(f)) {
        return 'SimHei,"黑体",sans-serif'
      }
      if (/microsoft yahei|微软雅黑/i.test(f)) {
        return 'Microsoft YaHei,"微软雅黑","Microsoft YaHei UI","微软雅黑 UI",sans-serif'
      }
      if (/microsoft jhenghei|微軟正黑體/i.test(f)) {
        return 'Microsoft JhengHei,"微軟正黑體",sans-serif'
      }
      if (/^stxinwei/i.test(f) || /华文新魏/i.test(f)) {
        return '"STXinwei","华文新魏",serif'
      }
      return f
    }
    const font = expandFontFamily(el.font || defaultFont)
    const size = el.actualSize || el.size || defaultSize
    return `${el.italic ? 'italic ' : ''}${el.bold ? 'bold ' : ''}${
      size * scale
    }px ${font}`
  }

  public getElementSize(el: IElement) {
    return el.actualSize || el.size || this.options.defaultSize
  }

  public getElementRowMargin(el: IElement) {
    const { defaultBasicRowMarginHeight, defaultRowMargin, scale } =
      this.options
    return (
      defaultBasicRowMarginHeight * (el.rowMargin ?? defaultRowMargin) * scale
    )
  }

  private isPageBreakElement(element?: IElement) {
    return element?.type === ElementType.PAGE_BREAK
  }

  private shouldForceWrapRow(
    element: IElement,
    preElement?: IElement
  ) {
    return (
      element.type === ElementType.SEPARATOR ||
      this.isPageBreakElement(element) ||
      isTableElement(element) ||
      this.isPageBreakElement(preElement) ||
      (preElement && isTableElement(preElement)) ||
      preElement?.type === ElementType.BLOCK ||
      element.type === ElementType.BLOCK ||
      preElement?.listId !== element.listId ||
      (preElement?.areaId !== element.areaId && !element.area?.hide) ||
      (element.control?.flexDirection === FlexDirection.COLUMN &&
        (element.controlComponent === ControlComponent.CHECKBOX ||
          element.controlComponent === ControlComponent.RADIO) &&
        preElement?.controlComponent === ControlComponent.VALUE) ||
      (element.value === ZERO && !element.area?.hide)
    )
  }

  private normalizeSpecialRow(row: IRow) {
    if (row.isPageBreak) {
      row.height = 0
      row.ascent = 0
    }
  }

  private shouldDrawLineBreakForRow(
    curRow: IRow,
    index: number,
    isDrawLineBreak: boolean,
    isPrintMode: boolean
  ) {
    return (
      isDrawLineBreak &&
      !isPrintMode &&
      this.mode !== EditorMode.CLEAN &&
      !curRow.isWidthNotEnough &&
      !curRow.isPageBreak &&
      index === curRow.elementList.length - 1
    )
  }

  public computeRowList(payload: IComputeRowListPayload) {
    const {
      innerWidth,
      elementList,
      isPagingMode = false,
      isFromTable = false,
      startX = 0,
      startY = 0,
      pageHeight = 0,
      mainOuterHeight = 0,
      surroundElementList = []
    } = payload
    const {
      defaultSize,
      defaultRowMargin,
      scale,
      table: { tdPadding, defaultTrMinHeight },
      defaultTabWidth
    } = this.options
    const defaultBasicRowMarginHeight = this.getDefaultBasicRowMarginHeight()
    // 使用 OffscreenCanvas 进行文本测量（性能更好）
    let ctx: CanvasRenderingContext2D
    if (typeof OffscreenCanvas !== 'undefined') {
      const offscreenCanvas = new OffscreenCanvas(1, 1)
      ctx = offscreenCanvas.getContext('2d') as unknown as CanvasRenderingContext2D
    } else {
      const canvas = document.createElement('canvas')
      ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    }
    // 计算列表偏移宽度
    const listStyleMap = this.listParticle.computeListStyle(ctx, elementList)
    const rowList: IRow[] = []
    if (elementList.length) {
      rowList.push({
        width: 0,
        height: 0,
        ascent: 0,
        elementList: [],
        startIndex: 0,
        rowIndex: 0,
        rowFlex: elementList?.[0]?.rowFlex || elementList?.[1]?.rowFlex
      })
    }
    // 起始位置及页码计算
    let x = startX
    let y = startY
    let pageNo = 0
    // 列表位置
    let listId: string | undefined
    let listIndex = 0
    let paragraphFirstLineIndent = 0
    let paragraphIndentLeft = 0
    let isParagraphFirstRow = true
    // 控件最小宽度
    let controlRealWidth = 0
    for (let i = 0; i < elementList.length; i++) {
      const curRow: IRow = rowList[rowList.length - 1]
      const element = elementList[i]
      // 分栏区域检测：当遇到分栏标记元素时，收集整个分栏区域并生成分栏容器行
      if (
        element.columnId &&
        element.columnCount &&
        element.columnCount >= 2
      ) {
        const columnId = element.columnId
        const columnCount = element.columnCount
        const columnGap = (element.columnGap || 0) * scale
        const columnSeparator = element.columnSeparator || false
        const columnWidths = element.columnWidths || []
        // 收集分栏区域内所有元素（跳过起始标记本身）
        const columnElements: IElement[] = []
        let j = i + 1
        while (j < elementList.length) {
          const el = elementList[j]
          if (!el.columnId || el.columnId !== columnId) break
          columnElements.push(el)
          j++
        }
        // 按 COLUMN_BREAK 分组到各列
        const columnGroups: IElement[][] = [[]]
        for (const el of columnElements) {
          if (el.type === ElementType.COLUMN_BREAK) {
            if (columnGroups.length < columnCount) {
              columnGroups.push([])
            }
          } else {
            columnGroups[columnGroups.length - 1].push(el)
          }
        }
        // 计算各列宽度
        const scaledColumnWidths: number[] = []
        if (columnWidths.length >= columnCount) {
          for (let c = 0; c < columnCount; c++) {
            scaledColumnWidths.push(columnWidths[c] * scale)
          }
        } else {
          const totalGap = columnGap * (columnCount - 1)
          const colWidth = (innerWidth - totalGap) / columnCount
          for (let c = 0; c < columnCount; c++) {
            scaledColumnWidths.push(colWidth)
          }
        }
        // 对每列独立调用 computeRowList
        const columnRowLists: IRow[][] = []
        let maxColumnHeight = 0
        for (let c = 0; c < columnCount; c++) {
          const groupElements = columnGroups[c] || []
          if (groupElements.length === 0) {
            columnRowLists.push([])
            continue
          }
          const colRowList = this.computeRowList({
            innerWidth: scaledColumnWidths[c],
            elementList: groupElements,
            isFromTable,
            isPagingMode,
            columnContext: {
              columnId,
              columnIndex: c,
              totalColumns: columnCount
            }
          })
          columnRowLists.push(colRowList)
          const colHeight = colRowList.reduce(
            (sum, row) => sum + row.height, 0
          )
          if (colHeight > maxColumnHeight) {
            maxColumnHeight = colHeight
          }
        }
        // 生成分栏容器行
        const containerRow: IRow = {
          width: innerWidth,
          height: maxColumnHeight,
          ascent: 0,
          startIndex: i,
          elementList: [],
          rowIndex: curRow.rowIndex + (curRow.elementList.length > 0 ? 1 : 0),
          isColumnContainer: true,
          columnRowLists,
          columnWidths: scaledColumnWidths,
          columnGap,
          columnSeparator
        }
        // 如果当前行为空，替换；否则追加新行
        if (curRow.elementList.length <= 1) {
          rowList[rowList.length - 1] = containerRow
        } else {
          rowList.push(containerRow)
        }
        // 跳过分栏区域内的元素（包括结束标记）
        i = j // j 已指向分栏区域外第一个元素，for 循环会再 +1
        // 添加新的空行用于后续元素
        if (i < elementList.length) {
          rowList.push({
            width: 0,
            height: 0,
            ascent: 0,
            elementList: [],
            startIndex: i,
            rowIndex: containerRow.rowIndex + 1
          })
        }
        continue
      }
      if (element.paragraphFirstLineIndent !== undefined) {
        paragraphFirstLineIndent = element.paragraphFirstLineIndent
      }
      if (element.paragraphIndentLeft !== undefined) {
        paragraphIndentLeft = element.paragraphIndentLeft
      }
      const isNonZeroSpacing = element.value !== ZERO
      const paragraphSpacingBefore = isNonZeroSpacing
        ? (element.paragraphSpacingBefore || 0) * scale
        : 0
      const paragraphSpacingAfter = isNonZeroSpacing
        ? (element.paragraphSpacingAfter || 0) * scale
        : 0

      const rowMargin = defaultBasicRowMarginHeight * defaultRowMargin
      const rowMarginTop = rowMargin + paragraphSpacingBefore
      const rowMarginBottom = rowMargin + paragraphSpacingAfter
      const metrics: IElementMetrics = {
        width: 0,
        height: 0,
        boundingBoxAscent: 0,
        boundingBoxDescent: 0
      }
      // 实际可用宽度
      const listOffsetX = element.listId ? listStyleMap.get(element.listId) || 0 : 0
      const listIndentX = element.listId
        ? ((element.listIndent ?? (element.listLevel || 0) * defaultTabWidth) || 0) *
          scale
        : 0
      const paragraphIndentX = paragraphIndentLeft * scale
      if (curRow.offsetX === undefined && (listOffsetX || paragraphIndentX || paragraphFirstLineIndent)) {
        const isListParagraph = !!element.listId
        const firstIndent = isListParagraph
          ? 0
          : (isParagraphFirstRow ? paragraphFirstLineIndent : 0)
        curRow.offsetX = Math.max(0,
          listOffsetX +
          listIndentX +
          paragraphIndentX +
          (isParagraphFirstRow ? firstIndent : 0)
        )
        if (isParagraphFirstRow && !isListParagraph) {
          isParagraphFirstRow = false
        }
      }
      if (element.listId) {
        curRow.isList = true
        if (curRow.listIndex === undefined) {
          curRow.listIndex = listIndex
        }
      }
      const offsetX = curRow.offsetX || 0
      const availableWidth = innerWidth - offsetX
      // 增加起始位置坐标偏移量
      const isStartElement = curRow.elementList.length === 1
      x += isStartElement ? offsetX : 0
      y += isStartElement ? curRow.offsetY || 0 : 0
      if (
        (element.control?.hide || element.area?.hide) &&
        !this.isDesignMode()
      ) {
        metrics.height =
          curRow.elementList[curRow.elementList.length - 1]?.metrics.height ||
          this.options.defaultSize * scale
      } else if (element.revisionType === 'delete') {
        // 删除修订不占位，宽高设为0
        metrics.width = 0
        metrics.height = 0
        metrics.boundingBoxAscent = 0
        metrics.boundingBoxDescent = 0
      } else if (
        isImageElement(element) ||
        element.type === ElementType.LATEX
      ) {
        // 浮动图片无需计算数据
        if (
          element.imgDisplay === ImageDisplay.SURROUND ||
          element.imgDisplay === ImageDisplay.FLOAT_TOP ||
          element.imgDisplay === ImageDisplay.FLOAT_BOTTOM
        ) {
          metrics.width = 0
          metrics.height = 0
          metrics.boundingBoxDescent = 0
        } else {
          const elementWidth = element.width! * scale
          const elementHeight = element.height! * scale
          // 图片超出尺寸后自适应（图片大小大于可用宽度时）
          if (elementWidth > availableWidth) {
            const adaptiveHeight =
              (elementHeight * availableWidth) / elementWidth
            element.width = availableWidth / scale
            element.height = adaptiveHeight / scale
            metrics.width = availableWidth
            metrics.height = adaptiveHeight
            metrics.boundingBoxDescent = adaptiveHeight
          } else {
            metrics.width = elementWidth
            metrics.height = elementHeight
            metrics.boundingBoxDescent = elementHeight
          }
        }
        metrics.boundingBoxAscent = 0
      } else if (isTableElement(element)) {
        const tableTdPadding = element.tdPadding || tdPadding
        // 查看后续表格是否属于同一个源表格-存在即合并
        if (element.pagingId) {
          let tableIndex = i + 1
          let combineCount = 0
          while (tableIndex < elementList.length) {
            const nextElement = elementList[tableIndex]
            if (nextElement.pagingId === element.pagingId) {
              const nexTrList = nextElement.trList!.filter(
                tr => !tr.pagingRepeat
              )
              element.trList!.push(...nexTrList)
              element.height! += nextElement.height!
              tableIndex++
              combineCount++
            } else {
              break
            }
          }
          if (combineCount) {
            elementList.splice(i + 1, combineCount)
          }
        }
        element.pagingIndex = element.pagingIndex ?? 0
        const trList = element.trList!
        const getTrAutoMinHeight = (tr: any) => {
          let maxSize = defaultSize
          let maxTdPaddingHeight = (tableTdPadding[0] || 0) + (tableTdPadding[2] || 0)
          for (let d = 0; d < tr.tdList.length; d++) {
            const td = tr.tdList[d]
            const curPad = td.padding || tableTdPadding
            const curPadH = (curPad[0] || 0) + (curPad[2] || 0)
            if (curPadH > maxTdPaddingHeight) maxTdPaddingHeight = curPadH
            const valueList = td.value || []
            for (let i = 0; i < valueList.length; i++) {
              const el = valueList[i]
              if (!el) continue
              if (el.value === ZERO || el.value === '\n') continue
              const size = el.actualSize || el.size || defaultSize
              if (size > maxSize) maxSize = size
            }
          }
          return Math.ceil(maxSize * 1.4 + maxTdPaddingHeight)
        }
        // 计算前移除上一次的高度
        for (let t = 0; t < trList.length; t++) {
          const tr = trList[t]
          const { defaultTrHeight } = this.options.table
          const baseHeight = Number(defaultTrHeight)
          const hasBaseHeight = Number.isFinite(baseHeight) && baseHeight > 0
          const autoMinHeight = Math.max(
            defaultTrMinHeight,
            hasBaseHeight ? baseHeight : 0,
            getTrAutoMinHeight(tr)
          )
          const explicitHeight = Number(tr.height)
          const hasExplicitHeight = Number.isFinite(explicitHeight) && explicitHeight > 0
          const nextHeight = tr.minHeight ?? (hasExplicitHeight ? explicitHeight : autoMinHeight)
          tr.height = Math.max(defaultTrMinHeight, nextHeight)
          tr.minHeight = tr.height
        }
        // 计算表格行列
        this.tableParticle.computeRowColInfo(element)
        // 计算表格内元素信息
        for (let t = 0; t < trList.length; t++) {
          const tr = trList[t]
          for (let d = 0; d < tr.tdList.length; d++) {
            const td = tr.tdList[d]
            const effectiveTdPadding = td.padding || tableTdPadding
            const tdPaddingWidth = effectiveTdPadding[1] + effectiveTdPadding[3]
            const tdPaddingHeight = effectiveTdPadding[0] + effectiveTdPadding[2]
            const rowList = this.computeRowList({
              innerWidth: (td.width! - tdPaddingWidth) * scale,
              elementList: td.value,
              isFromTable: true,
              isPagingMode
            })
            const rowHeight = rowList.reduce((pre, cur) => pre + cur.height, 0)
            td.rowList = rowList
            // 移除缩放导致的行高变化-渲染时会进行缩放调整
            const curTdHeight = rowHeight / scale + tdPaddingHeight
            // 内容高度大于当前单元格高度需增加
            if (td.height! < curTdHeight) {
              const extraHeight = curTdHeight - td.height!
              const changeTr = trList[t + td.rowspan - 1]
              changeTr.height += extraHeight
              changeTr.tdList.forEach(changeTd => {
                changeTd.height! += extraHeight
                if (!changeTd.realHeight) {
                  changeTd.realHeight = changeTd.height!
                } else {
                  changeTd.realHeight! += extraHeight
                }
              })
            }
            // 当前单元格最小高度及真实高度（包含跨列）
            let curTdMinHeight = 0
            let curTdRealHeight = 0
            let i = 0
            while (i < td.rowspan) {
              const curTr = trList[i + t] || trList[t]
              curTdMinHeight += curTr.minHeight!
              curTdRealHeight += curTr.height!
              i++
            }
            td.realMinHeight = curTdMinHeight
            td.realHeight = curTdRealHeight
            td.mainHeight = curTdHeight
          }
        }
        // 单元格高度大于实际内容高度需减少
        const reduceTrList = this.tableParticle.getTrListGroupByCol(trList)
        for (let t = 0; t < reduceTrList.length; t++) {
          const tr = reduceTrList[t]
          let reduceHeight = -1
          for (let d = 0; d < tr.tdList.length; d++) {
            const td = tr.tdList[d]
            const curTdRealHeight = td.realHeight!
            const curTdHeight = td.mainHeight!
            const curTdMinHeight = td.realMinHeight!
            // 获取最大可减少高度
            const curReduceHeight =
              curTdHeight < curTdMinHeight
                ? curTdRealHeight - curTdMinHeight
                : curTdRealHeight - curTdHeight
            if (!~reduceHeight || curReduceHeight < reduceHeight) {
              reduceHeight = curReduceHeight
            }
          }
          if (reduceHeight > 0) {
            const changeTr = trList[t]
            changeTr.height -= reduceHeight
            changeTr.tdList.forEach(changeTd => {
              changeTd.height! -= reduceHeight
              changeTd.realHeight! -= reduceHeight
            })
          }
        }
        // 需要重新计算表格内值
        this.tableParticle.computeRowColInfo(element)
        // 计算出表格高度
        const tableHeight = this.tableParticle.getTableHeight(element)
        const tableWidth = this.tableParticle.getTableWidth(element)
        element.width = tableWidth
        element.height = tableHeight
        const elementWidth = tableWidth * scale
        const elementHeight = tableHeight * scale
        metrics.width = elementWidth
        metrics.height = elementHeight
        metrics.boundingBoxDescent = elementHeight
        metrics.boundingBoxAscent = -rowMargin
        // 后一个元素也是表格则移除行间距
        if (elementList[i + 1]?.type === ElementType.TABLE) {
          metrics.boundingBoxAscent -= rowMargin
        }
        // 表格分页处理(拆分表格)
        if (isPagingMode) {
          const height = this.getHeight()
          const marginHeight = this.getMainOuterHeight()
          let curPagePreHeight = marginHeight
          for (let r = 0; r < rowList.length; r++) {
            const row = rowList[r]
            const rowOffsetY = row.offsetY || 0
            if (
              row.height + curPagePreHeight + rowOffsetY > height ||
              rowList[r - 1]?.isPageBreak
            ) {
              curPagePreHeight = marginHeight + row.height + rowOffsetY
            } else {
              curPagePreHeight += row.height + rowOffsetY
            }
          }
          // 当前剩余高度是否能容下当前表格第一行（可拆分）的高度，排除掉表头类型
          const rowMarginHeight = rowMargin * 2 * scale
          const firstTrHeight = element.trList![0].height! * scale
          if (
            curPagePreHeight + firstTrHeight + rowMarginHeight > height ||
            (element.pagingIndex !== 0 && element.trList![0].pagingRepeat)
          ) {
            // 无可拆分行则切换至新页
            curPagePreHeight = marginHeight
          }
          // 表格高度超过页面高度开始截断行
          if (curPagePreHeight + rowMarginHeight + elementHeight > height) {
            const trList = element.trList!
            // 计算需要移除的行数
            let deleteStart = 0
            let deleteCount = 0
            let preTrHeight = 0
            // 大于一行时再拆分避免循环
            if (trList.length > 1) {
              for (let r = 0; r < trList.length; r++) {
                const tr = trList[r]
                const trHeight = tr.height * scale
                if (
                  curPagePreHeight + rowMarginHeight + preTrHeight + trHeight >
                  height
                ) {
                  break
                } else {
                  deleteStart = r + 1
                  deleteCount = trList.length - deleteStart
                  preTrHeight += trHeight
                }
              }
            }
            if (deleteCount) {
              const pagingId = element.pagingId || getUUID()
              const cloneElement = this._splitTableForPaging(element, deleteStart)
              if (cloneElement) {
                element.pagingId = pagingId
                cloneElement.pagingId = pagingId
                cloneElement.pagingIndex = element.pagingIndex! + 1
                cloneElement.id = getUUID()
                this._refreshTableLayoutMetrics(element, metrics)
                this._refreshTableLayoutMetrics(cloneElement)
                this.spliceElementList(elementList, i + 1, 0, [cloneElement])
              }
            }
          }
          // 表格经过分页处理-需要处理上下文
          if (element.pagingId) {
            const positionContext = this.position.getPositionContext()
            if (positionContext.isTable) {
              // 查找光标所在表格索引（根据trId搜索）
              let newPositionContextIndex = -1
              let newPositionContextTrIndex = -1
              let tableIndex = i
              while (tableIndex < elementList.length) {
                const curElement = elementList[tableIndex]
                if (curElement.pagingId !== element.pagingId) break
                const trIndex = curElement.trList!.findIndex(
                  r => r.id === positionContext.trId
                )
                if (~trIndex) {
                  newPositionContextIndex = tableIndex
                  newPositionContextTrIndex = trIndex
                  break
                }
                tableIndex++
              }
              if (~newPositionContextIndex) {
                positionContext.index = newPositionContextIndex
                positionContext.trIndex = newPositionContextTrIndex
                this.position.setPositionContext(positionContext)
              }
            }
          }
        }
      } else if (element.type === ElementType.SEPARATOR) {
        const {
          separator: { lineWidth }
        } = this.options
        element.width = availableWidth / scale
        metrics.width = availableWidth
        metrics.height = getSeparatorRenderHeight(element, lineWidth) * scale
        metrics.boundingBoxAscent = -rowMargin
        metrics.boundingBoxDescent = -rowMargin + metrics.height
      } else if (element.type === ElementType.PAGE_BREAK) {
        // 分页符禁用显示时，保留最小高度用于光标定位，但不占用水平空间
        if (this.options.pageBreak.disabled) {
          element.width = 0
          metrics.width = 0
          metrics.height = defaultSize * scale
          metrics.boundingBoxAscent = defaultSize * scale
          metrics.boundingBoxDescent = 0
        } else {
          element.width = availableWidth / scale
          metrics.width = availableWidth
          metrics.height = defaultSize
        }
      } else if (
        element.type === ElementType.RADIO ||
        element.controlComponent === ControlComponent.RADIO
      ) {
        const { width, height, gap } = this.options.radio
        const elementWidth = width + gap * 2
        element.width = elementWidth
        metrics.width = elementWidth * scale
        metrics.height = height * scale
      } else if (
        element.type === ElementType.CHECKBOX ||
        element.controlComponent === ControlComponent.CHECKBOX
      ) {
        const { width, height, gap } = this.options.checkbox
        const elementWidth = width + gap * 2
        element.width = elementWidth
        metrics.width = elementWidth * scale
        metrics.height = height * scale
      } else if (element.type === ElementType.TAB) {
        metrics.width = defaultTabWidth * scale
        metrics.height = defaultSize * scale
        metrics.boundingBoxDescent = 0
        metrics.boundingBoxAscent = metrics.height
      } else if (element.type === ElementType.BLOCK) {
        if (!element.width) {
          metrics.width = availableWidth
        } else {
          const elementWidth = element.width * scale
          metrics.width = Math.min(elementWidth, availableWidth)
        }
        metrics.height = element.height! * scale
        metrics.boundingBoxDescent = metrics.height
        metrics.boundingBoxAscent = 0
      } else {
        // 设置上下标真实字体尺寸
        const size = element.size || defaultSize
        if (
          element.type === ElementType.SUPERSCRIPT ||
          element.type === ElementType.SUBSCRIPT
        ) {
          element.actualSize = Math.ceil(size * 0.6)
        }
        metrics.height = (element.actualSize || size) * scale
        ctx.font = this.getElementFont(element)
        const fontMetrics = this.textParticle.measureText(ctx, element)
        const characterScaleRatio = TextParticle.getCharacterScaleRatio(
          element.characterScale
        )
        metrics.width = fontMetrics.width * scale * characterScaleRatio
        if (element.letterSpacing) {
          metrics.width += element.letterSpacing * scale
        }
        metrics.boundingBoxAscent =
          (element.value === ZERO
            ? element.size || defaultSize
            : fontMetrics.actualBoundingBoxAscent) * scale
        metrics.boundingBoxDescent =
          fontMetrics.actualBoundingBoxDescent * scale
        if (element.type === ElementType.SUPERSCRIPT) {
          metrics.boundingBoxAscent += metrics.height / 2
        } else if (element.type === ElementType.SUBSCRIPT) {
          metrics.boundingBoxDescent += metrics.height / 2
        }
      }
      const lineHeight = this.options.defaultLineHeight
      const ascent =
        isImageElement(element) ||
        element.type === ElementType.LATEX
          ? metrics.height + rowMarginTop
          : metrics.boundingBoxAscent +
            rowMarginTop +
            ((metrics.boundingBoxAscent + metrics.boundingBoxDescent) *
              (lineHeight - 1)) /
              2
      const height =
        rowMarginTop +
        (metrics.boundingBoxAscent + metrics.boundingBoxDescent) * lineHeight +
        rowMarginBottom
      const rowElement: IRowElement = Object.assign(element, {
        metrics,
        left: 0,
        style: this.getElementFont(element, scale)
      })
      // 暂时只考虑非换行场景：控件开始时统计宽度，结束时消费宽度及还原
      if (rowElement.control?.minWidth) {
        if (rowElement.controlComponent) {
          controlRealWidth += metrics.width
        }
        if (rowElement.controlComponent === ControlComponent.POSTFIX) {
          // 设置最小宽度控件属性（字符偏移量）
          this.control.setMinWidthControlInfo({
            row: curRow,
            rowElement,
            availableWidth,
            controlRealWidth
          })
          controlRealWidth = 0
        }
      }
      // 超过限定宽度
      const preElement = elementList[i - 1]
      let nextElement = elementList[i + 1]
      // 累计行宽 + 当前元素宽度 + 排版宽度(英文单词整体宽度 + 后面标点符号宽度)
      let curRowWidth = curRow.width + metrics.width
      if (this.options.wordBreak === WordBreak.BREAK_WORD) {
        if (
          (!preElement?.type || preElement?.type === ElementType.TEXT) &&
          (!element.type || element.type === ElementType.TEXT)
        ) {
          // 英文单词
          const word = `${preElement?.value || ''}${element.value}`
          if (this.WORD_LIKE_REG.test(word)) {
            const { width, endElement } = this.textParticle.measureWord(
              ctx,
              elementList,
              i
            )
            // 单词宽度大于行可用宽度，无需折行
            const wordWidth = width * scale
            if (wordWidth <= availableWidth) {
              curRowWidth += wordWidth
              nextElement = endElement
            }
          }
          // 标点符号
          const punctuationWidth = this.textParticle.measurePunctuationWidth(
            ctx,
            nextElement
          )
          curRowWidth += punctuationWidth * scale
        }
      }
      // 列表信息
      if (element.listId) {
        if (element.listId !== listId) {
          listIndex = 0
        } else if (isParagraphSeparator(element)) {
          listIndex++
        }
      }
      listId = element.listId
      // 计算四周环绕导致的元素偏移量
      const surroundPosition = this.position.setSurroundPosition({
        pageNo,
        rowElement,
        row: curRow,
        rowElementRect: {
          x,
          y,
          height,
          width: metrics.width
        },
        availableWidth,
        surroundElementList
      })
      x = surroundPosition.x
      curRowWidth += surroundPosition.rowIncreaseWidth
      x += metrics.width
      // 是否强制换行
      const isForceBreak =
        i !== 0 &&
        this.shouldForceWrapRow(element, preElement)
      // 是否宽度不足导致换行
      const isWidthNotEnough = curRowWidth > availableWidth
      const isWrap = isForceBreak || isWidthNotEnough
      // 新行数据处理
      if (isWrap) {
        const resolveRowFlex = () => {
          const cur = elementList[i]
          if (cur?.value === ZERO) {
            return (
              elementList[i + 1]?.rowFlex ||
              elementList[i + 2]?.rowFlex ||
              cur.rowFlex
            )
          }
          return cur?.rowFlex || elementList[i + 1]?.rowFlex
        }
        const row: IRow = {
          width: metrics.width,
          height,
          startIndex: i,
          elementList: [rowElement],
          ascent,
          rowIndex: curRow.rowIndex + 1,
          rowFlex: resolveRowFlex(),
          isPageBreak: this.isPageBreakElement(element)
        }
        this.normalizeSpecialRow(row)
        // 控件缩进
        if (
          rowElement.controlComponent !== ControlComponent.PREFIX &&
          rowElement.control?.indentation === ControlIndentation.VALUE_START
        ) {
          // 查找到非前缀的第一个元素位置
          const preStartIndex = curRow.elementList.findIndex(
            el =>
              el.controlId === rowElement.controlId &&
              el.controlComponent !== ControlComponent.PREFIX
          )
          if (~preStartIndex) {
            const preRowPositionList = this.position.computeRowPosition({
              row: curRow,
              innerWidth: this.getInnerWidth()
            })
            const valueStartPosition = preRowPositionList[preStartIndex]
            if (valueStartPosition) {
              row.offsetX = valueStartPosition.coordinate.leftTop[0]
            }
          }
        }
        // 列表缩进
        if (element.listId) {
          row.isList = true
          row.offsetX =
            (row.offsetX || 0) + (listStyleMap.get(element.listId!) || 0) + listIndentX
          row.listIndex = listIndex
        }
        // Y轴偏移量
        row.offsetY =
          !isFromTable &&
          element.area?.top &&
          element.areaId !== elementList[i - 1]?.areaId
            ? element.area.top * scale
            : 0
        rowList.push(row)
      } else {
        curRow.width += metrics.width
        // 减小块元素前第一行空行行高
        if (
          i === 0 &&
          (getIsBlockElement(elementList[1]) || !!elementList[1]?.areaId)
        ) {
          curRow.height = defaultBasicRowMarginHeight
          curRow.ascent = defaultBasicRowMarginHeight
        } else if (curRow.height < height) {
          curRow.height = height
          curRow.ascent = ascent
        }
        curRow.elementList.push(rowElement)
      }
      // 行结束时逻辑
      if (isWrap || i === elementList.length - 1) {
        // 换行原因：宽度不足
        curRow.isWidthNotEnough = isWidthNotEnough && !isForceBreak
        // 两端对齐、分散对齐
        if (
          !curRow.isSurround &&
          (preElement?.rowFlex === RowFlex.JUSTIFY ||
            (preElement?.rowFlex === RowFlex.ALIGNMENT &&
              curRow.isWidthNotEnough))
        ) {
          // 忽略换行符及尾部元素间隔设置
          const rowElementList =
            curRow.elementList[0]?.value === ZERO
              ? curRow.elementList.slice(1)
              : curRow.elementList
          const gap =
            (availableWidth - curRow.width) / (rowElementList.length - 1)
          for (let e = 0; e < rowElementList.length - 1; e++) {
            const el = rowElementList[e]
            el.metrics.width += gap
          }
          curRow.width = availableWidth
        }
      }
      if (i !== 0 && element.value === ZERO && !element.area?.hide && !element.listWrap) {
        paragraphFirstLineIndent = 0
        paragraphIndentLeft = 0
        isParagraphFirstRow = true
      }
      // 重新计算坐标、页码、下一行首行元素环绕交叉
      if (isWrap) {
        x = startX
        y += curRow.height
        if (
          isPagingMode &&
          !isFromTable &&
          pageHeight &&
          (y - startY + mainOuterHeight + height > pageHeight ||
            this.isPageBreakElement(element))
        ) {
          y = startY
          // 删除多余四周环绕型元素
          deleteSurroundElementList(surroundElementList, pageNo)
          pageNo += 1
        }
        // 计算下一行第一个元素是否存在环绕交叉
        rowElement.left = 0
        const nextRow = rowList[rowList.length - 1]
        const surroundPosition = this.position.setSurroundPosition({
          pageNo,
          rowElement,
          row: nextRow,
          rowElementRect: {
            x,
            y,
            height,
            width: metrics.width
          },
          availableWidth,
          surroundElementList
        })
        x = surroundPosition.x
        x += metrics.width
      }
    }

    return rowList
  }

  private _computePageList(): IRow[][] {
    const pageRowList: IRow[][] = [[]]
    const {
      pageMode,
      pageNumber: { maxPageNo }
    } = this.options
    const height = this.getHeight()
    const marginHeight = this.getMainOuterHeight()
    let pageHeight = marginHeight
    let pageNo = 0
    if (pageMode === PageMode.CONTINUITY) {
      pageRowList[0] = this.rowList
      // 重置高度
      pageHeight += this.rowList.reduce(
        (pre, cur) => pre + cur.height + (cur.offsetY || 0),
        0
      )
      const dpr = this.getPagePixelRatio()
      const pageDom = this.pageList[0]
      const pageDomHeight = Number(pageDom.style.height.replace('px', ''))
      if (pageHeight > pageDomHeight) {
        pageDom.style.height = `${pageHeight}px`
        pageDom.height = pageHeight * dpr
      } else {
        const reduceHeight = pageHeight < height ? height : pageHeight
        pageDom.style.height = `${reduceHeight}px`
        pageDom.height = reduceHeight * dpr
      }
      this._initPageContext(this.ctxList[0])
    } else {
      for (let i = 0; i < this.rowList.length; i++) {
        const row = this.rowList[i]
        const rowOffsetY = row.offsetY || 0
        if (
          row.height + rowOffsetY + pageHeight > height ||
          this.rowList[i - 1]?.isPageBreak
        ) {
          if (Number.isInteger(maxPageNo) && pageNo >= maxPageNo!) {
            this.elementList = this.elementList.slice(0, row.startIndex)
            break
          }
          pageHeight = marginHeight + row.height + rowOffsetY
          pageRowList.push([row])
          pageNo++
        } else {
          pageHeight += row.height + rowOffsetY
          pageRowList[pageNo].push(row)
        }
      }
    }
    return pageRowList
  }

  private _insertTableTdByColIndex(
    tdList: ITd[],
    td: ITd,
    targetColIndex: number
  ) {
    let insertIndex = tdList.length
    for (let i = 0; i < tdList.length; i++) {
      const curColIndex = tdList[i].colIndex ?? Number.MAX_SAFE_INTEGER
      if (curColIndex > targetColIndex) {
        insertIndex = i
        break
      }
    }
    tdList.splice(insertIndex, 0, td)
  }

  private _resetTableTdLayoutState(td: ITd) {
    delete td.x
    delete td.y
    delete td.width
    delete td.height
    delete td.trIndex
    delete td.tdIndex
    delete td.rowIndex
    delete td.colIndex
    delete td.isLastRowTd
    delete td.isLastColTd
    delete td.isLastTd
    delete td.mainHeight
    delete td.realHeight
    delete td.realMinHeight
  }

  private _refreshTableLayoutMetrics(element: IElement, metrics?: IElementMetrics) {
    this.tableParticle.computeRowColInfo(element)
    const tableHeight = this.tableParticle.getTableHeight(element)
    const tableWidth = this.tableParticle.getTableWidth(element)
    element.width = tableWidth
    element.height = tableHeight
    if (!metrics) return
    const elementWidth = tableWidth * this.options.scale
    const elementHeight = tableHeight * this.options.scale
    metrics.width = elementWidth
    metrics.height = elementHeight
    metrics.boundingBoxDescent = elementHeight
  }

  private _createTablePagingContinuationTd(
    sourceTd: ITd,
    targetColIndex: number,
    targetTrId: string | undefined,
    targetTableId: string | undefined,
    rowspan: number
  ): ITd {
    const continuationTd = deepClone(sourceTd)
    const tdId = getUUID()
    continuationTd.id = tdId
    continuationTd.rowspan = Math.max(1, rowspan)
    continuationTd.value = [
      {
        value: ZERO,
        size: this.options.defaultSize,
        tableId: targetTableId,
        trId: targetTrId,
        tdId
      }
    ]
    continuationTd.colIndex = targetColIndex
    this._resetTableTdLayoutState(continuationTd)
    return continuationTd
  }

  private _splitTableForPaging(element: IElement, deleteStart: number): IElement | null {
    const trList = element.trList
    if (!trList?.length || deleteStart <= 0 || deleteStart >= trList.length) {
      return null
    }

    const splitRowIndex = deleteStart
    const sourceTableId = element.id
    const carryMergeList: Array<{
      colIndex: number
      td: ITd
      remainingRowspan: number
    }> = []

    for (let r = 0; r < splitRowIndex; r++) {
      const tr = trList[r]
      for (let d = 0; d < tr.tdList.length; d++) {
        const td = tr.tdList[d]
        const tdStart = td.rowIndex ?? r
        const tdRowspan = Math.max(1, td.rowspan || 1)
        const tdEnd = tdStart + tdRowspan
        if (tdStart < splitRowIndex && tdEnd > splitRowIndex) {
          const colIndex = td.colIndex ?? 0
          const visibleRowspan = splitRowIndex - tdStart
          const remainingRowspan = tdEnd - splitRowIndex
          if (visibleRowspan > 0 && remainingRowspan > 0) {
            td.rowspan = visibleRowspan
            this._resetTableTdLayoutState(td)
            carryMergeList.push({
              colIndex,
              td,
              remainingRowspan
            })
          }
        }
      }
    }

    const splitTrList = trList.splice(deleteStart, trList.length - deleteStart)
    if (!splitTrList.length) return null

    const cloneElement = deepClone(element)
    const repeatTrList = trList.filter(tr => tr.pagingRepeat)
    let cloneTrList: ITr[] = splitTrList
    let carryTargetIndex = 0
    if (repeatTrList.length) {
      const cloneRepeatTrList = deepClone(repeatTrList)
      cloneRepeatTrList.forEach(tr => (tr.id = getUUID()))
      cloneTrList = [...cloneRepeatTrList, ...cloneTrList]
      carryTargetIndex = cloneRepeatTrList.length
    }

    const carryTargetTr = cloneTrList[carryTargetIndex]
    if (carryTargetTr && carryMergeList.length) {
      carryMergeList
        .sort((a, b) => a.colIndex - b.colIndex)
        .forEach(({ td, colIndex, remainingRowspan }) => {
          const continuationTd = this._createTablePagingContinuationTd(
            td,
            colIndex,
            carryTargetTr.id,
            sourceTableId,
            remainingRowspan
          )
          this._insertTableTdByColIndex(
            carryTargetTr.tdList,
            continuationTd,
            colIndex
          )
        })
    }

    cloneElement.trList = cloneTrList
    return cloneElement
  }

  private _getRowSpacing(row: IRow): { before: number; after: number } {
    let before = 0
    let after = 0
    for (const el of row.elementList) {
      if (el.value === ZERO) continue
      before = Math.max(before, el.paragraphSpacingBefore ?? 0)
      after = Math.max(after, el.paragraphSpacingAfter ?? 0)
    }
    return { before, after }
  }

  private _drawParagraphColor(
    ctx: CanvasRenderingContext2D,
    payload: IDrawRowPayload
  ) {
    const { rowList, positionList, innerWidth } = payload
    const margins = this.getMargins()
    for (let i = 0; i < rowList.length; i++) {
      const curRow = rowList[i]
      const firstElement = curRow.elementList[0]
      const paragraphColor = firstElement?.paragraphColor
      if (!paragraphColor) continue
      const {
        coordinate: {
          leftTop: [, y]
        }
      } = positionList[curRow.startIndex]
      const x = margins[3]
      this.paragraphColor.recordFillInfo(
        ctx,
        x,
        y,
        innerWidth,
        curRow.height,
        paragraphColor
      )
      this.paragraphColor.render(ctx)
    }
  }


  private _drawHighlight(ctx: CanvasRenderingContext2D, payload: IDrawRowPayload) {
    const { rowList, positionList } = payload
    const {
      scale,
      group: { disabled: groupDisabled },
      showCommentBalloons
    } = this.options
    for (let i = 0; i < rowList.length; i++) {
      const curRow = rowList[i]
      const { before: spacingBefore, after: spacingAfter } = this._getRowSpacing(curRow)
      const spacingBeforeScaled = spacingBefore * scale
      const spacingAfterScaled = spacingAfter * scale
      const highlightHeight = curRow.height - spacingBeforeScaled - spacingAfterScaled
      for (let j = 0; j < curRow.elementList.length; j++) {
        const element = curRow.elementList[j]
        if (!element.highlight) continue
        // 批注背景色优先：有批注时跳过高亮，避免颜色叠加
        if (
          !groupDisabled &&
          element.groupIds?.length &&
          showCommentBalloons !== false
        )
          continue
        const {
          coordinate: { leftTop: [x, y] }
        } = positionList[curRow.startIndex + j]
        this.highlight.recordFillInfo(
          x,
          y + spacingBeforeScaled,
          element.metrics.width,
          highlightHeight,
          element.highlight
        )
      }
    }
    this.highlight.render(ctx)
  }

  public drawRow(ctx: CanvasRenderingContext2D, payload: IDrawRowPayload) {
    // 优先绘制段落背景色（最底层）
    this._drawParagraphColor(ctx, payload)
    // 绘制高亮（文本之下）
    this._drawHighlight(ctx, payload)

    // 绘制元素、下划线、删除线、选区
    const {
      scale,
      table: { tdPadding },
      group,
      lineBreak
    } = this.options
    const {
      rowList,
      pageNo,
      elementList,
      positionList,
      startIndex,
      zone,
      isDrawLineBreak = !lineBreak.disabled
    } = payload
    const isPrintMode = this.mode === EditorMode.PRINT
    const { isCrossRowCol, tableId } = this.range.getRange()
    let index = startIndex
    for (let i = 0; i < rowList.length; i++) {
      const curRow = rowList[i]
      // 分栏容器行：绘制各列内容及可选分隔线
      if (curRow.isColumnContainer && curRow.columnRowLists) {
        const { scale } = this.options
        const colWidths = curRow.columnWidths || []
        const colGap = curRow.columnGap || 0
        const colSeparator = curRow.columnSeparator || false
        // 获取分栏容器行的 Y 坐标
        const containerPos = positionList[curRow.startIndex]
        const containerY = containerPos
          ? containerPos.coordinate.leftTop[1]
          : 0
        let colX = containerPos
          ? containerPos.coordinate.leftTop[0]
          : 0
        for (let c = 0; c < curRow.columnRowLists.length; c++) {
          const colRowList = curRow.columnRowLists[c]
          if (colRowList.length > 0) {
            // 计算列内元素的位置列表
            const colPositionList: IElementPosition[] = []
            this.position.computePageRowPosition({
              positionList: colPositionList,
              rowList: colRowList,
              pageNo,
              startX: colX,
              startY: containerY,
              startRowIndex: 0,
              startIndex: 0,
              innerWidth: colWidths[c] || 0
            })
            // 构建列内元素列表
            const colElementList: IElement[] = []
            for (const colRow of colRowList) {
              for (const el of colRow.elementList) {
                colElementList.push(el)
              }
            }
            // 绘制列内容
            this.drawRow(ctx, {
              elementList: colElementList,
              positionList: colPositionList,
              rowList: colRowList,
              pageNo,
              startIndex: 0,
              innerWidth: colWidths[c] || 0,
              zone
            })
          }
          // 绘制列间分隔线
          if (colSeparator && c < curRow.columnRowLists.length - 1) {
            const separatorX = colX + (colWidths[c] || 0) + colGap / 2
            ctx.save()
            ctx.beginPath()
            ctx.moveTo(separatorX, containerY)
            ctx.lineTo(separatorX, containerY + curRow.height)
            ctx.strokeStyle = '#DCDFE6'
            ctx.lineWidth = 0.5 * scale
            ctx.stroke()
            ctx.restore()
          }
          colX += (colWidths[c] || 0) + colGap
        }
        continue
      }
      // 选区绘制记录
      const rangeRecord: IElementFillRect = {
        x: 0,
        y: 0,
        width: 0,
        height: 0
      }
      let tableRangeElement: IElement | null = null
      for (let j = 0; j < curRow.elementList.length; j++) {
        const element = curRow.elementList[j]
        const metrics = element.metrics
        // 当前元素位置信息
        const {
          ascent: offsetY,
          coordinate: {
            leftTop: [x, y]
          }
        } = positionList[curRow.startIndex + j]
        const preElement = curRow.elementList[j - 1]
        // 元素绘制
        if (
          element.revisionType === 'delete'
        ) {
          // 删除修订内容不在正文渲染，由右侧气泡显示
          this.textParticle.complete()
        } else if (
          (element.control?.hide || element.area?.hide) &&
          !this.isDesignMode()
        ) {
          // 控件隐藏时不绘制
          this.textParticle.complete()
        } else if (element.type === ElementType.IMAGE) {
          this.textParticle.complete()
          // 浮动图片单独绘制
          if (
            element.imgDisplay !== ImageDisplay.SURROUND &&
            element.imgDisplay !== ImageDisplay.FLOAT_TOP &&
            element.imgDisplay !== ImageDisplay.FLOAT_BOTTOM
          ) {
            this.imageParticle.render(ctx, element, x, y + offsetY)
          }
        } else if (element.type === ElementType.LATEX) {
          this.textParticle.complete()
          this.laTexParticle.render(ctx, element, x, y + offsetY)
        } else if (element.type === ElementType.TABLE) {
          if (isCrossRowCol) {
            rangeRecord.x = x
            rangeRecord.y = y
            tableRangeElement = element
          }
          this.tableParticle.render(ctx, element, x, y)
        } else if (element.type === ElementType.HYPERLINK) {
          this.textParticle.complete()
          this.hyperlinkParticle.render(ctx, element, x, y + offsetY)
        } else if (element.type === ElementType.DATE) {
          const nextElement = curRow.elementList[j + 1]
          // 释放之前的
          if (!preElement || preElement.dateId !== element.dateId) {
            this.textParticle.complete()
          }
          this.textParticle.record(ctx, element, x, y + offsetY)
          if (!nextElement || nextElement.dateId !== element.dateId) {
            // 手动触发渲染
            this.textParticle.complete()
          }
        } else if (element.type === ElementType.SUPERSCRIPT) {
          this.textParticle.complete()
          this.superscriptParticle.render(ctx, element, x, y + offsetY)
        } else if (element.type === ElementType.SUBSCRIPT) {
          this.underline.render(ctx)
          this.textParticle.complete()
          this.subscriptParticle.render(ctx, element, x, y + offsetY)
        } else if (element.type === ElementType.SEPARATOR) {
          this.separatorParticle.render(ctx, element, x, y)
        } else if (this.isPageBreakElement(element)) {
          if (
            this.mode !== EditorMode.CLEAN &&
            !isPrintMode &&
            this.options.pageBreak.disabled === false
          ) {
            this.pageBreakParticle.render(ctx, element, x, y)
          }
        } else if (
          element.type === ElementType.CHECKBOX ||
          element.controlComponent === ControlComponent.CHECKBOX
        ) {
          this.textParticle.complete()
          this.checkboxParticle.render({
            ctx,
            x,
            y: y + offsetY,
            index: j,
            row: curRow
          })
        } else if (
          element.type === ElementType.RADIO ||
          element.controlComponent === ControlComponent.RADIO
        ) {
          this.textParticle.complete()
          this.radioParticle.render({
            ctx,
            x,
            y: y + offsetY,
            index: j,
            row: curRow
          })
        } else if (element.type === ElementType.TAB) {
          this.textParticle.complete()
        } else if (
          element.rowFlex === RowFlex.ALIGNMENT ||
          element.rowFlex === RowFlex.JUSTIFY
        ) {
          // 如果是两端对齐，因canvas目前不支持letterSpacing需单独绘制文本
          this.textParticle.record(ctx, element, x, y + offsetY)
          this.textParticle.complete()
        } else if (element.type === ElementType.BLOCK) {
          this.textParticle.complete()
          this.blockParticle.render(pageNo, element, x, y + offsetY)
        } else if (element.type === ElementType.PLACEHOLDER) {
          // 占位符元素按普通文本绘制
          this.textParticle.record(ctx, element, x, y + offsetY)
          this.textParticle.complete()
        } else {
          // 如果当前元素设置左偏移，则上一元素立即绘制
          const hasCustomCharacterScale =
            (element.characterScale ?? 100) !== 100
          if (element.left || hasCustomCharacterScale) {
            this.textParticle.complete()
          }
          this.textParticle.record(ctx, element, x, y + offsetY)
          // 如果设置字宽、字间距、标点符号（避免浏览器排版缩小间距）需单独绘制
          if (
            element.width ||
            element.letterSpacing ||
            hasCustomCharacterScale ||
            PUNCTUATION_REG.test(element.value)
          ) {
            this.textParticle.complete()
          }
        }
        // 换行符绘制
        if (
          this.shouldDrawLineBreakForRow(
            curRow,
            j,
            isDrawLineBreak,
            isPrintMode
          )
        ) {
          this.lineBreakParticle.render(ctx, element, x, y + curRow.height / 2)
        }
        // 边框绘制（目前仅支持控件）
        if (element.control?.border) {
          // 不同控件边框立刻绘制
          if (
            preElement?.control?.border &&
            preElement.controlId !== element.controlId
          ) {
            this.control.drawBorder(ctx)
          }
          // 当前元素位置信息记录
          const rowMargin = this.getElementRowMargin(element)
          this.control.recordBorderInfo(
            x,
            y + rowMargin,
            element.metrics.width,
            curRow.height - 2 * rowMargin
          )
        } else if (preElement?.control?.border) {
          this.control.drawBorder(ctx)
        }
        // 下划线记录
        if (element.underline || element.control?.underline) {
          // 下标元素下划线单独绘制
          if (
            preElement?.type === ElementType.SUBSCRIPT &&
            element.type !== ElementType.SUBSCRIPT
          ) {
            this.underline.render(ctx)
          }
          // 行间距
          const rowMargin = this.getElementRowMargin(element)
          // 元素向左偏移量
          const offsetX = element.left || 0
          // 下标元素y轴偏移值
          let offsetY = 0
          if (element.type === ElementType.SUBSCRIPT) {
            offsetY = this.subscriptParticle.getOffsetY(element)
          }
          // 占位符不参与颜色计算
          const color = element.control?.underline
            ? this.options.underlineColor
            : element.color
          this.underline.recordFillInfo(
            ctx,
            x - offsetX,
            y + curRow.height - rowMargin + offsetY,
            metrics.width + offsetX,
            0,
            color,
            element.textDecoration?.style
          )
        } else if (preElement?.underline || preElement?.control?.underline) {
          this.underline.render(ctx)
        }
        // 删除线记录
        if (element.strikeout) {
          // 仅文本类元素支持删除线
          if (!element.type || TEXTLIKE_ELEMENT_TYPE.includes(element.type)) {
            // 字体大小不同时需立即绘制
            if (
              preElement &&
              ((preElement.type === ElementType.SUBSCRIPT &&
                element.type !== ElementType.SUBSCRIPT) ||
                (preElement.type === ElementType.SUPERSCRIPT &&
                  element.type !== ElementType.SUPERSCRIPT) ||
                this.getElementSize(preElement) !==
                  this.getElementSize(element))
            ) {
              this.strikeout.render(ctx)
            }
            // 基线文字测量信息
            const standardMetrics = this.textParticle.measureBasisWord(
              ctx,
              this.getElementFont(element)
            )
            // 文字渲染位置 + 基线文字下偏移量 - 一半文字高度
            let adjustY =
              y +
              offsetY +
              standardMetrics.actualBoundingBoxDescent * scale -
              metrics.height / 2
            // 上下标位置调整
            if (element.type === ElementType.SUBSCRIPT) {
              adjustY += this.subscriptParticle.getOffsetY(element)
            } else if (element.type === ElementType.SUPERSCRIPT) {
              adjustY += this.superscriptParticle.getOffsetY(element)
            }
            this.strikeout.recordFillInfo(ctx, x, adjustY, metrics.width)
          }
        } else if (preElement?.strikeout) {
          this.strikeout.render(ctx)
        }
        // 插入修订：蓝色下划线
        if (element.revisionType === 'insert') {
          const revColor = this.options.revisionInsertColor || '#1a73e8'
          const rowMargin = this.getElementRowMargin(element)
          const offsetX = element.left || 0
          const lineY = y + curRow.height - rowMargin
          ctx.save()
          ctx.strokeStyle = revColor
          ctx.lineWidth = this.options.scale
          const adjustY = Math.floor(lineY + 2 * ctx.lineWidth) + 0.5
          ctx.beginPath()
          ctx.moveTo(x - offsetX, adjustY)
          ctx.lineTo(x - offsetX + metrics.width + offsetX, adjustY)
          ctx.stroke()
          ctx.restore()
        }
        // 选区记录
        const {
          zone: currentZone,
          startIndex,
          endIndex
        } = this.range.getRange()
        if (
          currentZone === zone &&
          startIndex !== endIndex &&
          startIndex <= index &&
          index <= endIndex
        ) {
          const positionContext = this.position.getPositionContext()
          // 表格需限定上下文
          if (
            (!positionContext.isTable && !element.tdId) ||
            positionContext.tdId === element.tdId
          ) {
            // 从行尾开始-绘制最小宽度
            if (startIndex === index) {
              const nextElement = elementList[startIndex + 1]
              if (nextElement && nextElement.value === ZERO) {
                rangeRecord.x = x + metrics.width
                rangeRecord.y = y
                rangeRecord.height = curRow.height
                rangeRecord.width += this.options.rangeMinWidth
              }
            } else {
              let rangeWidth = metrics.width
              // 最小选区宽度
              if (rangeWidth === 0 && curRow.elementList.length === 1) {
                rangeWidth = this.options.rangeMinWidth
              }
              // 记录第一次位置、行高
              if (!rangeRecord.width) {
                rangeRecord.x = x
                rangeRecord.y = y
                rangeRecord.height = curRow.height
              }
              rangeRecord.width += rangeWidth
            }
          }
        }
        // 组信息记录
        if (!group.disabled && element.groupIds && this.options.showCommentBalloons !== false) {
          const { before: gSpacingBefore, after: gSpacingAfter } = this._getRowSpacing(curRow)
          this.group.recordFillInfo(
            element,
            x,
            y + gSpacingBefore * scale,
            metrics.width,
            curRow.height - (gSpacingBefore + gSpacingAfter) * scale
          )
        }

        index++
        // 绘制表格内元素
        if (element.type === ElementType.TABLE) {
          const tdPaddingWidth = tdPadding[1] + tdPadding[3]
          for (let t = 0; t < element.trList!.length; t++) {
            const tr = element.trList![t]
            for (let d = 0; d < tr.tdList!.length; d++) {
              const td = tr.tdList[d]
              this.drawRow(ctx, {
                elementList: td.value,
                positionList: td.positionList!,
                rowList: td.rowList!,
                pageNo,
                startIndex: 0,
                innerWidth: (td.width! - tdPaddingWidth) * scale,
                zone,
                isDrawLineBreak: false
              })
            }
          }
        }
      }
      // 绘制列表样式
      if (curRow.isList) {
        this.listParticle.drawListStyle(
          ctx,
          curRow,
          positionList[curRow.startIndex]
        )
      }

      // 绘制文字、边框、下划线、删除线
      this.textParticle.complete()
      this.control.drawBorder(ctx)
      this.underline.render(ctx)
      this.strikeout.render(ctx)
      // 绘制批注样式
      this.group.render(ctx)

      // 绘制选区
      if (!isPrintMode) {
        if (rangeRecord.width && rangeRecord.height) {
          const { x, y, width, height } = rangeRecord
          this.range.render(ctx, x, y, width, height)
        }
        if (
          isCrossRowCol &&
          tableRangeElement &&
          tableRangeElement.id === tableId
        ) {
          const {
            coordinate: {
              leftTop: [x, y]
            }
          } = positionList[curRow.startIndex]
          this.tableParticle.drawRange(ctx, tableRangeElement, x, y)
        }
      }
    }
  }

  private _drawFloat(
    ctx: CanvasRenderingContext2D,
    payload: IDrawFloatPayload
  ) {
    const { scale } = this.options
    const floatPositionList = this.position.getFloatPositionList()
    const { imgDisplays, pageNo } = payload
    for (let e = 0; e < floatPositionList.length; e++) {
      const floatPosition = floatPositionList[e]
      const element = floatPosition.element
      if (
        (pageNo === floatPosition.pageNo ||
          floatPosition.zone === EditorZone.HEADER ||
          floatPosition.zone == EditorZone.FOOTER) &&
        element.imgDisplay &&
        imgDisplays.includes(element.imgDisplay) &&
        element.type === ElementType.IMAGE
      ) {
        const imgFloatPosition = element.imgFloatPosition!
        this.imageParticle.render(
          ctx,
          element,
          imgFloatPosition.x * scale,
          imgFloatPosition.y * scale
        )
      }
    }
  }

  private _clearPage(pageNo: number) {
    const ctx = this.ctxList[pageNo]
    const pageDom = this.pageList[pageNo]
    ctx.clearRect(
      0,
      0,
      Math.max(pageDom.width, this.getWidth()),
      Math.max(pageDom.height, this.getHeight())
    )
    this.blockParticle.clear()
  }

  private _drawPage(payload: IDrawPagePayload) {
    const { elementList, positionList, rowList, pageNo } = payload

    const {
      inactiveAlpha,
      pageMode,
      header,
      footer,
      pageNumber,
      lineNumber,
      pageBorder
    } = this.options
    const isPrintMode = this.mode === EditorMode.PRINT
    const innerWidth = this.getInnerWidth()
    const ctx = this.ctxList[pageNo]
    // 判断当前激活区域-非正文区域时元素透明度降低
    ctx.globalAlpha = !this.zone.isMainActive() ? inactiveAlpha : 1
    this._clearPage(pageNo)
    // 绘制背景
    this.background.render(ctx, pageNo)
    // 绘制区域
    if (!isPrintMode) {
      this.area.render(ctx, pageNo)
    }
    // 绘制水印
    if (pageMode !== PageMode.CONTINUITY && this.options.watermark.data) {
      this.waterMark.render(ctx, pageNo)
    }
    // 绘制页边距
    if (!isPrintMode) {
      this.margin.render(ctx, pageNo)
    }
    // 渲染衬于文字下方元素
    this._drawFloat(ctx, {
      pageNo,
      imgDisplays: [ImageDisplay.FLOAT_BOTTOM]
    })

    // 渲染元素
    const index = rowList[0]?.startIndex
    this.drawRow(ctx, {
      elementList,
      positionList,
      rowList,
      pageNo,
      startIndex: index,
      innerWidth,
      zone: EditorZone.MAIN
    })
    if (this.getIsPagingMode()) {
      // 绘制页眉
      if (!header.disabled) {
        this.header.render(ctx, pageNo)
      }
      // 绘制页码
      if (!pageNumber.disabled) {
        this.pageNumber.render(ctx, pageNo)
      }
      // 绘制页脚
      if (!footer.disabled) {
        this.footer.render(ctx, pageNo)
      }
    }
    // 渲染浮于文字上方元素
    this._drawFloat(ctx, {
      pageNo,
      imgDisplays: [ImageDisplay.FLOAT_TOP, ImageDisplay.SURROUND]
    })
    // 搜索匹配绘制
    if (!isPrintMode && this.search.getSearchKeyword()) {
      this.search.render(ctx, pageNo)
    }
    // 绘制空白占位符
    if (this.elementList.length <= 1 && !this.elementList[0]?.listId) {
      this.placeholder.render(ctx)
    }
    // 渲染行数
    if (!lineNumber.disabled) {
      this.lineNumber.render(ctx, pageNo)
    }
    // 绘制页面边框
    if (!pageBorder.disabled) {
      this.pageBorder.render(ctx)
    }
    // 绘制签章
    this.badge.render(ctx, pageNo)
  }

  private _disconnectLazyRender() {
    this.lazyRenderIntersectionObserver?.disconnect()
  }

  // 局部渲染 - 只渲染当前页面和相邻页面
  private _renderVisiblePages(currentPageNo?: number) {
    const positionList = this.position.getOriginalMainPositionList()
    const elementList = this.getOriginalMainElementList()
    const pageCount = this.pageRowList.length
    
    // 确定需要渲染的页面范围
    let pagesToRender: number[] = []
    
    if (currentPageNo !== undefined && currentPageNo >= 0) {
      // 只渲染当前页和前后各一页
      const startPage = Math.max(0, currentPageNo - 1)
      const endPage = Math.min(pageCount - 1, currentPageNo + 1)
      for (let i = startPage; i <= endPage; i++) {
        pagesToRender.push(i)
      }
    } else {
      // 渲染所有可见页面
      pagesToRender = [...this.visiblePageNoList]
      // 如果没有可见页面信息，渲染第一页
      if (pagesToRender.length === 0) {
        pagesToRender = [0]
      }
    }
    
    // 只渲染指定的页面
    for (const pageNo of pagesToRender) {
      if (pageNo < pageCount && this.pageRowList[pageNo]) {
        this._drawPage({
          elementList,
          positionList,
          rowList: this.pageRowList[pageNo],
          pageNo
        })
      }
    }
  }

  private _lazyRender() {
    const positionList = this.position.getOriginalMainPositionList()
    const elementList = this.getOriginalMainElementList()
    this._disconnectLazyRender()
    this.lazyRenderIntersectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const index = Number((<HTMLCanvasElement>entry.target).dataset.index)
          this._drawPage({
            elementList,
            positionList,
            rowList: this.pageRowList[index],
            pageNo: index
          })
        }
      })
    })
    this.pageList.forEach(el => {
      this.lazyRenderIntersectionObserver!.observe(el)
    })
  }

  private _immediateRender() {
    const positionList = this.position.getOriginalMainPositionList()
    const elementList = this.getOriginalMainElementList()
    for (let i = 0; i < this.pageRowList.length; i++) {
      this._drawPage({
        elementList,
        positionList,
        rowList: this.pageRowList[i],
        pageNo: i
      })
    }
  }

  public render(payload?: IDrawOption) {
    this.renderCount++
    const { header, footer } = this.options
    const {
      isSubmitHistory = true,
      isSetCursor = true,
      isCompute = true,
      isLazy = true,
      isInit = false,
      isSourceHistory = false,
      isFirstRender = false,
      isPartialRender = false,
      pageNo: targetPageNo
    } = payload || {}
    let { curIndex } = payload || {}
    const innerWidth = this.getInnerWidth()
    const isPagingMode = this.getIsPagingMode()
    // 缓存当前页数信息
    const oldPageSize = this.pageRowList.length
    // 计算文档信息
    if (isCompute) {
      // 清空浮动元素位置信息
      this.position.setFloatPositionList([])
      if (isPagingMode) {
        // 页眉信息
        if (!header.disabled) {
          this.header.compute()
        }
        // 页脚信息
        if (!footer.disabled) {
          this.footer.compute()
        }
      }
      // 行信息
      const margins = this.getMargins()
      const pageHeight = this.getHeight()
      const extraHeight = this.header.getExtraHeight()
      const mainOuterHeight = this.getMainOuterHeight()
      const startX = margins[3]
      const startY = margins[0] + extraHeight
      const surroundElementList = pickSurroundElementList(this.elementList)
      this.rowList = this.computeRowList({
        startX,
        startY,
        pageHeight,
        mainOuterHeight,
        isPagingMode,
        innerWidth,
        surroundElementList,
        elementList: this.elementList
      })
      // 页面信息
      this.pageRowList = this._computePageList()
      // 位置信息
      this.position.computePositionList()
      // 区域信息
      this.area.compute()
      if (this.mode !== EditorMode.PRINT) {
        // 搜索信息
        const searchKeyword = this.search.getSearchKeyword()
        if (searchKeyword) {
          this.search.compute(searchKeyword)
        }

      }
    }
    // 清除光标等副作用
    this.imageObserver.clearAll()
    this.cursor.recoveryCursor()
    // 创建纸张
    for (let i = 0; i < this.pageRowList.length; i++) {
      if (!this.pageList[i]) {
        this._createPage(i)
      }
    }
    // 移除多余页
    const curPageCount = this.pageRowList.length
    const prePageCount = this.pageList.length
    if (prePageCount > curPageCount) {
      const deleteCount = prePageCount - curPageCount
      this.ctxList.splice(curPageCount, deleteCount)
      this.pageList
        .splice(curPageCount, deleteCount)
        .forEach(page => page.remove())
    }
    // 绘制元素
    // 连续页因为有高度的变化会导致canvas渲染空白，需立即渲染，否则会出现闪动
    // 当页面数量变化时，需要完整渲染
    const pageCountChanged = oldPageSize !== this.pageRowList.length
    if (isPartialRender && isPagingMode && !pageCountChanged) {
      // 局部渲染 - 只渲染当前页面和相邻页面
      this._renderVisiblePages(targetPageNo ?? this.intersectionPageNo)
    } else if (isLazy && isPagingMode) {
      this._lazyRender()
    } else {
      this._immediateRender()
    }
    // 光标重绘
    if (isSetCursor) {
      curIndex = this.setCursor(curIndex)
    } else if (this.range.getIsSelection()) {
      // 存在选区时仅定位避免事件无法捕获
      this.cursor.focus()
    }
    // 历史记录用于undo、redo（非首次渲染内容变更 || 第一次存在光标时）
    if (
      (isSubmitHistory && !isFirstRender) ||
      (curIndex !== undefined && this.historyManager.isStackEmpty())
    ) {
      this.submitHistory(curIndex)
    }
    // 信息变动回调
    nextTick(() => {
      // 选区样式
      this.range.setRangeStyle()
      // 重新唤起弹窗类控件
      if (isCompute && this.control.getActiveControl()) {
        this.control.reAwakeControl()
      }
      // 表格工具重新渲染
      if (
        isCompute &&
        !this.isReadonly() &&
        this.position.getPositionContext().isTable
      ) {
        this.tableTool.render()
      }
      // 页眉指示器重新渲染
      if (isCompute && !this.zone.isMainActive()) {
        this.zone.drawZoneIndicator()
      }
      // 页数改变
      if (oldPageSize !== this.pageRowList.length) {
        if (this.listener.pageSizeChange) {
          this.listener.pageSizeChange(this.pageRowList.length)
        }
        if (this.eventBus.hasSubscribers('pageSizeChange')) {
          this.eventBus.emit('pageSizeChange', this.pageRowList.length)
        }
      }
      // 文档内容改变
      if ((isSubmitHistory || isSourceHistory) && !isInit) {
        if (this.listener.contentChange) {
          this.listener.contentChange()
        }
        if (this.eventBus.hasSubscribers('contentChange')) {
          this.eventBus.emit('contentChange')
        }
      }
      // 修订气泡更新
      if (isCompute && this.revisionOverlay) {
        this.revisionOverlay.update()
      }
      // 批注卡片位置更新（纸张大小/缩放变更等非编辑场景）
      if (isCompute && !isSubmitHistory && !isSourceHistory && this.commentOverlay) {
        this.commentOverlay.render()
      }
    })
  }

  public setCursor(curIndex: number | undefined) {
    const positionContext = this.position.getPositionContext()
    const positionList = this.position.getPositionList()
    if (positionContext.isTable) {
      const { index, trIndex, tdIndex } = positionContext
      const elementList = this.getOriginalElementList()
      const tablePositionList =
        elementList[index!].trList?.[trIndex!].tdList[tdIndex!].positionList
      if (curIndex === undefined && tablePositionList) {
        curIndex = tablePositionList.length - 1
      }
      const tablePosition = tablePositionList?.[curIndex!]
      this.position.setCursorPosition(tablePosition || null)
    } else {
      this.position.setCursorPosition(
        curIndex !== undefined ? positionList[curIndex] : null
      )
    }
    // 定位到图片元素并且位置发生变化
    let isShowCursor = true
    if (
      curIndex !== undefined &&
      positionContext.isImage &&
      positionContext.isDirectHit
    ) {
      const elementList = this.getElementList()
      const element = elementList[curIndex]
      if (IMAGE_ELEMENT_TYPE.includes(element.type!)) {
        isShowCursor = false
        const position = this.position.getCursorPosition()
        this.previewer.updateResizer(element, position)
      }
    }
    this.cursor.drawCursor({
      isShow: isShowCursor
    })
    return curIndex
  }

  public submitHistory(curIndex: number | undefined) {
    const positionContext = this.position.getPositionContext()
    const oldElementList = getSlimCloneElementList(this.elementList)
    const oldHeaderElementList = getSlimCloneElementList(
      this.header.getElementList()
    )
    const oldFooterElementList = getSlimCloneElementList(
      this.footer.getElementList()
    )
    const oldRange = deepClone(this.range.getRange())
    const pageNo = this.pageNo
    const oldPositionContext = deepClone(positionContext)
    const zone = this.zone.getZone()
    this.historyManager.execute(() => {
      this.zone.setZone(zone)
      this.setPageNo(pageNo)
      this.position.setPositionContext(deepClone(oldPositionContext))
      this.header.setElementList(deepClone(oldHeaderElementList))
      this.footer.setElementList(deepClone(oldFooterElementList))
      this.elementList = deepClone(oldElementList)
      this.range.replaceRange(deepClone(oldRange))
      this.render({
        curIndex,
        isSubmitHistory: false,
        isSourceHistory: true
      })
    })
  }

  public destroy() {
    this.setLoading(false)
    this.container.remove()
    this.canvasEvent.removeEvent()
    this.globalEvent.removeEvent()
    this.mouseObserver.removeEvent()
    this.scrollObserver.removeEvent()
    this.selectionObserver.removeEvent()
  }

  public clearSideEffect() {
    // 预览工具组件
    this.getPreviewer().clearResizer()
    // 表格工具组件
    this.getTableTool().dispose()
    // 超链接弹窗
    this.getHyperlinkParticle().clearHyperlinkPopup()
    // 日期控件
    this.getDateParticle().clearDatePicker()
  }
}
