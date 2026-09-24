/**
 * VerveDocs View —— Draw
 *
 * 编辑器视图门面。
 *
 * 增量策略：
 *  - Reuse unchanged paragraph layout and block bitmaps.
 *  - Diff paint snapshots against the last rendered frame.
 *  - Regenerate thumbnails only for changed pages.
 */

import { createEditorI18n, type EditorI18n, type Translate } from '@vervedoc/i18n'
import type { IDocxDocumentMeta, IEditorOption, IPosition, Path } from '@vervedoc/docx-editor-schema'
import { formatElementTree, pairBookmarkMarkers, getByPath } from '@vervedoc/docx-editor-schema'

import type { Listener, RangeManager, EventBus } from '@vervedoc/docx-editor-state'
import { LayoutEngine, type LayoutOptions } from './layout-engine'
import type { DocumentLayout, ParagraphBlock, InlineBox, LineBox } from './layout-types'
import { CanvasRenderer } from './canvas-renderer'
import { hitTest } from './hit-test'
import { locateCaret, computeSelectionRects } from './caret-rect'
import { TableWidget } from './widgets/table-widget'
import { ImageWidget } from './widgets/image-widget'
import { ChartWidget } from './widgets/chart-widget'
import { ParagraphWidget } from './widgets/paragraph-widget'
import { HeaderFooterWidget, type Zone } from './widgets/header-footer-widget'
import { RulerWidget } from './widgets/ruler-widget'
import { WatermarkWidget, type WatermarkConfig } from './widgets/watermark-widget'
import { SystemWatermarkWidget, type SystemWatermarkConfig } from './widgets/watermark-system-widget'
import { SelectionToolbarWidget } from './widgets/selection-toolbar-widget'
import { CaretWidget } from './widgets/caret-widget'
import { computeDirtyRect, prepareRenderState, type RenderState } from './render-state'
import {
  findInlineByPos,
  findParagraphByPos,
  findLineByPos,
  findFirstInline,
  findLastInline,
  findHyperlinkByPos
} from './layout-query'
import { collectGroupAnchors, collectRevisionAnchors, type AnchorInfo } from './anchor-collector'
import { CaretNavigation } from './caret-navigation'
import { ZoneManager } from './zone-manager'

// 固定黑色 I-beam，避免系统文本指针在白色页面上不可见。
const TEXT_CURSOR = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path d="M8 3h8M12 3v18M8 21h8" fill="none" stroke="black" stroke-width="2"/></svg>')}") 9 9, text`

/** Draw 门面依赖：装配文档、状态管理器与各类回调 */
export interface DrawDeps {
  /** 文档元数据 */
  document: IDocxDocumentMeta
  /** 事件监听器（用于发射 page-count-change 等事件） */
  listener?: Listener
  /** 事件总线（用于发射用户交互事件，如 editor-mousedown/chart-click 等） */
  eventBus?: EventBus

  /** 选区管理器 */
  rangeManager?: RangeManager
  /** 键盘/输入时触发的回调（由 core 装配） */
  onInput?: (text: string) => void
  /** 键盘事件回调（由 core 装配） */
  onKeyDown?: (e: KeyboardEvent) => void
  /** 每次 RAF 渲染完成后调用（用于驱动批注/修订 overlay 更新） */
  afterRender?: () => void
  /** 悬浮工具栏命令回调（由 core 装配，转发到 Command） */
  onCommand?: (command: string, ...args: any[]) => any
  /** zone 变化回调（由 core 装配，用于驱动 UI 标签显示） */
  onZoneChange?: (zone: Zone) => void
  i18n?: EditorI18n
}

/**
 * 编辑器视图门面类：装配 LayoutEngine + CanvasRenderer + 各交互 widget，
 * 对外提供文档/光标/选区/工具栏 API，对内调度排版、渲染、事件绑定。
 */
export class Draw {
  /** 外层容器 DOM */
  private container: HTMLDivElement
  /** 滚动包装层（绝对定位、自身溢出滚动） */
  private wrapper: HTMLDivElement
  /** 撑起文档总高度的占位元素（驱动 wrapper 滚动） */
  private scroller: HTMLDivElement
  /** canvas 三层宿主（pointer-events:none，覆盖 container 视口） */
  private canvasHost: HTMLDivElement
  /** canvas 渲染器 */
  private renderer: CanvasRenderer

  setChartRenderer(renderer: import('@vervedoc/docx-editor-schema').IChartRenderer | null): void {
    this.renderer.setChartRenderer(renderer)
    this.thumbnailCache.clear()
    this.forceFullRender = true
    this.scheduleRender()
  }
  /** 排版引擎 */
  private engine: LayoutEngine
  /** 最近一次排版结果 */
  private layout: DocumentLayout | null = null
  private diagnosticNotice?: HTMLDivElement
  private diagnosticSignature = ''

  /** 文档元数据 */
  private document: IDocxDocumentMeta
  /** 编辑器选项 */
  private options: IEditorOption
  /** 选区管理器 */
  private range?: RangeManager
  /** 事件监听器 */
  private listener?: Listener
  /** 事件总线（用户交互事件） */
  private eventBus?: EventBus
  private translate: Translate
  private unsubscribeI18n: () => void

  /** 当前滚动 y（wrapper.scrollTop） */
  private scrollY = 0
  /** 视口高度 */
  private viewportHeight = 0
  /** 视口宽度 */
  private viewportWidth = 0
  /** RAF 帧句柄 */
  private rafId: number | null = null
  /** 当前 RAF 是否跳过 afterRender（滚动渲染时为 true，避免每帧生成缩略图） */
  private _pendingSkipAfterRender = false

  /** 容器尺寸观察器 */
  private ro?: ResizeObserver

  private renderState?: RenderState
  private paintedState?: RenderState
  private forceFullRender = true
  private thumbnailCache = new Map<number, { signature: string; image: string; foreground?: string }>()

  /** 隐藏 textarea：作为输入焦点与 IME 组合的宿主 */
  private inputEl!: HTMLTextAreaElement
  /** IME 组合输入中标志 */
  private isComposing = false

  /** 光标闪烁可见性 */
  private caretVisible = true
  /** 光标闪烁定时器句柄 */
  private caretTimer: number | null = null

  /** 鼠标拖拽选区状态 */
  private isDragging = false
  /** 拖拽锚点（按下位置） */
  private dragAnchor: IPosition | null = null
  /** 拖拽过程中最近一次命中位置（RAF 节流） */
  private dragPendingPos: IPosition | null = null
  /** 拖拽 RAF 句柄 */
  private dragRafId: number | null = null

  /** 文本输入回调 */
  private onInput?: (text: string) => void
  /** 键盘事件回调 */
  private onKeyDown?: (e: KeyboardEvent) => void
  /** 渲染完成后回调 */
  private afterRender?: () => void
  /** 命令回调（转发到 Command） */
  private onCommand?: (command: string, ...args: any[]) => any

  /** 悬浮选区工具栏 widget */
  private selectionToolbarWidget: SelectionToolbarWidget | null = null
  /** 抑制下一次悬浮工具栏显示（段落手柄选中时用） */
  private _suppressToolbar = false


  /** 当前编辑区域：正文 / 页眉 / 页脚 */
  private zone: Zone = 'main'
  /** zone 变化回调（由 core 装配，用于驱动 UI 标签显示） */
  private onZoneChange?: (zone: Zone) => void

