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

import type { IDocxDocumentMeta, IEditorOption, IPosition } from '@vervedoc/docx-editor-schema'
import { formatElementTree, isSamePath, getByPath, FONT_FAMILY_LIST, FONT_FAMILY_VALUE, FONT_FAMILY_LABEL, FONT_SIZE, FONT_SIZE_LIST } from '@vervedoc/docx-editor-schema'
import type { Listener, RangeManager, EventBus } from '@vervedoc/docx-editor-state'
import { LayoutEngine, type LayoutOptions } from './layout-engine'
import type { DocumentLayout, BlockNode, ParagraphBlock, InlineBox, LineBox } from './layout-types'
import { CanvasRenderer } from './canvas-renderer'
import { hitTest } from './hit-test'
import { locateCaret, computeSelectionRects } from './caret-rect'
import { TableWidget } from './widgets/table-widget'
import { ImageWidget } from './widgets/image-widget'
import { HeaderFooterWidget, type Zone } from './widgets/header-footer-widget'

export interface DrawDeps {
  document: IDocxDocumentMeta
  listener?: Listener
  eventBus?: EventBus
  rangeManager?: RangeManager
  /** 键盘/输入时触发的回调（由 core 装配） */
  onInput?: (text: string) => void
  onKeyDown?: (e: KeyboardEvent) => void
  /** 每次 RAF 渲染完成后调用（用于驱动批注/修订 overlay 更新） */
  afterRender?: () => void
  /** 悬浮工具栏命令回调（由 core 装配，转发到 Command） */
  onCommand?: (command: string, ...args: any[]) => void
  /** zone 变化回调（由 core 装配，用于驱动 UI 标签显示） */
  onZoneChange?: (zone: Zone) => void
}

export class Draw {
  private container: HTMLDivElement
  private wrapper: HTMLDivElement
  private scroller: HTMLDivElement
  private canvasHost: HTMLDivElement
  private renderer: CanvasRenderer
  private engine: LayoutEngine
  private layout: DocumentLayout | null = null

  private document: IDocxDocumentMeta
  private options: IEditorOption
  private range?: RangeManager

  private scrollY = 0
  private viewportHeight = 0
  private viewportWidth = 0
  private rafId: number | null = null

  private ro?: ResizeObserver

  /** 上一帧的签名 -> block id，用于复用位图缓存 */
  private lastSignatureToId = new Map<string, number>()

  /** 隐藏 textarea：作为输入焦点与 IME 组合的宿主 */
  private inputEl!: HTMLTextAreaElement
  private isComposing = false

  /** 光标闪烁 */
  private caretVisible = true
  private caretTimer: number | null = null

  /** 鼠标拖拽选区状态 */
  private isDragging = false
  private dragAnchor: IPosition | null = null
  private dragPendingPos: IPosition | null = null
  private dragRafId: number | null = null

  private onInput?: (text: string) => void
  private onKeyDown?: (e: KeyboardEvent) => void
  private afterRender?: () => void
  private onCommand?: (command: string, ...args: any[]) => void

  /** 悬浮选区工具栏 */
  private selectionToolbar: HTMLDivElement | null = null

  /** 当前编辑区域：正文 / 页眉 / 页脚 */
  private zone: Zone = 'main'
  /** zone 变化回调（由 core 装配，用于驱动 UI 标签显示） */
  private onZoneChange?: (zone: Zone) => void

