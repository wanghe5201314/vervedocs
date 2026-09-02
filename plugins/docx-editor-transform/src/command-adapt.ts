/**
 * VerveDocs Transform —— CommandAdapt
 *
 * 基于路径的树编辑命令。所有命令直接操作 IDocxDocument.elements 树。
 * 通过 draw.setDocument 通知视图重排（避免直接依赖 view）。
 */

import type {
  IDocxDocument, IElement, Path, ITextElement,
  ITitleElement, ITableElement
} from '@vervedoc/docx-editor-schema'
import {
  getByPath, getParentContainer, cloneTree
} from '@vervedoc/docx-editor-schema'
import type { RangeManager } from '@vervedoc/docx-editor-state'

export interface DrawLike {
  getDocument(): IDocxDocument
  setDocument(doc: IDocxDocument): void
}

export class CommandAdapt {
  constructor(
    private draw: DrawLike,
    private range: RangeManager
  ) {}

  /* -------------------- 文本编辑 -------------------- */

  insertText(text: string): void {
    const pos = this.range.getFocus()
    if (!pos) return
    const doc = this.draw.getDocument()
    const node = getByPath(doc.elements, pos.path)
    if (!node) return
    if (node.type === 'text') {
      const t = node as ITextElement
      const before = t.value.slice(0, pos.offset)
      const after = t.value.slice(pos.offset)
      t.value = before + text + after
      this.range.setCaret({ path: pos.path.slice() as Path, offset: pos.offset + text.length })
      this.draw.setDocument(doc)
    }
  }

  deleteBackward(): void {
    const pos = this.range.getFocus()
    if (!pos) return
    const doc = this.draw.getDocument()
    const node = getByPath(doc.elements, pos.path)
    if (!node) return
    if (node.type === 'text') {
      const t = node as ITextElement
      if (pos.offset > 0) {
        t.value = t.value.slice(0, pos.offset - 1) + t.value.slice(pos.offset)
        this.range.setCaret({ path: pos.path.slice() as Path, offset: pos.offset - 1 })
        this.draw.setDocument(doc)
      } else {
        // 与前一个 text run 合并
        const parent = getParentContainer(doc.elements, pos.path)
        const idx = pos.path[pos.path.length - 1] as number
        if (parent && idx > 0) {
          const prev = parent[idx - 1]
          if (prev && prev.type === 'text') {
            const p = prev as ITextElement
            const newOffset = p.value.length > 0 ? p.value.length - 1 : 0
            if (p.value.length > 0) p.value = p.value.slice(0, -1)
            // 合并 current 到 prev
            p.value += t.value
            parent.splice(idx, 1)
            const newPath = pos.path.slice() as Path
            newPath[newPath.length - 1] = idx - 1
            this.range.setCaret({ path: newPath, offset: newOffset })
            this.draw.setDocument(doc)
          }
        }
      }
    }
  }

  deleteForward(): void {
    const pos = this.range.getFocus()
    if (!pos) return
    const doc = this.draw.getDocument()
    const node = getByPath(doc.elements, pos.path)
    if (!node || node.type !== 'text') return
    const t = node as ITextElement
    if (pos.offset < t.value.length) {
      t.value = t.value.slice(0, pos.offset) + t.value.slice(pos.offset + 1)
      this.draw.setDocument(doc)
    }
  }

  /** Enter 换段：在当前 text run 内切成两半，第二半为新 run；对普通段落即插入零宽段分隔 */
  splitParagraph(): void {
    const pos = this.range.getFocus()
    if (!pos) return
    const doc = this.draw.getDocument()
    const node = getByPath(doc.elements, pos.path)
    const parent = getParentContainer(doc.elements, pos.path)
    if (!node || !parent) return
    if (node.type !== 'text') return
    const t = node as ITextElement
    const idx = pos.path[pos.path.length - 1] as number
    const before = t.value.slice(0, pos.offset)
    const after = t.value.slice(pos.offset)
    t.value = before
    // 插入段落分隔标记 + 后半 text
    const sep: ITextElement = { type: 'text', value: '\u200B' } as ITextElement
    const rest: ITextElement = { type: 'text', value: after } as ITextElement
    // 继承字体/字号
    const anyT = t as unknown as Record<string, unknown>
    for (const k of ['font', 'size', 'bold', 'color']) {
      if (anyT[k] != null) {
        (rest as unknown as Record<string, unknown>)[k] = anyT[k]
      }
    }
    parent.splice(idx + 1, 0, sep, rest)
    const newPath = pos.path.slice() as Path
    newPath[newPath.length - 1] = idx + 2
    this.range.setCaret({ path: newPath, offset: 0 })
    this.draw.setDocument(doc)
  }

