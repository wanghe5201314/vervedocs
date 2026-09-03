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
import type { DocxCommentMeta, RevisionCallbacks, CommentCallbacks } from '@vervedoc/docx-editor-comment'
import { Search } from '@vervedoc/docx-editor-commands'
import { BlockParticle } from '@vervedoc/docx-editor-commands'
import { DateParticle } from '@vervedoc/docx-editor-commands'
import { LaTexParticle } from '@vervedoc/docx-editor-commands'
import { GadgetComponent } from '@vervedoc/docx-editor-commands'
import { ControlComponent } from '@vervedoc/docx-editor-commands'
import { ShortcutHandler } from './shortcut'

export type { DocxCommentMeta, RevisionCallbacks, CommentCallbacks }

export class DocxEditor {
  public listener: Listener
  public eventBus: EventBus
  public range: RangeManager
  public draw: Draw
  public command: Command
  public comment: CommentComponent
  public revision: RevisionComponent
  public search: Search
  public block: BlockParticle
  public date: DateParticle
  public laTex: LaTexParticle
  public gadget: GadgetComponent
  public control: ControlComponent

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
        this.comment.render()
        this.revision.update()
        this.block?.clear()
      },
      onCommand: (command: string, ...args: any[]) => {
        const fn = (this.command as unknown as Record<string, ((...a: any[]) => void) | undefined>)[command]
        if (typeof fn === 'function') fn.call(this.command, ...args)
      },
      onZoneChange: (zone) => {
        this.listener.emit('zoneChange', zone)
      }
    })

    adapt = new CommandAdapt(
      {
        getDocument: () => this.draw.getDocument(),
        setDocument: (d: IDocxDocumentMeta) => this.draw.setDocument(d),
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
        getOptions: () => this.draw.getOptions(),
        print: () => this.draw.print()
      },
      this.range
    )
    this.command = new Command(adapt)

    // commands 组件实例化（基于 verve 树模型）
    this.search = new Search(this.draw)
    this.block = new BlockParticle(this.draw)
    this.date = new DateParticle(this.draw)
    this.laTex = new LaTexParticle(this.draw)
    this.control = new ControlComponent()
    this.control.install(this.draw)
    // GadgetComponent 需要在 draw 上挂 __structureAdapter 桥接
    ;(this.draw as any).__structureAdapter = {}
    this.gadget = new GadgetComponent()
    this.gadget.install(this.draw, this.command as any)

    // 构造批注/修订组件所需的命令代理（桥接视图与文档查询接口）
    const drawRef = this.draw
    const commentProxy = {
      getContainer: () => drawRef.getScroller(),
      getPositionList: () => null,
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
      executeSetGroup: () => null,
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
    this.comment.install(commentProxy)
    this.revision.install(commentProxy)

    // 从文档中自动加载批注数据
    if (doc.comments && doc.comments.length > 0) {
      this.comment.buildCommentsFromMetas(doc.comments)
    }

    // 鼠标点击 -> hit + setCaret + focus 隐藏输入框
    // 注意：Draw 内 mousedown 已处理 hit，这里不再重复绑定
  }

  getDocument(): IDocxDocumentMeta { return this.draw.getDocument() }

  setDocument(doc: IDocxDocumentMeta): void {
    if (!doc || !Array.isArray(doc.elements)) {
      throw new TypeError('[DocxEditor.setDocument] 需要 IDocxDocumentMeta')
    }
    // 同步批注数据
    if (doc.comments && doc.comments.length > 0) {
      this.comment.buildCommentsFromMetas(doc.comments)
    } else {
      this.comment.buildCommentsFromMetas([])
    }
    this.draw.setDocument(doc)
  }

  destroy(): void {
    this.block?.destroy()
    this.date?.clearDatePicker()
    this.comment.destroy()
    this.revision.destroy()
    this.draw.destroy()
    this.listener = new Listener()
    this.eventBus.clear()
    this.range.clear()
  }
}

export default DocxEditor
