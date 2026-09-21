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
import { ThumbnailManager } from './workers/thumbnail-manager'

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
  private adapt: CommandAdapt
  private destroyed = false
  private clipboardEpoch = 0

  private clipboardGuard(): () => boolean {
    const doc = this.draw.getDocument()
    const epoch = this.clipboardEpoch
    const zone = this.draw.getZone()
    const range = JSON.stringify(this.range.getRange())
    return () => !this.destroyed && epoch === this.clipboardEpoch &&
      doc === this.draw.getDocument() && zone === this.draw.getZone() &&
      range === JSON.stringify(this.range.getRange())
  }
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
  private thumbnailWorker: ThumbnailManager
  private thumbnailSources: string[] = []


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
    if (doc.sections !== undefined && !Array.isArray(doc.sections)) {
      throw new TypeError('旧 sections 内容区必须显式迁移到 contentZones')
    }
    for (const elements of [doc.header, doc.footer, ...Object.values(doc.contentZones ?? {}), ...Object.values(doc.headerFooterParts ?? {})]) {
      if (elements) formatElementTree(elements, { editorOptions, styles: doc.styles, numbering: doc.numbering })
    }

    this.listener = new Listener()
    this.thumbnailWorker = new ThumbnailManager(images => {
      if (!this.destroyed) this.listener.emit('thumbnailChange', images)
    })
    this.listener.on('thumbnailAppearanceChange', () => this.refreshThumbnailAppearance())
    for (const event of ['contentChange', 'documentSet'] as const) {
      this.listener.on(event, () => this.thumbnailWorker.invalidate())
    }
    this.eventBus = new EventBus()
    this.range = new RangeManager(this.listener)
    for (const event of ['contentChange', 'documentSet', 'rangeChange', 'zoneChange', 'abilityChange'] as const) {
      this.listener.on(event, () => { this.clipboardEpoch++ })
    }


    // 渲染后联动通过 after-render 事件订阅，Draw 只 emit 事件不直接耦合各组件
    this.wireAfterRenderHooks()

    // 先声明适配器占位，以便在 Draw 构造时可以引用（onInput 回调需要 CommandAdapt）
    let adapt: CommandAdapt | null = null

    const shortcut = new ShortcutHandler({
      getDraw: () => this.draw,
      getCommand: () => this.command,
      dispatchCommand: (command, ...args) => this.dispatchCommand(command, ...args),
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
        getActiveDocument: () => this.draw.getActiveDocument(),
        applyActiveDocument: (d: IDocxDocumentMeta) => {
          if (this.draw.getZone() === 'main') this.draw.setDocument(d)
          else this.draw.applyActiveDocument(d)
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
    this.adapt = adapt
    this.command = new Command(adapt)

    // 构建命令分发责任链：事件重定向 → 插件命令 → 剪贴板 → 核心命令兜底
    this.commandChain
      .use((cmd, _args, next) => {
        if (cmd === 'requestInsertImage') { this.listener.emit('requestInsertImage'); return }
        if (cmd === 'requestInsertHyperlink') { this.listener.emit('requestInsertHyperlink'); return }
        if (cmd === 'requestInsertFormula') { this.listener.emit('requestInsertFormula'); return }
        if (cmd === 'executeTableProperty') { this.listener.emit('requestTableProperties'); return }
        return next()
      })
      .use((cmd, args, next) => {
        const pluginCmd = this.pluginCommands.get(cmd)
        if (typeof pluginCmd === 'function') return pluginCmd(...args)
        return next()
      })
      .use((cmd, args, next) => {
        if (cmd === 'executeCopy' || cmd === 'executeCut') {
          if (cmd === 'executeCut' && !this.command.getIsCanInput()) return
          const text = this.command.executeCopy()
          if (!navigator.clipboard) return
          const isCurrent = this.clipboardGuard()
          const fragment = adapt.copyFragment()
          const mime = 'web application/x-vervedocs+json'
          const write = fragment && typeof ClipboardItem !== 'undefined' && ClipboardItem.supports?.(mime)
            ? navigator.clipboard.write([new ClipboardItem({
              'text/plain': new Blob([text], { type: 'text/plain' }),
              [mime]: new Blob([JSON.stringify(fragment)], { type: 'application/x-vervedocs+json' })
            })])
            : navigator.clipboard.writeText(text)
          return write.then(() => {
            if (cmd === 'executeCut' && isCurrent()) this.command.executeCut()
            return text
          }).catch(() => {})
        }
        if (['executePaste', 'executePastePlain', 'executePasteNoFormat'].includes(cmd)) {
          if (!this.command.getIsCanInput()) return
          if (args.length > 0) return next()
          if (!navigator.clipboard) return
          const isCurrent = this.clipboardGuard()
          return (async () => {
            const mime = 'web application/x-vervedocs+json'
            if (cmd === 'executePaste' && navigator.clipboard.read) {
              const items = await navigator.clipboard.read()
              for (const item of items) if (item.types.includes(mime)) {
                const fragment = JSON.parse(await (await item.getType(mime)).text())
                if (isCurrent()) adapt.pasteFragment(fragment)
                return
              }
              for (const item of items) if (item.types.includes('text/plain')) {
                const text = await (await item.getType('text/plain')).text()
                if (isCurrent()) this.command.executePaste(text)
                return
              }
            } else {
              const text = await navigator.clipboard.readText()
              if (isCurrent()) this.command.executePasteNoFormat(text)
            }
          })().catch(() => {})
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
      getDocument: () => drawRef.getDocument(),
      commitTransaction: (action) => this.adapt.commitPluginTransaction(action),
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
      executeSetGroup: (update) => this.adapt.setGroup(update),
      executeDeleteGroup: (groupId: string) => { this.command?.executeDeleteGroup(groupId) },
      executeLocationGroup: (groupId: string) => { this.command?.executeLocationGroup(groupId) },
      executeUpdateOptions: (opts: any) => {
        this.adapt.updateOptions(opts)
      },
      setActiveGroup: (groupId: string | null) => { drawRef.setActiveGroup(groupId) },
      setActiveRevision: (revisionId, color) => { drawRef.setActiveRevision(revisionId, color) },
      getEventBus: () => this.eventBus,
      setChartRenderer: (renderer) => drawRef.setChartRenderer(renderer),
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
    this.listener.on('contentChange', () => {
      this.worker.updateElements(this.draw.getDocument().elements)
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
      if (this.listener.hasListeners('thumbnailChange')) {
        const images = this.draw.getPageThumbnails()
        const sources = this.draw.getThumbnailForegrounds()
        if (sources.length !== this.thumbnailSources.length || sources.some((value, i) => value !== this.thumbnailSources[i])) {
          // Publish new content immediately; background composition follows asynchronously.
          this.listener.emit('thumbnailChange', images)
          this.thumbnailSources = sources
        }
        this.refreshThumbnailAppearance(sources)
      }
    })
  }

  private refreshThumbnailAppearance(sources?: string[]): void {
    if (this.destroyed || !this.draw || !this.listener.hasListeners('thumbnailChange')) return
    const options = this.draw.getOptions()
    const background = options.background as { color?: string } | undefined
    this.thumbnailWorker.update(sources ?? this.draw.getThumbnailForegrounds(),
      options.eyeCare ? '#C7EDCC' : background?.color || '#ffffff')
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
    this.adapt.replaceDocument(doc, true)
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
    this.destroyed = true
    for (const plugin of this.plugins.values()) {
      plugin.destroy?.()
    }
    this.block?.destroy()
    this.date?.clearDatePicker()
    this.control?.destroy()
    this.history?.destroy()
    this.draw.destroy()
    this.thumbnailWorker.destroy()
    this.worker.destroy()
    this.listener = new Listener()
    this.eventBus.clear()
    this.range.clear()
  }
}

export default DocxEditor
