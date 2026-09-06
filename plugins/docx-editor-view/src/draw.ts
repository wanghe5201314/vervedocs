/**
 * VerveDocs View —— Draw
 *
 * 编辑器视图门面。
 *
 * 增量策略：
 *  - 保持 setDocument 每次都 layout()
 *  - 与前一次 layout 按段落"签名"比对：签名相同则复用 block.id（bitmap 缓存复用），
 *    签名不同则保留新分配 id 并 markDirty（渲染时会重建 bitmap）。
 *  - 未匹配的旧块 id 由 renderer.render 内的 GC 淘汰。
 */

import type { IDocxDocumentMeta, IEditorOption, IPosition, Path } from '@vervedoc/docx-editor-schema'
import { formatElementTree, isSamePath, getByPath, FONT_FAMILY_LIST, FONT_FAMILY_VALUE, FONT_FAMILY_LABEL, FONT_SIZE, FONT_SIZE_LIST } from '@vervedoc/docx-editor-schema'
import type { Listener, RangeManager, EventBus } from '@vervedoc/docx-editor-state'
import { LayoutEngine, type LayoutOptions } from './layout-engine'
import type { DocumentLayout, BlockNode, ParagraphBlock, InlineBox, LineBox } from './layout-types'
import { CanvasRenderer } from './canvas-renderer'
import { hitTest } from './hit-test'
import { locateCaret, computeSelectionRects } from './caret-rect'
import { TableWidget } from './widgets/table-widget'
import { ImageWidget } from './widgets/image-widget'
import { ParagraphWidget } from './widgets/paragraph-widget'
import { HeaderFooterWidget, type Zone } from './widgets/header-footer-widget'
import { RulerWidget } from './widgets/ruler-widget'

/** Draw 门面依赖：装配文档、状态管理器与各类回调 */
export interface DrawDeps {
  /** 文档元数据 */
  document: IDocxDocumentMeta
  /** 事件监听器（用于发射 page-count-change 等事件） */
  listener?: Listener
  /** 事件总线 */
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
  onCommand?: (command: string, ...args: any[]) => void
  /** zone 变化回调（由 core 装配，用于驱动 UI 标签显示） */
  onZoneChange?: (zone: Zone) => void
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
  /** 排版引擎 */
  private engine: LayoutEngine
  /** 最近一次排版结果 */
  private layout: DocumentLayout | null = null

  /** 文档元数据 */
  private document: IDocxDocumentMeta
  /** 编辑器选项 */
  private options: IEditorOption
  /** 选区管理器 */
  private range?: RangeManager
  /** 事件监听器 */
  private listener?: Listener

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

  /** 上一帧的签名 -> block id，用于复用位图缓存 */
  private lastSignatureToId = new Map<string, number>()

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
  private onCommand?: (command: string, ...args: any[]) => void

  /** 悬浮选区工具栏 */
  private selectionToolbar: HTMLDivElement | null = null
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
  /** 段落格式悬浮 widget */
  private paragraphWidget: ParagraphWidget | null = null
  /** 页眉页脚交互 widget */
  private headerFooterWidget: HeaderFooterWidget | null = null
  /** 标尺 widget */
  private rulerWidget: RulerWidget | null = null

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

    container.classList.add('vervedocs-container')
    // container 需要作为绝对定位的参照
    if (getComputedStyle(container).position === 'static') {
      container.style.position = 'relative'
    }
    container.style.overflow = 'hidden'

    // scroller 是可滚动容器（自身溢出出现滚动条）
    this.wrapper = document.createElement('div')
    this.wrapper.className = 'vervedocs-wrapper'
    this.wrapper.style.position = 'absolute'
    this.wrapper.style.inset = '0'
    this.wrapper.style.overflow = 'auto'
    this.wrapper.style.background = '#E2E2E2'

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
    this.engine = new LayoutEngine(this.toLayoutOptions())

