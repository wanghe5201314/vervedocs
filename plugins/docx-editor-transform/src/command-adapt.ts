/**
 * VerveDocs Transform —— CommandAdapt
 *
 * 基于路径的树编辑命令。所有命令直接操作 IDocxDocumentMeta.elements 树。
 * 通过 draw.setDocument 通知视图重排（避免直接依赖 view）。
 */

import type {
  IDocxDocumentMeta, IElement, Path, ITextElement,
  ITitleElement, ITableElement, IListElement, ListTypeName, IPosition, ITd
} from '@vervedoc/docx-editor-schema'
import {
  getByPath, getParentContainer, cloneTree, walkTree, isSamePath, splitParagraphs
} from '@vervedoc/docx-editor-schema'
import type { RangeManager } from '@vervedoc/docx-editor-state'

export interface DrawLike {
  getDocument(): IDocxDocumentMeta
  setDocument(doc: IDocxDocumentMeta): void
  /** 获取当前活动区域的文档（zone=header/footer 时 elements 指向对应区域） */
  getActiveDocument(): IDocxDocumentMeta
  /** 将修改后的活动文档写回对应区域并触发重渲染 */
  applyActiveDocument(doc: IDocxDocumentMeta): void
  setScale(scale: number): void
  setPageSize(width: number, height: number): void
  getOptions(): { pageWidth?: number; pageHeight?: number; scale?: number; [key: string]: unknown }
  print(): void
}

export class CommandAdapt {
  private _paintFmt: Partial<Pick<ITextElement, 'bold' | 'italic' | 'underline' | 'strikeout' | 'color' | 'highlight' | 'font' | 'size'>> | null = null
  private _searchHits: { path: Path; start: number; end: number }[] = []
  private _searchIdx = 0

  constructor(
    private draw: DrawLike,
    private range: RangeManager
  ) {}

  /* -------------------- 文本编辑 -------------------- */

  insertText(text: string): void {
    if (this.deleteSelection()) {
      // 选区已删除，光标在原选区 start，继续插入 text
    }
    const pos = this.range.getFocus()
    if (!pos) return
    const doc = this.draw.getActiveDocument()
    const node = getByPath(doc.elements, pos.path)
    if (!node) return
    if (node.type === 'text') {
      const t = node as ITextElement
      const before = t.value.slice(0, pos.offset)
      const after = t.value.slice(pos.offset)
      t.value = before + text + after
      this.range.setCaret({ path: pos.path.slice() as Path, offset: pos.offset + text.length })
      this.draw.applyActiveDocument(doc)
    }
  }

  /** 删除当前选区内容（若已 collapsed 则不操作）。光标收缩到选区 start。返回是否实际删除。 */
  deleteSelection(): boolean {
    if (this.range.isCollapsed()) return false
    const ordered = this.range.getOrdered()
    if (!ordered) return false
    const { start, end } = ordered
    const doc = this.draw.getActiveDocument()

    const runs: { path: Path; parent: IElement[]; idx: number }[] = []
    walkTree(doc.elements, (node, ctx) => {
      if (node.type === 'text' && Array.isArray(ctx.parent)) {
        runs.push({ path: ctx.path.slice() as Path, parent: ctx.parent as IElement[], idx: ctx.index })
      }
    })

    let startRunIdx = -1, endRunIdx = -1
    for (let i = 0; i < runs.length; i++) {
      if (isSamePath(runs[i].path, start.path)) startRunIdx = i
      if (isSamePath(runs[i].path, end.path)) endRunIdx = i
    }
    if (startRunIdx === -1 || endRunIdx === -1 || startRunIdx > endRunIdx) return false

    if (startRunIdx === endRunIdx) {
      const node = getByPath(doc.elements, start.path)
      if (node && node.type === 'text') {
        const t = node as ITextElement
        t.value = t.value.slice(0, start.offset) + t.value.slice(end.offset)
        this.range.setCaret({ path: start.path.slice() as Path, offset: start.offset })
        this.draw.applyActiveDocument(doc)
        return true
      }
      return false
    }

    const startRun = runs[startRunIdx]
    const endRun = runs[endRunIdx]
    const startNode = startRun.parent[startRun.idx] as ITextElement
    const endNode = endRun.parent[endRun.idx] as ITextElement
    if (startNode.type !== 'text' || endNode.type !== 'text') return false

    const before = startNode.value.slice(0, start.offset)
    const after = endNode.value.slice(end.offset)
    startNode.value = before + after

    const toDelete = runs.slice(startRunIdx + 1, endRunIdx + 1)
    const groups = new Map<IElement[], number[]>()
    for (const r of toDelete) {
      let arr = groups.get(r.parent)
      if (!arr) { arr = []; groups.set(r.parent, arr) }
      arr.push(r.idx)
    }
    for (const [parent, idxs] of groups) {
      idxs.sort((a, b) => b - a)
      for (const idx of idxs) parent.splice(idx, 1)
    }

    this.range.setCaret({ path: start.path.slice() as Path, offset: start.offset })
    this.draw.applyActiveDocument(doc)
    return true
  }

