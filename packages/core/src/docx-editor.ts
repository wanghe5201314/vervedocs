/**
 * VerveDocs Core —— DocxEditor
 *
 * 全新构造，零兼容：只接受 IDocxDocumentMeta。
 */

import type { IDocxDocumentMeta, IEditorOption } from '@vervedoc/docx-editor-schema'
import { cloneTree, formatElementTree, mergeOption } from '@vervedoc/docx-editor-schema'
import { EventBus, Listener, RangeManager } from '@vervedoc/docx-editor-state'
import { Draw } from '@vervedoc/docx-editor-view'
import { Command, CommandAdapt } from '@vervedoc/docx-editor-transform'
import { CommentComponent, RevisionComponent } from '@vervedoc/docx-editor-comment'
import type { CommentHost, DocxCommentMeta, RevisionCallbacks, CommentCallbacks } from '@vervedoc/docx-editor-comment'
import { Search, BlockParticle, DateParticle, LaTexParticle, ControlComponent } from '@vervedoc/docx-editor-commands'
import { HistoryComponent } from '@vervedoc/docx-editor-history'
import { ShortcutHandler } from './shortcut'
import { WorkerManager } from './workers/worker-manager'

export type { DocxCommentMeta, RevisionCallbacks, CommentCallbacks }

/**
 * 批注组件的只读视图（对外暴露给协作层 / 业务层使用）。
 *
 * 通过该视图**只能**读取批注数据、触发一次重渲染，无法访问 / 替换内部 `CommentHost`。
 * 若要注入回调，请使用 {@link DocxEditor.setCommentCallbacks}。
 */
export interface CommentView {
  /** 获取当前批注列表 */
  getComments(): any[]
  /** 覆盖批注列表（远端同步等场景） */
  setComments(comments: any[]): void
  /** 触发气泡重新渲染 */
  render(): void
}

/**
 * 修订组件的只读视图。
 */
export interface RevisionView {
  /** 获取当前修订列表（公开信息） */
  getRevisions(): Array<{
    id: string; type: 'insert' | 'delete' | 'format'; author: string; date: string; content: string
  }>
  /** 触发气泡重新计算与渲染 */
  update(): void
  /** 接受指定修订 */
  acceptRevision(id: string): void
  /** 拒绝指定修订 */
  rejectRevision(id: string): void
  /** 接受所有修订 */
  acceptAllRevisions(): void
  /** 拒绝所有修订 */
  rejectAllRevisions(): void
}

/**
 * DocxEditor 文档编辑器主类
 *
 * 全新构造，零兼容：只接受 IDocxDocumentMeta。
 * 组合 Listener / EventBus / RangeManager / Draw / Command / Comment / Revision / Search 等组件。
 */
export class DocxEditor {
  /** 事件监听器（content/range/page/catalog 等命名空间） */
  public listener: Listener
  /** 全局事件总线（hyperlinkMenuClick / chartClick 等右键菜单事件） */
  public eventBus: EventBus
  /** 选区管理器（anchor/focus 位置与折叠/展开） */
  public range: RangeManager
  /** 视图绘制引擎（布局 + Canvas 渲染 + 交互） */
  public draw: Draw
  /** 命令入口（executeXxx 系列方法） */
  public command: Command
  /**
   * 批注组件（**内部装配**，禁止外部直接调用其 `install` 方法覆盖宿主）。
   *
   * 外部消费者请使用：
   * - {@link DocxEditor.setCommentCallbacks} 注入回调
   * - {@link DocxEditor.getCommentView} 获取只读视图
   */
  public readonly comment: CommentComponent
  /**
   * 修订组件（**内部装配**，禁止外部直接调用其 `install` 方法覆盖宿主）。
   *
   * 外部消费者请使用：
   * - {@link DocxEditor.setRevisionCallbacks} 注入回调
   * - {@link DocxEditor.getRevisionView} 获取只读视图
   */
  public readonly revision: RevisionComponent
  /** 搜索组件 */
  public search: Search
  /** 块级粒子组件（图片/视频/音频/图表等块级元素） */
  public block: BlockParticle
  /** 日期粒子组件 */
  public date: DateParticle
  /** LaTeX 公式粒子组件 */
  public laTex: LaTexParticle
  /** 控件组件（checkbox/radio/dropdown 等） */
  public control: ControlComponent
  /** 历史管理组件（撤销/重做） */
  public history: HistoryComponent

  /** Worker 管理器（后台计算目录/搜索等） */
  public worker: WorkerManager