    this.wrapper.addEventListener('scroll', this.onScroll, { passive: true })
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(() => this.onResize())
      this.ro.observe(container)
    }
    this.canvasHost.addEventListener('vervedocs:image-loaded', () => this.scheduleRender())

    // Range 变化时触发光标重绘 + 悬浮工具栏
    if (deps.listener && this.range) {
      deps.listener.on('range-change', () => {
        this.caretVisible = true
        this.renderCaretIfAny()
        // 拖拽过程中不更新悬浮工具栏，等 mouseup 再触发，避免工具栏跟随拖拽闪烁
        if (!this.isDragging) {
          this.updateSelectionToolbar()
          this.tableWidget?.update()
          this.imageWidget?.update()
          this.paragraphWidget?.update()
        }
      })
    }

    // 隐藏输入框（textarea）：捕获所有键盘 & IME 输入
    this.inputEl = document.createElement('textarea')
    this.inputEl.className = 'vervedocs-hidden-input'
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
      caretColor: 'transparent'
    } as CSSStyleDeclaration)
    this.inputEl.setAttribute('autocorrect', 'off')
    this.inputEl.setAttribute('autocapitalize', 'off')
    this.inputEl.setAttribute('spellcheck', 'false')
    container.appendChild(this.inputEl)

    this.bindEditingEvents()

    this.onResize()
    this.reformatAndRender()
    this.startCaretBlink()
    this.createSelectionToolbar()
    this.tableWidget = new TableWidget({
      getLayout: () => this.layout,
      getRange: () => this.range ?? null,
      getContainerRect: () => this.canvasHost.getBoundingClientRect(),
      getScrollY: () => this.scrollY,
      getPageOffsetX: () => {
        const wrapperWidth = this.wrapper.clientWidth
        const scrollLeft = this.wrapper.scrollLeft
        return Math.max(0, (wrapperWidth - (this.layout?.pageWidth ?? 0)) / 2) - scrollLeft
      },
      onCommand: (cmd: string, ...args: any[]) => { this.onCommand?.(cmd, ...args) },
      hit: (clientX: number, clientY: number) => this.hit(clientX, clientY),
      focusInput: () => this.focusInput(),
      setCursor: (cursor: string) => { this.wrapper.style.cursor = cursor }
    })
    this.tableWidget.create()
    this.headerFooterWidget = new HeaderFooterWidget({
      getLayout: () => this.layout,
      getContainerRect: () => this.canvasHost.getBoundingClientRect(),
      getScrollY: () => this.scrollY,
      getWrapperWidth: () => this.wrapper.clientWidth,
      getScrollLeft: () => this.wrapper.scrollLeft,
      getPageOffsetX: () => {
        const wrapperWidth = this.wrapper.clientWidth
        const scrollLeft = this.wrapper.scrollLeft
        return Math.max(0, (wrapperWidth - (this.layout?.pageWidth ?? 0)) / 2) - scrollLeft
      },
      getZone: () => this.zone,
      setZone: (zone: Zone) => this.setZone(zone),
      focusInput: () => this.focusInput(),
      drawZoneBorder: (layout, scrollY, zone, pageOffsetX) => this.renderer.drawZoneBorder(layout, scrollY, zone, pageOffsetX)
    })
    this.headerFooterWidget.create()
    this.imageWidget = new ImageWidget({
      getLayout: () => this.layout,
      getRange: () => this.range ?? null,
      getContainerRect: () => this.canvasHost.getBoundingClientRect(),
      getScrollY: () => this.scrollY,
      getPageOffsetX: () => {
        const wrapperWidth = this.wrapper.clientWidth
        const scrollLeft = this.wrapper.scrollLeft
        return Math.max(0, (wrapperWidth - (this.layout?.pageWidth ?? 0)) / 2) - scrollLeft
      },
      onCommand: (cmd: string, ...args: any[]) => { this.onCommand?.(cmd, ...args) },
      onUpdateImageSizeLive: (path: Path, width: number, height: number) => this.updateImageSizeLive(path, width, height),
      hit: (clientX: number, clientY: number) => this.hit(clientX, clientY),
      focusInput: () => this.focusInput()
    })
    this.imageWidget.create()
    this.paragraphWidget = new ParagraphWidget({
      getLayout: () => this.layout,
      getRange: () => this.range ?? null,
      getContainerRect: () => this.canvasHost.getBoundingClientRect(),
      getScrollY: () => this.scrollY,
      getPageOffsetX: () => {
        const wrapperWidth = this.wrapper.clientWidth
        const scrollLeft = this.wrapper.scrollLeft
        return Math.max(0, (wrapperWidth - (this.layout?.pageWidth ?? 0)) / 2) - scrollLeft
      },
      onCommand: (cmd: string, ...args: any[]) => { this.onCommand?.(cmd, ...args) },
      hit: (clientX: number, clientY: number) => this.hit(clientX, clientY),
      suppressToolbar: () => { this._suppressToolbar = true }
    })
    this.paragraphWidget.create()
    this.rulerWidget = new RulerWidget({
      container: container,
      getLayout: () => this.layout,
      getScrollY: () => this.scrollY,
      getWrapperWidth: () => this.wrapper.clientWidth,
      getWrapperHeight: () => this.wrapper.clientHeight,
      getPageOffsetX: () => {
        const wrapperWidth = this.wrapper.clientWidth
        const scrollLeft = this.wrapper.scrollLeft
        return Math.max(0, (wrapperWidth - (this.layout?.pageWidth ?? 0)) / 2) - scrollLeft
      },
      getScale: () => Number(this.options.scale ?? 1),
      getPageMargins: () => (this.options.pageMargins as [number, number, number, number]) ?? [100, 120, 100, 120],
      getPageGap: () => Number((this.options as unknown as { pageGap?: number }).pageGap ?? 24),
      onCommand: (cmd: string, ...args: any[]) => { this.onCommand?.(cmd, ...args) }
    })
    this.rulerWidget.create()
    if ((options as unknown as { showRuler?: boolean }).showRuler) {
      this.rulerWidget.setVisible(true)
    }
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
      if (text) this.onInput?.(text)
      this.inputEl.value = ''
    })

    // 普通输入（非 IME）
    this.inputEl.addEventListener('input', (e) => {
      if (this.isComposing) return
      const ie = e as InputEvent
      const data = ie.data ?? this.inputEl.value
      if (data) this.onInput?.(data)
      this.inputEl.value = ''
    })
  }

  /**
   * 鼠标按下处理：表格/图片/页眉页脚手柄优先；否则命中文档位置后处理
   * Ctrl+点击跳转、双击选词、三击选段、Shift+扩展选区、普通点击+开始拖拽。
   * @param e 鼠标事件
   */
  private onMouseDown = (e: MouseEvent): void => {
    if (!this.range) return
    // 阻止 mousedown 默认行为抢走隐藏输入框的焦点
    e.preventDefault()

    // 表格边框拖拽
    if (this.tableWidget?.handleMouseDown(e)) return

    // 图片选中/缩放
    if (this.imageWidget?.handleMouseDown(e)) return

    // 双击页眉/页脚区域：切换编辑区域
    if (this.headerFooterWidget?.handleMouseDown(e)) return

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
    this.finishMouseSelect()
  }

  /**
   * 鼠标移动处理：非拖拽时按 hover 超链接切换光标；拖拽时 RAF 节流更新选区 focus。
   * @param e 鼠标事件
   */
  private onMouseMove = (e: MouseEvent): void => {
    this.tableWidget?.handleMouseMove(e)
    // 非拖拽时：hover 超链接显示手型，提示可 Ctrl+点击跳转
    if (!this.isDragging) {
      const pos = this.hit(e.clientX, e.clientY)
      const url = pos ? this.findHyperlinkByPos(pos) : null
      this.wrapper.style.cursor = url ? 'pointer' : 'text'
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
   * 鼠标松开处理：结束拖拽、清理 RAF、更新悬浮工具栏与各 widget。
   * @param e 鼠标事件
   */
  private onMouseUp = (e: MouseEvent): void => {
    this.tableWidget?.handleMouseUp(e)
    this.isDragging = false
    this.dragAnchor = null
    this.dragPendingPos = null
    if (this.dragRafId != null) { cancelAnimationFrame(this.dragRafId); this.dragRafId = null }
    // 松开鼠标后才显示悬浮工具栏
    this.updateSelectionToolbar()
    this.tableWidget?.update()
    this.imageWidget?.update()
    this.paragraphWidget?.update()
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
    e.preventDefault()
    if (this.imageWidget?.showContextMenu(e.clientX, e.clientY)) return
    this.tableWidget?.showContextMenu(e.clientX, e.clientY)
  }


  /* -------------------- 双击选词 / 三击选段 -------------------- */

  /**
   * 双击选词：在命中 inline 内按 word char 边界扩展选区；非 word char 选当前单字。
   * @param pos 命中位置
   */
  private selectWordAt(pos: IPosition): void {
    if (!this.range || !this.layout) return
    const inl = this.findInlineByPos(pos)
    if (!inl) { this.range.setCaret(pos); return }
    const text = inl.text
    const localOff = pos.offset - inl.startOffset
    const isWord = (ch: string) => /[A-Za-z0-9_]/.test(ch)
    let left = localOff
    let right = localOff
    while (left > 0 && isWord(text[left - 1])) left--
    while (right < text.length && isWord(text[right])) right++
    // 非 word char（CJK / 标点 / 空格）：选当前单字
    if (left === right) {
      if (localOff < text.length) right = localOff + 1
      else left = Math.max(0, localOff - 1)
    }
    this.range.setRange({
      anchor: { path: inl.path, offset: inl.startOffset + left },
      focus: { path: inl.path, offset: inl.startOffset + right }
    })
  }

  /**
   * 三击选段：把选区扩展到命中段落的首 inline 起点到末 inline 终点。
   * @param pos 命中位置
   */
  private selectParagraphAt(pos: IPosition): void {
    if (!this.range || !this.layout) return
    const para = this.findParagraphByPos(pos)
    if (!para) { this.range.setCaret(pos); return }
    let first: InlineBox | undefined
    let last: InlineBox | undefined
    for (const line of para.lines) {
      for (const inl of line.inlines) {
        if (!first) first = inl
        last = inl
      }
    }
    if (!first || !last) { this.range.setCaret(pos); return }
    this.range.setRange({
      anchor: { path: first.path, offset: first.startOffset },
      focus: { path: last.path, offset: last.endOffset }
    })
  }

  /**
   * 按 position 在当前 layout 中查找所属 inline。
   * @param pos 待定位位置
   * @returns 命中的 InlineBox；未命中返回 null
   */
  private findInlineByPos(pos: IPosition): InlineBox | null {
    if (!this.layout) return null
    for (const page of this.layout.pages) {
      const r = this.findInlineInBlocks(page.blocks, pos)
      if (r) return r
    }
    return null
  }

  /**
   * 在 block 列表中递归查找所属 inline（含表格单元格递归）。
   * @param blocks 块列表
   * @param pos 待定位位置
   * @returns 命中的 InlineBox；未命中返回 null
   */
  private findInlineInBlocks(blocks: BlockNode[], pos: IPosition): InlineBox | null {
    for (const b of blocks) {
      if (b.kind === 'paragraph') {
        for (const line of b.lines) {
          for (const inl of line.inlines) {
            if (isSamePath(inl.path, pos.path) && pos.offset >= inl.startOffset && pos.offset <= inl.endOffset) {
              return inl
            }
          }
        }
      } else if (b.kind === 'table') {
        for (const row of b.rows) {
          for (const cell of row.cells) {
            const r = this.findInlineInBlocks(cell.content, pos)
            if (r) return r
          }
        }
      }
    }
    return null
  }

  /**
   * 按 position 在当前 layout 中查找所属段落块。
   * @param pos 待定位位置
   * @returns 命中的 ParagraphBlock；未命中返回 null
   */
  private findParagraphByPos(pos: IPosition): ParagraphBlock | null {
    if (!this.layout) return null
    for (const page of this.layout.pages) {
      const r = this.findParagraphInBlocks(page.blocks, pos)
      if (r) return r
    }
    return null
  }

  /**
   * 在 block 列表中递归查找所属段落块（含表格单元格递归）。
   * @param blocks 块列表
   * @param pos 待定位位置
   * @returns 命中的 ParagraphBlock；未命中返回 null
   */
  private findParagraphInBlocks(blocks: BlockNode[], pos: IPosition): ParagraphBlock | null {
    for (const b of blocks) {
      if (b.kind === 'paragraph') {
        for (const line of b.lines) {
          for (const inl of line.inlines) {
            if (isSamePath(inl.path, pos.path)) return b
          }
        }
      } else if (b.kind === 'table') {
        for (const row of b.rows) {
          for (const cell of row.cells) {
            const r = this.findParagraphInBlocks(cell.content, pos)
            if (r) return r
          }
        }
      }
    }
    return null
  }

  /* -------------------- 光标移动（方向键 / Home / End / 词移动） -------------------- */

  /** 光标上移：基于当前光标矩形，用 hitTest 命中上一行同 x 最近字符 */
  moveCaretUp(): void {
    this.moveCaretVertical(-1)
  }

  /** 光标下移 */
  moveCaretDown(): void {
    this.moveCaretVertical(1)
  }

  /**
   * 光标垂直移动：基于当前光标矩形，用 hitTest 命中上一/下一行同 x 最近字符。
   * @param dir 移动方向，1=下移，-1=上移
   */
  private moveCaretVertical(dir: 1 | -1): void {
    if (!this.layout || !this.range) return
    const pos = this.range.getFocus()
    if (!pos) return
    const rect = locateCaret(this.layout, pos)
    if (!rect) return
    // 目标 y = 当前光标 y ± 行高（估算上一/下一行中部）
    const targetY = rect.y + dir * rect.height
    const newPos = hitTest(this.layout, rect.x, targetY)
    if (newPos) {
      this.range.setCaret(newPos)
      this.caretVisible = true
      this.renderCaretIfAny()
    }
  }

  /** 当前行首 */
  moveCaretToLineStart(): void {
    if (!this.layout || !this.range) return
    const pos = this.range.getFocus()
    if (!pos) return
    const line = this.findLineByPos(pos)
    if (!line) return
    const first = line.inlines[0]
    if (first) {
      this.range.setCaret({ path: first.path, offset: first.startOffset })
      this.caretVisible = true
      this.renderCaretIfAny()
    }
  }

  /** 当前行尾 */
  moveCaretToLineEnd(): void {
    if (!this.layout || !this.range) return
    const pos = this.range.getFocus()
    if (!pos) return
    const line = this.findLineByPos(pos)
    if (!line) return
    const last = line.inlines[line.inlines.length - 1]
    if (last) {
      this.range.setCaret({ path: last.path, offset: last.endOffset })
      this.caretVisible = true
      this.renderCaretIfAny()
    }
  }

  /** 按词左移 */
  moveCaretWordLeft(): void {
    if (!this.layout || !this.range) return
    const pos = this.range.getFocus()
    if (!pos) return
    const inl = this.findInlineByPos(pos)
    if (!inl) return
    const text = inl.text
    const localOff = pos.offset - inl.startOffset
    const isWord = (ch: string) => /[A-Za-z0-9_]/.test(ch)
    let off = localOff
    // 先跳过非 word char（空格/标点），再跳过 word char
    while (off > 0 && !isWord(text[off - 1])) off--
    while (off > 0 && isWord(text[off - 1])) off--
    if (off === localOff && off > 0) off = localOff - 1
    this.range.setCaret({ path: inl.path, offset: inl.startOffset + off })
    this.caretVisible = true
    this.renderCaretIfAny()
  }

  /** 按词右移 */
  moveCaretWordRight(): void {
    if (!this.layout || !this.range) return
    const pos = this.range.getFocus()
    if (!pos) return
    const inl = this.findInlineByPos(pos)
    if (!inl) return
    const text = inl.text
    const localOff = pos.offset - inl.startOffset
    const isWord = (ch: string) => /[A-Za-z0-9_]/.test(ch)
    let off = localOff
    while (off < text.length && !isWord(text[off])) off++
    while (off < text.length && isWord(text[off])) off++
    if (off === localOff && off < text.length) off = localOff + 1
    this.range.setCaret({ path: inl.path, offset: inl.startOffset + off })
    this.caretVisible = true
    this.renderCaretIfAny()
  }

  /** 文档首 */
  moveCaretToDocStart(): void {
    if (!this.layout || !this.range) return
    const first = this.findFirstInline()
    if (first) {
      this.range.setCaret({ path: first.path, offset: first.startOffset })
      this.caretVisible = true
      this.renderCaretIfAny()
    }
  }

  /** 文档尾 */
  moveCaretToDocEnd(): void {
    if (!this.layout || !this.range) return
    const last = this.findLastInline()
    if (last) {
      this.range.setCaret({ path: last.path, offset: last.endOffset })
      this.caretVisible = true
      this.renderCaretIfAny()
    }
  }

  /** 全选：从文档首到文档尾 */
  selectAll(): void {
    if (!this.layout || !this.range) return
    const first = this.findFirstInline()
    const last = this.findLastInline()
    if (!first || !last) return
    this.range.setRange({
      anchor: { path: first.path, offset: first.startOffset },
      focus: { path: last.path, offset: last.endOffset }
    })
    this.caretVisible = false
    this.renderCaretIfAny()
  }

  /**
   * 按 position 在当前 layout 中查找所属行盒。
   * @param pos 待定位位置
   * @returns 命中的 LineBox；未命中返回 null
   */
  private findLineByPos(pos: IPosition): LineBox | null {
    if (!this.layout) return null
    for (const page of this.layout.pages) {
      const r = this.findLineInBlocks(page.blocks, pos)
      if (r) return r
    }
    return null
  }

  /**
   * 在 block 列表中递归查找所属行盒（含表格单元格递归）。
   * @param blocks 块列表
   * @param pos 待定位位置
   * @returns 命中的 LineBox；未命中返回 null
   */
  private findLineInBlocks(blocks: BlockNode[], pos: IPosition): LineBox | null {
    for (const b of blocks) {
      if (b.kind === 'paragraph') {
        for (const line of b.lines) {
          for (const inl of line.inlines) {
            if (isSamePath(inl.path, pos.path) && pos.offset >= inl.startOffset && pos.offset <= inl.endOffset) {
              return line
            }
          }
        }
      } else if (b.kind === 'table') {
        for (const row of b.rows) {
          for (const cell of row.cells) {
            const r = this.findLineInBlocks(cell.content, pos)
            if (r) return r
          }
        }
      }
    }
    return null
  }

  /**
   * 查找文档首个 inline（用于光标兜底定位到文档首）。
   * @returns 首个 InlineBox；空文档返回 null
   */
  private findFirstInline(): InlineBox | null {
    if (!this.layout) return null
    for (const page of this.layout.pages) {
      const r = this.findFirstInlineInBlocks(page.blocks)
      if (r) return r
    }
    return null
  }

  /**
   * 在 block 列表中递归查找首个 inline（含表格单元格递归）。
   * @param blocks 块列表
   * @returns 首个 InlineBox；未命中返回 null
   */
  private findFirstInlineInBlocks(blocks: BlockNode[]): InlineBox | null {
    for (const b of blocks) {
      if (b.kind === 'paragraph') {
        for (const line of b.lines) {
          if (line.inlines[0]) return line.inlines[0]
        }
      } else if (b.kind === 'table') {
        for (const row of b.rows) {
          for (const cell of row.cells) {
            const r = this.findFirstInlineInBlocks(cell.content)
            if (r) return r
          }
        }
      }
    }
    return null
  }

  /** 按 position 定位 inline，若属于超链接则返回其 URL（供 Ctrl+点击跳转） */
  private findHyperlinkByPos(pos: IPosition): string | null {
    return this.findInlineByPos(pos)?.hyperlink ?? null
  }

  /**
   * 查找文档末个 inline（用于光标定位到文档尾/全选终点）。
   * @returns 末个 InlineBox；空文档返回 null
   */
  private findLastInline(): InlineBox | null {
    if (!this.layout) return null
    let last: InlineBox | null = null
    for (const page of this.layout.pages) {
      this.findLastInlineInBlocks(page.blocks, (inl) => { last = inl })
    }
    return last
  }

  /**
   * 在 block 列表中递归遍历所有 inline，对每个 inline 调用回调（含表格单元格递归）。
   * @param blocks 块列表
   * @param onInline 每个 inline 的回调
   */
  private findLastInlineInBlocks(blocks: BlockNode[], onInline: (inl: InlineBox) => void): void {
    for (const b of blocks) {
      if (b.kind === 'paragraph') {
        for (const line of b.lines) {
          for (const inl of line.inlines) onInline(inl)
        }
      } else if (b.kind === 'table') {
        for (const row of b.rows) {
          for (const cell of row.cells) {
            this.findLastInlineInBlocks(cell.content, onInline)
          }
        }
      }
    }
  }

  /** 把隐藏输入框放到当前光标位置，以便 IME 弹窗位置正确 */
  focusInput(): void {
    if (!this.range) return
    const pos = this.range.getFocus()
    if (!pos || !this.layout) { this.inputEl.focus(); return }
    const rect = locateCaret(this.layout, pos)
    if (rect) {
      const wrapperWidth = this.wrapper.clientWidth
      const pageOffsetX = Math.max(0, (wrapperWidth - this.layout.pageWidth) / 2) - this.wrapper.scrollLeft
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
        const selRects = computeSelectionRects(this.layout, ordered.start, ordered.end)
        this.renderer.drawSelection(selRects, this.scrollY)
      }
    }
    // 光标
    const pos = this.range.getFocus()
    if (!pos) return
    const rect = locateCaret(this.layout, pos)
    if (rect) this.renderer.drawCaret(rect.x, rect.y, rect.height, this.scrollY, this.caretVisible)
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


  /* -------------------- 悬浮选区工具栏 -------------------- */

  /** 创建悬浮选区工具栏（字体/字号/B/I/U/S/颜色/高亮/对齐/清除格式）并挂载到容器。 */
  private createSelectionToolbar(): void {
    if (!this.onCommand) return
    const tb = document.createElement('div')
    tb.className = 'vervedocs-selection-toolbar'
    Object.assign(tb.style, {
      position: 'absolute',
      display: 'none',
      zIndex: '100',
      background: '#fff',
      borderRadius: '0',
      boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
      padding: '8px 10px',
      gap: '6px',
      alignItems: 'center',
      fontSize: '14px',
      userSelect: 'none',
      whiteSpace: 'nowrap',
      fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif',
    } as CSSStyleDeclaration)

    const fire = (cmd: string, ...args: any[]) => { this.onCommand?.(cmd, ...args) }


    const mkBtn = (icon: string, cmd: string, args: any[] = [], title = ''): HTMLButtonElement => {
      const el = document.createElement('button')
      el.title = title
      el.dataset.cmd = cmd
      el.dataset.args = JSON.stringify(args)
      Object.assign(el.style, {
        border: 'none', background: 'transparent', borderRadius: '4px',
        padding: '4px', cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center', lineHeight: '0',
      } as CSSStyleDeclaration)
      const sp = document.createElement('span')
      sp.className = 'material-icons'
      sp.textContent = icon
      sp.style.cssText = 'font-size:18px;color:#3D4757;'
      el.appendChild(sp)
      el.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation() })
      el.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); fire(cmd, ...args) })
      return el
    }

    const mkSep = (): HTMLSpanElement => {
      const sep = document.createElement('span')
      Object.assign(sep.style, {
        display: 'inline-block', width: '1px', height: '24px',
        background: '#e0e0e0', margin: '0 3px',
      } as CSSStyleDeclaration)
      return sep
    }

    // 字体下拉
    const fontSel = document.createElement('select')
    Object.assign(fontSel.style, {
      border: '1px solid #ddd', borderRadius: '4px', padding: '4px 6px',
      fontSize: '13px', background: '#fff', cursor: 'pointer', maxWidth: '110px',
    } as CSSStyleDeclaration)
    for (const f of FONT_FAMILY_LIST) {
      const opt = document.createElement('option')
      opt.value = FONT_FAMILY_VALUE[f] ?? f; opt.textContent = f
      fontSel.appendChild(opt)
    }
    fontSel.addEventListener('mousedown', (e) => e.stopPropagation())
    fontSel.addEventListener('change', () => fire('executeFont', fontSel.value))
    tb.appendChild(fontSel)

    // 字号下拉
    const sizeSel = document.createElement('select')
    Object.assign(sizeSel.style, {
      border: '1px solid #ddd', borderRadius: '4px', padding: '4px 6px',
      fontSize: '13px', background: '#fff', cursor: 'pointer', width: '68px',
    } as CSSStyleDeclaration)
    for (const s of FONT_SIZE_LIST) {
      const opt = document.createElement('option')
      const pt = FONT_SIZE[s] ?? Number(s)
      opt.value = String(pt); opt.textContent = s
      sizeSel.appendChild(opt)
    }
    sizeSel.value = '14'
    sizeSel.addEventListener('mousedown', (e) => e.stopPropagation())
    sizeSel.addEventListener('change', () => fire('executeSize', Number(sizeSel.value)))
    tb.appendChild(sizeSel)

    tb.appendChild(mkSep())

    // B I U S
    tb.appendChild(mkBtn('format_bold', 'executeBold', [], '加粗'))
    tb.appendChild(mkBtn('format_italic', 'executeItalic', [], '斜体'))
    tb.appendChild(mkBtn('format_underlined', 'executeUnderline', [], '下划线'))
    tb.appendChild(mkBtn('format_strikethrough', 'executeStrikeout', [], '删除线'))

    tb.appendChild(mkSep())

    // 颜色
    const colorBtn = document.createElement('input')
    colorBtn.type = 'color'
    colorBtn.value = '#000000'
    Object.assign(colorBtn.style, {
      width: '32px', height: '28px', border: '1px solid #ddd',
      borderRadius: '4px', cursor: 'pointer', padding: '0', background: 'transparent',
    } as CSSStyleDeclaration)
    colorBtn.title = '字体颜色'
    colorBtn.addEventListener('mousedown', (e) => e.stopPropagation())
    colorBtn.addEventListener('input', () => fire('executeColor', colorBtn.value))
    tb.appendChild(colorBtn)

    // 高亮
    const hlBtn = document.createElement('input')
    hlBtn.type = 'color'
    hlBtn.value = '#ffff00'
    Object.assign(hlBtn.style, {
      width: '32px', height: '28px', border: '1px solid #ddd',
      borderRadius: '4px', cursor: 'pointer', padding: '0', background: 'transparent',
    } as CSSStyleDeclaration)
    hlBtn.title = '高亮颜色'
    hlBtn.addEventListener('mousedown', (e) => e.stopPropagation())
    hlBtn.addEventListener('input', () => fire('executeHighlight', hlBtn.value))
    tb.appendChild(hlBtn)

    tb.appendChild(mkSep())

    // 对齐
    tb.appendChild(mkBtn('format_align_left', 'executeRowFlex', ['left'], '左对齐'))
    tb.appendChild(mkBtn('format_align_center', 'executeRowFlex', ['center'], '居中'))
    tb.appendChild(mkBtn('format_align_right', 'executeRowFlex', ['right'], '右对齐'))
    tb.appendChild(mkBtn('format_align_justify', 'executeRowFlex', ['justify'], '两端对齐'))

    tb.appendChild(mkSep())

    // 清除格式
    tb.appendChild(mkBtn('format_clear', 'executeFormat', [], '清除格式'))

    this.container.appendChild(tb)
    this.selectionToolbar = tb
  }

  /** 更新悬浮选区工具栏：折叠选区/表格内选区时隐藏，否则定位到选区起点上方并回显格式状态。 */
  private updateSelectionToolbar(): void {
    if (!this.selectionToolbar || !this.layout || !this.range) return
    const tb = this.selectionToolbar
    if (this._suppressToolbar) { tb.style.display = 'none'; this._suppressToolbar = false; return }
    if (this.range.isCollapsed()) {
      tb.style.display = 'none'
      return
    }
    const ordered = this.range.getOrdered()
    if (!ordered) { tb.style.display = 'none'; return }
    // 表格内选区不显示段落悬浮工具栏
    if (ordered.start.path.length >= 2 && ordered.start.path[1] === 'trList') {
      tb.style.display = 'none'
      return
    }
    const rect = locateCaret(this.layout, ordered.start)
    if (!rect) { tb.style.display = 'none'; return }
    const wrapperWidth = this.wrapper.clientWidth
    const pageOffsetX = Math.max(0, (wrapperWidth - this.layout.pageWidth) / 2) - this.wrapper.scrollLeft
    const x = Math.round(rect.x + pageOffsetX)
    const y = Math.round(rect.y - this.scrollY) - rect.height - 8
    tb.style.display = 'flex'
    tb.style.left = `${Math.max(4, Math.min(x, this.viewportWidth - tb.offsetWidth - 4))}px`
    tb.style.top = `${Math.max(4, y)}px`

    this.syncToolbarState(tb)
  }

  /** 读取光标所在 run 的格式状态，回显到工具栏控件 */
  private syncToolbarState(tb: HTMLDivElement): void {
    if (!this.range) return
    const pos = this.range.getFocus()
    if (!pos) return
    const node = getByPath(this.document.elements, pos.path)
    if (!node || node.type !== 'text') return
    const run = node as unknown as Record<string, unknown>

    const fontSel = tb.querySelector('select:nth-of-type(1)') as HTMLSelectElement | null
    const sizeSel = tb.querySelector('select:nth-of-type(2)') as HTMLSelectElement | null

    // 回显字体
    if (fontSel) {
      const font = String(run.font ?? '')
      const label = FONT_FAMILY_LABEL[font] ?? font
      for (let i = 0; i < fontSel.options.length; i++) {
        const opt = fontSel.options[i]
        opt.selected = opt.value === font || opt.textContent === label
      }
    }

    // 回显字号
    if (sizeSel) {
      const size = String(run.size ?? '')
      for (let i = 0; i < sizeSel.options.length; i++) {
        if (sizeSel.options[i].value === size) { sizeSel.options[i].selected = true; break }
      }
    }

    // 回显 B/I/U/S 高亮
    const btns = tb.querySelectorAll<HTMLButtonElement>('button[data-cmd]')
    for (let i = 0; i < btns.length; i++) {
      const btn = btns[i]
      const cmd = btn.dataset.cmd
      let active = false
      if (cmd === 'executeBold') active = !!run.bold
      else if (cmd === 'executeItalic') active = !!run.italic
      else if (cmd === 'executeUnderline') active = !!run.underline
      else if (cmd === 'executeStrikeout') active = !!run.strikeout
      else if (cmd === 'executeRowFlex') {
        const args = JSON.parse(btn.dataset.args || '[]')
        active = String(run.rowFlex ?? 'left') === args[0]
      }
      btn.style.background = active ? '#e8eaf6' : 'transparent'
    }
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
    this.engine.updateOptions(this.toLayoutOptions())
    this.renderer.invalidateAll()
    this.reformatAndRender()
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
   * 设置页边距并重排+重渲染。
   * @param margins [top, right, bottom, left]
   */
  setPaperMargins(margins: [number, number, number, number]): void {
    this.options.pageMargins = margins
    this.engine.updateOptions(this.toLayoutOptions())
    this.renderer.invalidateAll()
    this.reformatAndRender()
  }

  /**
   * 设置页面尺寸（宽/高）并重排+重渲染。
   * @param width 页面宽度
   * @param height 页面高度
   */
  setPageSize(width: number, height: number): void {
    this.options.pageWidth = width
    this.options.pageHeight = height
    this.engine.updateOptions(this.toLayoutOptions())
    this.renderer.invalidateAll()
    this.reformatAndRender()
  }

  /**
   * 获取当前编辑器选项。
   * @returns 编辑器选项
   */
  getOptions(): IEditorOption { return this.options }

  /**
   * 批量更新编辑器选项并重排+重渲染。
   * @param patch 选项补丁
   */
  updateOptions(patch: Partial<IEditorOption>): void {
    Object.assign(this.options, patch)
    this.engine.updateOptions(this.toLayoutOptions())
    this.renderer.invalidateAll()
    this.reformatAndRender()
  }

  /** 打印：打开新窗口写入 canvas 图片 */
  print(): void {
    const canvases = this.scroller.querySelectorAll('canvas')
    if (canvases.length === 0) return
    const w = window.open('', '_blank', 'width=900,height=700')
    if (!w) return
    w.document.write('<style>body{margin:0}@media print{.page{page-break-after:always}}</style>')
    canvases.forEach(c => {
      const img = (c as HTMLCanvasElement).toDataURL('image/png')
      w.document.write(`<img class="page" src="${img}" style="width:100%"/>`)
    })
    w.document.close()
    w.focus()
    w.print()
  }

  /**
   * 获取所有页面的缩略图图片（data URL）。
   * 利用渲染器的 renderPageThumbnail 方法，为每页创建离屏 canvas 绘制内容并输出 PNG data URL。
   * @returns 缩略图 data URL 数组，每个元素对应一页
   */
  getPageThumbnails(): string[] {
    if (!this.layout) return []
    const images: string[] = []
    for (const page of this.layout.pages) {
      const dataUrl = this.renderer.renderPageThumbnail(page, 0.7)
      if (dataUrl) images.push(dataUrl)
    }
    return images
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

  /** 供 commands 组件获取当前活动区域元素列表 */
  getElementList(): import('@vervedoc/docx-editor-schema').IElement[] {
    return this.getActiveDocument().elements
  }

  /** 供 commands 组件访问 RangeManager（路径接口） */
  getRange(): RangeManager | null {
    return this.range ?? null
  }

  /** 供批注/修订组件查询：新架构下容器宽度由 Draw 管理，外部不应修改 */
  isNewLayoutEngine(): boolean { return true }

  /** 获取当前编辑区域 */
  getZone(): Zone { return this.zone }

  /** 切换编辑区域（main/header/footer） */
  setZone(zone: Zone): void {
    if (this.zone === zone) return
    this.zone = zone
    this.onZoneChange?.(zone)
    this.scheduleRender()
  }

  /** 获取当前活动区域的文档（zone=header/footer 时 elements 指向对应区域） */
  getActiveDocument(): IDocxDocumentMeta {
    if (this.zone === 'header' && this.document.sections?.header) {
      return { ...this.document, elements: this.document.sections.header }
    }
    if (this.zone === 'footer' && this.document.sections?.footer) {
      return { ...this.document, elements: this.document.sections.footer }
    }
    return this.document
  }

  /** 将修改后的活动文档写回对应区域并触发重渲染 */
  applyActiveDocument(doc: IDocxDocumentMeta): void {
    if (this.zone === 'header') {
      this.document.sections = this.document.sections || {}
      this.document.sections.header = doc.elements
    } else if (this.zone === 'footer') {
      this.document.sections = this.document.sections || {}
      this.document.sections.footer = doc.elements
    } else {
      this.document.elements = doc.elements
    }
    this.reformatAndRender()
  }

  /** 设置当前高亮的批注/修订组 ID（鼠标悬浮气泡时调用） */
  setActiveGroup(groupId: string | null): void {
    this.renderer.updateVisualOptions({ activeGroupId: groupId })
    this.renderer.invalidateAll()
    this.scheduleRender()
  }

  /**
   * 遍历当前 layout，收集每个 groupId 所对应的锚点坐标（文档绝对坐标）。
   * 返回 Map<groupId, { startX, startY, endX, endY, lineHeight, glyphHeight, startGlyphTop, endGlyphTop }>
   * glyphHeight / startGlyphTop / endGlyphTop 用于按字形实际高度绘制竖线（而非行高）
   */
  getGroupAnchorMap(): Map<string, { startX: number; startY: number; endX: number; endY: number; lineHeight: number; glyphHeight: number; startGlyphTop: number; endGlyphTop: number }> {
    const result = new Map<string, { startX: number; startY: number; endX: number; endY: number; lineHeight: number; glyphHeight: number; startGlyphTop: number; endGlyphTop: number }>()
    if (!this.layout) return result
    for (const page of this.layout.pages) {
      this.collectGroupAnchors(page.blocks, page.contentRect.x, page.contentRect.y, result)
    }
    return result
  }

  /**
   * 遍历当前 layout，收集每个 revisionId 所对应的锚点坐标（文档绝对坐标）。
   * 返回 Map<revisionId, { startX, startY, endX, endY, lineHeight, glyphHeight, startGlyphTop, endGlyphTop }>
   */
  getRevisionAnchorMap(): Map<string, { startX: number; startY: number; endX: number; endY: number; lineHeight: number; glyphHeight: number; startGlyphTop: number; endGlyphTop: number }> {
    const result = new Map<string, { startX: number; startY: number; endX: number; endY: number; lineHeight: number; glyphHeight: number; startGlyphTop: number; endGlyphTop: number }>()
    if (!this.layout) return result
    for (const page of this.layout.pages) {
      this.collectRevisionAnchors(page.blocks, page.contentRect.x, page.contentRect.y, result)
    }
    return result
  }

  private collectGroupAnchors(
    blocks: BlockNode[],
    originX: number,
    originY: number,
    result: Map<string, { startX: number; startY: number; endX: number; endY: number; lineHeight: number; glyphHeight: number; startGlyphTop: number; endGlyphTop: number }>
  ): void {
    for (const b of blocks) {
      if (b.kind === 'table') {
        for (const row of b.rows) {
          for (const cell of row.cells) {
            const cx = originX + b.rect.x + cell.rect.x + cell.contentPaddingLeft
            const cy = originY + b.rect.y + cell.rect.y + cell.contentPaddingTop + cell.verticalOffset
            this.collectGroupAnchors(cell.content, cx, cy, result)
          }
        }
        continue
      }
      if (b.kind !== 'paragraph') continue
      const bx = originX + b.rect.x
      const by = originY + b.rect.y
      for (const line of b.lines) {
        for (const inl of line.inlines) {
          if (!inl.groupIds?.length) continue
          const absX = bx + inl.x
          const absY = by + line.y
          const absEndX = absX + inl.width
          const absEndY = absY + line.height
          const glyphHeight = inl.size * 1.15
          const absGlyphTop = absY + line.baseline - inl.size * 0.875
          for (const gid of inl.groupIds) {
            const existing = result.get(gid)
            if (!existing) {
              result.set(gid, { startX: absX, startY: absY, endX: absEndX, endY: absEndY, lineHeight: line.height, glyphHeight, startGlyphTop: absGlyphTop, endGlyphTop: absGlyphTop })
            } else {
              if (absY < existing.startY || (absY === existing.startY && absX < existing.startX)) {
                existing.startX = absX
                existing.startY = absY
                existing.startGlyphTop = absGlyphTop
              }
              if (absEndY > existing.endY || (absEndY === existing.endY && absEndX > existing.endX)) {
                existing.endX = absEndX
                existing.endY = absEndY
                existing.endGlyphTop = absGlyphTop
              }
            }
          }
        }
      }
    }
  }

  private collectRevisionAnchors(
    blocks: BlockNode[],
    originX: number,
    originY: number,
    result: Map<string, { startX: number; startY: number; endX: number; endY: number; lineHeight: number; glyphHeight: number; startGlyphTop: number; endGlyphTop: number }>
  ): void {
    for (const b of blocks) {
      if (b.kind === 'table') {
        for (const row of b.rows) {
          for (const cell of row.cells) {
            const cx = originX + b.rect.x + cell.rect.x + cell.contentPaddingLeft
            const cy = originY + b.rect.y + cell.rect.y + cell.contentPaddingTop + cell.verticalOffset
            this.collectRevisionAnchors(cell.content, cx, cy, result)
          }
        }
        continue
      }
      if (b.kind !== 'paragraph') continue
      const bx = originX + b.rect.x
      const by = originY + b.rect.y
      for (const line of b.lines) {
        for (const inl of line.inlines) {
          const revisionId = (inl.run as any)?.revisionId
          if (!revisionId) continue
          const absX = bx + inl.x
          const absY = by + line.y
          const absEndX = absX + inl.width
          const absEndY = absY + line.height
          const glyphHeight = inl.size * 1.15
          const absGlyphTop = absY + line.baseline - inl.size * 0.875
          const existing = result.get(revisionId)
          if (!existing) {
            result.set(revisionId, {
              startX: absX,
              startY: absY,
              endX: absEndX,
              endY: absEndY,
              lineHeight: line.height,
              glyphHeight,
              startGlyphTop: absGlyphTop,
              endGlyphTop: absGlyphTop
            })
          } else {
            if (absY < existing.startY || (absY === existing.startY && absX < existing.startX)) {
              existing.startX = absX
              existing.startY = absY
              existing.startGlyphTop = absGlyphTop
            }
            if (absEndY > existing.endY || (absEndY === existing.endY && absEndX > existing.endX)) {
              existing.endX = absEndX
              existing.endY = absEndY
              existing.endGlyphTop = absGlyphTop
            }
          }
        }
      }
    }
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
    const wrapperWidth = this.wrapper.clientWidth
    const scrollLeft = this.wrapper.scrollLeft
    const pageOffsetX = Math.max(0, (wrapperWidth - this.layout.pageWidth) / 2) - scrollLeft
    const x = clientX - rect.left - pageOffsetX
    const y = clientY - rect.top + this.scrollY
    return hitTest(this.layout, x, y)
  }

  /** 销毁视图：解绑事件、断开 ResizeObserver、取消 RAF/定时器、销毁各 widget、移除 DOM。 */
  destroy(): void {
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
    this.paragraphWidget?.destroy()
    this.headerFooterWidget?.destroy()
    this.rulerWidget?.destroy()

    if (this.inputEl && this.inputEl.parentElement === this.container) {
      this.container.removeChild(this.inputEl)
    }
    if (this.selectionToolbar && this.selectionToolbar.parentElement === this.container) {
      this.container.removeChild(this.selectionToolbar)
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
    formatElementTree(this.document.elements, { editorOptions: this.options })
    const headerElements = this.document.sections?.header
    const footerElements = this.document.sections?.footer
    if (headerElements?.length) formatElementTree(headerElements, { editorOptions: this.options })
    if (footerElements?.length) formatElementTree(footerElements, { editorOptions: this.options })
    const layout = this.engine.layout(this.document.elements, headerElements, footerElements)

    // 复用旧 block id：对签名一致者继承 id，避免 bitmap 无谓重建
    const nextSignatureToId = new Map<string, number>()
    const dirty: number[] = []
    const walk = (blocks: BlockNode[]) => {
      for (const b of blocks) {
        if (b.kind === 'paragraph' || b.kind === 'image' || b.kind === 'pageBreak' || b.kind === 'separator') {
          const sig = signBlock(b)
          const reusedId = this.lastSignatureToId.get(sig)
          if (reusedId != null) {
            b.id = reusedId
          } else {
            dirty.push(b.id)
          }
          nextSignatureToId.set(sig, b.id)
        } else if (b.kind === 'table') {
          for (const row of b.rows) {
            for (const cell of row.cells) walk(cell.content)
          }
        }
      }
    }
    for (const page of layout.pages) {
      walk(page.blocks)
      if (page.headerBlocks) walk(page.headerBlocks)
      if (page.footerBlocks) walk(page.footerBlocks)
    }

    this.lastSignatureToId = nextSignatureToId
    this.layout = layout
    this.listener?.emit('page-count-change', layout.pages.length)

    // scroller 撑起文档总高（页面居中通过 CSS margin:0 auto）
    this.scroller.style.height = `${layout.totalHeight}px`
    this.scroller.style.width = `${layout.pageWidth}px`
    this.scroller.style.margin = '0 auto'

    if (dirty.length > 0) this.renderer.markDirty(dirty)
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

  /** 计算居中偏移并同步给 renderer */
  private updateVisualLayout(): void {
    if (!this.layout) return
    const wrapperWidth = this.wrapper.clientWidth
    const scrollLeft = this.wrapper.scrollLeft
    // scroller 已经通过 margin:0 auto 居中，页在其内 x=0
    // canvas 覆盖 container 视口，页面绘制的 x 需要 = (wrapperWidth - pageWidth)/2 - scrollLeft
    const pageOffsetX = Math.max(0, (wrapperWidth - this.layout.pageWidth) / 2) - scrollLeft
    this.renderer.updateVisualOptions({
      pageOffsetX,
      pageMargins: (this.options.pageMargins as [number, number, number, number]) ?? [100, 120, 100, 120],
      groupColors: (this.options as unknown as { group?: { groupColors?: Record<string, import('@vervedoc/docx-editor-schema').IGroupColor> } }).group?.groupColors
    })
    this.rulerWidget?.update()
  }

  /** 容器 resize 处理：更新视口尺寸、同步 renderer、刷新视觉布局并调度重渲染。 */
  private onResize = (): void => {
    const rect = this.container.getBoundingClientRect()
    this.viewportWidth = rect.width
    this.viewportHeight = rect.height
    this.renderer.setSize(this.viewportWidth, this.viewportHeight)
    this.updateVisualLayout()
    this.scheduleRender()
  }

  /** 滚动处理：更新 scrollY、刷新视觉布局与各 widget、发射当前页码变化事件。 */
  private onScroll = (): void => {
    this.scrollY = this.wrapper.scrollTop
    this.updateVisualLayout()
    // 滚动渲染跳过 afterRender（避免每帧生成缩略图等重操作），widget 更新在 RAF 内完成
    this.scheduleRender(true)
    this.tableWidget?.update()
    this.imageWidget?.update()
    this.paragraphWidget?.update()
    // 发射当前页码变化
    if (this.layout && this.listener) {
      const midY = this.scrollY + this.wrapper.clientHeight / 2
      for (const page of this.layout.pages) {
        if (midY >= page.rect.y && midY < page.rect.y + page.rect.height) {
          this.listener.emit('current-page-no-change', page.index)
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
      if (skipAfterRender) this._pendingSkipAfterRender = true
      return
    }
    this._pendingSkipAfterRender = skipAfterRender
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null
      if (!this.layout) return
      this.renderer.render(this.layout, this.scrollY, this.viewportHeight)
      this.renderCaretIfAny()
      this.updateSelectionToolbar()
      if (!this._pendingSkipAfterRender) {
        this.afterRender?.()
      }
      this._pendingSkipAfterRender = false
    })
  }
}

/* -------------------- 块签名（用于跨帧复用 bitmap） -------------------- */

/**
 * 计算块的签名（用于跨帧复用 bitmap）：按块类型拼接关键字段为字符串。
 * @param b 块
 * @returns 块签名字符串
 */
function signBlock(b: BlockNode): string {
  if (b.kind === 'paragraph') return signParagraph(b)
  if (b.kind === 'image') {
    const img = b.block as unknown as { value?: string; rotate?: number; imgDisplay?: string }
    return `img|${img.value ?? ''}|${b.rect.width}x${b.rect.height}|r${img.rotate ?? 0}|d${img.imgDisplay ?? 'block'}`
  }
  if (b.kind === 'pageBreak') return `pb|${b.parentPath.join('.')}|${b.indexInParent}`
  if (b.kind === 'separator') return `sep|${b.parentPath.join('.')}|${b.indexInParent}|${b.rect.width}x${b.rect.height}`
  return `unk`
}

/**
 * 计算段落块签名：拼接段落属性 + 各 inline 文本/字体/样式 + 项目符号 + 环绕图片关键字段。
 * @param b 段落块
 * @returns 段落签名字符串
 */
function signParagraph(b: ParagraphBlock): string {
  const attrs = b.block ?? (b.lines[0]?.inlines[0]?.run) ?? null
  const a = attrs as unknown as Record<string, unknown> | null
  const paraKey = a
    ? `${a.rowFlex ?? ''}|${a.paragraphStyleId ?? ''}|${a.lineHeight ?? ''}|${a.lineHeightRule ?? ''}|${a.paragraphFirstLineIndent ?? ''}|${a.paragraphIndentLeft ?? ''}|${a.paragraphIndentRight ?? ''}|${a.indentHanging ?? ''}|${a.paragraphSpacingBefore ?? ''}|${a.paragraphSpacingAfter ?? ''}`
    : ''
  const runsKey: string[] = []
  for (const line of b.lines) {
    for (const inl of line.inlines) {
      runsKey.push(`${inl.text}#${inl.font}|${inl.size}|${inl.bold ? 1 : 0}|${inl.italic ? 1 : 0}|${inl.color}|${inl.bgColor ?? ''}|${inl.strikeout ? 1 : 0}|${inl.underline ? 1 : 0}|ls=${inl.letterSpacing ?? 0}`)
    }
  }
  const bulletKey = b.bulletText
    ? `~b:${b.bulletKind ?? ''}|${b.bulletText ?? ''}|${b.bulletFont ?? ''}|${b.bulletSize ?? ''}|${b.bulletColor ?? ''}|${b.bulletBold ? 1 : 0}|bx=${b.bulletX ?? ''}`
    : ''
  const si = b.surroundImage
  const surroundKey = si
    ? `~si:${(si.block as unknown as { value?: string }).value ?? ''}|${si.rect.width}x${si.rect.height}|r${(si.block as unknown as { rotate?: number }).rotate ?? 0}`
    : ''
  return `p|${b.paragraphKind}|w=${Math.round(b.rect.width)}|${paraKey}|${runsKey.join('~')}${bulletKey}${surroundKey}`
}