  /** 提取当前选区纯文本（用于复制/剪切）。 */
  extractSelectionText(): string {
    if (this.range.isCollapsed()) return ''
    const ordered = this.range.getOrdered()
    if (!ordered) return ''
    const { start, end } = ordered
    const doc = this.draw.getActiveDocument()

    const runs: { path: Path; text: string }[] = []
    walkTree(doc.elements, (node, ctx) => {
      if (node.type === 'text') {
        runs.push({ path: ctx.path.slice() as Path, text: (node as ITextElement).value })
      }
    })

    let startRunIdx = -1, endRunIdx = -1
    for (let i = 0; i < runs.length; i++) {
      if (isSamePath(runs[i].path, start.path)) startRunIdx = i
      if (isSamePath(runs[i].path, end.path)) endRunIdx = i
    }
    if (startRunIdx === -1 || endRunIdx === -1 || startRunIdx > endRunIdx) return ''

    if (startRunIdx === endRunIdx) {
      return runs[startRunIdx].text.slice(start.offset, end.offset)
    }

    let result = runs[startRunIdx].text.slice(start.offset)
    for (let i = startRunIdx + 1; i < endRunIdx; i++) {
      const t = runs[i].text
      result += t === '\u200B' ? '\n' : t
    }
    result += runs[endRunIdx].text.slice(0, end.offset)
    return result
  }