  /* -------------------- 光标移动 -------------------- */

  moveCaretLeft(): void {
    const pos = this.range.getFocus()
    if (!pos) return
    if (pos.offset > 0) {
      this.range.setCaret({ path: pos.path.slice() as Path, offset: pos.offset - 1 })
      return
    }
    // 跨 run 向前
    const doc = this.draw.getDocument()
    const parent = getParentContainer(doc.elements, pos.path)
    const idx = pos.path[pos.path.length - 1] as number
    if (parent && idx > 0) {
      for (let i = idx - 1; i >= 0; i--) {
        const p = parent[i]
        if (p && p.type === 'text') {
          const newPath = pos.path.slice() as Path
          newPath[newPath.length - 1] = i
          const t = p as ITextElement
          this.range.setCaret({ path: newPath, offset: t.value.length })
          return
        }
      }
    }
  }

  moveCaretRight(): void {
    const pos = this.range.getFocus()
    if (!pos) return
    const doc = this.draw.getDocument()
    const node = getByPath(doc.elements, pos.path)
    if (node && node.type === 'text') {
      const t = node as ITextElement
      if (pos.offset < t.value.length) {
        this.range.setCaret({ path: pos.path.slice() as Path, offset: pos.offset + 1 })
        return
      }
    }
    // 跨 run 向后
    const parent = getParentContainer(doc.elements, pos.path)
    const idx = pos.path[pos.path.length - 1] as number
    if (parent && idx < parent.length - 1) {
      for (let i = idx + 1; i < parent.length; i++) {
        const p = parent[i]
        if (p && p.type === 'text') {
          const newPath = pos.path.slice() as Path
          newPath[newPath.length - 1] = i
          this.range.setCaret({ path: newPath, offset: 0 })
          return
        }
      }
    }
  }

  /* -------------------- 段落属性 -------------------- */

  setRowFlex(flex: 'left' | 'center' | 'right' | 'justify' | 'alignment'): void {
    const pos = this.range.getFocus()
    if (!pos) return
    const doc = this.draw.getDocument()
    const node = getByPath(doc.elements, pos.path)
    if (!node) return
    ;(node as unknown as Record<string, unknown>).rowFlex = flex
    this.draw.setDocument(doc)
  }

  setLineHeight(lh: number, rule: 'auto' | 'exact' | 'atLeast' = 'auto'): void {
    const pos = this.range.getFocus()
    if (!pos) return
    const doc = this.draw.getDocument()
    const node = getByPath(doc.elements, pos.path)
    if (!node) return
    const any = node as unknown as Record<string, unknown>
    any.lineHeight = lh
    any.lineHeightRule = rule
    this.draw.setDocument(doc)
  }

  /* -------------------- run 样式 -------------------- */

  setBold(bold: boolean): void {
    this.mutateRun(run => { run.bold = bold })
  }
  setColor(color: string): void {
    this.mutateRun(run => { (run as unknown as Record<string, unknown>).color = color })
  }
  setFont(font: string): void {
    this.mutateRun(run => { (run as unknown as Record<string, unknown>).font = font })
  }
  setSize(size: number): void {
    this.mutateRun(run => { (run as unknown as Record<string, unknown>).size = size })
  }
  setHighlight(color: string): void {
    this.mutateRun(run => { (run as unknown as Record<string, unknown>).highlight = color })
  }
  setStrikeout(v: boolean): void {
    this.mutateRun(run => { (run as unknown as Record<string, unknown>).strikeout = v })
  }
  setUnderline(v: boolean): void {
    this.mutateRun(run => { (run as unknown as Record<string, unknown>).underline = v })
  }

