/**
 * VerveDocs Core —— DocxEditor
 *
 * 全新构造，零兼容：只接受 IDocxDocumentMeta。
 */

import type { IDocxDocumentMeta, IEditorOption, EditorPlugin, PluginHost } from '@vervedoc/docx-editor-schema'
import { cloneTree, formatElementTree, mergeOption } from '@vervedoc/docx-editor-schema'
import { EventBus, Listener, RangeManager } from '@vervedoc/docx-editor-state'
import { Draw } from '@vervedoc/docx-editor-view'
import { CommandChain } from './command-chain'
import { Command, CommandAdapt } from '@vervedoc/docx-editor-transform'
import { Search, BlockParticle, DateParticle, LaTexParticle, ControlComponent } from '@vervedoc/docx-editor-commands'
import { HistoryComponent } from '@vervedoc/docx-editor-history'
import { ShortcutHandler } from './shortcut'
import { WorkerManager } from './workers/worker-manager'

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
  /** 已注册插件表（按 name 索引） */
  private plugins = new Map<string, EditorPlugin>()
  /** 插件命令注册表（命令名 → 处理函数），责任链中插件命令 handler 查此表分发 */
  private pluginCommands = new Map<string, (...args: any[]) => any>()
  /** 命令分发责任链 */
  private commandChain = new CommandChain()
  /** 插件宿主契约实例，构造完成后赋值，use(plugin) 时注入给插件 */
  private pluginHost: PluginHost | null = null
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
      onCommand: (command: string, ...args: any[]) => this.commandChain.dispatch(command, ...args),
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

    // 构建命令分发责任链：事件重定向 → 插件命令 → 剪贴板 → 核心命令兜底
    this.commandChain
      .use((cmd, _args, next) => {
        if (cmd === 'requestInsertImage') { this.listener.emit('requestInsertImage'); return }
        if (cmd === 'requestInsertHyperlink') { this.listener.emit('requestInsertHyperlink'); return }
        if (cmd === 'requestInsertFormula') { this.listener.emit('requestInsertFormula'); return }
        return next()
      })
      .use((cmd, args, next) => {
        const pluginCmd = this.pluginCommands.get(cmd)
        if (typeof pluginCmd === 'function') return pluginCmd(...args)
        return next()
      })
      .use((cmd, _args, next) => {
        if (cmd === 'executeCopy') {
          const text = this.command.executeCopy()
          if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {})
          return
        }
        if (cmd === 'executeCut') {
          const text = this.command.executeCut()
          if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {})
          return
        }
        if (cmd === 'executePaste') {
          if (navigator.clipboard) {
            navigator.clipboard.readText().then(text => this.command.executePaste(text)).catch(() => {})
          }
          return
        }
        return next()
      })
      .use((cmd, args, _next) => {
        if (!this.command) return undefined
        const fn = (this.command as unknown as Record<string, ((...a: any[]) => any) | undefined>)[cmd]
        if (typeof fn === 'function') return fn.call(this.command, ...args)
        return undefined
      })

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


    // 构造插件宿主契约（桥接视图与文档查询接口），供 use(plugin) 时注入
    // ⚠️ 该对象是 PluginHost 的唯一合法实现，外部严禁替换。
    const drawRef = this.draw
    this.pluginHost = {
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
      executeDeleteGroup: (groupId: string) => { this.command?.executeDeleteGroup(groupId) },
      executeLocationGroup: (groupId: string) => { this.command?.executeLocationGroup(groupId) },
      executeUpdateOptions: (opts: any) => {
        Object.assign(editorOptions, opts)
        drawRef.setDocument(drawRef.getDocument())
      },
      spliceElementList: (list: any[], idx: number, deleteCount: number) => { list.splice(idx, deleteCount) },
      renderDraw: () => { drawRef.setDocument(drawRef.getDocument()) },
      setActiveGroup: (groupId: string | null) => { drawRef.setActiveGroup(groupId) },
      getEventBus: () => this.eventBus,
      executeInsertChart: (payload: any) => { this.command?.executeInsertChart(payload) },
      executeUpdateChart: (id: string, patch: Record<string, unknown>) => { this.command?.executeUpdateChart(id, patch) }
    }

    // 订阅 transform 的文档替换事件，通知插件同步数据（反转原 setCommentHandler 耦合）
    this.listener.on('documentSet', (d: IDocxDocumentMeta) => {
      for (const plugin of this.plugins.values()) {
        plugin.hooks?.onSetDocument?.(d)
      }
    })

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
   * Draw 只 emit `after-render` 事件，不直接调用插件/block/control/worker，
   * 已注册插件的 `hooks.afterRender` 在此遍历调用，核心组件联动也在此集中订阅。
   */
  private wireAfterRenderHooks(): void {
    this.listener.lifecycle.afterRenderListener(() => {
      for (const plugin of this.plugins.values()) {
        plugin.hooks?.afterRender?.()
      }
      this.renderEmbedBlocks()
      this.block?.clear()
      this.control?.clear()
      this.worker?.updateElements(this.draw.getDocument().elements)
      const images = this.draw.getPageThumbnails()
      this.listener.emit('thumbnailChange', images)
    })
  }

  /**
   * 渲染嵌入块（iframe）：遍历 layout 中 kind === 'block' 的节点，
   * 调 BlockParticle.render 挂载/复用 DOM。chart 已由 canvas drawImage 渲染，不在此处理。
   */
  private renderEmbedBlocks(): void {
    if (!this.block) return
    const layout = this.draw.getLayout()
    if (!layout) return
    for (const page of layout.pages) {
      for (const b of page.blocks) {
        if (b.kind === 'block') {
          const x = page.contentRect.x + b.rect.x
          const y = page.contentRect.y + b.rect.y
          this.block.render(page.index, b.block, x, y)
        }
      }
    }
  }

  /**
   * 获取当前文档元数据
   * @returns 文档元数据（含 elements/sections/comments 等）
   */
  getDocument(): IDocxDocumentMeta { return this.draw.getDocument() }

  /**
   * 设置文档元数据，重置 zone 到 main 并通知插件同步数据
   * @param doc 文档元数据（必须包含 elements 数组）
   * @throws {TypeError} doc 非 IDocxDocumentMeta 时抛出
   */
  setDocument(doc: IDocxDocumentMeta): void {
    if (!doc || !Array.isArray(doc.elements)) {
      throw new TypeError('[DocxEditor.setDocument] 需要 IDocxDocumentMeta')
    }
    // 重置 zone 到 main，避免在 header/footer 区域时数据写入错误位置
    this.draw.setZone('main')
    this.draw.setDocument(doc)
    // 通知插件同步数据（批注/修订等）
    for (const plugin of this.plugins.values()) {
      plugin.hooks?.onSetDocument?.(doc)
    }
    // 通知 Worker 文档数据更新
    this.worker.updateElements(doc.elements)
  }

  // ============================================================
  //   插件注册 —— 可选功能（批注/修订等）的唯一合法入口
  // ============================================================

  /**
   * 注册插件。core 在注册时自动注入 PluginHost、登记命令表；
   * 若文档已加载，立即触发 `hooks.onSetDocument` 以同步初始数据。
   *
   * 核心引擎（view/transform）保持内置硬编码，不通过此方法注册。
   *
   * @param plugin 满足 EditorPlugin 契约的插件实例
   */
  use(plugin: EditorPlugin): void {
    if (this.plugins.has(plugin.name)) {
      console.warn(`[DocxEditor] 插件 "${plugin.name}" 已注册，忽略重复注册`)
      return
    }
    this.plugins.set(plugin.name, plugin)
    if (this.pluginHost) plugin.install(this.pluginHost)
    if (plugin.commands) {
      for (const [name, fn] of Object.entries(plugin.commands)) {
        this.pluginCommands.set(name, fn)
      }
    }
    // 若文档已加载，通知插件同步初始数据
    if (plugin.hooks?.onSetDocument) {
      plugin.hooks.onSetDocument(this.draw.getDocument())
    }
  }

  /**
   * 获取已注册插件实例，供宿主层调用插件特有方法。
   *
   * @param name 插件名称
   * @returns 插件实例，未注册时返回 undefined
   */
  getPlugin<T extends EditorPlugin>(name: string): T | undefined {
    return this.plugins.get(name) as T | undefined
  }

  /**
   * 分发命令到责任链（供宿主层触发插件命令）
   */
  dispatchCommand(command: string, ...args: any[]): any {
    return this.commandChain.dispatch(command, ...args)
  }

  /**
   * 销毁编辑器实例，释放所有资源（DOM/事件监听/定时器/组件/插件）
   */
  destroy(): void {
    for (const plugin of this.plugins.values()) {
      plugin.destroy?.()
    }
    this.block?.destroy()
    this.date?.clearDatePicker()
    this.control?.destroy()
    this.history?.destroy()
    this.draw.destroy()
    this.worker.destroy()
    this.listener = new Listener()
    this.eventBus.clear()
    this.range.clear()
  }
}

export default DocxEditor