  deleteBackward(): void {
    if (this.deleteSelection()) return
    const pos = this.range.getFocus()
    if (!pos) return
    const doc = this.draw.getActiveDocument()
    const node = getByPath(doc.elements, pos.path)
    if (!node) return
    if (node.type === 'text') {
      const t = node as ITextElement
      if (pos.offset > 0) {
        t.value = t.value.slice(0, pos.offset - 1) + t.value.slice(pos.offset)
        this.range.setCaret({ path: pos.path.slice() as Path, offset: pos.offset - 1 })
        this.draw.applyActiveDocument(doc)
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
            this.draw.applyActiveDocument(doc)
          }
        }
      }
    }
  }

  deleteForward(): void {
    if (this.deleteSelection()) return
    const pos = this.range.getFocus()
    if (!pos) return
    const doc = this.draw.getActiveDocument()
    const node = getByPath(doc.elements, pos.path)
    if (!node || node.type !== 'text') return
    const t = node as ITextElement
    if (pos.offset < t.value.length) {
      t.value = t.value.slice(0, pos.offset) + t.value.slice(pos.offset + 1)
      this.draw.applyActiveDocument(doc)
    }
  }

  /** Enter 换段：在当前 text run 内切成两半，第二半为新 run；对普通段落即插入零宽段分隔 */
  splitParagraph(): void {
    if (this.deleteSelection()) return
    const pos = this.range.getFocus()
    if (!pos) return
    const doc = this.draw.getActiveDocument()
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
    this.draw.applyActiveDocument(doc)
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
    const doc = this.draw.getActiveDocument()
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
    const doc = this.draw.getActiveDocument()
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
    const doc = this.draw.getActiveDocument()
    const ordered = this.range.getOrdered()
    const pos = ordered?.start ?? this.range.getFocus()
    if (!pos) return
    const parent = getParentContainer(doc.elements, pos.path)
    if (!parent) return
    const cursorIdx = pos.path[pos.path.length - 1] as number
    const groups = splitParagraphs(parent)
    for (const g of groups) {
      if (cursorIdx < g.start || cursorIdx >= g.end) continue
      if (g.block) {
        ;(g.block as unknown as Record<string, unknown>).rowFlex = flex
      }
      for (const r of g.runs) {
        ;(r as unknown as Record<string, unknown>).rowFlex = flex
      }
      this.draw.applyActiveDocument(doc)
      return
    }
  }

  setLineHeight(lh: number, rule: 'auto' | 'exact' | 'atLeast' = 'auto'): void {
    const doc = this.draw.getActiveDocument()
    const pos = this.range.getFocus()
    if (!pos) return
    const parent = getParentContainer(doc.elements, pos.path)
    if (!parent) return
    const cursorIdx = pos.path[pos.path.length - 1] as number
    const groups = splitParagraphs(parent)
    for (const g of groups) {
      if (cursorIdx < g.start || cursorIdx >= g.end) continue
      const targets = g.block ? [g.block, ...g.runs] : g.runs
      for (const r of targets) {
        const any = r as unknown as Record<string, unknown>
        any.lineHeight = lh
        any.lineHeightRule = rule
      }
      this.draw.applyActiveDocument(doc)
      return
    }
  }

  /** 段间距（前后各 margin） */
  setRowMargin(margin: number): void {
    const doc = this.draw.getActiveDocument()
    const pos = this.range.getFocus()
    if (!pos) return
    const parent = getParentContainer(doc.elements, pos.path)
    if (!parent) return
    const cursorIdx = pos.path[pos.path.length - 1] as number
    const groups = splitParagraphs(parent)
    for (const g of groups) {
      if (cursorIdx < g.start || cursorIdx >= g.end) continue
      const targets = g.block ? [g.block, ...g.runs] : g.runs
      for (const r of targets) {
        const any = r as unknown as Record<string, unknown>
        any.paragraphSpacingBefore = margin
        any.paragraphSpacingAfter = margin
      }
      this.draw.applyActiveDocument(doc)
      return
    }
  }

  /* -------------------- run 样式 -------------------- */

  setBold(bold?: boolean): void {
    this.mutateRuns(run => { run.bold = bold }, 'bold')
  }
  setItalic(italic?: boolean): void {
    this.mutateRuns(run => { run.italic = italic }, 'italic')
  }
  setColor(color: string): void {
    this.mutateRuns(run => { (run as unknown as Record<string, unknown>).color = color })
  }
  setFont(font: string): void {
    this.mutateRuns(run => { (run as unknown as Record<string, unknown>).font = font })
  }
  setSize(size: number): void {
    this.mutateRuns(run => { (run as unknown as Record<string, unknown>).size = size })
  }
  setSizeAdd(): void {
    this.mutateRuns(run => { run.size = Math.min(72, (run.size ?? 14) + 2) })
  }
  setSizeMinus(): void {
    this.mutateRuns(run => { run.size = Math.max(8, (run.size ?? 14) - 2) })
  }
  setHighlight(color: string): void {
    this.mutateRuns(run => { (run as unknown as Record<string, unknown>).highlight = color })
  }
  setStrikeout(v?: boolean): void {
    this.mutateRuns(run => { (run as unknown as Record<string, unknown>).strikeout = v }, 'strikeout')
  }
  setUnderline(v?: boolean): void {
    this.mutateRuns(run => { (run as unknown as Record<string, unknown>).underline = v }, 'underline')
  }

  /** 清除当前选区所有 run 的字符格式 */
  clearFormat(): void {
    this.mutateRuns(run => {
      run.bold = undefined
      run.italic = undefined
      run.underline = undefined
      run.strikeout = undefined
      run.color = undefined
      run.highlight = undefined
      run.font = undefined
      run.size = undefined
    })
  }

  /** 格式刷：首次调用复制当前 run 格式，二次调用应用到当前 run */
  paintFormat(): void {
    if (this._paintFmt) {
      this.mutateRun(run => {
        Object.assign(run, this._paintFmt)
      })
      this._paintFmt = null
    } else {
      const pos = this.range.getFocus()
      if (!pos) return
      const doc = this.draw.getActiveDocument()
      const node = getByPath(doc.elements, pos.path)
      if (!node || node.type !== 'text') return
      const t = node as ITextElement
      this._paintFmt = {
        bold: t.bold, italic: t.italic, underline: t.underline,
        strikeout: t.strikeout, color: t.color, highlight: t.highlight,
        font: t.font, size: t.size
      }
    }
  }

  private mutateRun(fn: (run: ITextElement) => void): void {
    const pos = this.range.getFocus()
    if (!pos) return
    const doc = this.draw.getActiveDocument()
    const node = getByPath(doc.elements, pos.path)
    if (!node || node.type !== 'text') return
    fn(node as ITextElement)
    this.draw.applyActiveDocument(doc)
  }

  /**
   * 选区感知的 run 变更：折叠时改当前 run，展开时改选区内所有 run。
   * toggleKey 传入时：若 value 为 undefined 则按"选区内任一 run 未设置 → 全设 true，全已设 → 全取消"toggle。
   */
  private mutateRuns(fn: (run: ITextElement) => void, toggleKey?: keyof ITextElement): void {
    const doc = this.draw.getActiveDocument()
    const ordered = this.range.getOrdered()
    if (!ordered) {
      const pos = this.range.getFocus()
      if (!pos) return
      const node = getByPath(doc.elements, pos.path)
      if (!node || node.type !== 'text') return
      fn(node as ITextElement)
      this.draw.applyActiveDocument(doc)
      return
    }
    const { start, end } = ordered

    const adjusted = this.splitBoundaryRuns(doc, start, end)
    this.range.setRange({ anchor: adjusted.start, focus: adjusted.end })
    const selectedRuns = this.collectRunsInRange(doc.elements, adjusted.start, adjusted.end)
    if (selectedRuns.length === 0) {
      const pos = this.range.getFocus()
      if (!pos) return
      const node = getByPath(doc.elements, pos.path)
      if (!node || node.type !== 'text') return
      fn(node as ITextElement)
      this.draw.applyActiveDocument(doc)
      return
    }
    if (toggleKey) {
      const allSet = selectedRuns.every(r => Boolean((r as unknown as Record<string, unknown>)[toggleKey]))
      for (const r of selectedRuns) {
        (fn as (run: ITextElement) => void)(r)
        if ((r as unknown as Record<string, unknown>)[toggleKey] === undefined) {
          ;(r as unknown as Record<string, unknown>)[toggleKey] = !allSet
        }
      }
    } else {
      for (const r of selectedRuns) fn(r)
    }
    this.draw.applyActiveDocument(doc)
  }

  /**
   * 在选区边界拆分 text run，使选区恰好对齐 whole runs。
   * 例：run="中国神华本部"，选 offset 2~6 → 拆成 "中国"|"神华本部"|"月度..."，
   * 返回调整后的 start/end（start 指向 "神华本部" offset 0，end 指向它 offset 4）。
   */
  private splitBoundaryRuns(doc: IDocxDocumentMeta, start: IPosition, end: IPosition): { start: IPosition; end: IPosition } {
    let startPath = start.path.slice() as Path
    let startOffset = start.offset
    let endPath = end.path.slice() as Path
    let endOffset = end.offset
    const sameRun = isSamePath(start.path, end.path)

    // 拆分 start run（start.offset > 0 且 < run.length）
    if (startOffset > 0) {
      const node = getByPath(doc.elements, startPath)
      if (node && node.type === 'text') {
        const t = node as ITextElement
        if (startOffset < t.value.length) {
          const parent = getParentContainer(doc.elements, startPath)
          if (parent) {
            const idx = startPath[startPath.length - 1] as number
            const after = t.value.slice(startOffset)
            t.value = t.value.slice(0, startOffset)
            const second = { ...t, value: after } as ITextElement
            parent.splice(idx + 1, 0, second as IElement)
            startPath = startPath.slice() as Path
            startPath[startPath.length - 1] = idx + 1
            startOffset = 0
            if (sameRun) {
              endPath = startPath.slice() as Path
              endOffset = end.offset - start.offset
            } else {
              const startParent = start.path.slice(0, -1)
              const endParent = endPath.slice(0, -1)
              if (isSamePath(startParent, endParent)) {
                endPath[endPath.length - 1] = (endPath[endPath.length - 1] as number) + 1
              }
            }
          }
        }
      }
    }

    // 拆分 end run（end.offset > 0 且 < run.length）
    if (endOffset > 0) {
      const node = getByPath(doc.elements, endPath)
      if (node && node.type === 'text') {
        const t = node as ITextElement
        if (endOffset < t.value.length) {
          const parent = getParentContainer(doc.elements, endPath)
          if (parent) {
            const idx = endPath[endPath.length - 1] as number
            const after = t.value.slice(endOffset)
            t.value = t.value.slice(0, endOffset)
            const second = { ...t, value: after } as ITextElement
            parent.splice(idx + 1, 0, second as IElement)
          }
        }
      }
    }

    return { start: { path: startPath, offset: startOffset }, end: { path: endPath, offset: endOffset } }
  }

  private collectRunsInRange(elements: IElement[], start: IPosition, end: IPosition): ITextElement[] {
    const runs: { path: Path; node: ITextElement }[] = []
    walkTree(elements, (node, ctx) => {
      if (node.type === 'text') runs.push({ path: ctx.path.slice() as Path, node: node as ITextElement })
    })
    let startIdx = -1, endIdx = -1
    for (let i = 0; i < runs.length; i++) {
      if (startIdx === -1 && isSamePath(runs[i].path, start.path)) startIdx = i
      if (isSamePath(runs[i].path, end.path)) endIdx = i
    }
    if (startIdx === -1 || endIdx === -1) return []
    if (startIdx > endIdx) { const t = startIdx; startIdx = endIdx; endIdx = t }
    return runs.slice(startIdx, endIdx + 1).map(r => r.node)
  }

  /* -------------------- 标题 / 列表 -------------------- */

  setTitle(level: ITitleElement['level'] | null): void {
    const pos = this.range.getFocus()
    if (!pos) return
    const doc = this.draw.getActiveDocument()
    const parent = getParentContainer(doc.elements, pos.path)
    if (!parent) return
    const idx = pos.path[pos.path.length - 1] as number
    const cur = parent[idx]
    if (!cur) return
    if (level === null) {
      if (cur.type === 'title') {
        const t = cur as ITitleElement
        const firstChild = (t.valueList ?? [])[0]
        parent[idx] = firstChild ?? { type: 'text', value: '' } as IElement
        this.draw.applyActiveDocument(doc)
      }
      return
    }
    if (cur.type === 'title') {
      (cur as ITitleElement).level = level
    } else if (cur.type === 'text') {
      const wrap: ITitleElement = {
        type: 'title', value: '', level,
        valueList: [cloneTree(cur)]
      }
      parent[idx] = wrap
    }
    this.draw.applyActiveDocument(doc)
  }

  /** 设置/取消列表 */
  setList(type: ListTypeName, style: string): void {
    const pos = this.range.getFocus()
    if (!pos) return
    const doc = this.draw.getActiveDocument()
    const parent = getParentContainer(doc.elements, pos.path)
    if (!parent) return
    const idx = pos.path[pos.path.length - 1] as number
    const cur = parent[idx]
    if (!cur) return
    if (cur.type === 'list') {
      const l = cur as IListElement
      if (l.listType === type && l.listStyle === style) {
        const firstChild = (l.valueList ?? [])[0]
        parent[idx] = firstChild ?? { type: 'text', value: '' } as IElement
      } else {
        l.listType = type
        l.listStyle = style
      }
    } else if (cur.type === 'text') {
      const wrap: IListElement = {
        type: 'list', value: '', listType: type, listStyle: style, listLevel: 0,
        valueList: [cloneTree(cur)]
      }
      parent[idx] = wrap
    }
    this.draw.applyActiveDocument(doc)
  }

  /* -------------------- 表格 -------------------- */

  insertTable(rows: number, cols: number, availableWidth = 600): void {
    const doc = this.draw.getActiveDocument()
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
    this.draw.applyActiveDocument(doc)
  }

  private getTableContext(): { doc: IDocxDocumentMeta; table: ITableElement; tableIndex: number; trIndex: number; tdIndex: number } | null {
    const pos = this.range.getFocus()
    if (!pos) return null
    const p = pos.path
    if (p.length < 5 || p[1] !== 'trList' || p[3] !== 'tdList') return null
    const doc = this.draw.getActiveDocument()
    const tableIndex = p[0] as number
    const trIndex = p[2] as number
    const tdIndex = p[4] as number
    const table = doc.elements[tableIndex]
    if (!table || table.type !== 'table') return null
    return { doc, table: table as ITableElement, tableIndex, trIndex, tdIndex }
  }

  private makeEmptyTd(width: number): ITd {
    return {
      width,
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
    }
  }

  insertTableRow(position: 'above' | 'below'): void {
    const ctx = this.getTableContext()
    if (!ctx) return
    const { doc, table, trIndex } = ctx
    const newRow = cloneTree(table.trList[trIndex])
    for (const td of newRow.tdList) {
      td.value = [{ type: 'text', value: '' } as IElement]
    }
    const insertAt = position === 'above' ? trIndex : trIndex + 1
    table.trList.splice(insertAt, 0, newRow)
    this.draw.applyActiveDocument(doc)
  }

  insertTableCol(position: 'left' | 'right'): void {
    const ctx = this.getTableContext()
    if (!ctx) return
    const { doc, table, tdIndex } = ctx
    const totalWidth = table.colgroup.reduce((s, c) => s + c.width, 0)
    const newColCount = table.colgroup.length + 1
    const colWidth = totalWidth / newColCount
    const insertAt = position === 'left' ? tdIndex : tdIndex + 1
    for (const tr of table.trList) {
      const newTd = this.makeEmptyTd(colWidth)
      tr.tdList.splice(insertAt, 0, newTd)
      for (const td of tr.tdList) td.width = colWidth
    }
    table.colgroup.splice(insertAt, 0, { width: colWidth })
    for (const c of table.colgroup) c.width = colWidth
    this.draw.applyActiveDocument(doc)
  }

  deleteTableRow(): void {
    const ctx = this.getTableContext()
    if (!ctx) return
    const { doc, table, trIndex } = ctx
    if (table.trList.length <= 1) return
    table.trList.splice(trIndex, 1)
    this.draw.applyActiveDocument(doc)
  }

  deleteTableCol(): void {
    const ctx = this.getTableContext()
    if (!ctx) return
    const { doc, table, tdIndex } = ctx
    if (table.trList[0].tdList.length <= 1) return
    for (const tr of table.trList) {
      tr.tdList.splice(tdIndex, 1)
    }
    table.colgroup.splice(tdIndex, 1)
    this.draw.applyActiveDocument(doc)
  }

  splitTableCell(): void {
    const ctx = this.getTableContext()
    if (!ctx) return
    const { doc, table, trIndex, tdIndex } = ctx
    const td = table.trList[trIndex].tdList[tdIndex]
    const newTd = this.makeEmptyTd(td.width)
    table.trList[trIndex].tdList.splice(tdIndex + 1, 0, newTd)
    const colWidth = td.width / 2
    td.width = colWidth
    newTd.width = colWidth
    if (table.colgroup[tdIndex]) {
      const totalWidth = table.colgroup[tdIndex].width
      table.colgroup.splice(tdIndex, 1, { width: colWidth }, { width: totalWidth - colWidth })
    }
    this.draw.applyActiveDocument(doc)
  }

  selectTable(): void {
    const ctx = this.getTableContext()
    if (!ctx) return
    const { table, tableIndex } = ctx
    const firstTr = table.trList[0]
    const lastTr = table.trList[table.trList.length - 1]
    if (!firstTr || !lastTr) return
    const anchor: IPosition = { path: [tableIndex, 'trList', 0, 'tdList', 0, 'value', 0], offset: 0 }
    const lastTdIdx = lastTr.tdList.length - 1
    const lastValue = lastTr.tdList[lastTdIdx].value
    const lastIdx = lastValue.length - 1
    const lastEl = lastValue[lastIdx]
    const focus: IPosition = {
      path: [tableIndex, 'trList', table.trList.length - 1, 'tdList', lastTdIdx, 'value', lastIdx],
      offset: lastEl && typeof (lastEl as { value?: unknown }).value === 'string' ? String((lastEl as { value: string }).value).length : 1
    }
    this.range.setRange({ anchor, focus })
  }

  /* -------------------- 图片 / 分页 -------------------- */

  insertImage(src: string | { value: string; width: number; height: number }, width?: number, height?: number): void {
    const doc = this.draw.getActiveDocument()
    const pos = this.range.getFocus() ?? { path: [doc.elements.length], offset: 0 }
    const imgSrc = typeof src === 'string' ? src : src.value
    const imgW = typeof src === 'string' ? (width ?? 200) : src.width
    const imgH = typeof src === 'string' ? (height ?? 150) : src.height
    const img: IElement = { type: 'image', value: imgSrc, width: imgW, height: imgH } as unknown as IElement
    const parent = pos.path.length === 1 ? doc.elements : getParentContainer(doc.elements, pos.path)
    if (!parent) return
    const idx = pos.path.length === 1 ? doc.elements.length : (pos.path[pos.path.length - 1] as number) + 1
    parent.splice(idx, 0, img)
    this.draw.applyActiveDocument(doc)
  }

  updateImageSize(path: Path, width: number, height: number): void {
    const doc = this.draw.getActiveDocument()
    const el = getByPath(doc.elements, path)
    if (!el || el.type !== 'image') return
    ;(el as unknown as { width: number; height: number }).width = Math.max(1, Math.round(width))
    ;(el as unknown as { width: number; height: number }).height = Math.max(1, Math.round(height))
    this.draw.applyActiveDocument(doc)
  }

  deleteImage(path: Path): void {
    const doc = this.draw.getActiveDocument()
    const parent = getParentContainer(doc.elements, path)
    if (!parent) return
    const idx = path[path.length - 1]
    if (typeof idx !== 'number' || idx < 0 || idx >= parent.length) return
    if (parent[idx].type !== 'image') return
    parent.splice(idx, 1)
    this.draw.applyActiveDocument(doc)
  }

  resetImageSize(path: Path): void {
    const doc = this.draw.getActiveDocument()
    const el = getByPath(doc.elements, path) as unknown as { type: string; value?: string; width: number; height: number } | null
    if (!el || el.type !== 'image' || !el.value) return
    const img = new Image()
    img.onload = () => {
      el.width = img.naturalWidth
      el.height = img.naturalHeight
      this.draw.applyActiveDocument(doc)
    }
    img.src = el.value
  }

  imageAlign(path: Path, align: 'left' | 'center' | 'right'): void {
    const doc = this.draw.getActiveDocument()
    const el = getByPath(doc.elements, path)
    if (!el || el.type !== 'image') return
    ;(el as unknown as { rowFlex: string }).rowFlex = align
    this.draw.applyActiveDocument(doc)
  }

  replaceImage(path: Path): void {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        const value = reader.result
        if (typeof value !== 'string') return
        const doc = this.draw.getActiveDocument()
        const el = getByPath(doc.elements, path) as unknown as { type: string; value: string; width: number; height: number } | null
        if (!el || el.type !== 'image') return
        const img = new Image()
        img.onload = () => {
          el.value = value
          el.width = img.naturalWidth
          el.height = img.naturalHeight
          this.draw.applyActiveDocument(doc)
        }
        img.src = value
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  insertPageBreak(): void {
    const doc = this.draw.getActiveDocument()
    const pos = this.range.getFocus() ?? { path: [doc.elements.length], offset: 0 }
    const parent = pos.path.length === 1 ? doc.elements : getParentContainer(doc.elements, pos.path)
    if (!parent) return
    const idx = pos.path.length === 1 ? doc.elements.length : (pos.path[pos.path.length - 1] as number) + 1
    parent.splice(idx, 0, { type: 'pageBreak', value: 'manual' } as IElement)
    this.draw.applyActiveDocument(doc)
  }

  /** 插入超链接 */
  insertHyperlink(payload: { value: string; url: string }): void {
    const doc = this.draw.getActiveDocument()
    const pos = this.range.getFocus() ?? { path: [doc.elements.length], offset: 0 }
    const parent = pos.path.length === 1 ? doc.elements : getParentContainer(doc.elements, pos.path)
    if (!parent) return
    const idx = pos.path.length === 1 ? doc.elements.length : (pos.path[pos.path.length - 1] as number) + 1
    const link: IElement = { type: 'hyperlink', value: payload.url } as unknown as IElement
    ;(link as unknown as Record<string, unknown>).valueList = [{ type: 'text', value: payload.value } as IElement]
    parent.splice(idx, 0, link)
    this.draw.applyActiveDocument(doc)
  }

  /** 插入分隔线 */
  insertSeparator(): void {
    const doc = this.draw.getActiveDocument()
    const pos = this.range.getFocus() ?? { path: [doc.elements.length], offset: 0 }
    const parent = pos.path.length === 1 ? doc.elements : getParentContainer(doc.elements, pos.path)
    if (!parent) return
    const idx = pos.path.length === 1 ? doc.elements.length : (pos.path[pos.path.length - 1] as number) + 1
    parent.splice(idx, 0, { type: 'separator', value: '' } as IElement)
    this.draw.applyActiveDocument(doc)
  }

  /* -------------------- 内容读写 / 目录 -------------------- */

  getValue(): IElement[] {
    return this.draw.getActiveDocument().elements
  }

  setValue(payload: { elements: IElement[] }): void {
    const doc = this.draw.getActiveDocument()
    doc.elements = payload.elements
    this.draw.applyActiveDocument(doc)
  }

  getWordCount(): number {
    const doc = this.draw.getActiveDocument()
    let count = 0
    walkTree(doc.elements, (node) => {
      if (node.type === 'text') count += (node as ITextElement).value.length
    })
    return count
  }

  getCatalog(): { id: string; level: number; name: string }[] {
    const doc = this.draw.getActiveDocument()
    const catalog: { id: string; level: number; name: string }[] = []
    const levelMap: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6 }
    walkTree(doc.elements, (node, ctx) => {
      if (node.type === 'title') {
        const t = node as ITitleElement
        const name = (t.valueList ?? []).map(v => v.type === 'text' ? (v as ITextElement).value : '').join('')
        catalog.push({ id: JSON.stringify(ctx.path), level: levelMap[t.level] ?? 1, name })
      }
    })
    return catalog
  }

  locationCatalog(id: string): void {
    try {
      const path = JSON.parse(id) as Path
      this.range.setCaret({ path, offset: 0 })
    } catch { /* invalid id */ }
  }

  /* -------------------- 页面 / 打印 -------------------- */

  setPaperSize(width: number, height: number): void {
    this.draw.setPageSize(width, height)
  }

  setPaperDirection(direction: 'vertical' | 'horizontal'): void {
    const opts = this.draw.getOptions()
    const w = Number(opts.pageWidth ?? 794)
    const h = Number(opts.pageHeight ?? 1123)
    if (direction === 'horizontal') {
      this.draw.setPageSize(Math.max(w, h), Math.min(w, h))
    } else {
      this.draw.setPageSize(Math.min(w, h), Math.max(w, h))
    }
  }

  pageScaleAdd(): void {
    const opts = this.draw.getOptions()
    const scale = Math.min(3, Number(opts.scale ?? 1) + 0.1)
    this.draw.setScale(scale)
  }

  pageScaleMinus(): void {
    const opts = this.draw.getOptions()
    const scale = Math.max(0.5, Number(opts.scale ?? 1) - 0.1)
    this.draw.setScale(scale)
  }

  print(): void {
    this.draw.print()
  }

  /* -------------------- 查找替换 -------------------- */

  /** 查找关键词，返回命中数，并选中第一个命中 */
  search(keyword: string): { count: number } {
    this._searchHits = []
    this._searchIdx = 0
    if (!keyword) return { count: 0 }
    const doc = this.draw.getActiveDocument()
    walkTree(doc.elements, (node, ctx) => {
      if (node.type !== 'text') return
      const text = (node as ITextElement).value
      let from = 0
      while (true) {
        const i = text.indexOf(keyword, from)
        if (i === -1) break
        this._searchHits.push({ path: ctx.path.slice() as Path, start: i, end: i + keyword.length })
        from = i + keyword.length
      }
    })
    if (this._searchHits.length > 0) this._selectHit(0)
    return { count: this._searchHits.length }
  }

  /** 替换当前命中为 text，跳到下一个命中。返回是否还有命中。 */
  replace(text: string): boolean {
    if (this._searchIdx >= this._searchHits.length) return false
    const hit = this._searchHits[this._searchIdx]
    const doc = this.draw.getActiveDocument()
    const node = getByPath(doc.elements, hit.path)
    if (node && node.type === 'text') {
      const t = node as ITextElement
      t.value = t.value.slice(0, hit.start) + text + t.value.slice(hit.end)
      const delta = text.length - (hit.end - hit.start)
      for (let i = this._searchIdx + 1; i < this._searchHits.length; i++) {
        const h = this._searchHits[i]
        if (isSamePath(h.path, hit.path)) { h.start += delta; h.end += delta }
      }
      this.draw.applyActiveDocument(doc)
    }
    this._searchIdx++
    if (this._searchIdx < this._searchHits.length) {
      this._selectHit(this._searchIdx)
      return true
    }
    return false
  }

  private _selectHit(idx: number): void {
    const hit = this._searchHits[idx]
    if (!hit) return
    this.range.setRange({
      anchor: { path: hit.path, offset: hit.start },
      focus: { path: hit.path, offset: hit.end }
    })
  }

  /* -------------------- 未实现命令占位（后续补） -------------------- */

  undo(): void { /* 交由 history 插件 */ }
  redo(): void { /* 交由 history 插件 */ }
}
