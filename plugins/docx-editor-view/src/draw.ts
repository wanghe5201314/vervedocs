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

import type { IDocxDocument, IEditorOption, IPosition } from '@vervedoc/docx-editor-schema'
import { formatElementTree } from '@vervedoc/docx-editor-schema'
import type { Listener, RangeManager, EventBus } from '@vervedoc/docx-editor-state'
import { LayoutEngine, type LayoutOptions } from './layout-engine'
import type { DocumentLayout, BlockNode, ParagraphBlock } from './layout-types'
import { CanvasRenderer } from './canvas-renderer'
import { hitTest } from './hit-test'
import { locateCaret } from './caret-rect'

export interface DrawDeps {
  document: IDocxDocument
  listener?: Listener
  eventBus?: EventBus
  rangeManager?: RangeManager
  /** 键盘/输入时触发的回调（由 core 装配） */
  onInput?: (text: string) => void
  onKeyDown?: (e: KeyboardEvent) => void
}

export class Draw {
  private container: HTMLDivElement
  private wrapper: HTMLDivElement
  private scroller: HTMLDivElement
  private canvasHost: HTMLDivElement
  private renderer: CanvasRenderer
  private engine: LayoutEngine
  private layout: DocumentLayout | null = null

  private document: IDocxDocument
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

  private onInput?: (text: string) => void
  private onKeyDown?: (e: KeyboardEvent) => void

  constructor(container: HTMLDivElement, options: IEditorOption, deps: DrawDeps) {
    this.container = container
    this.options = options
    this.document = deps.document
    this.range = deps.rangeManager
    this.onInput = deps.onInput
    this.onKeyDown = deps.onKeyDown
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
      showMarginRuler: (options as unknown as { showMarginRuler?: boolean }).showMarginRuler ?? true
    })
    this.engine = new LayoutEngine(this.toLayoutOptions())

    this.wrapper.addEventListener('scroll', this.onScroll, { passive: true })
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(() => this.onResize())
      this.ro.observe(container)
    }
    this.canvasHost.addEventListener('vervedocs:image-loaded', () => this.scheduleRender())

    // Range 变化时触发光标重绘
    if (deps.listener && this.range) {
      deps.listener.on('rangeChange', () => {
        this.caretVisible = true
        this.renderCaretIfAny()
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
  }

  /* -------------------- 输入 / 键盘事件 -------------------- */

  private bindEditingEvents(): void {
    // 让 wrapper 可接收指针事件（canvasHost 为 pointer-events:none）
    this.wrapper.addEventListener('mousedown', this.onMouseDown)
    this.wrapper.addEventListener('dblclick', this.onDblClick)

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
    const pos = this.hit(e.clientX, e.clientY)
    console.log('[EDIT] mousedown', { clientX: e.clientX, clientY: e.clientY, pos })
    if (pos) {
      this.range.setCaret(pos)
      this.focusInput()
      this.caretVisible = true
      this.renderCaretIfAny()
    } else {
      // 未命中：仍要 focus 隐藏输入框，避免键盘输入被浏览器丢弃
      this.inputEl.focus()
    }
  }

  private onDblClick = (_e: MouseEvent): void => {
    // 预留：页眉/页脚双击进入编辑区
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
    const pos = this.range.getFocus()
    if (!pos) { this.renderer.clearOverlay(); return }
    const rect = locateCaret(this.layout, pos)
    console.log('[EDIT] caret', { pos, rect })
    if (!rect) { this.renderer.clearOverlay(); return }
    this.renderer.drawCaret(rect.x, rect.y, rect.height, this.scrollY, this.caretVisible)
  }


  /* -------------------- 对外 API -------------------- */

  setDocument(doc: IDocxDocument): void {
    this.document = doc
    this.reformatAndRender()
  }

  getDocument(): IDocxDocument { return this.document }

  setScale(scale: number): void {
    this.options.scale = scale
    this.engine.updateOptions(this.toLayoutOptions())
    this.renderer.invalidateAll()
    this.reformatAndRender()
  }

  getLayout(): DocumentLayout | null { return this.layout }

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
    this.wrapper.removeEventListener('dblclick', this.onDblClick)
    this.ro?.disconnect()
    if (this.rafId != null) cancelAnimationFrame(this.rafId)
    if (this.caretTimer != null) { clearInterval(this.caretTimer); this.caretTimer = null }
    if (this.inputEl && this.inputEl.parentElement === this.container) {
      this.container.removeChild(this.inputEl)
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
    const layout = this.engine.layout(this.document.elements)

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
    for (const page of layout.pages) walk(page.blocks)

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
      pageMargins: (this.options.pageMargins as [number, number, number, number]) ?? [100, 120, 100, 120]
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
  }

  private scheduleRender(): void {
    if (this.rafId != null) return
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null
      if (!this.layout) return
      this.renderer.render(this.layout, this.scrollY, this.viewportHeight)
      this.renderCaretIfAny()
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
      runsKey.push(`${inl.text}#${inl.font}|${inl.size}|${inl.bold ? 1 : 0}|${inl.italic ? 1 : 0}|${inl.color}|${inl.bgColor ?? ''}|${inl.strikeout ? 1 : 0}|${inl.underline ? 1 : 0}`)
    }
  }
  const bulletKey = b.paragraphKind === 'list'
    ? `~b:${b.bulletKind ?? ''}|${b.bulletText ?? ''}|${b.bulletFont ?? ''}|${b.bulletSize ?? ''}|${b.bulletColor ?? ''}|${b.bulletBold ? 1 : 0}`
    : ''
  return `p|${b.paragraphKind}|w=${Math.round(b.rect.width)}|${paraKey}|${runsKey.join('~')}${bulletKey}`
}