  private mutateRun(fn: (run: ITextElement) => void): void {
    const pos = this.range.getFocus()
    if (!pos) return
    const doc = this.draw.getDocument()
    const node = getByPath(doc.elements, pos.path)
    if (!node || node.type !== 'text') return
    fn(node as ITextElement)
    this.draw.setDocument(doc)
  }

  /* -------------------- 标题 / 列表 -------------------- */

  setTitle(level: ITitleElement['level']): void {
    const pos = this.range.getFocus()
    if (!pos) return
    const doc = this.draw.getDocument()
    const parent = getParentContainer(doc.elements, pos.path)
    if (!parent) return
    const idx = pos.path[pos.path.length - 1] as number
    const cur = parent[idx]
    if (!cur) return
    // 将当前节点包装/替换为 title
    if (cur.type === 'title') {
      (cur as ITitleElement).level = level
    } else if (cur.type === 'text') {
      const wrap: ITitleElement = {
        type: 'title', value: '', level,
        valueList: [cloneTree(cur)]
      }
      parent[idx] = wrap
    }
    this.draw.setDocument(doc)
  }

  /* -------------------- 表格 -------------------- */

  insertTable(rows: number, cols: number, availableWidth = 600): void {
    const doc = this.draw.getDocument()
    const pos = this.range.getFocus() ?? { path: [doc.elements.length], offset: 0 }
    const parent = pos.path.length === 1 ? doc.elements : getParentContainer(doc.elements, pos.path)
    if (!parent) return
    const idx = pos.path.length === 1 ? doc.elements.length : (pos.path[pos.path.length - 1] as number) + 1
    const colWidth = availableWidth / cols
    const table: ITableElement = {
      type: 'table',
      value: '',
      colgroup: Array.from({ length: cols }, () => ({ width: colWidth })),
      trList: Array.from({ length: rows }, () => ({
        height: 32,
        tdList: Array.from({ length: cols }, () => ({
          width: colWidth,
          colspan: 1,
          rowspan: 1,
          value: [{ type: 'text', value: '' } as IElement],
          verticalAlign: 'top' as const,
          borderStyle: {
            top: { width: 1, color: '#000', style: 'solid' as const },
            right: { width: 1, color: '#000', style: 'solid' as const },
            bottom: { width: 1, color: '#000', style: 'solid' as const },
            left: { width: 1, color: '#000', style: 'solid' as const }
          },
          padding: [5, 5, 5, 5] as [number, number, number, number]
        }))
      }))
    }
    parent.splice(idx, 0, table)
    this.draw.setDocument(doc)
  }

  /* -------------------- 图片 / 分页 -------------------- */

  insertImage(src: string, width: number, height: number): void {
    const doc = this.draw.getDocument()
    const pos = this.range.getFocus() ?? { path: [doc.elements.length], offset: 0 }
    const img: IElement = { type: 'image', value: src, width, height } as unknown as IElement
    const parent = pos.path.length === 1 ? doc.elements : getParentContainer(doc.elements, pos.path)
    if (!parent) return
    const idx = pos.path.length === 1 ? doc.elements.length : (pos.path[pos.path.length - 1] as number) + 1
    parent.splice(idx, 0, img)
    this.draw.setDocument(doc)
  }

  insertPageBreak(): void {
    const doc = this.draw.getDocument()
    const pos = this.range.getFocus() ?? { path: [doc.elements.length], offset: 0 }
    const parent = pos.path.length === 1 ? doc.elements : getParentContainer(doc.elements, pos.path)
    if (!parent) return
    const idx = pos.path.length === 1 ? doc.elements.length : (pos.path[pos.path.length - 1] as number) + 1
    parent.splice(idx, 0, { type: 'pageBreak', value: 'manual' } as IElement)
    this.draw.setDocument(doc)
  }

  /* -------------------- 未实现命令占位（后续补） -------------------- */

  undo(): void { /* 交由 history 插件 */ }
  redo(): void { /* 交由 history 插件 */ }
}