  /** 表格交互 widget（手柄 + 右键菜单） */
  private tableWidget: TableWidget | null = null
  /** 图片交互 widget（选中 + 缩放手柄 + 右键菜单） */
  private imageWidget: ImageWidget | null = null
  /** 图表交互 widget（选中 + 缩放手柄 + 编辑/删除工具栏） */
  private chartWidget: ChartWidget | null = null
  /** 段落格式悬浮 widget */
  private paragraphWidget: ParagraphWidget | null = null
  /** 页眉页脚交互 widget */
  private headerFooterWidget: HeaderFooterWidget | null = null
  /** 标尺 widget */
  private rulerWidget: RulerWidget | null = null
  /** 水印渲染 widget */
  private watermarkWidget: WatermarkWidget | null = null
  /** 系统级水印 widget（DOM 覆盖层） */
  private systemWatermarkWidget: SystemWatermarkWidget | null = null
  /** DOM 光标 widget（替代 canvas overlay 绘制光标） */
  private caretWidget: CaretWidget | null = null
  /** 光标导航 Controller */
  private caretNavigation: CaretNavigation | null = null
  /** 编辑区域 Manager */
  private zoneManager: ZoneManager | null = null

  /**
   * 创建 Draw 视图门面：构建 DOM 骨架、装配渲染器/排版引擎/各 widget、绑定事件并首次渲染。
   * @param container 外层容器 DOM
   * @param options 编辑器选项
   * @param deps 依赖装配（文档、状态、回调）
   */
  constructor(container: HTMLDivElement, options: IEditorOption, deps: DrawDeps) {
    this.container = container
    this.options = options
    this.document = deps.document
    this.range = deps.rangeManager
    this.onInput = deps.onInput
    this.onKeyDown = deps.onKeyDown
    this.afterRender = deps.afterRender
    this.onCommand = deps.onCommand
    this.onZoneChange = deps.onZoneChange
    this.listener = deps.listener
    this.eventBus = deps.eventBus
    const i18n = deps.i18n ?? createEditorI18n(options.locale)
    this.translate = i18n.t
    this.unsubscribeI18n = i18n.subscribe(() => {
      this.options.locale = i18n.locale
      this.refreshTranslations()
    })

    container.classList.add('vervedocs-container')
    // container 需要作为绝对定位的参照
    if (getComputedStyle(container).position === 'static') {
      container.style.position = 'relative'
    }
    container.style.overflow = 'hidden'
    container.style.background = '#E2E2E2'

    // scroller 是可滚动容器（自身溢出出现滚动条）
    this.wrapper = document.createElement('div')
    this.wrapper.className = 'vervedocs-wrapper'
    this.wrapper.style.position = 'absolute'
    this.wrapper.style.inset = '0'
    this.wrapper.style.overflow = 'auto'
    this.wrapper.style.background = 'transparent'
    this.wrapper.style.cursor = TEXT_CURSOR
    this.wrapper.style.zIndex = '5'

    // 撑起文档总高度的占位元素
    this.scroller = document.createElement('div')
    this.scroller.className = 'vervedocs-scroller'
    this.scroller.style.position = 'relative'

    this.wrapper.appendChild(this.scroller)
    container.appendChild(this.wrapper)

    // canvas 层放在 container 内、wrapper 之上；绝对定位覆盖 container 视口，不参与滚动
    this.canvasHost = document.createElement('div')
    this.canvasHost.className = 'vervedocs-canvas-host'
    this.canvasHost.style.position = 'absolute'
    this.canvasHost.style.inset = '0'
    this.canvasHost.style.pointerEvents = 'none'
    container.appendChild(this.canvasHost)

    this.renderer = new CanvasRenderer(this.canvasHost, {
      dpr: Number(options.devicePixelRatio ?? window.devicePixelRatio ?? 1),
      scale: Number(options.scale ?? 1),
      pageMargins: (options.pageMargins as [number, number, number, number]) ?? [100, 120, 100, 120],
      showMarginRuler: (options as unknown as { showMarginRuler?: boolean }).showMarginRuler ?? true,
      groupColors: (options as unknown as { group?: { groupColors?: Record<string, import('@vervedoc/docx-editor-schema').IGroupColor> } }).group?.groupColors
    })

    this.renderer.setEyeCare(!!options.eyeCare)
    this.engine = new LayoutEngine(this.toLayoutOptions())

    this.wrapper.addEventListener('scroll', this.onScroll, { passive: true })
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(() => this.resize())
      this.ro.observe(container)
    }
    const assetLoaded = () => {
      this.thumbnailCache.clear()
      this.forceFullRender = true
      this.scheduleRender()
    }
    this.canvasHost.addEventListener('vervedocs:image-loaded', assetLoaded)
    this.canvasHost.addEventListener('vervedocs:chart-loaded', assetLoaded)

    // Range 变化时触发光标重绘 + 悬浮工具栏 + 工具栏样式同步
    if (deps.listener && this.range) {
      deps.listener.on('rangeChange', () => {
        this.caretVisible = true
        this.renderCaretIfAny()
        // 拖拽过程中不更新悬浮工具栏，等 mouseup 再触发，避免工具栏跟随拖拽闪烁
        if (!this.isDragging) {
          // 同步选区样式到工具栏（formatChange）
          const style = this.onCommand?.('getRangeStyle')
          if (style) this.listener?.emit('formatChange', style)
          this.selectionToolbarWidget?.update()
          this.tableWidget?.update()
          this.imageWidget?.update()
          this.chartWidget?.update()
          this.paragraphWidget?.update()
          this.rulerWidget?.update()
        }
      })
    }

    // 隐藏输入框（textarea）：捕获所有键盘 & IME 输入
    this.inputEl = document.createElement('textarea')
    this.inputEl.className = 'vervedocs-hidden-input'
    this.inputEl.readOnly = !!options.readonly
    this.inputEl.disabled = !!options.disabled
    Object.assign(this.inputEl.style, {
      position: 'absolute',
      left: '0px',
      top: '0px',
      width: '1px',
      height: '1px',
      opacity: '0',
      border: 'none',
      outline: 'none',
      resize: 'none',
      padding: '0',
      margin: '0',
      overflow: 'hidden',
      zIndex: '10',
      background: 'transparent',
      color: 'transparent',
      cursor: TEXT_CURSOR,
      caretColor: 'transparent'
    } as CSSStyleDeclaration)
    this.inputEl.setAttribute('autocorrect', 'off')
    this.inputEl.setAttribute('autocapitalize', 'off')
    this.inputEl.setAttribute('spellcheck', 'false')
    container.appendChild(this.inputEl)

    this.bindEditingEvents()