  /**
   * 构造 DocxEditor 实例
   * @param container 编辑器挂载的 DOM 容器（必须为 HTMLDivElement）
   * @param document 文档元数据（必须包含 elements 数组，不再兼容 IElement[] / IEditorData）
   * @param options 编辑器选项（字体/字号/页边距等，缺省时自动合并默认值）
   * @throws {TypeError} container 非 HTMLDivElement 或 document 非 IDocxDocumentMeta 时抛出
   */
  constructor(
    container: HTMLDivElement,
    document: IDocxDocumentMeta,
    options: IEditorOption = {}
  ) {
    if (!container || !(container instanceof HTMLDivElement)) {
      throw new TypeError('[DocxEditor] container 必须是 HTMLDivElement')
    }
    if (!document || typeof document !== 'object' || !Array.isArray(document.elements)) {
      throw new TypeError(
        '[DocxEditor] document 必须是 IDocxDocumentMeta，且 elements 为数组。不再兼容 IElement[] / IEditorData 形态。'
      )
    }


    const editorOptions = mergeOption(options)
    const doc: IDocxDocumentMeta = cloneTree(document)

    formatElementTree(doc.elements, {
      editorOptions,
      styles: doc.styles,
      numbering: doc.numbering
    })
    if (doc.sections?.header) formatElementTree(doc.sections.header, { editorOptions, styles: doc.styles, numbering: doc.numbering })
    if (doc.sections?.footer) formatElementTree(doc.sections.footer, { editorOptions, styles: doc.styles, numbering: doc.numbering })
    if (doc.sections?.footnotes) formatElementTree(doc.sections.footnotes, { editorOptions, styles: doc.styles, numbering: doc.numbering })
    if (doc.sections?.endnotes) formatElementTree(doc.sections.endnotes, { editorOptions, styles: doc.styles, numbering: doc.numbering })

    this.listener = new Listener()
    this.eventBus = new EventBus()
    this.range = new RangeManager(this.listener)

    this.comment = new CommentComponent()
    this.revision = new RevisionComponent()

    // 渲染后联动通过 after-render 事件订阅，Draw 只 emit 事件不直接耦合各组件
    this.wireAfterRenderHooks()

    // 先声明适配器占位，以便在 Draw 构造时可以引用（onInput 回调需要 CommandAdapt）
    let adapt: CommandAdapt | null = null

    const shortcut = new ShortcutHandler({
      getDraw: () => this.draw,
      getCommand: () => this.command,
      getRange: () => this.range,
      getAdapt: () => adapt
    })

    this.draw = new Draw(container, editorOptions, {
      document: doc,
      listener: this.listener,
      eventBus: this.eventBus,

      rangeManager: this.range,
      onInput: (text: string) => {
        adapt?.insertText(text)
      },
      onKeyDown: shortcut.handle,
      afterRender: () => {
        this.listener.emit('afterRender')
      },
      onCommand: (command: string, ...args: any[]) => {
        if (command === 'requestInsertImage') { this.listener.emit('requestInsertImage'); return }
        if (command === 'requestInsertHyperlink') { this.listener.emit('requestInsertHyperlink'); return }
        if (command === 'requestInsertFormula') { this.listener.emit('requestInsertFormula'); return }
        if (command === 'requestInsertComment') { this.comment.addComment(); return }

        if (command === 'executeCopy') {
          const text = this.command.executeCopy()
          if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {})
          return
        }
        if (command === 'executeCut') {
          const text = this.command.executeCut()
          if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {})
          return
        }
        if (command === 'executePaste') {
          if (navigator.clipboard) {
            navigator.clipboard.readText().then(text => this.command.executePaste(text)).catch(() => {})
          }
          return
        }
        if (!this.command) return
        const fn = (this.command as unknown as Record<string, ((...a: any[]) => any) | undefined>)[command]
        if (typeof fn === 'function') return fn.call(this.command, ...args)
      },
      onZoneChange: (zone) => {
        this.listener.emit('zoneChange', zone)
      }
    })

    adapt = new CommandAdapt(
      {
        getDocument: () => this.draw.getDocument(),
        setDocument: (d: IDocxDocumentMeta) => this.draw.setDocument(d),
        getLayout: () => this.draw.getLayout(),
        getScroller: () => this.draw.getScroller(),
        getActiveDocument: () => {
          const doc = this.draw.getDocument()
          const zone = this.draw.getZone()
          if (zone === 'header' && doc.sections?.header) {
            return { ...doc, elements: doc.sections.header }
          }
          if (zone === 'footer' && doc.sections?.footer) {
            return { ...doc, elements: doc.sections.footer }
          }
          return doc
        },
        applyActiveDocument: (d: IDocxDocumentMeta) => {
          const zone = this.draw.getZone()
          if (zone === 'header' || zone === 'footer') {
            const doc = this.draw.getDocument()
            if (!doc.sections) doc.sections = {}
            if (zone === 'header') doc.sections.header = d.elements
            else doc.sections.footer = d.elements
            this.draw.setDocument(doc)
          } else {
            this.draw.setDocument(d)
          }
        },
        setScale: (s: number) => this.draw.setScale(s),
        setPageSize: (w: number, h: number) => this.draw.setPageSize(w, h),
        setRulerVisible: (visible: boolean) => this.draw.setRulerVisible(visible),
        setPaperMargins: (margins: [number, number, number, number]) => this.draw.setPaperMargins(margins),
        getOptions: () => this.draw.getOptions(),
        updateOptions: (patch) => this.draw.updateOptions(patch),
        getZone: () => this.draw.getZone(),
        setZone: (zone) => this.draw.setZone(zone),
        setZoneWithCaret: (zone) => this.draw.setZoneWithCaret(zone),
        print: () => this.draw.print(),
        getPageThumbnails: () => this.draw.getPageThumbnails(),
        scrollPositionIntoView: (pos) => this.draw.scrollPositionIntoView(pos)
      },
      this.range,
      this.listener
    )
    this.command = new Command(adapt)

    // 历史管理：创建 HistoryManager 注入 CommandAdapt
    this.history = new HistoryComponent()
    const historyManager = this.history.install({
      maxRecordCount: Number(editorOptions.historyMaxRecordCount ?? 50),
      coalesceMs: 300
    })
    adapt.setHistoryManager(historyManager)
    adapt.pushInitialHistory()

    // commands 组件实例化（基于 verve 树模型）
    this.search = new Search(this.draw)
    this.block = new BlockParticle(this.draw)
    this.date = new DateParticle(this.draw)
    this.laTex = new LaTexParticle(this.draw)
    this.control = new ControlComponent()
    this.control.install(this.draw)


    // 构造批注/修订组件所需的宿主契约（桥接视图与文档查询接口）
    // ⚠️ 该对象是 CommentHost 的唯一合法实现，外部严禁替换。
    const drawRef = this.draw
    const commentHost: CommentHost = {
      getContainer: () => drawRef.getScroller(),
      getPositionList: () => null,
      getRevisionAnchor: (revisionId: string) => {
        const anchorMap = drawRef.getRevisionAnchorMap()
        return anchorMap.get(revisionId) || null
      },
      getDrawWidth: () => Number(editorOptions.pageWidth ?? 794),
      getDrawHeight: () => Number(editorOptions.pageHeight ?? 1123),
      getPageGap: () => Number((editorOptions as any).pageGap ?? 24),
      getOptions: () => editorOptions,
      getElementList: () => drawRef.getDocument().elements,
      getGroupContext: (groupId: string) => {
        const anchorMap = drawRef.getGroupAnchorMap()
        const anchor = anchorMap.get(groupId)
        if (!anchor) return null
        return {
          isTable: false,
          index: -1,
          startIndex: -1,
          endIndex: -1,
          _anchor: anchor
        }
      },
      executeSetGroup: () => this.command?.executeSetGroup() ?? null,
      executeDeleteGroup: () => {},
      executeLocationGroup: () => {},
      executeUpdateOptions: (opts: any) => {
        Object.assign(editorOptions, opts)
        drawRef.setDocument(drawRef.getDocument())
      },
      spliceElementList: (list: any[], idx: number, deleteCount: number) => { list.splice(idx, deleteCount) },
      renderDraw: () => { drawRef.setDocument(drawRef.getDocument()) },
      setActiveGroup: (groupId: string | null) => { drawRef.setActiveGroup(groupId) },
    }
    this.comment.install(commentHost)
    this.comment.setEventBus(this.eventBus)
    this.revision.install(commentHost)
    adapt.setCommentHandler(this.comment)

    // 从文档中自动加载批注数据
    if (doc.comments && doc.comments.length > 0) {
      this.comment.buildCommentsFromMetas(doc.comments)
    }

    // 初始化 Worker，推送初始文档数据
    this.worker = new WorkerManager()
    // Worker 计算出目录后，通过 listener 推送给 UI
    this.worker.onTocResult((result) => {
      this.listener.emit('tocChange', result.toc)
    })
    this.worker.updateElements(doc.elements)

    // 鼠标点击 -> hit + setC8 + focus 隐藏输入框
    // 注意：Draw 内 mousedown 已处理 hit，这里不再重复绑定
  }

  /**
   * 订阅 after-render 生命周期事件，集中管理渲染后各组件的联动。
   *
   * Draw 只 emit `after-render` 事件，不直接调用 comment/revision/block/control/worker，
   * 各组件的联动逻辑在此集中订阅，新增组件只需在此追加订阅即可，无需修改 Draw 回调签名。
   */
  private wireAfterRenderHooks(): void {
    this.listener.lifecycle.afterRenderListener(() => {
      this.comment.render()
      this.revision.update()
      this.block?.clear()
      this.control?.clear()
      this.worker?.updateElements(this.draw.getDocument().elements)
      const images = this.draw.getPageThumbnails()
      this.listener.emit('thumbnailChange', images)
    })
  }

  /**
   * 获取当前文档元数据
   * @returns 文档元数据（含 elements/sections/comments 等）
   */
  getDocument(): IDocxDocumentMeta { return this.draw.getDocument() }

  /**
   * 设置文档元数据，重置 zone 到 main 并同步批注
   * @param doc 文档元数据（必须包含 elements 数组）
   * @throws {TypeError} doc 非 IDocxDocumentMeta 时抛出
   */
  setDocument(doc: IDocxDocumentMeta): void {
    if (!doc || !Array.isArray(doc.elements)) {
      throw new TypeError('[DocxEditor.setDocument] 需要 IDocxDocumentMeta')
    }
    // 重置 zone 到 main，避免在 header/footer 区域时数据写入错误位置
    this.draw.setZone('main')
    // 同步批注数据
    if (doc.comments && doc.comments.length > 0) {
      this.comment.buildCommentsFromMetas(doc.comments)
    } else {
      this.comment.buildCommentsFromMetas([])
    }
    this.draw.setDocument(doc)
    // 通知 Worker 文档数据更新
    this.worker.updateElements(doc.elements)
  }

  // ============================================================
  //   批注 / 修订 —— 唯一合法的外部注入入口
  // ============================================================

  /**
   * 追加 / 替换批注回调集合。
   *
   * 该方法是外部（协作层、业务层）为批注注入行为的**唯一合法通道**。
   * 它不会触碰 core 内部装配的 `CommentHost`，从而避免出现气泡消失等回归问题。
   *
   * @param callbacks 批注回调集合（onSave / onDelete / onReply / onResolve / onCancel / onRequestSave）
   */
  setCommentCallbacks(callbacks: CommentCallbacks): void {
    this.comment.setCallbacks(callbacks)
  }

  /**
   * 追加 / 替换修订回调集合。
   *
   * 与 {@link DocxEditor.setCommentCallbacks} 同理，是外部为修订注入行为的唯一合法通道。
   *
   * @param callbacks 修订回调集合（onAccept / onReject 等）
   */
  setRevisionCallbacks(callbacks: RevisionCallbacks): void {
    this.revision.setCallbacks(callbacks)
  }

  /**
   * 获取批注组件的只读视图。
   *
   * 用于协作层进行数据同步 / 触发重渲染，**不暴露** `_host` 与 `install`，
   * 从而保护 core 内部装配。
   */
  getCommentView(): CommentView {
    const comp = this.comment
    return {
      getComments: () => comp.getComments(),
      setComments: (list: any[]) => comp.setComments(list),
      render: () => comp.render()
    }
  }

  /**
   * 获取修订组件的只读视图。
   */
  getRevisionView(): RevisionView {
    const comp = this.revision
    return {
      getRevisions: () => comp.getRevisions(),
      update: () => comp.update(),
      acceptRevision: (id: string) => comp.acceptRevision(id),
      rejectRevision: (id: string) => comp.rejectRevision(id),
      acceptAllRevisions: () => comp.acceptAllRevisions(),
      rejectAllRevisions: () => comp.rejectAllRevisions()
    }
  }

  /**
   * 销毁编辑器实例，释放所有资源（DOM/事件监听/定时器/组件）
   */
  destroy(): void {
    this.block?.destroy()
    this.date?.clearDatePicker()
    this.control?.destroy()
    this.history?.destroy()
    this.comment.destroy()
    this.revision.destroy()
    this.draw.destroy()
    this.worker.destroy()
    this.listener = new Listener()
    this.eventBus.clear()
    this.range.clear()
  }
}

export default DocxEditor