  /** 表格交互 widget（手柄 + 右键菜单） */
  private tableWidget: TableWidget | null = null
  /** 图片交互 widget（选中 + 缩放手柄 + 右键菜单） */
  private imageWidget: ImageWidget | null = null
  /** 页眉页脚交互 widget */
  private headerFooterWidget: HeaderFooterWidget | null = null

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
    void deps.listener; void deps.eventBus

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
    this.wrapper.style.background = '#f0f2f5'

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
      deps.listener.on('rangeChange', () => {
        this.caretVisible = true
        this.renderCaretIfAny()
        this.updateSelectionToolbar()
        this.tableWidget?.update()
        this.imageWidget?.update()
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
      focusInput: () => this.focusInput()
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
      hit: (clientX: number, clientY: number) => this.hit(clientX, clientY),
      focusInput: () => this.focusInput()
    })
    this.imageWidget.create()
  }

  /* -------------------- 输入 / 键盘事件 -------------------- */

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

  private onMouseDown = (e: MouseEvent): void => {
    if (!this.range) return
    // 阻止 mousedown 默认行为抢走隐藏输入框的焦点
    e.preventDefault()

    // 图片选中/缩放
    if (this.imageWidget?.handleMouseDown(e)) return

    // 双击页眉/页脚区域：切换编辑区域
    if (this.headerFooterWidget?.handleMouseDown(e)) return

    const pos = this.hit(e.clientX, e.clientY)
    if (!pos) { this.inputEl.focus(); return }
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

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isDragging || !this.range || !this.dragAnchor || !this.layout) return
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

  private onMouseUp = (): void => {
    this.isDragging = false
    this.dragAnchor = null
    this.dragPendingPos = null
    if (this.dragRafId != null) { cancelAnimationFrame(this.dragRafId); this.dragRafId = null }
  }

  private finishMouseSelect(): void {
    this.focusInput()
    this.caretVisible = true
    this.renderCaretIfAny()
  }

  /* -------------------- 右键菜单 -------------------- */

  private onContextMenu = (e: MouseEvent): void => {
    e.preventDefault()
    if (this.imageWidget?.showContextMenu(e.clientX, e.clientY)) return
    this.tableWidget?.showContextMenu(e.clientX, e.clientY)
  }


  /* -------------------- 双击选词 / 三击选段 -------------------- */

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

  private findInlineByPos(pos: IPosition): InlineBox | null {
    if (!this.layout) return null
    for (const page of this.layout.pages) {
      const r = this.findInlineInBlocks(page.blocks, pos)
      if (r) return r
    }
    return null
  }

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

  private findParagraphByPos(pos: IPosition): ParagraphBlock | null {
    if (!this.layout) return null
    for (const page of this.layout.pages) {
      const r = this.findParagraphInBlocks(page.blocks, pos)
      if (r) return r
    }
    return null
  }

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

  private findLineByPos(pos: IPosition): LineBox | null {
    if (!this.layout) return null
    for (const page of this.layout.pages) {
      const r = this.findLineInBlocks(page.blocks, pos)
      if (r) return r
    }
    return null
  }

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

  private findFirstInline(): InlineBox | null {
    if (!this.layout) return null
    for (const page of this.layout.pages) {
      const r = this.findFirstInlineInBlocks(page.blocks)
      if (r) return r
    }
    return null
  }

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

  private findLastInline(): InlineBox | null {
    if (!this.layout) return null
    let last: InlineBox | null = null
    for (const page of this.layout.pages) {
      this.findLastInlineInBlocks(page.blocks, (inl) => { last = inl })
    }
    return last
  }

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

  private startCaretBlink(): void {
    if (this.caretTimer != null) return
    this.caretTimer = window.setInterval(() => {
      this.caretVisible = !this.caretVisible
      this.renderCaretIfAny()
    }, 530) as unknown as number
  }

  private renderCaretIfAny(): void {
    if (!this.layout || !this.range) return
    this.renderer.clearOverlay()
    // zone 边框（页眉/页脚编辑时）
    this.headerFooterWidget?.renderBorder()
    // 选区高亮（非折叠时）
    const ordered = this.range.getOrdered()
    if (ordered && !this.range.isCollapsed()) {
      const selRects = computeSelectionRects(this.layout, ordered.start, ordered.end)

      this.renderer.drawSelection(selRects, this.scrollY)
    }
    // 光标
    const pos = this.range.getFocus()
    if (!pos) return
    const rect = locateCaret(this.layout, pos)
    if (rect) this.renderer.drawCaret(rect.x, rect.y, rect.height, this.scrollY, this.caretVisible)
  }


  /* -------------------- 悬浮选区工具栏 -------------------- */

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

    const SVG_BOLD = '<svg width="20" height="20" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M8.131 6.9c2.035 0 2.569-.9 2.569-1.869 0-.968-.64-1.831-2.623-1.831H5.2v3.7h2.931zm.524 5.9c2.045 0 2.545-1.305 2.545-2.3 0-.985-.506-2.4-2.81-2.4H5.2v4.7h3.455zM4 2h4.71c2.367 0 3.19 1.583 3.19 3s-.325 1.852-1.1 2.5c1.2.5 1.569 1.379 1.6 3 .03 1.606-.586 3.5-3.769 3.5H4V2z" fill="#3D4757" fill-rule="evenodd"/></svg>'
    const SVG_ITALIC = '<svg width="20" height="20" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M10.017 3L8.08 13H9v1H6v-1h1.182L9 3H8V2h3v1h-.983z" fill="#3D4757"/></svg>'
    const SVG_UNDERLINE = '<svg width="20" height="20" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M5 2v6a3 3 0 106 0V2h1v6a4 4 0 11-8 0V2h1zM4 13h8v1H4z" fill="#3D4757"/></svg>'
    const SVG_STRIKE = '<svg width="20" height="20" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><g fill="#3D4757" fill-rule="evenodd"><path d="M10.42 7.903H6.692a9.182 9.182 0 01-.41-.172 5.54 5.54 0 01-.814-.447 2.955 2.955 0 01-.655-.595 2.728 2.728 0 01-.44-.777 2.877 2.877 0 01-.162-1.006c0-.472.094-.888.282-1.25.188-.36.453-.663.793-.907s.747-.43 1.22-.558A5.97 5.97 0 018.063 2c.504 0 .95.049 1.337.147.387.097.725.23 1.013.398.287.169.53.365.73.59a3.337 3.337 0 01.772 1.486c.03.13.054.255.073.379h-1.276a2.393 2.393 0 00-.22-.615 2.315 2.315 0 00-.59-.724 2.467 2.467 0 00-.834-.44 3.376 3.376 0 00-1.005-.146 4.69 4.69 0 00-.958.097 2.77 2.77 0 00-.839.314 1.765 1.765 0 00-.597.566c-.152.233-.229.518-.229.854 0 .348.086.642.258.884.171.241.401.449.689.622.287.174.615.323.983.448s.749.247 1.142.367c.31.097.62.196.934.297a8.439 8.439 0 01.973.38zm1.376 1c.175.217.315.466.418.746.105.285.158.612.158.98 0 .554-.104 1.041-.312 1.462-.207.42-.496.772-.867 1.054-.37.282-.81.495-1.32.64A6.12 6.12 0 018.205 14c-.543 0-1.071-.09-1.586-.273a4.44 4.44 0 01-1.374-.773 3.873 3.873 0 01-.97-1.217 3.695 3.695 0 01-.395-1.612h1.27c.028.407.122.78.282 1.12a2.835 2.835 0 001.581 1.465c.363.138.76.207 1.192.207.387 0 .758-.042 1.112-.126a2.85 2.85 0 00.938-.399 2.01 2.01 0 00.647-.708c.16-.29.241-.642.241-1.054 0-.337-.087-.623-.261-.86a2.333 2.333 0 00-.69-.61 4.651 4.651 0 00-.495-.257h2.099z"/><path d="M3 7h10v1H3z"/></g></svg>'
    const SVG_LEFT = '<svg width="20" height="20" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M2 13h12v1H2zm0-3h8v1H2zm0-3h12v1H2zm0-6h12v1H2zm0 3h8v1H2z" fill="#3d4757" fill-rule="evenodd"/></svg>'
    const SVG_CENTER = '<svg width="20" height="20" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M2 13h12v1H2v-1zm2-3h8v1H4v-1zM2 7h12v1H2V7zm0-6h12v1H2V1zm2 3h8v1H4V4z" fill="#3D4757" fill-rule="evenodd"/></svg>'
    const SVG_RIGHT = '<svg width="20" height="20" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M2 13h12v1H2v-1zm4-3h8v1H6v-1zM2 7h12v1H2V7zm0-6h12v1H2V1zm4 3h8v1H6V4z" fill="#3D4757" fill-rule="evenodd"/></svg>'
    const SVG_JUSTIFY = '<svg width="20" height="20" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M2 3h12v1H2zM2 6h12v1H2zM2 9h12v1H2zM2 12h12v1H2z" fill="#3D4757"/></svg>'
    const SVG_FORMAT = '<svg width="20" height="20" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><g fill="#3D4757" fill-rule="evenodd"><path d="M8.213 13H6.8l6.636-6.636-4.243-4.243-7.07 7.071L5.928 13H4.515L1.06 9.546a.5.5 0 010-.707L8.839 1.06a.5.5 0 01.707 0l4.95 4.95a.5.5 0 010 .707L8.213 13z" fill-rule="nonzero"/><path d="M4.536 6.364l4.95 4.95-.707.707-4.95-4.95zM4.521 13h10.03v1H5.496z"/></g></svg>'

    const mkBtn = (svg: string, cmd: string, args: any[] = [], title = ''): HTMLButtonElement => {
      const el = document.createElement('button')
      el.innerHTML = svg
      el.title = title
      el.dataset.cmd = cmd
      el.dataset.args = JSON.stringify(args)
      Object.assign(el.style, {
        border: 'none', background: 'transparent', borderRadius: '4px',
        padding: '4px', cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center', lineHeight: '0',
      } as CSSStyleDeclaration)
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
    tb.appendChild(mkBtn(SVG_BOLD, 'executeBold', [], '加粗'))
    tb.appendChild(mkBtn(SVG_ITALIC, 'executeItalic', [], '斜体'))
    tb.appendChild(mkBtn(SVG_UNDERLINE, 'executeUnderline', [], '下划线'))
    tb.appendChild(mkBtn(SVG_STRIKE, 'executeStrikeout', [], '删除线'))

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
    tb.appendChild(mkBtn(SVG_LEFT, 'executeRowFlex', ['left'], '左对齐'))
    tb.appendChild(mkBtn(SVG_CENTER, 'executeRowFlex', ['center'], '居中'))
    tb.appendChild(mkBtn(SVG_RIGHT, 'executeRowFlex', ['right'], '右对齐'))
    tb.appendChild(mkBtn(SVG_JUSTIFY, 'executeRowFlex', ['justify'], '两端对齐'))

    tb.appendChild(mkSep())

    // 清除格式
    tb.appendChild(mkBtn(SVG_FORMAT, 'executeFormat', [], '清除格式'))

    this.container.appendChild(tb)
    this.selectionToolbar = tb
  }

  private updateSelectionToolbar(): void {
    if (!this.selectionToolbar || !this.layout || !this.range) return
    const tb = this.selectionToolbar
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

  setDocument(doc: IDocxDocumentMeta): void {
    this.document = doc
    this.reformatAndRender()
  }

  getDocument(): IDocxDocumentMeta { return this.document }

  setScale(scale: number): void {
    this.options.scale = scale
    this.engine.updateOptions(this.toLayoutOptions())
    this.renderer.invalidateAll()
    this.reformatAndRender()
  }

  setPageSize(width: number, height: number): void {
    this.options.pageWidth = width
    this.options.pageHeight = height
    this.engine.updateOptions(this.toLayoutOptions())
    this.renderer.invalidateAll()
    this.reformatAndRender()
  }

  getOptions(): IEditorOption { return this.options }

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

  getLayout(): DocumentLayout | null { return this.layout }

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
    this.headerFooterWidget?.destroy()

    if (this.inputEl && this.inputEl.parentElement === this.container) {
      this.container.removeChild(this.inputEl)
    }
    if (this.selectionToolbar && this.selectionToolbar.parentElement === this.container) {
      this.container.removeChild(this.selectionToolbar)
    }
    this.container.removeChild(this.wrapper)
  }

  /* -------------------- 内部 -------------------- */

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

  private reformatAndRender(): void {
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
        if (b.kind === 'paragraph' || b.kind === 'image' || b.kind === 'pageBreak') {
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

    // scroller 撑起文档总高（页面居中通过 CSS margin:0 auto）
    this.scroller.style.height = `${layout.totalHeight}px`
    this.scroller.style.width = `${layout.pageWidth}px`
    this.scroller.style.margin = '0 auto'

    if (dirty.length > 0) this.renderer.markDirty(dirty)
    this.updateVisualLayout()
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
  }

  private onResize = (): void => {
    const rect = this.container.getBoundingClientRect()
    this.viewportWidth = rect.width
    this.viewportHeight = rect.height
    this.renderer.setSize(this.viewportWidth, this.viewportHeight)
    this.updateVisualLayout()
    this.scheduleRender()
  }

  private onScroll = (): void => {
    this.scrollY = this.wrapper.scrollTop
    this.updateVisualLayout()
    this.scheduleRender()
    this.updateSelectionToolbar()
    this.tableWidget?.update()
    this.imageWidget?.update()
  }

  private scheduleRender(): void {
    if (this.rafId != null) return
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null
      if (!this.layout) return
      this.renderer.render(this.layout, this.scrollY, this.viewportHeight)
      this.renderCaretIfAny()
      this.updateSelectionToolbar()
      this.afterRender?.()
    })
  }
}

/* -------------------- 块签名（用于跨帧复用 bitmap） -------------------- */

function signBlock(b: BlockNode): string {
  if (b.kind === 'paragraph') return signParagraph(b)
  if (b.kind === 'image') return `img|${(b.block as unknown as { value?: string }).value ?? ''}|${b.rect.width}x${b.rect.height}`
  if (b.kind === 'pageBreak') return `pb|${b.parentPath.join('.')}|${b.indexInParent}`
  return `unk`
}

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
  return `p|${b.paragraphKind}|w=${Math.round(b.rect.width)}|${paraKey}|${runsKey.join('~')}${bulletKey}`
}