    this.resize()
    this.reformatAndRender()
    this.startCaretBlink()
    this.selectionToolbarWidget = new SelectionToolbarWidget({
      canEdit: () => !this.options.readonly && !this.options.disabled,
      getLayout: () => this.layout,
      getRange: () => this.range ?? null,
      getDocument: () => this.document,
      getZone: () => this.zone,
      getScrollY: () => this.scrollY,
      getPageOffsetX: () => this.getPageOffsetX(),
      getViewportWidth: () => this.viewportWidth,
      getContainer: () => this.container,
      onCommand: (cmd: string, ...args: any[]) => this.onCommand?.(cmd, ...args),
      isSuppressToolbar: () => this._suppressToolbar,
      consumeSuppressToolbar: () => { this._suppressToolbar = false }
    })
    this.selectionToolbarWidget.create()
    this.tableWidget = new TableWidget({
      translate: this.translate,
      canEdit: () => !this.options.readonly && !this.options.disabled,
      getLayout: () => this.layout,
      getRange: () => this.range ?? null,
      getContainerRect: () => this.canvasHost.getBoundingClientRect(),
      getScrollY: () => this.scrollY,
      getPageOffsetX: () => this.getPageOffsetX(),
      onCommand: (cmd: string, ...args: any[]) => this.onCommand?.(cmd, ...args),
      hit: (clientX: number, clientY: number) => this.hit(clientX, clientY),
      focusInput: () => this.focusInput(),
      setCursor: (cursor: string) => {
        this.wrapper.style.cursor = cursor === 'text' || cursor === 'default' ? TEXT_CURSOR : cursor
      }
    })
    this.tableWidget.create()
    this.headerFooterWidget = new HeaderFooterWidget({
      translate: this.translate,
      getLayout: () => this.layout,
      getContainerRect: () => this.canvasHost.getBoundingClientRect(),
      getScrollY: () => this.scrollY,
      getWrapperWidth: () => this.wrapper.clientWidth,
      getScrollLeft: () => this.wrapper.scrollLeft,
      getPageOffsetX: () => this.getPageOffsetX(),
      getZone: () => this.zone,
      setZone: (zone: Zone) => this.setZone(zone),
      setZoneWithCaret: (zone: Zone) => this.setZoneWithCaret(zone),
      focusInput: () => this.focusInput(),
      drawZoneBorder: (layout, scrollY, zone, pageOffsetX) => this.renderer.drawZoneBorder(layout, scrollY, zone, pageOffsetX),
      onInsertPageNumber: (options) => {
        const zone: 'header' | 'footer' = this.zone === 'header' ? 'header' : 'footer'
        this.onCommand?.('executeSetPageNumber', { ...options, zone })
      }
    })
    this.headerFooterWidget.create()
    this.imageWidget = new ImageWidget({
      getContainer: () => this.canvasHost,
      getLayout: () => this.layout,
      getContainerRect: () => this.canvasHost.getBoundingClientRect(),
      getScrollY: () => this.scrollY,
      getPageOffsetX: () => this.getPageOffsetX(),
      onCommand: (cmd: string, ...args: any[]) => this.onCommand?.(cmd, ...args),
      onUpdateImageSizeLive: (path: Path, width: number, height: number) => this.updateImageSizeLive(path, width, height)
    })
    this.imageWidget.create()
    this.chartWidget = new ChartWidget({
      getContainer: () => this.canvasHost,
      getLayout: () => this.layout,
      getContainerRect: () => this.canvasHost.getBoundingClientRect(),
      getScrollY: () => this.scrollY,
      getPageOffsetX: () => this.getPageOffsetX(),
      onCommand: (cmd: string, ...args: any[]) => this.onCommand?.(cmd, ...args),
      onUpdateChartSizeLive: (path: Path, width: number, height: number) => this.updateChartSizeLive(path, width, height),
      getEventBus: () => this.eventBus
    })
    this.chartWidget.create()
    this.paragraphWidget = new ParagraphWidget({
      translate: this.translate,
      canEdit: () => !this.options.readonly && !this.options.disabled,
      getLayout: () => this.layout,
      getRange: () => this.range ?? null,
      getContainerRect: () => this.canvasHost.getBoundingClientRect(),
      getScrollY: () => this.scrollY,
      getPageOffsetX: () => this.getPageOffsetX(),
      onCommand: (cmd: string, ...args: any[]) => this.onCommand?.(cmd, ...args),
      hit: (clientX: number, clientY: number) => this.hit(clientX, clientY),
      suppressToolbar: () => { this._suppressToolbar = true },
      focusInput: () => this.focusInput()
    })
    this.paragraphWidget.create()
    this.rulerWidget = new RulerWidget({
      container: container,
      getLayout: () => this.layout,
      getScrollY: () => this.scrollY,
      getWrapperWidth: () => this.wrapper.clientWidth,
      getWrapperHeight: () => this.wrapper.clientHeight,
      getPageOffsetX: () => this.getPageOffsetX(),
      // Layout coordinates are already the renderer's page coordinates.
      getScale: () => (this.layout?.pageWidth ?? Number(this.options.pageWidth ?? 794)) / Number(this.options.pageWidth ?? 794),
      getPageMargins: () => (this.options.pageMargins as [number, number, number, number]) ?? [100, 120, 100, 120],
      getParagraphIndent: () => {
        const pos = this.range?.getFocus()
        const paragraph = pos ? findParagraphByPos(this.layout, pos) : null
        if (!paragraph) return null
        const run = paragraph.lines[0]?.inlines[0]?.run
        const attr = (key: string) => Number(
          (paragraph.block as unknown as Record<string, unknown> | null)?.[key] ??
          (run as unknown as Record<string, unknown> | undefined)?.[key] ?? 0
        )
        const left = Math.max(0, attr('paragraphIndentLeft'))
        const hanging = Math.max(0, attr('indentHanging'))
        return {
          first: left + (hanging ? 0 : Math.max(0, attr('paragraphFirstLineIndent'))),
          left: left + hanging,
          right: Math.max(0, attr('paragraphIndentRight'))
        }
      },
      onCommand: (cmd: string, ...args: any[]) => this.onCommand?.(cmd, ...args)
    })
    this.rulerWidget.create()
    if ((options as unknown as { showRuler?: boolean }).showRuler) {
      this.rulerWidget.setVisible(true)
    }

    this.watermarkWidget = new WatermarkWidget({
      getPageOffsetX: () => this.getPageOffsetX()
    })
    this.watermarkWidget.create()
    this.renderer.setWatermarkWidget(this.watermarkWidget)

    this.systemWatermarkWidget = new SystemWatermarkWidget({
      getContainer: () => this.container
    })
    this.systemWatermarkWidget.create()

    this.caretWidget = new CaretWidget({
      getCanvasHost: () => this.canvasHost
    })
    this.caretWidget.create()

    this.caretNavigation = new CaretNavigation({
      getLayout: () => this.layout,
      getRange: () => this.range ?? null,
      getZone: () => this.zone,
      findInlineByPos: (pos) => this.findInlineByPos(pos),
      findParagraphByPos: (pos) => this.findParagraphByPos(pos),
      findLineByPos: (pos) => this.findLineByPos(pos),
      findFirstInline: () => this.findFirstInline(),
      findLastInline: () => this.findLastInline(),
      setCaretVisible: (visible: boolean) => { this.caretVisible = visible },
      renderCaretIfAny: () => this.renderCaretIfAny()
    })

