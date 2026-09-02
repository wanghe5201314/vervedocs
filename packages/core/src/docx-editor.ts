/**
 * VerveDocs Core —— DocxEditor
 *
 * 全新构造，零兼容：只接受 IDocxDocument。
 */

import type { IDocxDocument, IEditorOption } from '@vervedoc/docx-editor-schema'
import { cloneTree, formatElementTree, mergeOption } from '@vervedoc/docx-editor-schema'
import { EventBus, Listener, RangeManager } from '@vervedoc/docx-editor-state'
import { Draw } from '@vervedoc/docx-editor-view'
import { Command, CommandAdapt } from '@vervedoc/docx-editor-transform'

export class DocxEditor {
  public listener: Listener
  public eventBus: EventBus
  public range: RangeManager
  public draw: Draw
  public command: Command

  constructor(
    container: HTMLDivElement,
    document: IDocxDocument,
    options: IEditorOption = {}
  ) {
    if (!container || !(container instanceof HTMLDivElement)) {
      throw new TypeError('[DocxEditor] container 必须是 HTMLDivElement')
    }
    if (!document || typeof document !== 'object' || !Array.isArray(document.elements)) {
      throw new TypeError(
        '[DocxEditor] document 必须是 IDocxDocument，且 elements 为数组。不再兼容 IElement[] / IEditorData 形态。'
      )
    }

    const editorOptions = mergeOption(options)
    const doc: IDocxDocument = cloneTree(document)

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

    // 先声明适配器占位，以便在 Draw 构造时可以引用（onInput 回调需要 CommandAdapt）
    let adapt: CommandAdapt | null = null

    this.draw = new Draw(container, editorOptions, {
      document: doc,
      listener: this.listener,
      eventBus: this.eventBus,
      rangeManager: this.range,
      onInput: (text: string) => {
        adapt?.insertText(text)
      },
      onKeyDown: (e: KeyboardEvent) => {
        if (!adapt) return
        if (e.key === 'Backspace') { e.preventDefault(); adapt.deleteBackward(); return }
        if (e.key === 'Delete')    { e.preventDefault(); adapt.deleteForward(); return }
        if (e.key === 'Enter')     { e.preventDefault(); adapt.splitParagraph(); return }
        if (e.key === 'ArrowLeft') { e.preventDefault(); adapt.moveCaretLeft(); return }
        if (e.key === 'ArrowRight'){ e.preventDefault(); adapt.moveCaretRight(); return }
        // Tab / Escape 等其它按键暂不处理
      }
    })

    adapt = new CommandAdapt(
      { getDocument: () => this.draw.getDocument(), setDocument: (d: IDocxDocument) => this.draw.setDocument(d) },
      this.range
    )
    this.command = new Command(adapt)

    // 鼠标点击 -> hit + setCaret + focus 隐藏输入框
    // 注意：Draw 内 mousedown 已处理 hit，这里不再重复绑定
  }

  getDocument(): IDocxDocument { return this.draw.getDocument() }

  setDocument(doc: IDocxDocument): void {
    if (!doc || !Array.isArray(doc.elements)) {
      throw new TypeError('[DocxEditor.setDocument] 需要 IDocxDocument')
    }
    this.draw.setDocument(doc)
  }

  destroy(): void {
    this.draw.destroy()
    this.listener = new Listener()
    this.eventBus.clear()
    this.range.clear()
  }
}

export default DocxEditor