    this.zoneManager = new ZoneManager({
      getPage: () => this.layout?.pages.find(page => this.scrollY < page.rect.y + page.rect.height),
      getZone: () => this.zone,
      setZoneState: (zone: Zone) => { this.zone = zone },
      getDocument: () => this.document,
      getRange: () => this.range ?? null,
      focusInput: () => this.focusInput(),
      onZoneChange: (zone: Zone) => { this.onZoneChange?.(zone) },
      scheduleRender: () => this.scheduleRender(),
      reformatAndRender: () => this.reformatAndRender()
    })
  }

  /* -------------------- 输入 / 键盘事件 -------------------- */

  /** 绑定编辑相关事件：鼠标点选/拖拽、右键菜单、键盘、IME 组合输入。 */
  private bindEditingEvents(): void {
    // 让 wrapper 可接收指针事件（canvasHost 为 pointer-events:none）
    this.wrapper.addEventListener('mousedown', this.onMouseDown)
    this.wrapper.addEventListener('contextmenu', this.onContextMenu)
    // 拖拽选区：mousemove/mouseup 绑定在 window，以捕获拖出 wrapper 的情况
    window.addEventListener('mousemove', this.onMouseMove)
    window.addEventListener('mouseup', this.onMouseUp)

    // 键盘事件在 inputEl 上
    this.inputEl.addEventListener('keydown', (e) => {
      // 光标可见性重置（阻止闪烁在打字时消失）
      this.caretVisible = true
      this.renderCaretIfAny()
      if (this.onKeyDown) this.onKeyDown(e)
    })

    // 组合输入（中文/emoji）
    this.inputEl.addEventListener('compositionstart', () => { this.isComposing = true })
    this.inputEl.addEventListener('compositionend', (e) => {
      this.isComposing = false
      const text = (e as CompositionEvent).data ?? ''
      if (text && !this.options.readonly && !this.options.disabled) this.onInput?.(text)
      this.inputEl.value = ''
    })

    // 普通输入（非 IME）
    this.inputEl.addEventListener('input', (e) => {
      if (this.isComposing) return
      const ie = e as InputEvent
      const data = ie.data ?? this.inputEl.value
      if (data && !this.options.readonly && !this.options.disabled) this.onInput?.(data)
      this.inputEl.value = ''
    })
  }

  /**
   * 鼠标按下处理：表格/图片/页眉页脚手柄优先；否则命中文档位置后处理
   * Ctrl+点击跳转、双击选词、三击选段、Shift+扩展选区、普通点击+开始拖拽。
   * @param e 鼠标事件
   */
  /** 获取事件总线（供 commands 插件等发射交互事件） */
  getEventBus(): EventBus | undefined {
    return this.eventBus
  }

  private isAnnotationEvent(e: MouseEvent): boolean {
    return e.target instanceof Element
      && !!e.target.closest('.ce-comment-overlay, .ce-revision-overlay')
  }

  private onMouseDown = (e: MouseEvent): void => {
    // Annotation controls own their native focus and text selection.
    if (this.isAnnotationEvent(e)) return
    if (this.options.disabled) return
    this.eventBus?.emit('editorMousedown', e)
    if (!this.range || e.button !== 0) return
    // 阻止 mousedown 默认行为抢走隐藏输入框的焦点
    e.preventDefault()

    // 表格边框拖拽
    if (!this.options.readonly && this.tableWidget?.handleMouseDown(e)) return

    // 图片选中/缩放
    if (!this.options.readonly && this.imageWidget?.handleMouseDown(e)) {
      this.eventBus?.emit('imageMousedown', e)
      return
    }

    // 图表选中/缩放
    if (!this.options.readonly && this.chartWidget?.handleMouseDown(e)) {
      return
    }

    // 双击页眉/页脚区域：切换编辑区域
    if (!this.options.readonly && this.headerFooterWidget?.handleMouseDown(e)) return

    const pos = this.hit(e.clientX, e.clientY)
    if (!pos) { this.inputEl.focus(); return }
    // Ctrl/Cmd + 单击：命中超链接则打开浏览器跳转（WPS 行为）
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.detail === 1) {
      const url = this.findHyperlinkByPos(pos)
      if (url) { window.open(url, '_blank', 'noopener'); return }
    }
    // 三击：选段
    if (e.detail >= 3) { this.selectParagraphAt(pos); this.finishMouseSelect(); return }
    // 双击：选词
    if (e.detail === 2) { this.selectWordAt(pos); this.finishMouseSelect(); return }
    // Shift+Click：扩展选区（anchor 不动，focus 移到点击点）
    if (e.shiftKey) {
      const anchor = this.range.getAnchor()
      if (anchor) { this.range.setRange({ anchor, focus: pos }); this.finishMouseSelect(); return }
    }
    // 普通点击：折叠光标并开始拖拽
    this.range.setCaret(pos)
    this.dragAnchor = pos
    this.isDragging = true
    this.wrapper.style.cursor = TEXT_CURSOR
    this.finishMouseSelect()
  }

  /**
   * 鼠标移动处理：非拖拽时按 hover 超链接切换光标；拖拽时 RAF 节流更新选区 focus。
   * @param e 鼠标事件
   */
  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isDragging && this.isAnnotationEvent(e)) return
    // 文本选区拖拽保持文本指针；表格边框悬浮和拖拽优先于链接指针。
    if (!this.isDragging && this.tableWidget?.handleMouseMove(e)) return
    // 非拖拽时：hover 超链接显示手型，提示可 Ctrl+点击跳转
    if (!this.isDragging) {
      const pos = this.hit(e.clientX, e.clientY)
      const url = pos ? this.findHyperlinkByPos(pos) : null
      this.wrapper.style.cursor = url ? 'pointer' : TEXT_CURSOR
      // 正文模式下，悬浮页眉/页脚区域显示提示
      this.updateZoneHoverTooltip(e)
      return
    }
    if (!this.range || !this.dragAnchor || !this.layout) return
    const pos = this.hit(e.clientX, e.clientY)
    if (!pos) return
    this.dragPendingPos = pos
    if (this.dragRafId == null) {
      this.dragRafId = requestAnimationFrame(() => {
        this.dragRafId = null
        if (!this.dragPendingPos || !this.range || !this.dragAnchor) return
        this.range.setRange({ anchor: this.dragAnchor, focus: this.dragPendingPos })
        this.caretVisible = true
        this.renderCaretIfAny()
      })
    }
  }

  /**
   * 正文模式下，鼠标悬浮在页眉/页脚区域时设置 title 提示。
   * @param e 鼠标事件
   */
  private updateZoneHoverTooltip(e: MouseEvent): void {
    if (!this.layout || this.zone !== 'main') {
      this.wrapper.title = ''
      return
    }
    const rect = this.canvasHost.getBoundingClientRect()
    const docY = e.clientY - rect.top + this.scrollY
    for (const page of this.layout.pages) {
      if (docY < page.rect.y || docY > page.rect.y + page.rect.height) continue
      if (page.headerRect && docY >= page.headerRect.y && docY <= page.headerRect.y + page.headerRect.height) {
        this.wrapper.title = '双击编辑页眉'
        return
      }
      if (page.footerRect && docY >= page.footerRect.y && docY <= page.footerRect.y + page.footerRect.height) {
        this.wrapper.title = '双击编辑页脚'
        return
      }
      break
    }
    this.wrapper.title = ''
  }

  /**
   * 鼠标松开处理：结束拖拽、清理 RAF、更新悬浮工具栏与各 widget。
   * @param e 鼠标事件
   */
  private onMouseUp = (e: MouseEvent): void => {
    this.eventBus?.emit('editorMouseup', e)
    this.tableWidget?.handleMouseUp(e)
    const wasDragging = this.isDragging
    if (wasDragging && this.dragRafId != null && this.dragPendingPos && this.dragAnchor && this.range) {
      this.range.setRange({ anchor: this.dragAnchor, focus: this.dragPendingPos })
    }
    this.isDragging = false
    this.dragAnchor = null
    this.dragPendingPos = null
    if (this.dragRafId != null) { cancelAnimationFrame(this.dragRafId); this.dragRafId = null }
    if (wasDragging) {
      const style = this.onCommand?.('getRangeStyle')
      if (style) this.listener?.emit('formatChange', style)
    }
    // 松开鼠标后才显示悬浮工具栏
    this.selectionToolbarWidget?.update()

  }

  /** 鼠标选区结束收尾：聚焦隐藏输入框、重置光标可见性并重绘。 */
  private finishMouseSelect(): void {
    this.focusInput()
    this.caretVisible = true
    this.renderCaretIfAny()
  }

  /* -------------------- 右键菜单 -------------------- */

  /**
   * 右键菜单处理：优先交给图片/表格 widget 显示上下文菜单。
   * @param e 鼠标事件
   */
  private onContextMenu = (e: MouseEvent): void => {
    if (this.isAnnotationEvent(e)) return
    e.preventDefault()
    if (this.options.readonly || this.options.disabled) return

    // 命中超链接时通知 UI 显示超链接右键菜单
    const pos = this.hit(e.clientX, e.clientY)
    if (pos && this.findHyperlinkByPos(pos)) {
      this.eventBus?.emit('hyperlinkMenuClick')
      return
    }

    // 优先表格，未命中再尝试段落
    if (this.tableWidget?.showContextMenu(e.clientX, e.clientY)) return
    this.paragraphWidget?.showContextMenu(e.clientX, e.clientY)
  }


  /* -------------------- 双击选词 / 三击选段 -------------------- */

  /**
   * 双击选词：在命中 inline 内按 word char 边界扩展选区；非 word char 选当前单字。
   * @param pos 命中位置
   */
  private selectWordAt(pos: IPosition): void {
    this.caretNavigation?.selectWordAt(pos)
  }

  /**
   * 三击选段：把选区扩展到命中段落的首 inline 起点到末 inline 终点。
   * @param pos 命中位置
   */
  private selectParagraphAt(pos: IPosition): void {
    this.caretNavigation?.selectParagraphAt(pos)
  }

  /**
   * 按 position 在当前 layout 中查找所属 inline。
   * @param pos 待定位位置
   * @returns 命中的 InlineBox；未命中返回 null
   */
  private findInlineByPos(pos: IPosition): InlineBox | null {
    return findInlineByPos(this.layout, pos)
  }

  /**
   * 按 position 在当前 layout 中查找所属段落块。
   * @param pos 待定位位置
   * @returns 命中的 ParagraphBlock；未命中返回 null
   */
  private findParagraphByPos(pos: IPosition): ParagraphBlock | null {
    return findParagraphByPos(this.layout, pos)
  }

  /* -------------------- 光标移动（方向键 / Home / End / 词移动） -------------------- */

  /** 光标上移：基于当前光标矩形，用 hitTest 命中上一行同 x 最近字符 */
  moveCaretUp(): void {
    this.caretNavigation?.moveCaretUp()
  }

  /** 光标下移 */
  moveCaretDown(): void {
    this.caretNavigation?.moveCaretDown()
  }

  /** 当前行首 */
  moveCaretToLineStart(): void {
    this.caretNavigation?.moveCaretToLineStart()
  }

  /** 当前行尾 */
  moveCaretToLineEnd(): void {
    this.caretNavigation?.moveCaretToLineEnd()
  }

  /** 按词左移 */
  moveCaretWordLeft(): void {
    this.caretNavigation?.moveCaretWordLeft()
  }

  /** 按词右移 */
  moveCaretWordRight(): void {
    this.caretNavigation?.moveCaretWordRight()
  }

  /** 文档首 */
  moveCaretToDocStart(): void {
    this.caretNavigation?.moveCaretToDocStart()
  }

  /** 文档尾 */
  moveCaretToDocEnd(): void {
    this.caretNavigation?.moveCaretToDocEnd()
  }

  /** 全选：从文档首到文档尾 */
  selectAll(): void {
    this.caretNavigation?.selectAll()
  }

  /**
   * 按 position 在当前 layout 中查找所属行盒。
   * @param pos 待定位位置
   * @returns 命中的 LineBox；未命中返回 null
   */
  private findLineByPos(pos: IPosition): LineBox | null {
    return findLineByPos(this.layout, pos)
  }

  /**
   * 查找文档首个 inline（用于光标兜底定位到文档首）。
   * @returns 首个 InlineBox；空文档返回 null
   */
  private findFirstInline(): InlineBox | null {
    return findFirstInline(this.layout)
  }

  /** 按 position 定位 inline，若属于超链接则返回其 URL（供 Ctrl+点击跳转） */
  private findHyperlinkByPos(pos: IPosition): string | null {
    return findHyperlinkByPos(this.layout, pos)
  }

  /**
   * 查找文档末个 inline（用于光标定位到文档尾/全选终点）。
   * @returns 末个 InlineBox；空文档返回 null
   */
  private findLastInline(): InlineBox | null {
    return findLastInline(this.layout)
  }

  /** 把隐藏输入框放到当前光标位置，以便 IME 弹窗位置正确 */
  focusInput(): void {
    if (!this.range) return
    const pos = this.range.getFocus()
    if (!pos || !this.layout) { this.inputEl.focus(); return }
    const rect = locateCaret(this.layout, pos, this.zone)
    if (rect) {
      const pageOffsetX = this.getPageOffsetX()
      this.inputEl.style.left = `${Math.round(rect.x + pageOffsetX)}px`
      this.inputEl.style.top = `${Math.round(rect.y - this.scrollY)}px`
    }
    this.inputEl.focus()
  }

  /* -------------------- 光标闪烁 -------------------- */

  /** 启动光标闪烁定时器（530ms 切换可见性）。 */
  private startCaretBlink(): void {
    if (this.caretTimer != null) return
    this.caretTimer = window.setInterval(() => {
      this.caretVisible = !this.caretVisible
      this.renderCaretIfAny()
    }, 530) as unknown as number
  }

  /** 重绘 overlay：zone 边框 + 选区高亮 + 光标（按 caretVisible 闪烁）。 */
  private renderCaretIfAny(): void {
    if (!this.layout || !this.range) return
    this.renderer.clearOverlay()
    // zone 边框（页眉/页脚编辑时）
    this.headerFooterWidget?.renderBorder()
    // 选区高亮（非折叠时）
    const ordered = this.range.getOrdered()
    if (ordered && !this.range.isCollapsed()) {
      const tableRects = this.computeTableSelectionRects(ordered)
      if (tableRects) {
        this.renderer.drawSelection(tableRects, this.scrollY)
      } else {
        const selRects = computeSelectionRects(this.layout, ordered.start, ordered.end, this.zone)
        this.renderer.drawSelection(selRects, this.scrollY)
      }
    }
    // 光标（DOM 绘制）
    const pos = this.range.getFocus()
    if (!pos || this.options.readonly || this.options.disabled) {
      this.caretWidget?.hide()
      return
    }
    const rect = locateCaret(this.layout, pos, this.zone)
    if (rect) {
      this.caretWidget?.update(rect, this.scrollY, this.getPageOffsetX(), this.caretVisible)
    } else {
      this.caretWidget?.hide()
    }
  }

  /**
   * 计算表格整表选区高亮矩形：当选区恰好覆盖整张表（首格到末格）时返回所有 cell 矩形，
   * 否则返回 null（交由普通文本选区处理）。
   * @param ordered 有序选区
   * @returns 单元格矩形数组；非整表选区返回 null
   */
  private computeTableSelectionRects(ordered: { start: IPosition; end: IPosition }): { x: number; y: number; width: number; height: number }[] | null {
    if (!this.layout) return null
    const { start, end } = ordered
    if (start.path.length < 5 || end.path.length < 5) return null
    if (start.path[1] !== 'trList' || end.path[1] !== 'trList') return null
    if (start.path[0] !== end.path[0]) return null
    const tableIndex = start.path[0] as number
    for (const page of this.layout.pages) {
      const block = page.blocks.find(b => b.kind === 'table' && b.indexInParent === tableIndex)
      if (!block || block.kind !== 'table') continue
      const rowCount = block.rows.length
      const lastRow = block.rows[rowCount - 1]
      if (!lastRow) return null
      const lastColIdx = lastRow.cells.length - 1
      const startRow = start.path[2] as number
      const startCol = start.path[4] as number
      const endRow = end.path[2] as number
      const endCol = end.path[4] as number
      if (startRow !== 0 || startCol !== 0 || endRow !== rowCount - 1 || endCol !== lastColIdx) return null
      const rects: { x: number; y: number; width: number; height: number }[] = []
      for (const row of block.rows) {
        for (const cell of row.cells) {
          rects.push({
            x: page.contentRect.x + block.rect.x + cell.rect.x,
            y: page.contentRect.y + block.rect.y + cell.rect.y,
            width: cell.rect.width,
            height: cell.rect.height
          })
        }
      }
      return rects
    }
    return null
  }



  /* -------------------- 对外 API -------------------- */

  /**
   * 设置新文档并触发重排版+重渲染。
   * @param doc 新文档元数据
   */
  setDocument(doc: IDocxDocumentMeta): void {
    if (!doc || !Array.isArray(doc.elements)) {
      doc = { ...(doc ?? {}), elements: (doc as { elements?: unknown[] })?.elements ?? [] } as IDocxDocumentMeta
    }
    this.document = doc
    this.reformatAndRender()
  }

  /**
   * 获取当前文档元数据。
   * @returns 文档元数据
   */
  getDocument(): IDocxDocumentMeta { return this.document }

  /**
   * 设置渲染缩放倍数并重排+重渲染。
   * @param scale 缩放倍数
   */
  setScale(scale: number): void {
    this.options.scale = scale
    this.reformatWithInvalidation()
  }

  /**
   * 设置标尺可见性。
   * @param visible 是否可见
   */
  setRulerVisible(visible: boolean): void {
    this.rulerWidget?.setVisible(visible)
  }

  /**
   * 实时更新图片尺寸（拖拽缩放时调用）并重排+重渲染。
   * @param path 图片元素路径
   * @param width 新宽度
   * @param height 新高度
   */
  updateImageSizeLive(path: Path, width: number, height: number): void {
    const el = getByPath(this.document.elements, path)
    if (!el || el.type !== 'image') return
    ;(el as unknown as { width: number; height: number }).width = Math.max(1, Math.round(width))
    ;(el as unknown as { width: number; height: number }).height = Math.max(1, Math.round(height))
    this.reformatAndRender()
  }

  /**
   * 拖拽缩放图表过程中实时更新尺寸（不写文档历史，仅刷新显示）。
   * @param path 图表路径
   * @param width 新宽度
   * @param height 新高度
   */
  updateChartSizeLive(path: Path, width: number, height: number): void {
    const el = getByPath(this.document.elements, path)
    if (!el || el.type !== 'block') return
    const metrics = (el as unknown as { metrics?: { width: number; height: number } }).metrics
    if (!metrics) return
    metrics.width = Math.max(1, Math.round(width))
    metrics.height = Math.max(1, Math.round(height))
    this.reformatAndRender()
  }

  /**
   * 设置页边距并重排+重渲染。
   * @param margins 页边距 [top, right, bottom, left]
   */
  setPaperMargins(margins: [number, number, number, number]): void {
    this.options.pageMargins = margins
    this.reformatWithInvalidation()
  }

  /**
   * 设置页面尺寸（宽/高）并重排+重渲染。
   * @param width 页面宽度
   * @param height 页面高度
   */
  setPageSize(width: number, height: number): void {
    this.options.pageWidth = width
    this.options.pageHeight = height
    // Imported document geometry takes precedence over layout option defaults.
    const paperDirection = width > height ? 'horizontal' : 'vertical'
    this.document.pageWidth = width
    this.document.pageHeight = height
    this.document.paperDirection = paperDirection
    for (const section of this.document.sections ?? []) {
      section.pageWidth = width
      section.pageHeight = height
      section.paperDirection = paperDirection
    }
    this.reformatWithInvalidation()
  }

  /**
   * 获取当前编辑器选项。
   * @returns 编辑器选项
   */
  getOptions(): IEditorOption { return this.options }

  /** Refresh display translations without rebuilding open panels or changing editor state. */
  refreshTranslations(): void {
    this.paragraphWidget?.refreshTranslations()
    this.tableWidget?.refreshTranslations()
    this.headerFooterWidget?.refreshTranslations()
  }

  /**
   * 批量更新编辑器选项并重排+重渲染。
   * @param patch 选项补丁
   */
  updateOptions(patch: Partial<IEditorOption>): void {
    Object.assign(this.options, patch)
    if ('readonly' in patch || 'disabled' in patch) {
      this.inputEl.readOnly = !!this.options.readonly
      this.inputEl.disabled = !!this.options.disabled
      this.inputEl.value = ''
      this.isComposing = false
      this._suppressToolbar = false
      this.selectionToolbarWidget?.update()
      this.paragraphWidget?.update()
      this.tableWidget?.update()
      this.renderCaretIfAny()
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'eyeCare')) {
      this.renderer.setEyeCare(!!this.options.eyeCare)
      this.listener?.emit('thumbnailAppearanceChange')
    }
    // View-only toggles must not enter the document layout/render lifecycle.
    if (Object.keys(patch).every(key => ['eyeCare', 'readonly', 'disabled'].includes(key))) return
    this.reformatWithInvalidation()
  }

  /** 打印完整分页，不依赖仅包含当前视口的 Canvas 图层。 */
  print(): void {
    if (!this.layout?.pages.length) return
    const frame = document.createElement('iframe')
    frame.title = '文档打印'
    frame.setAttribute('aria-hidden', 'true')
    frame.tabIndex = -1
    frame.style.cssText = 'position:fixed;width:0;height:0;border:0;left:-10000px;top:0;'
    try {
      const images = this.getPageThumbnails()
      const pageStyles = this.layout.pages.map((page, index) =>
        `@page docx-page-${index}{size:${page.rect.width}px ${page.rect.height}px;margin:0}`
      ).join('')
      const pages = this.layout.pages.map((page, index) =>
        `<div class="page" style="page:docx-page-${index};width:${page.rect.width}px;height:${page.rect.height}px"><img src="${images[index]}" alt=""/></div>`
      ).join('')
      // Wait for every page image before opening the native print dialog.
      frame.onload = () => {
        const w = frame.contentWindow
        if (!w) {
          frame.remove()
          return
        }
        frame.onload = null
        w.addEventListener('afterprint', () => {
          setTimeout(() => frame.remove(), 0)
        }, { once: true })
        w.focus()
        w.print()
      }
      frame.srcdoc = `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><title>打印文档</title><style>
        @page{margin:0}${pageStyles}
        body{margin:0}
        .page{break-after:page;page-break-after:always}
        .page:last-child{break-after:auto;page-break-after:auto}
        .page img{display:block;width:100%;height:100%}
      </style></head><body>${pages}</body></html>`
      document.body.appendChild(frame)
    } catch (error) {
      frame.remove()
      throw error
    }
  }

  /**
   * 获取所有页面的缩略图图片（data URL）。
   * Reuse cached PNGs; only changed page content or visual options require painting.
   * @returns 缩略图 data URL 数组，每个元素对应一页
   */
  getPageThumbnails(): string[] {
    if (!this.layout) return []
    this.syncPageNumberToRenderer()
    this.syncWatermarkToRenderer()
    const visualSignature = JSON.stringify([
      { ...this.options, eyeCare: undefined }, this.layout.pages.length
    ])
    const images: string[] = []
    for (const page of this.layout.pages) {
      const signature = `${visualSignature}|${this.renderState?.pageSignatures.get(page.index)}`
      let cached = this.thumbnailCache.get(page.index)
      if (cached?.signature !== signature) {
        let foreground: string | undefined
        const image = this.renderer.renderPageThumbnail(page, 0.7, this.layout.pages.length, value => { foreground = value })
        cached = { signature, image, foreground }
        this.thumbnailCache.set(page.index, cached)
      }
      if (cached.image) images.push(cached.image)
    }
    for (const index of this.thumbnailCache.keys()) {
      if (index >= this.layout.pages.length) this.thumbnailCache.delete(index)
    }
    return images
  }

  /** Cached transparent content only: this never renders pages on an appearance toggle. */
  getThumbnailForegrounds(): string[] {
    return Array.from(this.thumbnailCache.values(), cached => cached.foreground ?? '')
  }

  /**
   * 获取最近一次排版结果。
   * @returns 排版结果；未排版返回 null
   */
  getLayout(): DocumentLayout | null { return this.layout }

  /**
   * 获取滚动占位元素（驱动 wrapper 滚动，批注/修订组件据此判断新架构）。
   * @returns scroller DOM
   */
  getScroller(): HTMLDivElement {
    // 打标记，让批注/修订组件的 _applyContainerWidth 跳过宽度覆盖
    ;(this.scroller as any).__vervedocsNewLayout = true
    return this.scroller
  }

  /** 供 commands 组件（BlockParticle 等）挂载 DOM 的容器（随文档滚动） */
  getContainer(): HTMLDivElement {
    return this.scroller
  }

  /**
   * 滚动到指定文档位置使其可见。
   * @param pos 文档位置
   */
  scrollPositionIntoView(pos: IPosition): void {
    if (!this.layout) return
    const rect = locateCaret(this.layout, pos, this.zone)
    if (!rect) return
    const anchor = document.createElement('div')
    anchor.style.position = 'absolute'
    anchor.style.left = `${rect.x}px`
    anchor.style.top = `${rect.y}px`
    anchor.style.width = '1px'
    anchor.style.height = `${rect.height}px`
    this.scroller.append(anchor)
    anchor.scrollIntoView({ block: 'center' })
    anchor.remove()

  }

  /** 供 commands 组件获取当前活动区域元素列表 */
  getElementList(): import('@vervedoc/docx-editor-schema').IElement[] {
    return this.getActiveDocument().elements
  }


  /** 供 commands 组件访问 RangeManager（路径接口） */
  getRange(): RangeManager | null {
    return this.range ?? null
  }


  /** 获取当前编辑区域 */
  getZone(): Zone { return this.zone }

  /** 切换编辑区域（main/header/footer） */
  setZone(zone: Zone): void {
    this.zoneManager?.setZone(zone)
  }

  /**
   * 切换编辑区域并设置初始光标。
   * 切换到页眉/页脚时，将光标定位到对应区域的起始文本位置；
   * 切回正文时清空选区。
   * @param zone 目标区域
   */
  setZoneWithCaret(zone: Zone): void {
    this.zoneManager?.setZoneWithCaret(zone)
  }

  /** 获取当前活动区域的文档（zone=header/footer 时 elements 指向对应区域） */
  getActiveDocument(): IDocxDocumentMeta {
    return this.zoneManager?.getActiveDocument() ?? this.document
  }

  /** 将修改后的活动文档写回对应区域并触发重渲染 */
  applyActiveDocument(doc: IDocxDocumentMeta): void {
    this.zoneManager?.applyActiveDocument(doc)
  }

  /** 设置当前高亮的批注/修订组 ID（鼠标悬浮气泡时调用） */
  setActiveGroup(groupId: string | null): void {
    if (!this.renderer.setActiveGroup(groupId) || !this.layout) return
    // Hover is transient: paint now, without rebuilding cards, widgets or thumbnails.
    // Keep any pending document RAF intact; it still owns its normal lifecycle hooks.
    this.renderer.render(this.layout, this.scrollY, this.viewportHeight)
  }

  setActiveRevision(revisionId: string | null, color?: string): void {
    if (!this.renderer.setActiveRevision(revisionId, color) || !this.layout) return
    this.renderer.render(this.layout, this.scrollY, this.viewportHeight)
  }

  /**
   * 遍历当前 layout，收集每个 groupId 所对应的锚点坐标（文档绝对坐标）。
   * 返回 Map<groupId, { startX, startY, endX, endY, lineHeight, glyphHeight, startGlyphTop, endGlyphTop }>
   * glyphHeight / startGlyphTop / endGlyphTop 用于按字形实际高度绘制竖线（而非行高）
   */
  getGroupAnchorMap(): Map<string, AnchorInfo> {
    const result = new Map<string, AnchorInfo>()
    if (!this.layout) return result
    for (const page of this.layout.pages) {
      collectGroupAnchors(page.blocks, page.contentRect.x, page.contentRect.y, result)
    }
    return result
  }

  /**
   * 遍历当前 layout，收集每个 revisionId 所对应的锚点坐标（文档绝对坐标）。
   * 返回 Map<revisionId, { startX, startY, endX, endY, lineHeight, glyphHeight, startGlyphTop, endGlyphTop }>
   */
  getRevisionAnchorMap(): Map<string, AnchorInfo> {
    const result = new Map<string, AnchorInfo>()
    if (!this.layout) return result
    for (const page of this.layout.pages) {
      collectRevisionAnchors(page.blocks, page.contentRect.x, page.contentRect.y, result)
    }
    return result
  }

  /**
   * 命中测试：把客户端坐标转为文档坐标并调用 hitTest。
   * @param clientX 客户端 x
   * @param clientY 客户端 y
   * @returns 命中位置；未命中返回 null
   */
  hit(clientX: number, clientY: number): IPosition | null {
    if (!this.layout) return null
    const rect = this.canvasHost.getBoundingClientRect()
    // canvasHost 覆盖 container 视口；页面在 canvas 上的 x = page.rect.x + pageOffsetX
    // 反推：文档坐标 x = (clientX - rect.left) - pageOffsetX
    const pageOffsetX = this.getPageOffsetX()
    const x = clientX - rect.left - pageOffsetX
    const y = clientY - rect.top + this.scrollY
    return hitTest(this.layout, x, y, this.zone)
  }

  /** 销毁视图：解绑事件、断开 ResizeObserver、取消 RAF/定时器、销毁各 widget、移除 DOM。 */
  destroy(): void {
    this.unsubscribeI18n()
    this.diagnosticNotice?.remove()
    this.wrapper.removeEventListener('scroll', this.onScroll)
    this.wrapper.removeEventListener('mousedown', this.onMouseDown)
    this.wrapper.removeEventListener('contextmenu', this.onContextMenu)
    window.removeEventListener('mousemove', this.onMouseMove)
    window.removeEventListener('mouseup', this.onMouseUp)
    this.ro?.disconnect()
    if (this.rafId != null) cancelAnimationFrame(this.rafId)
    if (this.caretTimer != null) { clearInterval(this.caretTimer); this.caretTimer = null }
    this.tableWidget?.destroy()
    this.imageWidget?.destroy()
    this.chartWidget?.destroy()
    this.paragraphWidget?.destroy()
    this.headerFooterWidget?.destroy()
    this.rulerWidget?.destroy()
    this.watermarkWidget?.destroy()
    this.systemWatermarkWidget?.destroy()
    this.selectionToolbarWidget?.destroy()
    this.caretWidget?.destroy()
    this.renderer.destroy()
    this.thumbnailCache.clear()

    if (this.inputEl && this.inputEl.parentElement === this.container) {
      this.container.removeChild(this.inputEl)
    }
    this.container.removeChild(this.wrapper)
  }

  /* -------------------- 内部 -------------------- */

  /**
   * 把编辑器选项映射为排版引擎选项。
   * @returns 排版选项
   */
  private toLayoutOptions(): LayoutOptions {
    return {
      pageWidth: Number(this.options.pageWidth ?? 794),
      pageHeight: Number(this.options.pageHeight ?? 1123),
      pageMargins: (this.options.pageMargins as [number, number, number, number]) ?? [100, 120, 100, 120],
      defaultFont: String(this.options.defaultFont ?? 'Microsoft YaHei'),
      defaultSize: Number(this.options.defaultSize ?? 16),
      defaultLineHeight: Number(this.options.defaultLineHeight ?? 1.5),
      scale: Number(this.options.scale ?? 1),
      pageGap: Number((this.options as unknown as { pageGap?: number }).pageGap ?? 24)
    }
  }

  /** 重排版+重渲染：格式化元素树 → 排版 → 复用 block id → 标脏 → 同步视觉 → 调度渲染。 */
  private reformatAndRender(): void {
    if (!this.document || !Array.isArray(this.document.elements)) {
      this.document = { ...this.document, elements: this.document?.elements ?? [] }
    }
    const bookmarkMarkers: { name: string; position: string; path: Path }[] = []
    formatElementTree(this.document.elements, { editorOptions: this.options, bookmarkMarkers })
    // Imported markers initialize the runtime index; repainting must not undo edits.
    if (this.document.bookmarks === undefined && bookmarkMarkers.length > 0) {
      this.document.bookmarks = pairBookmarkMarkers(bookmarkMarkers, this.document.elements)
    }
    const headerElements = this.document.header ?? this.document.contentZones?.header
    const footerElements = this.document.footer ?? this.document.contentZones?.footer
    for (const elements of [headerElements, footerElements, ...Object.values(this.document.headerFooterParts ?? {})]) {
      if (elements?.length) formatElementTree(elements, { editorOptions: this.options })
    }
    const layout = this.engine.layout(this.document.elements, headerElements, footerElements, this.document)

    const { state, dirty } = prepareRenderState(layout, this.renderState)
    this.renderState = state
    this.layout = layout
    const diagnostics = layout.diagnostics ?? []
    const signature = JSON.stringify(diagnostics)
    if (signature !== this.diagnosticSignature) {
      this.diagnosticSignature = signature
      this.diagnosticNotice?.remove()
      this.diagnosticNotice = undefined
      if (diagnostics.length) {
        const notice = document.createElement('div')
        notice.className = 'vervedocs-layout-diagnostics'
        notice.setAttribute('role', 'status')
        notice.style.cssText = 'position:absolute;top:0;left:0;right:0;z-index:100;max-height:120px;overflow:auto;white-space:pre-wrap;padding:8px 12px;background:#fff4ce;color:#663c00;font-size:13px;'
        notice.textContent = diagnostics.map(item => `[${item.zone} / ${item.path.join('.')} / ${item.feature}] ${item.message}`).join('\n')
        this.container.appendChild(notice)
        this.diagnosticNotice = notice
      }
      this.listener?.emit('layoutDiagnosticsChange', diagnostics)
    }
    this.listener?.emit('pageCountChange', layout.pages.length)

    // scroller 撑起文档总高（页面居中通过 CSS margin:0 auto）
    this.scroller.style.height = `${layout.totalHeight}px`
    this.scroller.style.width = `${layout.pageWidth}px`
    this.scroller.style.margin = '0 auto'

    if (dirty.length > 0) this.renderer.markDirty(dirty)
    this.renderer.setLayout(layout, new Set([...state.blocks.values()].map(block => block.id)))
    this.updateVisualLayout()
    // 光标兜底：若 range 尚未定位（首次渲染 / 之前是空文档），把光标置到文档首位，
    // 避免"看不到光标 / 无法输入"。findFirstInline 在空文档兜底 run 上也能命中零宽 inline。
    if (this.range && !this.range.getFocus()) {
      const first = this.findFirstInline()
      if (first) {
        this.range.setCaret({ path: first.path, offset: first.startOffset })
        this.caretVisible = true
      }
    }
    this.scheduleRender()
  }

  /** 计算页面水平居中偏移：(wrapperWidth - pageWidth)/2 - scrollLeft */
  private getPageOffsetX(): number {
    const wrapperWidth = this.wrapper.clientWidth
    const scrollLeft = this.wrapper.scrollLeft
    return Math.max(0, (wrapperWidth - (this.layout?.pageWidth ?? 0)) / 2) - scrollLeft
  }


  /** 选项变更后重排版并重渲染：更新引擎选项、失效位图缓存、重排版 */
  private reformatWithInvalidation(): void {
    this.engine.updateOptions(this.toLayoutOptions())
    this.renderer.invalidateAll()
    this.thumbnailCache.clear()
    this.forceFullRender = true
    this.reformatAndRender()
  }

  /** 计算居中偏移并同步给 renderer */
  private updateVisualLayout(): void {
    if (!this.layout) return
    const pageOffsetX = this.getPageOffsetX()
    const bg = (this.options as unknown as { background?: { color?: string } }).background
    this.renderer.updateVisualOptions({
      pageOffsetX,
      pageMargins: (this.options.pageMargins as [number, number, number, number]) ?? [100, 120, 100, 120],
      pageBg: bg?.color || '#ffffff',
      groupColors: (this.options as unknown as { group?: { groupColors?: Record<string, import('@vervedoc/docx-editor-schema').IGroupColor> } }).group?.groupColors
    })
    this.rulerWidget?.update()
  }

  /** 容器 resize 处理：更新视口尺寸、同步 renderer、刷新视觉布局并调度重渲染。 */
  private resize = (): void => {
    const rect = this.container.getBoundingClientRect()
    if (rect.width === this.viewportWidth && rect.height === this.viewportHeight) return
    this.forceFullRender = true
    this.viewportWidth = rect.width
    this.viewportHeight = rect.height
    this.renderer.setSize(this.viewportWidth, this.viewportHeight)
    this.updateVisualLayout()
    this.scheduleRender()

  }

  /** 滚动处理：更新 scrollY、刷新视觉布局与各 widget、发射当前页码变化事件。 */
  private onScroll = (): void => {
    this.forceFullRender = true
    this.scrollY = this.wrapper.scrollTop
    this.updateVisualLayout()
    // 滚动渲染跳过 afterRender（避免每帧生成缩略图等重操作），widget 更新在 RAF 内完成
    this.scheduleRender(true)

    // 发射当前页码变化
    if (this.layout && this.listener) {
      const midY = this.scrollY + this.wrapper.clientHeight / 2
      for (const page of this.layout.pages) {
        if (midY >= page.rect.y && midY < page.rect.y + page.rect.height) {
          this.listener.emit('currentPageNoChange', page.index)
          break
        }
      }
    }
  }

  /**
   * 调度一帧渲染：RAF 内执行 renderer.render + 光标/工具栏重绘 + afterRender 回调。
   * @param skipAfterRender 是否跳过 afterRender 回调（滚动时传 true，避免每帧生成缩略图等重操作）
   */
  private scheduleRender(skipAfterRender = false): void {
    if (this.rafId != null) {
      this._pendingSkipAfterRender = this._pendingSkipAfterRender && skipAfterRender
      return
    }
    this._pendingSkipAfterRender = skipAfterRender
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null
      if (!this.layout) return
      this.syncPageNumberToRenderer()
      this.syncWatermarkToRenderer()
      const dirtyRect = this.forceFullRender || !this.renderState ? null :
        computeDirtyRect(this.paintedState, this.renderState, {
          x: -this.getPageOffsetX(), y: this.scrollY,
          width: this.viewportWidth, height: this.viewportHeight
        })
      this.forceFullRender = false

      this.renderer.render(this.layout, this.scrollY, this.viewportHeight, dirtyRect)
      this.paintedState = this.renderState
      this.renderCaretIfAny()
      this.selectionToolbarWidget?.update()
      this.tableWidget?.update()
      this.paragraphWidget?.update()
      this.imageWidget?.update()
      this.chartWidget?.update()
      if (!this._pendingSkipAfterRender) {
        this.afterRender?.()
      }
      this._pendingSkipAfterRender = false
    })
  }

  /** 将 options.pageNumber 配置同步到渲染器 */
  private syncPageNumberToRenderer(): void {
    const pn = (this.options as any).pageNumber ?? null
    this.renderer.updatePageNumber(pn)
  }

  /** 将 options.watermark 配置同步到水印 widget */
  private syncWatermarkToRenderer(): void {
    const wm = (this.options as any).watermark ?? null
    this.watermarkWidget?.setConfig(wm as WatermarkConfig | null)
  }

  /** 设置系统级水印（DOM 覆盖层） */
  setSystemWatermark(config: SystemWatermarkConfig | null): void {
    this.systemWatermarkWidget?.setConfig(config)
  }
}
