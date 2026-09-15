/**
 * VerveDocs Transform —— CommandAdapt
 *
 * 基于路径的树编辑命令。所有命令直接操作 IDocxDocumentMeta.elements 树。
 * 通过 draw.setDocument 通知视图重排（避免直接依赖 view）。
 */

import type {
  IDocxDocumentMeta, IElement, Path, ITextElement,
  ITitleElement, ITableElement, IListElement, ListTypeName, IPosition, IRange, ITd, VerticalAlign,
  IAutoTocItem, IAutoTocResult, DocumentLayout, IBookmark, IEditorOption, BlockNode,
  HistorySnapshot, IHistoryManager, IParagraphStyle, IListNumbering, IDocxTheme
} from '@vervedoc/docx-editor-schema'
import {
  getByPath, getParentContainer, cloneTree, walkTree, isSamePath, splitParagraphs
} from '@vervedoc/docx-editor-schema'
import type { RangeManager, IRangeStyle, IEditorAbility, Listener } from '@vervedoc/docx-editor-state'

// 重新导出迁移至 schema 的跨包共享类型，保持 transform 包 API 兼容
export type { HistorySnapshot, IHistoryManager } from '@vervedoc/docx-editor-schema'

/** 文档编辑区域类型：主体、页眉、页脚 */
export type Zone = 'main' | 'header' | 'footer'

/**
 * DrawLike 接口：描述 CommandAdapt 所依赖的视图/绘制层抽象。
 * 通过该接口隔离命令适配器与具体视图实现，便于测试与解耦。
 */
export interface DrawLike {
  /** 获取当前文档元数据 */
  getDocument(): IDocxDocumentMeta
  /** 设置文档元数据并触发重排 */
  setDocument(doc: IDocxDocumentMeta): void
  /** 获取当前活动文档（根据 zone 切换的文档） */
  getActiveDocument(): IDocxDocumentMeta
  /** 应用活动文档变更 */
  applyActiveDocument(doc: IDocxDocumentMeta): void
  /** 获取文档布局信息，未布局时返回 null */
  getLayout(): DocumentLayout | null
  /** 获取滚动容器元素 */
  getScroller(): HTMLDivElement
  /** 设置页面缩放比例 */
  setScale(scale: number): void
  /** 设置页面尺寸（宽高） */
  setPageSize(width: number, height: number): void
  /** 设置标尺可见性 */
  setRulerVisible(visible: boolean): void
  /** 设置页边距（上、右、下、左） */
  setPaperMargins(margins: [number, number, number, number]): void
  /** 获取编辑器选项 */
  getOptions(): { pageWidth?: number; pageHeight?: number; scale?: number; [key: string]: unknown }
  /** 以补丁方式更新编辑器选项 */
  updateOptions(patch: Partial<IEditorOption>): void
  /** 获取当前编辑区域 */
  getZone(): Zone
  /** 设置当前编辑区域 */
  setZone(zone: Zone): void
  /** 切换编辑区域并设置初始光标到对应区域起始位置 */
  setZoneWithCaret(zone: Zone): void
  /** 打印文档 */
  print(): void
  /** 获取所有页面缩略图（data URL 数组） */
  getPageThumbnails(): string[]
  /** 滚动到指定文档位置使其可见 */
  scrollPositionIntoView?(pos: IPosition): void
  /** 设置系统级水印（DOM 覆盖层），null 表示移除 */
  setSystemWatermark?(config: { data: string; color?: string; opacity?: number; size?: number; font?: string; repeat?: boolean; gapX?: number; gapY?: number } | null): void
}

/**
 * CommandAdapt 类：基于路径的树编辑命令适配器。
 * 所有命令直接操作 IDocxDocumentMeta.elements 树，通过 draw.setDocument 通知视图重排，
 * 避免直接依赖 view。是 Command 门面背后真正执行编辑逻辑的核心实现。
 */
export class CommandAdapt {
  /** 格式刷暂存的文本格式片段，null 表示未启用格式刷 */
  private _paintFmt: Partial<Pick<ITextElement, 'bold' | 'italic' | 'underline' | 'strikeout' | 'color' | 'highlight' | 'font' | 'size'>> | null = null
  /** 当前搜索命中结果列表，每项记录命中的路径与起止偏移 */
  private _searchHits: { path: Path; start: number; end: number }[] = []
  /** 当前搜索命中索引（高亮位置） */
  private _searchIdx = 0
  /** 历史管理器实例，未设置时为 null */
  private _historyManager: IHistoryManager | null = null


  /**
   * 创建 CommandAdapt 实例。
   * @param draw 绘制层抽象，用于读写文档与触发视图更新
   * @param range 选区管理器，用于维护光标与选区
   * @param listener 事件监听器，可选，用于对外发射状态变更事件
   */
  constructor(
    private draw: DrawLike,
    private range: RangeManager,
    private listener?: Listener
  ) {}

  /**
   * 设置历史管理器。
   * @param hm 历史管理器实例
   */
  setHistoryManager(hm: IHistoryManager): void {
    this._historyManager = hm
  }


  /** 计算当前页面内容区宽度（pageWidth - 左右边距） */
  private getContentWidth(): number {
    const opts = this.draw.getOptions()
    const pageWidth = Number(opts.pageWidth ?? 794)
    const margins = (opts.pageMargins as [number, number, number, number] | undefined) ?? [96, 120, 96, 120]
    return Math.max(100, pageWidth - margins[0] - margins[2])
  }

  /** 初始化历史首快照（编辑器就绪后调用一次） */
  pushInitialHistory(): void {
    if (!this._historyManager) return
    this._historyManager.pushInitial({
      doc: cloneTree(this.draw.getDocument()),
      range: this.range.getRange()
    })
  }

  /** 提交变更并推送历史快照，同时通知调用方状态变更 */
  private _commit(doc: IDocxDocumentMeta, coalesceKey?: string): void {
    this.draw.applyActiveDocument(doc)
    if (this._historyManager) {
      this._historyManager.push(
        { doc: cloneTree(this.draw.getDocument()), range: this.range.getRange() },
        coalesceKey
      )
    }
    // 通知调用方：内容变更 + 选区样式变更 + 能力变更（含撤销/重做状态）
    this.listener?.emit('contentChange')
    this.listener?.emit('formatChange', this.getRangeStyle())
    this.listener?.emit('abilityChange', this.getAbility())
  }

  /**
   * 模板方法：获取活动文档 → 执行修改动作 → 提交（重渲染 + 历史 + 事件）。
   *
   * 命令方法只需提供修改逻辑（action），无需手动调 `_commit`。
   * action 返回 `false` 时跳过提交（用于校验失败提前退出）。
   *
   * @param action 修改动作，接收 doc 引用直接 mutate，返回 false 跳过提交
   * @param coalesceKey 历史合并键（如 'text' 用于连续输入合并为一条撤销记录）
   *
   * @example
   * ```ts
   * setBold(): void {
   *   this.execute(doc => {
   *     const pos = this.range.getFocus()
   *     if (!pos) return false
   *     // ... mutate doc
   *   })
   * }
   * ```
   */
  protected execute(
    action: (doc: IDocxDocumentMeta) => boolean | void,
    coalesceKey?: string
  ): void {
    const doc = this.draw.getActiveDocument()
    if (action(doc) !== false) {
      this._commit(doc, coalesceKey)
    }
  }

  /* -------------------- 文本编辑 -------------------- */

  /**
   * 在当前光标位置插入文本。若存在选区则先删除选区再插入。
   * @param text 待插入的文本内容
   */
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
      // 不可迁移：前置 deleteSelection() 可能已 commit
      this._commit(doc, 'text')
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
        // 不可迁移：方法返回 boolean，且有多个 _commit 分支
        this._commit(doc, 'text')
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
    // 不可迁移：方法返回 boolean，且有多个 _commit 分支
    this._commit(doc, 'text')
    return true
  }

  /** 获取文档全文纯文本（所有 text run 的 value 拼接）。 */
  getFullText(): string {
    const doc = this.draw.getDocument()
    return (doc.elements || []).map(el => (el as any).value || '').join('')
  }

  /** 跳转到指定页码（通过设置滚动位置）。 */
  jumpToPage(pageNo: number): void {
    const opts = this.draw.getOptions()
    const pageHeight = Number(opts.pageHeight ?? 1123)
    const pageGap = Number(opts.pageGap ?? 24) * Number(opts.scale ?? 1)
    const scroller = this.draw.getScroller()
    const wrapper = scroller?.parentElement as HTMLElement | null
    if (wrapper) {
      wrapper.scrollTop = pageNo * (pageHeight + pageGap)
    }
  }

  /** 定位到指定修订 ID 的首个元素位置，返回是否找到。 */
  locateRevision(id: string): boolean {
    if (!id) return false
    const doc = this.draw.getDocument()
    const elements = doc.elements || []
    for (let i = 0; i < elements.length; i++) {
      if ((elements[i] as any).revisionId === id) {
        this.setRange(i, i)
        return true
      }
    }
    return false
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

  /**
   * 向后删除一个字符（Backspace 行为）。若有选区则删除选区；否则删除光标前一个字符，
   * 光标位于 run 起点时尝试与前一个 text run 合并。
   */
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
        // 不可迁移：多个 _commit 在不同分支
        this._commit(doc, 'text')
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
            // 不可迁移：多个 _commit 在不同分支
            this._commit(doc, 'text')
          }
        }
      }
    }
  }

  /**
   * 向前删除一个字符（Delete 行为）。若有选区则删除选区；否则删除光标后一个字符。
   */
  deleteForward(): void {
    if (this.deleteSelection()) return
    this.execute(doc => {
      const pos = this.range.getFocus()
      if (!pos) return false
      const node = getByPath(doc.elements, pos.path)
      if (!node || node.type !== 'text') return false
      const t = node as ITextElement
      if (pos.offset >= t.value.length) return false
      t.value = t.value.slice(0, pos.offset) + t.value.slice(pos.offset + 1)
      return
    }, 'text')
  }

  /** Enter 换段：在当前 text run 内切成两半，第二半为新 run；对普通段落即插入零宽段分隔 */
  splitParagraph(): void {
    if (this.deleteSelection()) return
    this.execute(doc => {
      const pos = this.range.getFocus()
      if (!pos) return false
      const node = getByPath(doc.elements, pos.path)
      const parent = getParentContainer(doc.elements, pos.path)
      if (!node || !parent) return false
      if (node.type !== 'text') return false
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
      return
    }, 'text')
  }

  /* -------------------- 光标移动 -------------------- */

  /**
   * 将光标向左移动一位。若已处于 run 起点，则跨 run 向前移动到上一个 text run 末尾。
   */
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

  /**
   * 将光标向右移动一位。若已处于 run 末尾，则跨 run 向后移动到下一个 text run 起点。
   */
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

  /**
   * 设置当前段落的行弹性对齐方式。
   * @param flex 对齐方式：'left' | 'center' | 'right' | 'justify' | 'alignment' | 'distribute'
   */
  setRowFlex(flex: 'left' | 'center' | 'right' | 'justify' | 'alignment' | 'distribute'): void {
    this.execute(doc => {
      const ordered = this.range.getOrdered()
      const pos = ordered?.start ?? this.range.getFocus()
      if (!pos) return false
      const parent = getParentContainer(doc.elements, pos.path)
      if (!parent) return false
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
        return
      }
      return false
    })
  }

  /**
   * 设置当前段落的行高及行高规则。
   * @param lh 行高数值
   * @param rule 行高规则，默认 'auto'
   */
  setLineHeight(lh: number, rule: 'auto' | 'exact' | 'atLeast' = 'auto'): void {
    this.execute(doc => {
      const pos = this.range.getFocus()
      if (!pos) return false
      const parent = getParentContainer(doc.elements, pos.path)
      if (!parent) return false
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
        return
      }
      return false
    })
  }

  /**
   * 段间距（前后各 margin）。
   * @param margin 段前段后间距数值
   */
  setRowMargin(margin: number): void {
    this.execute(doc => {
      const pos = this.range.getFocus()
      if (!pos) return false
      const parent = getParentContainer(doc.elements, pos.path)
      if (!parent) return false
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
        return
      }
      return false
    })
  }

  /* -------------------- run 样式 -------------------- */

  /**
   * 设置选区内 run 的加粗样式。
   * @param bold 是否加粗，省略时为切换语义
   */
  setBold(bold?: boolean): void {
    this.mutateRuns(run => { run.bold = bold }, 'bold')
  }
  /**
   * 设置选区内 run 的斜体样式。
   * @param italic 是否斜体，省略时为切换语义
   */
  setItalic(italic?: boolean): void {
    this.mutateRuns(run => { run.italic = italic }, 'italic')
  }
  /**
   * 设置选区内 run 的文字颜色。
   * @param color 颜色值字符串
   */
  setColor(color: string): void {
    this.mutateRuns(run => { (run as unknown as Record<string, unknown>).color = color })
  }
  /**
   * 设置选区内 run 的字体。
   * @param font 字体名称
   */
  setFont(font: string): void {
    this.mutateRuns(run => { (run as unknown as Record<string, unknown>).font = font })
  }
  /**
   * 设置选区内 run 的字号。
   * @param size 字号数值
   */
  setSize(size: number): void {
    this.mutateRuns(run => { (run as unknown as Record<string, unknown>).size = size })
  }
  /** 增大选区内 run 的字号（步进 2，上限 72）。 */
  setSizeAdd(): void {
    this.mutateRuns(run => { run.size = Math.min(72, (run.size ?? 14) + 2) })
  }
  /** 减小选区内 run 的字号（步进 2，下限 8）。 */
  setSizeMinus(): void {
    this.mutateRuns(run => { run.size = Math.max(8, (run.size ?? 14) - 2) })
  }
  /**
   * 设置选区内 run 的高亮颜色。
   * @param color 高亮颜色值
   */
  setHighlight(color: string): void {
    this.mutateRuns(run => { (run as unknown as Record<string, unknown>).highlight = color })
  }
  /**
   * 设置选区内 run 的删除线。
   * @param v 是否显示删除线，省略时为切换语义
   */
  setStrikeout(v?: boolean): void {
    this.mutateRuns(run => { (run as unknown as Record<string, unknown>).strikeout = v }, 'strikeout')
  }
  /** 设置选区内 run 的双删除线 */
  setDoubleStrikeout(v?: boolean): void {
    this.mutateRuns(run => { (run as unknown as Record<string, unknown>).doubleStrikeout = v })
  }
  /** 设置选区内 run 的隐藏属性 */
  setHidden(v?: boolean): void {
    this.mutateRuns(run => { (run as unknown as Record<string, unknown>).hidden = v })
  }
  /**
   * 设置选区内 run 的下划线。
   * @param v 是否显示下划线，省略时为切换语义
   */
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

  /**
   * 对当前光标所在的 text run 执行变更并提交。
   * @param fn 对目标 run 的变更函数
   */
  private mutateRun(fn: (run: ITextElement) => void): void {
    this.execute(doc => {
      const pos = this.range.getFocus()
      if (!pos) return false
      const node = getByPath(doc.elements, pos.path)
      if (!node || node.type !== 'text') return false
      fn(node as ITextElement)
      return
    })
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
      // 不可迁移：多个分支各自 commit
      this._commit(doc)
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
      // 不可迁移：多个分支各自 commit
      this._commit(doc)
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
    // 不可迁移：多个分支各自 commit
    this._commit(doc)
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

  /**
   * 收集选区范围内的所有 text run。
   * @param elements 文档元素树
   * @param start 选区起点
   * @param end 选区终点
   * @returns 范围内的 text run 数组
   */
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

  /**
   * 设置或取消当前段落的标题级别。level 为 null 时取消标题，否则将当前段落包装为对应级别的标题元素。
   * @param level 标题级别，null 表示取消标题
   */
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
        // 不可迁移：多个 _commit 在不同分支
        this._commit(doc)
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
    // 不可迁移：多个 _commit 在不同分支
    this._commit(doc)
  }

  /**
   * 设置或取消列表。
   * @param type 列表类型名
   * @param style 列表样式
   */
  setList(type: ListTypeName, style: string): void {
    this.execute(doc => {
      const pos = this.range.getFocus()
      if (!pos) return false
      const parent = getParentContainer(doc.elements, pos.path)
      if (!parent) return false
      const idx = pos.path[pos.path.length - 1] as number
      const cur = parent[idx]
      if (!cur) return false
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
      return
    })
  }

  /* -------------------- 表格 -------------------- */

  /**
   * 在当前光标处插入表格。
   * @param rows 行数
   * @param cols 列数
   * @param availableWidth 可用宽度，省略时取内容区宽度
   */
  insertTable(rows: number, cols: number, availableWidth?: number): void {
    this.execute(doc => {
      const pos = this.range.getFocus() ?? { path: [doc.elements.length], offset: 0 }
      const parent = pos.path.length === 1 ? doc.elements : getParentContainer(doc.elements, pos.path)
      if (!parent) return false
      const idx = (pos.path[pos.path.length - 1] as number) + 1
      const contentWidth = availableWidth ?? this.getContentWidth()
      const colWidth = contentWidth / cols
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
      return
    })
  }

  /**
   * 获取当前光标所在的表格上下文信息。
   * @returns 包含 doc/table/tableIndex/trIndex/tdIndex 的对象；光标不在表格内时返回 null
   */
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

  /**
   * 创建一个空的表格单元格。
   * @param width 单元格宽度
   * @returns 空单元格对象
   */
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

  /**
   * 在当前行上方或下方插入指定数量的表格行。
   * @param position 插入位置：'above' | 'below'
   * @param count 插入行数，默认 1
   */
  insertTableRow(position: 'above' | 'below', count = 1): void {
    this.execute(_doc => {
      const ctx = this.getTableContext()
      if (!ctx) return false
      const { table, trIndex } = ctx
      const insertAt = position === 'above' ? trIndex : trIndex + 1
      for (let i = 0; i < count; i++) {
        const newRow = cloneTree(table.trList[trIndex])
        for (const td of newRow.tdList) {
          td.value = [{ type: 'text', value: '' } as IElement]
        }
        table.trList.splice(insertAt + i, 0, newRow)
      }
      return
    })
  }

  /**
   * 在当前列左侧或右侧插入指定数量的表格列，并重新均分列宽。
   * @param position 插入位置：'left' | 'right'
   * @param count 插入列数，默认 1
   */
  insertTableCol(position: 'left' | 'right', count = 1): void {
    this.execute(_doc => {
      const ctx = this.getTableContext()
      if (!ctx) return false
      const { table, tdIndex } = ctx
      const totalWidth = table.colgroup.reduce((s, c) => s + c.width, 0)
      const newColCount = table.colgroup.length + count
      const colWidth = totalWidth / newColCount
      const insertAt = position === 'left' ? tdIndex : tdIndex + 1
      for (let i = 0; i < count; i++) {
        for (const tr of table.trList) {
          const newTd = this.makeEmptyTd(colWidth)
          tr.tdList.splice(insertAt + i, 0, newTd)
        }
        table.colgroup.splice(insertAt + i, 0, { width: colWidth })
      }
      for (const tr of table.trList) {
        for (const td of tr.tdList) td.width = colWidth
      }
      for (const c of table.colgroup) c.width = colWidth
      return
    })
  }

  /** 删除当前表格行（至少保留一行）。 */
  deleteTableRow(): void {
    this.execute(_doc => {
      const ctx = this.getTableContext()
      if (!ctx) return false
      const { table, trIndex } = ctx
      if (table.trList.length <= 1) return false
      table.trList.splice(trIndex, 1)
      return
    })
  }

  /** 删除当前表格列（至少保留一列）。 */
  deleteTableCol(): void {
    this.execute(_doc => {
      const ctx = this.getTableContext()
      if (!ctx) return false
      const { table, tdIndex } = ctx
      if (table.trList[0].tdList.length <= 1) return false
      for (const tr of table.trList) {
        tr.tdList.splice(tdIndex, 1)
      }
      table.colgroup.splice(tdIndex, 1)
      return
    })
  }

  /** 将当前单元格拆分为两个单元格，并均分原列宽。 */
  splitTableCell(): void {
    this.execute(_doc => {
      const ctx = this.getTableContext()
      if (!ctx) return false
      const { table, trIndex, tdIndex } = ctx
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
      return
    })
  }

  /** 选中当前表格的全部内容。 */
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

  /** 合并选区内单元格 */
  mergeTableCells(): void {
    this.execute(_doc => {
      const ctx = this.getTableContext()
      if (!ctx) return false
      const { table } = ctx

      const ordered = this.range.getOrdered()
      if (!ordered) return false
      const { start, end } = ordered
      if (start.path.length < 5 || end.path.length < 5) return false
      if (start.path[0] !== end.path[0]) return false

      const minRow = Math.min(start.path[2] as number, end.path[2] as number)
      const maxRow = Math.max(start.path[2] as number, end.path[2] as number)
      const minCol = Math.min(start.path[4] as number, end.path[4] as number)
      const maxCol = Math.max(start.path[4] as number, end.path[4] as number)

      if (minRow === maxRow && minCol === maxCol) return false

      const firstTd = table.trList[minRow]?.tdList[minCol]
      if (!firstTd) return false

      const allContent: IElement[] = []
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          const td = table.trList[r]?.tdList[c]
          if (td && !td.merged) {
            for (const el of td.value) allContent.push(el)
          }
        }
      }

      firstTd.colspan = maxCol - minCol + 1
      firstTd.rowspan = maxRow - minRow + 1
      firstTd.value = allContent.length > 0 ? allContent : [{ type: 'text', value: '' } as IElement]
      firstTd.width = table.colgroup.slice(minCol, maxCol + 1).reduce((s, c) => s + c.width, 0)

      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          if (r === minRow && c === minCol) continue
          const td = table.trList[r]?.tdList[c]
          if (td) {
            td.merged = true
            td.value = []
          }
        }
      }
      return
    })
  }

  /** 删除整个表格 */
  deleteTable(): void {
    this.execute(doc => {
      const ctx = this.getTableContext()
      if (!ctx) return false
      const { tableIndex } = ctx
      doc.elements.splice(tableIndex, 1)
      return
    })
  }

  /** 设置当前单元格垂直对齐 */
  setCellVerticalAlign(align: VerticalAlign): void {
    this.execute(_doc => {
      const ctx = this.getTableContext()
      if (!ctx) return false
      const { table, trIndex, tdIndex } = ctx
      const td = table.trList[trIndex]?.tdList[tdIndex]
      if (!td) return false
      td.verticalAlign = align
      return
    })
  }

  /** 设置当前单元格底纹颜色 */
  setCellBackground(color: string): void {
    this.execute(_doc => {
      const ctx = this.getTableContext()
      if (!ctx) return false
      const { table, trIndex, tdIndex } = ctx
      const td = table.trList[trIndex]?.tdList[tdIndex]
      if (!td) return false
      td.backgroundColor = color
      return
    })
  }

  /** 切换当前行重复表头 */
  toggleRepeatHeader(): void {
    this.execute(_doc => {
      const ctx = this.getTableContext()
      if (!ctx) return false
      const { table, trIndex } = ctx
      const tr = table.trList[trIndex]
      if (!tr) return false
      tr.pagingRepeat = !tr.pagingRepeat
      return
    })
  }

  /**
   * 设置指定表格列的宽度。
   * @param tableIndex 表格索引
   * @param colIndex 列索引
   * @param width 列宽
   */
  setTableColWidth(tableIndex: number, colIndex: number, width: number): void {
    const doc = this.draw.getDocument()
    const table = doc.elements[tableIndex]
    if (!table || table.type !== 'table') return
    const t = table as ITableElement
    if (colIndex < 0 || colIndex >= t.colgroup.length) return
    const w = Math.max(20, Math.round(width))
    t.colgroup[colIndex].width = w
    for (const tr of t.trList) {
      const td = tr.tdList[colIndex]
      if (td && !td.merged) td.width = w
    }
    // 不可迁移：doc 来自 this.draw.getDocument() 而非 getActiveDocument()
    this._commit(doc)
  }

  /**
   * 设置指定表格行的高度。
   * @param tableIndex 表格索引
   * @param rowIndex 行索引
   * @param height 行高
   */
  setTableRowHeight(tableIndex: number, rowIndex: number, height: number): void {
    const doc = this.draw.getDocument()
    const table = doc.elements[tableIndex]
    if (!table || table.type !== 'table') return
    const t = table as ITableElement
    if (rowIndex < 0 || rowIndex >= t.trList.length) return
    const h = Math.max(20, Math.round(height))
    t.trList[rowIndex].height = h
    // 不可迁移：doc 来自 this.draw.getDocument() 而非 getActiveDocument()
    this._commit(doc)
  }

  /* -------------------- 图片 / 分页 -------------------- */

  /**
   * 在当前光标处插入图片。
   * @param src 图片源，可以是 URL 字符串或包含 value/width/height 的对象
   * @param width 宽度，当 src 为字符串时生效，默认 200
   * @param height 高度，当 src 为字符串时生效，默认 150
   */
  insertImage(src: string | { value: string; width: number; height: number }, width?: number, height?: number): void {
    this.execute(doc => {
      const pos = this.range.getFocus() ?? { path: [doc.elements.length], offset: 0 }
      const imgSrc = typeof src === 'string' ? src : src.value
      const imgW = typeof src === 'string' ? (width ?? 200) : src.width
      const imgH = typeof src === 'string' ? (height ?? 150) : src.height
      const img: IElement = { type: 'image', value: imgSrc, width: imgW, height: imgH } as unknown as IElement
      const topLevelIndex = (pos.path[0] as number) ?? doc.elements.length
      const idx = Math.min(topLevelIndex + 1, doc.elements.length)
      doc.elements.splice(idx, 0, img)
      return
    })
  }

  /** 插入电子签名图片，固定 100×100 */
  signature(dataUrl: string): void {
    this.insertImage({ value: dataUrl, width: 100, height: 100 })
  }

  /**
   * 在当前光标处插入 LaTeX 公式元素。
   * @param payload LaTeX 参数，包含 latex/svg/width/height
   */
  insertLatex(payload: { latex: string; svg: string; width: number; height: number }): void {
    this.execute(doc => {
      const pos = this.range.getFocus() ?? { path: [doc.elements.length], offset: 0 }
      const el: IElement = { type: 'latex', value: payload.latex, laTexSVG: payload.svg, width: payload.width, height: payload.height } as unknown as IElement
      const parent = pos.path.length === 1 ? doc.elements : getParentContainer(doc.elements, pos.path)
      if (!parent) return false
      const idx = (pos.path[pos.path.length - 1] as number) + 1
      parent.splice(idx, 0, el)
      return
    })
  }

  /**
   * 更新指定图片的尺寸。
   * @param path 图片路径
   * @param width 新宽度
   * @param height 新高度
   */
  updateImageSize(path: Path, width: number, height: number): void {
    this.execute(doc => {
      const el = getByPath(doc.elements, path)
      if (!el || el.type !== 'image') return false
      ;(el as unknown as { width: number; height: number }).width = Math.max(1, Math.round(width))
      ;(el as unknown as { width: number; height: number }).height = Math.max(1, Math.round(height))
      return
    })
  }

  /**
   * 删除指定路径的图片元素。
   * @param path 图片路径
   */
  deleteImage(path: Path): void {
    this.execute(doc => {
      const parent = getParentContainer(doc.elements, path)
      if (!parent) return false
      const idx = path[path.length - 1]
      if (typeof idx !== 'number' || idx < 0 || idx >= parent.length) return false
      if (parent[idx].type !== 'image') return false
      parent.splice(idx, 1)
      return
    })
  }

  /**
   * 重置指定图片为原始尺寸（通过加载图片获取 naturalWidth/Height）。
   * @param path 图片路径
   */
  resetImageSize(path: Path): void {
    const doc = this.draw.getActiveDocument()
    const el = getByPath(doc.elements, path) as unknown as { type: string; value?: string; width: number; height: number } | null
    if (!el || el.type !== 'image' || !el.value) return
    const img = new Image()
    img.onload = () => {
      el.width = img.naturalWidth
      el.height = img.naturalHeight
      // 不可迁移：_commit 在异步 onload 回调内
      this._commit(doc)
    }
    img.src = el.value
  }

  /**
   * 设置图片对齐方式。
   * @param path 图片路径
   * @param align 对齐方式：'left' | 'center' | 'right'
   */
  imageAlign(path: Path, align: 'left' | 'center' | 'right'): void {
    this.execute(doc => {
      const el = getByPath(doc.elements, path)
      if (!el || el.type !== 'image') return false
      ;(el as unknown as { rowFlex: string }).rowFlex = align
      return
    })
  }

  /**
   * 替换指定图片：弹出文件选择框，读取本地图片并以 data URL 替换原图片，同时更新尺寸。
   * @param path 图片路径
   */
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
          // 不可迁移：_commit 在异步嵌套回调内
          this._commit(doc)
        }
        img.src = value
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  /**
   * 将指定图片顺时针旋转 90 度。
   * @param path 图片路径
   */
  rotateImage(path: Path): void {
    this.execute(doc => {
      const el = getByPath(doc.elements, path) as unknown as { type: string; rotate?: number; width: number; height: number } | null
      if (!el || el.type !== 'image') return false
      const cur = el.rotate ?? 0
      el.rotate = (cur + 90) % 360
      return
    })
  }

  /**
   * 保存指定图片到本地（触发浏览器下载）。
   * @param path 图片路径
   */
  saveImage(path: Path): void {
    const doc = this.draw.getActiveDocument()
    const el = getByPath(doc.elements, path) as unknown as { type: string; value: string } | null
    if (!el || el.type !== 'image' || !el.value) return
    const a = document.createElement('a')
    a.href = el.value
    a.download = `image-${Date.now()}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  /**
   * 设置图片环绕方式。
   * @param path 图片路径
   * @param mode 环绕模式：'block' | 'surround' | 'floatTop' | 'floatBottom'
   */
  imageWrap(path: Path, mode: 'block' | 'surround' | 'floatTop' | 'floatBottom'): void {
    this.execute(doc => {
      const el = getByPath(doc.elements, path) as unknown as { type: string; imgDisplay?: string; rowFlex?: string } | null
      if (!el || el.type !== 'image') return false
      el.imgDisplay = mode
      if (mode === 'surround' || mode === 'floatTop' || mode === 'floatBottom') el.rowFlex = 'center'
      return
    })
  }

  /** 在当前光标处插入分页符。 */
  insertPageBreak(): void {
    this.execute(doc => {
      const pos = this.range.getFocus() ?? { path: [doc.elements.length], offset: 0 }
      const parent = pos.path.length === 1 ? doc.elements : getParentContainer(doc.elements, pos.path)
      if (!parent) return false
      const idx = (pos.path[pos.path.length - 1] as number) + 1
      parent.splice(idx, 0, { type: 'pageBreak', value: 'manual' } as IElement)
      return
    })
  }

  /**
   * 插入超链接。
   * @param payload 超链接参数，包含 url 与 valueList
   */
  insertHyperlink(payload: { url: string; valueList: IElement[] }): void {
    this.execute(doc => {
      const pos = this.range.getFocus() ?? { path: [doc.elements.length], offset: 0 }
      const parent = pos.path.length === 1 ? doc.elements : getParentContainer(doc.elements, pos.path)
      if (!parent) return false
      const idx = (pos.path[pos.path.length - 1] as number) + 1
      const link: IElement = { type: 'hyperlink', value: payload.url } as unknown as IElement
      ;(link as unknown as Record<string, unknown>).valueList = payload.valueList.map(r => ({ ...r, type: 'text' } as IElement))
      parent.splice(idx, 0, link)
      return
    })
  }

  /**
   * 插入分隔线。
   * @param opts 分隔线选项，可以是对象或数组形式
   */
  insertSeparator(opts?: { lineType?: string; lineWidth?: number; dashArray?: number[]; color?: string } | any[]): void {
    let normalized: { lineType?: string; lineWidth?: number; dashArray?: number[]; color?: string }
    if (Array.isArray(opts)) {
      const base: { lineType: string; lineWidth: number; dashArray: number[] } = { lineType: 'solid', lineWidth: 1, dashArray: [0, 0] }
      if (opts.length === 3) {
        base.lineType = opts[0]; base.lineWidth = opts[1]; base.dashArray = opts[2]
      } else {
        base.dashArray = opts
      }
      normalized = base
    } else if (opts && typeof opts === 'object') {
      normalized = {
        lineType: (opts as any).type || (opts as any).lineType || 'solid',
        lineWidth: (opts as any).width || (opts as any).lineWidth || 1,
        dashArray: (opts as any).dashArray || [0, 0],
        color: (opts as any).color
      }
    } else {
      normalized = { lineType: 'solid', lineWidth: 1, dashArray: [0, 0] }
    }
    this.execute(doc => {
      const pos = this.range.getFocus() ?? { path: [doc.elements.length], offset: 0 }
      const parent = pos.path.length === 1 ? doc.elements : getParentContainer(doc.elements, pos.path)
      if (!parent) return false
      const idx = (pos.path[pos.path.length - 1] as number) + 1
      const sep: IElement = { type: 'separator', value: '' } as unknown as IElement
      const sepAny = sep as unknown as Record<string, unknown>
      if (normalized.lineType != null) sepAny.lineType = normalized.lineType
      if (normalized.lineWidth != null) sepAny.lineWidth = normalized.lineWidth
      if (normalized.dashArray != null) sepAny.dashArray = normalized.dashArray
      if (normalized.color != null) sepAny.color = normalized.color
      parent.splice(idx, 0, sep)
      return
    })
  }

  /** 插入换行符 */
  lineBreak(): void {
    this.insertElementList([{ type: 'text', value: '\n' } as IElement])
  }

  /** 插入分栏符 */
  columnBreak(): void {
    this.insertElementList([{ type: 'text', value: '\n' } as IElement])
  }

  /** 插入连续分节符 */
  sectionBreakContinuous(): void {
    this.insertSeparator({ dashArray: [0, 0] })
  }

  /* -------------------- 内容读写 / 目录 -------------------- */

  /**
   * 获取当前活动文档的全部元素。
   * @returns 文档元素数组
   */
  getValue(): IElement[] {
    return this.draw.getActiveDocument().elements
  }

  /**
   * 完整替换文档内容，并重置编辑区域到 main。
   * @param payload 文档内容，包含 main 及可选的 header/footer/comments
   */
  setValue(payload: {
    main: IElement[]
    header?: IElement[]
    footer?: IElement[]
    comments?: unknown[]
    styles?: Record<string, IParagraphStyle>
    numbering?: Record<string, IListNumbering>
    theme?: IDocxTheme
  }): void {
    // 重置 zone 到 main 并完整替换文档，清除旧数据
    this.draw.setZone('main')
    const prev = this.draw.getDocument()
    this.draw.setDocument({
      ...prev,
      success: true,
      elements: payload.main,
      sections: {
        header: payload.header ?? [],
        footer: payload.footer ?? []
      },
      styles: payload.styles ?? prev.styles,
      numbering: payload.numbering ?? prev.numbering,
      theme: payload.theme ?? prev.theme,
      comments: (payload.comments ?? []) as any
    })
    // 通知文档已替换，由 core 订阅后通知插件同步批注数据（反转原 setCommentHandler 耦合）
    this.listener?.emit('documentSet', this.draw.getDocument())
    if (this._historyManager) {
      this._historyManager.push(
        { doc: cloneTree(this.draw.getDocument()), range: this.range.getRange() },
        undefined
      )
    }
    this.listener?.emit('contentChange')
    this.listener?.emit('formatChange', this.getRangeStyle())
    this.listener?.emit('abilityChange', this.getAbility())
  }

  /**
   * 统计文档字数（所有 text run 的字符数之和）。
   * @returns 字数数值
   */
  getWordCount(): number {
    const doc = this.draw.getActiveDocument()
    let count = 0
    walkTree(doc.elements, (node) => {
      if (node.type === 'text') count += (node as ITextElement).value.length
    })
    return count
  }

  /**
   * 获取文档目录（基于标题元素）。
   * @returns 目录项数组，每项包含 id/level/name
   */
  getToc(): { id: string; level: number; name: string }[] {
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

  /**
   * 定位到指定目录项：滚动到对应标题位置并设置光标。
   * @param id 目录项 ID（序列化的路径字符串）
   */
  locationToc(id: string): void {
    try {
      const path = JSON.parse(id) as Path
      const layout = this.draw.getLayout()
      if (layout) {
        for (const page of layout.pages) {
          for (const b of page.blocks) {
            if (b.kind !== 'paragraph') continue
            const blockPath = b.parentPath.concat(b.startIndex)
            if (blockPath.length === path.length && blockPath.every((v, i) => v === path[i])) {
              const scroller = this.draw.getScroller()
              const scrollContainer = scroller.parentElement as HTMLDivElement
              const absY = page.contentRect.y + b.rect.y
              const targetScrollTop = Math.max(0, absY - scrollContainer.clientHeight / 2)
              scrollContainer.scrollTop = targetScrollTop
              this.range.setCaret({ path, offset: 0 })
              return
            }
          }
        }
      }
      this.range.setCaret({ path, offset: 0 })
    } catch {
      // ignore invalid catalog id
    }
  }

  /**
   * 设置光标位置。
   * @param path 光标路径
   * @param offset 偏移量
   */
  setCaret(path: Path, offset: number): void {
    this.range.setCaret({ path: path.slice() as Path, offset })
  }

  /**
   * 基于布局分页生成自动目录结果（按层级过滤的三组目录）。
   * @returns 包含 toc1/toc2/toc3 的自动目录结果
   */
  getAutoToc(): IAutoTocResult {
    const layout = this.draw.getLayout()
    const empty: IAutoTocResult = { toc1: [], toc2: [], toc3: [] }
    if (!layout) return empty

    const levelMap: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6 }
    const all: IAutoTocItem[] = []

    for (const page of layout.pages) {
      const pageNo = page.index + 1
      for (const b of page.blocks) {
        if (b.kind !== 'paragraph' || b.paragraphKind !== 'title' || !b.block) continue
        const titleEl = b.block as unknown as ITitleElement
        const level = levelMap[titleEl.level] ?? 1
        const name = (titleEl.valueList ?? []).map(v => v.type === 'text' ? (v as ITextElement).value : '').join('')
        const id = JSON.stringify(b.parentPath.concat(b.startIndex))
        // 从排版块中直接取编号文本（由排版引擎通过 listNumbering 计算得到）
        const bulletText = (b as unknown as { bulletText?: string }).bulletText
        const number = bulletText?.trim() || undefined

        all.push({ id, level, name, pageNo, number })
      }
    }

    return {
      toc1: all.filter(i => i.level <= 1),
      toc2: all.filter(i => i.level <= 2),
      toc3: all.filter(i => i.level <= 3)
    }
  }

  /**
   * 在当前光标处插入自动目录文本。
   * @param type 目录类型：1 | 2 | 3，对应不同层级深度
   */
  insertAutoToc(type: 1 | 2 | 3): void {
    const result = this.getAutoToc()
    const items = type === 1 ? result.toc1 : type === 2 ? result.toc2 : result.toc3
    if (items.length === 0) return

    this.execute(doc => {
      const pos = this.range.getFocus() ?? { path: [doc.elements.length], offset: 0 }
      const parent = pos.path.length === 1 ? doc.elements : getParentContainer(doc.elements, pos.path)
      if (!parent) return false
      const idx = (pos.path[pos.path.length - 1] as number) + 1

      const tocElements: IElement[] = items.map(item => ({
        type: 'text',
        valueList: [{
          type: 'text',
          value: '  '.repeat(item.level - 1) + item.name + ' ' + '\u00b7'.repeat(Math.max(3, 50 - item.name.length - item.level * 2)) + ' ' + String(item.pageNo)
        }]
      } as unknown as IElement))

      parent.splice(idx, 0, ...tocElements)
      return
    })
  }

  /* -------------------- 页面 / 打印 -------------------- */

  /**
   * 设置纸张尺寸并发出页面尺寸变更事件。
   * @param width 宽度
   * @param height 高度
   */
  setPaperSize(width: number, height: number): void {
    this.draw.setPageSize(width, height)
    this.listener?.emit('pageSizeChange', { width, height })
  }

  /**
   * 设置纸张方向（纵向/横向），自动调整宽高。
   * @param direction 方向：'vertical' | 'horizontal'
   */
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

  /** 放大页面缩放（步进 0.1，上限 3）。 */
  pageScaleAdd(): void {
    const opts = this.draw.getOptions()
    const scale = Math.min(3, Number(opts.scale ?? 1) + 0.1)
    this.draw.setScale(scale)
    this.listener?.emit('pageScaleChange', scale)
  }

  /** 缩小页面缩放（步进 0.1，下限 0.5）。 */
  pageScaleMinus(): void {
    const opts = this.draw.getOptions()
    const scale = Math.max(0.5, Number(opts.scale ?? 1) - 0.1)
    this.draw.setScale(scale)
    this.listener?.emit('pageScaleChange', scale)
  }

  /**
   * 获取纸张高度（含缩放）。
   * @returns 纸张高度数值
   */
  getPaperHeight(): number {
    const opts = this.draw.getOptions()
    return Number(opts.pageHeight ?? 1123) * Number(opts.scale ?? 1)
  }

  /**
   * 获取编辑器选项。
   * @returns 当前编辑器配置选项
   */
  getOptions(): IEditorOption {
    return this.draw.getOptions() as IEditorOption
  }

  /**
   * 设置页面模式。
   * @param mode 页面模式字符串
   */
  setPageMode(mode: string): void {
    this.draw.updateOptions({ pageMode: mode as 'paging' | 'continuity' })
  }

  /**
   * 设置页面缩放比例。
   * @param scale 缩放比例
   */
  setPageScale(scale: number): void {
    this.draw.setScale(scale)
    this.listener?.emit('pageScaleChange', scale)
  }

  /** 恢复默认缩放比例 */
  setPageScaleRecovery(): void {
    this.draw.setScale(1)
    this.listener?.emit('pageScaleChange', 1)
  }

  /**
   * 设置分栏数。
   * @param value 分栏数量
   */
  setColumns(value: number): void {
    this.draw.updateOptions({ columnCount: value } as Partial<IEditorOption>)
  }

  /**
   * 批量更新编辑器选项。
   * @param patch 选项补丁对象
   */
  updateOptions(patch: Partial<IEditorOption>): void {
    this.draw.updateOptions(patch)
  }

  /**
   * 设置标尺可见性。
   * @param visible 是否可见
   */
  setRulerVisible(visible: boolean): void {
    this.draw.setRulerVisible(visible)
  }

  /**
   * 设置页边距（四边数值取整并保证非负）。
   * @param margins 边距数组，顺序为上、右、下、左
   */
  setPaperMargin(margins: number[]): void {
    const m = [
      Math.max(0, Math.round(margins[0] ?? 0)),
      Math.max(0, Math.round(margins[1] ?? 0)),
      Math.max(0, Math.round(margins[2] ?? 0)),
      Math.max(0, Math.round(margins[3] ?? 0))
    ] as [number, number, number, number]
    this.draw.setPaperMargins(m)
  }

  /** 打印文档。 */
  print(): void {
    this.draw.print()
  }

  /**
   * 获取所有页面缩略图。
   * @returns 缩略图 data URL 数组
   */
  getPageThumbnails(): string[] {
    return this.draw.getPageThumbnails()
  }

  /* -------------------- 水印 -------------------- */

  /**
   * 添加水印。
   * @param payload 水印参数，可包含 data/content/color/opacity/size/font/repeat
   */
  addWatermark(payload: { data?: string; content?: string; color?: string; opacity?: number; size?: number; font?: string; repeat?: boolean; gapX?: number; gapY?: number } | any): void {
    const p = payload || {}
    this.draw.updateOptions({ watermark: {
      data: p.data || p.content || '',
      color: p.color,
      opacity: p.opacity,
      size: p.size,
      font: p.font,
      repeat: p.repeat,
      gapX: p.gapX,
      gapY: p.gapY
    } } as Partial<IEditorOption>)
  }

  /** 删除水印 */
  deleteWatermark(): void {
    this.draw.updateOptions({ watermark: null } as Partial<IEditorOption>)
  }

  /**
   * 设置系统级水印（全页面 DOM 覆盖层）。
   * @param config 水印配置，null 表示移除
   */
  setSystemWatermark(config: { data: string; color?: string; opacity?: number; size?: number; font?: string; repeat?: boolean; gapX?: number; gapY?: number } | null): void {
    this.draw.setSystemWatermark?.(config)
  }

  /** 删除系统级水印 */
  deleteSystemWatermark(): void {
    this.draw.setSystemWatermark?.(null)
  }

  /* -------------------- 查找替换 -------------------- */

  /**
   * 查找关键词，返回命中数，并选中第一个命中。
   * @param keyword 搜索关键字
   * @returns 包含命中数量 count 的结果对象
   */
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

  /**
   * 替换当前命中为 text，跳到下一个命中。返回是否还有命中。opts.index 可指定替换第几个命中。
   * @param text 替换文本
   * @param opts 替换选项，可指定 index
   * @returns 是否还存在后续命中
   */
  replace(text: string, opts?: { index?: number }): boolean {
    if (opts?.index != null && opts.index >= 0 && opts.index < this._searchHits.length) {
      this._searchIdx = opts.index
    }
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
      // 不可迁移：方法返回 boolean
      this._commit(doc)
    }
    this._searchIdx++
    if (this._searchIdx < this._searchHits.length) {
      this._selectHit(this._searchIdx)
      return true
    }
    return false
  }

  /**
   * 定位到指定搜索结果索引。
   * @param idx 搜索结果索引
   */
  locateSearchResult(idx: number): void {

    if (idx < 0 || idx >= this._searchHits.length) return
    this._searchIdx = idx
    this._selectHit(idx)
  }

  /**
   * 获取当前搜索命中列表，每项包含匹配文本及前后上下文片段。
   * @returns 匹配项数组，index 为命中序号，before/match/after 为上下文与匹配文本
   */
  getSearchMatches(): { index: number; before: string; match: string; after: string }[] {
    const doc = this.draw.getActiveDocument()
    const PAD = 50
    const result: { index: number; before: string; match: string; after: string }[] = []

    // 预计算文本元素扁平列表，用于跨元素收集上下文
    const textNodes: { path: Path; value: string }[] = []
    walkTree(doc.elements, (node, ctx) => {
      if (node.type === 'text') {
        textNodes.push({ path: ctx.path.slice() as Path, value: (node as ITextElement).value })
      }
    })

    for (let i = 0; i < this._searchHits.length; i++) {
      const hit = this._searchHits[i]
      const nodeIdx = textNodes.findIndex(t => isSamePath(t.path, hit.path))
      if (nodeIdx === -1) continue
      const value = textNodes[nodeIdx].value
      const match = value.slice(hit.start, hit.end)

      // 向前收集上下文（跨元素），不在开头加 …
      let before = value.slice(Math.max(0, hit.start - PAD), hit.start)
      let needBefore = PAD - before.length
      let niBefore = nodeIdx - 1
      while (needBefore > 0 && niBefore >= 0) {
        const prevValue = textNodes[niBefore].value
        const take = Math.min(needBefore, prevValue.length)
        before = prevValue.slice(prevValue.length - take) + before
        needBefore -= take
        niBefore--
      }

      // 向后收集上下文（跨元素）
      let after = value.slice(hit.end, Math.min(value.length, hit.end + PAD))
      let needAfter = PAD - after.length
      let niAfter = nodeIdx + 1
      while (needAfter > 0 && niAfter < textNodes.length) {
        const nextValue = textNodes[niAfter].value
        const take = Math.min(needAfter, nextValue.length)
        after += nextValue.slice(0, take)
        needAfter -= take
        niAfter++
      }
      if (niAfter < textNodes.length || hit.end + PAD < value.length) after += '…'

      result.push({ index: i, before, match, after })
    }
    return result
  }

  /**
   * 全部替换：先搜索 keyword，逐个替换为 replacement，返回替换计数。
   * @param keyword 搜索关键字
   * @param replacement 替换文本
   * @returns 包含替换数量 count 的结果对象
   */
  replaceAll(keyword: string, replacement: string): { count: number } {
    this.search(keyword)
    let count = 0
    while (this._searchIdx < this._searchHits.length) {
      this.replace(replacement)
      count++
    }
    return { count }
  }

  /**
   * 替换一处搜索结果并继续搜索，返回新的搜索结果。
   * @param result 搜索结果定位信息
   * @param replacement 替换文本
   * @returns 包含新的命中数量 count 的结果对象
   */
  replaceOne(result: { resultIndex: number; keyword: string }, replacement: string): { count: number } {
    if (!result || !replacement) return { count: 0 }
    this.replace(replacement, { index: result.resultIndex })
    return this.search(result.keyword)
  }

  /**
   * 选中指定索引的搜索命中区域。
   * @param idx 搜索命中索引
   */
  private _selectHit(idx: number): void {
    const hit = this._searchHits[idx]

    if (!hit) return
    this.range.setRange({
      anchor: { path: hit.path, offset: hit.start },
      focus: { path: hit.path, offset: hit.end }
    })
    this.draw.scrollPositionIntoView?.({ path: hit.path, offset: hit.start })
  }

  /* -------------------- 书签 -------------------- */

  /**
   * 获取所有书签。
   * @returns 书签数组
   */
  getBookmarks(): IBookmark[] {
    return this.draw.getDocument().bookmarks ?? []
  }

  /**
   * 在当前选区添加书签。
   * @param payload 书签参数，包含 name
   */
  addBookmark(payload: { name: string }): void {
    const range = this.range.getRange()
    if (!range) return
    const doc = this.draw.getDocument()
    const bookmarks = doc.bookmarks ?? []
    if (bookmarks.some(b => b.name === payload.name)) return
    const collapsed = isSamePath(range.anchor.path, range.focus.path) && range.anchor.offset === range.focus.offset
    bookmarks.push({ name: payload.name, range, collapsed })
    doc.bookmarks = bookmarks
    // 不可迁移：doc 来自 this.draw.getDocument() 而非 getActiveDocument()
    this._commit(doc)
  }

  /**
   * 删除指定书签。
   * @param payload 书签参数，包含 name
   */
  deleteBookmark(payload: { name: string }): void {
    const doc = this.draw.getDocument()
    if (!doc.bookmarks) return
    doc.bookmarks = doc.bookmarks.filter(b => b.name !== payload.name)
    // 不可迁移：doc 来自 this.draw.getDocument() 而非 getActiveDocument()
    this._commit(doc)
  }

  /**
   * 跳转到指定书签。
   * @param payload 书签参数，包含 name
   */
  gotoBookmark(payload: { name: string }): void {
    const doc = this.draw.getDocument()
    const bookmark = doc.bookmarks?.find(b => b.name === payload.name)
    if (!bookmark) return
    this.range.setRange(bookmark.range)
    const pos = this.findVisiblePosNearby(doc.elements, bookmark.range.focus) ?? bookmark.range.focus
    this.draw.scrollPositionIntoView?.(pos)
  }

  /**
   * bookmarkMarker 是零宽 run，layout 中无 inline，locateCaret 找不到。
   * 从 marker path 出发，在同一兄弟数组中找相邻的非零宽元素，返回其位置。
   */
  private findVisiblePosNearby(elements: IElement[], pos: IPosition): IPosition | null {
    const path = pos.path
    if (path.length < 1) return null
    const lastSeg = path[path.length - 1]
    if (typeof lastSeg !== 'number') return null
    const parentPath = path.slice(0, -1)
    const parent = parentPath.length === 0 ? elements : getByPath(elements, parentPath as Path)
    if (!Array.isArray(parent)) return null
    const isVisible = (el: unknown): boolean => {
      const v = String((el as { value?: string })?.value ?? '')
      return !!v && !/^[\u200B\uFEFF]+$/.test(v)
    }
    for (let i = lastSeg + 1; i < parent.length; i++) {
      if (isVisible(parent[i])) return { path: [...parentPath, i] as Path, offset: 0 }
    }
    for (let i = lastSeg - 1; i >= 0; i--) {
      if (isVisible(parent[i])) return { path: [...parentPath, i] as Path, offset: 0 }
    }
    return null
  }

  /* -------------------- 目录 -------------------- */

  /**
   * 插入目录，带 tocId 标识便于后续删除。
   * @param payload 目录参数，可包含 type/mode 及其他自定义字段
   */
  insertToc(payload: { type?: 1 | 2 | 3; mode?: string; [key: string]: unknown }): void {
    const type = (payload.type as 1 | 2 | 3) ?? 3
    const result = this.getAutoToc()
    const items = type === 1 ? result.toc1 : type === 2 ? result.toc2 : result.toc3
    if (items.length === 0) return

    this.execute(doc => {
      const pos = this.range.getFocus() ?? { path: [doc.elements.length], offset: 0 }
      const parent = pos.path.length === 1 ? doc.elements : getParentContainer(doc.elements, pos.path)
      if (!parent) return false
      const idx = (pos.path[pos.path.length - 1] as number) + 1

      const tocId = Date.now().toString()
      const tocElements: IElement[] = items.map(item => ({
        type: 'text',
        valueList: [{
          type: 'text',
          value: '  '.repeat(item.level - 1) + item.name + ' ' + '\u00b7'.repeat(Math.max(3, 50 - item.name.length - item.level * 2)) + ' ' + String(item.pageNo)
        }],
        tocId
      } as unknown as IElement))

      parent.splice(idx, 0, ...tocElements)
      return
    })
  }

  /** 删除所有目录元素（带 tocId 标识的元素） */
  removeToc(): void {
    this.execute(doc => {
      const elements = doc.elements
      for (let i = elements.length - 1; i >= 0; i--) {
        if ((elements[i] as unknown as { tocId?: string }).tocId) {
          elements.splice(i, 1)
        }
      }
    })
  }

  /* -------------------- 撤销 / 重做 -------------------- */

  /** 撤销上一步操作，恢复历史快照并通知选区样式与能力变更。 */
  undo(): void {
    if (!this._historyManager) return
    const current: HistorySnapshot = {
      doc: cloneTree(this.draw.getDocument()),
      range: this.range.getRange()
    }
    const prev = this._historyManager.undo(current)
    if (prev) {
      this.draw.setDocument(prev.doc)
      if (prev.range) this.range.setRange(prev.range)
    }
    // 撤销后通知：选区样式变更 + 能力变更（canUndo/canRedo 可能变化）
    this.listener?.emit('formatChange', this.getRangeStyle())
    this.listener?.emit('abilityChange', this.getAbility())
  }

  /** 重做下一步操作，恢复历史快照并通知选区样式与能力变更。 */
  redo(): void {
    if (!this._historyManager) return
    const current: HistorySnapshot = {
      doc: cloneTree(this.draw.getDocument()),
      range: this.range.getRange()
    }
    const next = this._historyManager.redo(current)
    if (next) {
      this.draw.setDocument(next.doc)
      if (next.range) this.range.setRange(next.range)
    }
    // 重做后通知：选区样式变更 + 能力变更
    this.listener?.emit('formatChange', this.getRangeStyle())
    this.listener?.emit('abilityChange', this.getAbility())
  }

  /* -------------------- 区域切换 -------------------- */

  /**
   * 切换编辑区域。切换到页眉/页脚时，将光标定位到对应区域的起始文本位置；
   * 切回正文时清空选区，由后续点击/键盘事件重新定位。
   * @param zone 区域：'main' | 'header' | 'footer'
   */
  setZone(zone: Zone): void {
    this.draw.setZoneWithCaret(zone)
  }

  /** 清除页眉内容并回到正文 */
  clearHeader(): void {
    this.setZone('header')
    this.selectAll()
    this.deleteBackward()
    this.setZone('main')
  }

  /** 清除页脚内容并回到正文 */
  clearFooter(): void {
    this.setZone('footer')
    this.selectAll()
    this.deleteBackward()
    this.setZone('main')
  }

  /**
   * 设置页码配置（与现有配置合并）。
   * @param payload 页码配置对象
   */
  setPageNumber(payload: Record<string, unknown>): void {
    const currentOptions = this.draw.getOptions() || {}
    this.draw.updateOptions({
      ...currentOptions,
      pageNumber: {
        ...((currentOptions as any).pageNumber || {}),
        ...payload
      }
    } as Partial<IEditorOption>)
  }

  /**

   * 获取当前编辑区域。
   * @returns 区域：'main' | 'header' | 'footer'
   */
  getZone(): Zone {
    return this.draw.getZone()
  }

  /* -------------------- 选区 / 全选 -------------------- */

  /** 选中当前活动文档的全部内容。 */
  selectAll(): void {
    const doc = this.draw.getActiveDocument()
    const runs: { path: Path }[] = []
    walkTree(doc.elements, (node, ctx) => {
      if (node.type === 'text') {
        runs.push({ path: ctx.path.slice() as Path })
      }
    })
    if (runs.length === 0) return
    const first = runs[0]
    const last = runs[runs.length - 1]
    const lastNode = getByPath(doc.elements, last.path) as ITextElement | null
    const endOffset = lastNode ? lastNode.value.length : 0
    this.range.setRange({
      anchor: { path: first.path, offset: 0 },
      focus: { path: last.path, offset: endOffset }
    })
  }

  /**
   * 按起止 run 索引设置选区范围。
   * @param startIndex 起始 run 索引
   * @param endIndex 结束 run 索引
   */
  setRange(startIndex: number, endIndex: number): void {
    const doc = this.draw.getActiveDocument()
    const runs: { path: Path }[] = []
    walkTree(doc.elements, (node, ctx) => {
      if (node.type === 'text') {
        runs.push({ path: ctx.path.slice() as Path })
      }
    })
    if (runs.length === 0) return
    const startIdx = Math.max(0, Math.min(startIndex, runs.length - 1))
    const endIdx = Math.max(0, Math.min(endIndex, runs.length - 1))
    const startPath = runs[startIdx].path
    const endPath = runs[endIdx].path
    const endNode = getByPath(doc.elements, endPath) as ITextElement | null
    const endOffset = endNode ? endNode.value.length : 0
    this.range.setRange({
      anchor: { path: startPath, offset: 0 },
      focus: { path: endPath, offset: endOffset }
    })
  }

  /* -------------------- 插入元素列表 -------------------- */

  /**
   * 在当前光标处插入元素列表，若存在选区则先删除选区。
   * @param elements 待插入的元素数组
   */
  insertElementList(elements: IElement[]): void {
    if (!elements || elements.length === 0) return
    this.deleteSelection()
    const doc = this.draw.getActiveDocument()
    const pos = this.range.getFocus() ?? { path: [doc.elements.length], offset: 0 }
    for (const el of elements) {
      const cloned = cloneTree([el])[0]
      if (cloned.type === 'text') {
        const textEl = cloned as ITextElement
        const node = getByPath(doc.elements, pos.path)
        if (node && node.type === 'text') {
          const t = node as ITextElement
          const before = t.value.slice(0, pos.offset)
          const after = t.value.slice(pos.offset)
          t.value = before + textEl.value + after
          pos.offset += textEl.value.length
        } else {
          const parent = pos.path.length === 1 ? doc.elements : getParentContainer(doc.elements, pos.path)
          if (parent) {
            const idx = (pos.path[pos.path.length - 1] as number) + 1
            parent.splice(idx, 0, cloned)
            pos.path = [...pos.path.slice(0, -1), idx] as Path
            pos.offset = 0
          }
        }
      } else {
        const parent = pos.path.length === 1 ? doc.elements : getParentContainer(doc.elements, pos.path)
        if (parent) {
          const idx = (pos.path[pos.path.length - 1] as number) + 1
          parent.splice(idx, 0, cloned)
          pos.path = [...pos.path.slice(0, -1), idx] as Path
          pos.offset = 0
        }
      }
    }
    this.range.setCaret({ path: pos.path.slice() as Path, offset: pos.offset })
    // 不可迁移：前置 deleteSelection() 可能已 commit
    this._commit(doc, 'text')
  }

  /* -------------------- 剪贴板 -------------------- */

  /**
   * 复制当前选区文本。
   * @returns 选区纯文本
   */
  copy(): string {
    return this.extractSelectionText()
  }

  /**
   * 剪切当前选区文本并删除选区。
   * @returns 选区纯文本
   */
  cut(): string {
    const text = this.extractSelectionText()
    this.deleteSelection()
    return text
  }

  /**
   * 粘贴文本（等同于插入文本）。
   * @param text 待粘贴文本
   */
  paste(text: string): void {
    this.insertText(text)
  }

  /**
   * 粘贴纯文本（等同于插入文本）。
   * @param text 待粘贴文本
   */
  pastePlain(text: string): void {
    this.insertText(text)
  }

  /* -------------------- run 扩展样式 -------------------- */

  /** 切换选区内 run 的上标样式（与下标互斥）。 */
  setSuperscript(): void {
    this.mutateRuns(run => {
      const r = run as unknown as Record<string, unknown>
      r.superscript = !r.superscript
      if (r.superscript) r.subscript = false
    }, 'superscript' as keyof ITextElement)
  }

  /** 切换选区内 run 的下标样式（与上标互斥）。 */
  setSubscript(): void {
    this.mutateRuns(run => {
      const r = run as unknown as Record<string, unknown>
      r.subscript = !r.subscript
      if (r.subscript) r.superscript = false
    }, 'subscript' as keyof ITextElement)
  }

  /**
   * 设置选区内 run 的字符缩放比例。
   * @param value 缩放比例
   */
  setCharacterScale(value: number): void {
    this.mutateRuns(run => {
      (run as unknown as Record<string, unknown>).characterScale = value
    })
  }

  /* -------------------- 段落首行缩进 -------------------- */

  /**
   * 设置当前段落的首行缩进。
   * @param indentPx 缩进像素值
   */
  setParagraphFirstLineIndent(indentPx: number): void {
    this.execute(doc => {
      const pos = this.range.getFocus()
      if (!pos) return false
      const parent = getParentContainer(doc.elements, pos.path)
      if (!parent) return false
      const cursorIdx = pos.path[pos.path.length - 1] as number
      const groups = splitParagraphs(parent)
      for (const g of groups) {
        if (cursorIdx < g.start || cursorIdx >= g.end) continue
        const targets = g.block ? [g.block, ...g.runs] : g.runs
        for (const r of targets) {
          (r as unknown as Record<string, unknown>).paragraphFirstLineIndent = indentPx
        }
        return
      }
      return false
    })
  }

  /**
   * 获取当前段落的首行缩进值。
   * @returns 首行缩进像素值
   */
  getFirstLineIndent(): number {
    const doc = this.draw.getActiveDocument()
    const pos = this.range.getFocus()
    if (!pos) return 0
    const parent = getParentContainer(doc.elements, pos.path)
    if (!parent) return 0
    const cursorIdx = pos.path[pos.path.length - 1] as number
    const groups = splitParagraphs(parent)
    for (const g of groups) {
      if (cursorIdx < g.start || cursorIdx >= g.end) continue
      const target = g.block ?? g.runs[0]
      if (!target) return 0
      return Number((target as unknown as Record<string, unknown>).paragraphFirstLineIndent ?? 0)
    }
    return 0
  }

  /**
   * 按方向执行首行缩进步进（步长 20 像素，下限 0）。
   * @param direction 方向：'add' | 'sub'
   */
  indentStep(direction: 'add' | 'sub'): void {
    const step = 20
    const current = this.getFirstLineIndent()
    const next = direction === 'add' ? current + step : Math.max(0, current - step)
    this.setParagraphFirstLineIndent(next)
  }

  /* -------------------- 段落属性通用读写 -------------------- */

  /**
   * 设置当前段落的指定属性值。
   * @param key 属性名（如 paragraphIndentLeft）
   * @param value 属性值
   */
  private setParagraphAttr(key: string, value: number): void {
    this.execute(doc => {
      const pos = this.range.getFocus()
      if (!pos) return false
      const parent = getParentContainer(doc.elements, pos.path)
      if (!parent) return false
      const cursorIdx = pos.path[pos.path.length - 1] as number
      const groups = splitParagraphs(parent)
      for (const g of groups) {
        if (cursorIdx < g.start || cursorIdx >= g.end) continue
        const targets = g.block ? [g.block, ...g.runs] : g.runs
        for (const r of targets) {
          (r as unknown as Record<string, unknown>)[key] = value
        }
        return
      }
      return false
    })
  }

  /**
   * 获取当前段落的指定属性值。
   * @param key 属性名
   * @returns 属性数值
   */
  private getParagraphAttr(key: string): number {
    const doc = this.draw.getActiveDocument()
    const pos = this.range.getFocus()
    if (!pos) return 0
    const parent = getParentContainer(doc.elements, pos.path)
    if (!parent) return 0
    const cursorIdx = pos.path[pos.path.length - 1] as number
    const groups = splitParagraphs(parent)
    for (const g of groups) {
      if (cursorIdx < g.start || cursorIdx >= g.end) continue
      const target = g.block ?? g.runs[0]
      if (!target) return 0
      return Number((target as unknown as Record<string, unknown>)[key] ?? 0)
    }
    return 0
  }

  /* -------------------- 左/右缩进 -------------------- */

  /** 设置左缩进（px） */
  setParagraphIndentLeft(px: number): void { this.setParagraphAttr('paragraphIndentLeft', px) }
  /** 获取左缩进（px） */
  getParagraphIndentLeft(): number { return this.getParagraphAttr('paragraphIndentLeft') }

  /** 设置右缩进（px） */
  setParagraphIndentRight(px: number): void { this.setParagraphAttr('paragraphIndentRight', px) }
  /** 获取右缩进（px） */
  getParagraphIndentRight(): number { return this.getParagraphAttr('paragraphIndentRight') }

  /* -------------------- 段前/段后间距 -------------------- */

  /** 设置段前间距（px） */
  setParagraphSpacingBefore(px: number): void { this.setParagraphAttr('paragraphSpacingBefore', px) }
  /** 获取段前间距（px） */
  getParagraphSpacingBefore(): number { return this.getParagraphAttr('paragraphSpacingBefore') }

  /** 设置段后间距（px） */
  setParagraphSpacingAfter(px: number): void { this.setParagraphAttr('paragraphSpacingAfter', px) }
  /** 获取段后间距（px） */
  getParagraphSpacingAfter(): number { return this.getParagraphAttr('paragraphSpacingAfter') }

  /**
   * 获取当前选区范围。
   * @returns 选区范围对象，无选区时返回 null
   */
  getRange(): IRange | null {
    return this.range.getRange()
  }

  /**
   * 获取是否只读状态。
   * @returns 是否只读
   */
  getIsReadonly(): boolean {
    return !!this.draw.getOptions().readonly
  }

  /**
   * 获取是否禁用状态。
   * @returns 是否禁用
   */
  getIsDisabled(): boolean {
    return !!this.draw.getOptions().disabled
  }

  /**
   * 获取是否可输入状态（非只读且非禁用）。
   * @returns 是否可输入
   */
  getIsCanInput(): boolean {
    return !this.getIsReadonly() && !this.getIsDisabled()
  }

  /**
   * 获取当前选区样式快照（bold/italic/underline 等回显状态）
   * @returns 选区样式状态对象
   */
  getRangeStyle(): IRangeStyle {
    const doc = this.draw.getActiveDocument()
    const pos = this.range.getFocus()

    /** 默认样式快照 */
    const defaultStyle: IRangeStyle = {
      type: null, bold: false, italic: false, underline: false, strikeout: false,
      doubleStrikeout: false, hidden: false, superscript: false, subscript: false,
      color: '', highlight: '', font: '', size: 0, level: null,
      rowFlex: 'left', lineHeight: 1.5, lineHeightRule: 'auto', paragraphFirstLineIndent: 0,
      characterScale: 100, painter: !!this._paintFmt,
      undo: this._historyManager?.canUndo() ?? false,
      redo: this._historyManager?.canRedo() ?? false
    }

    if (!pos) return defaultStyle

    const parent = getParentContainer(doc.elements, pos.path)
    if (!parent) return defaultStyle

    const cursorIdx = pos.path[pos.path.length - 1] as number
    const el = parent[cursorIdx] as Record<string, unknown> | undefined
    if (!el) return defaultStyle

    // 段落级属性：从段落第一个有该属性的元素获取（光标所在元素可能缺少段落级属性）
    const groups = splitParagraphs(parent)
    let paraEl: Record<string, unknown> = el
    for (const g of groups) {
      if (cursorIdx < g.start || cursorIdx >= g.end) continue
      for (const r of g.runs) {
        const candidate = r as Record<string, unknown>
        if (candidate.rowFlex !== undefined) {
          paraEl = candidate
          break
        }
      }
      break
    }

    return {
      type: (el.type as string) ?? null,
      bold: !!el.bold,
      italic: !!el.italic,
      underline: !!el.underline,
      strikeout: !!el.strikeout,
      doubleStrikeout: !!el.doubleStrikeout,
      hidden: !!el.hidden,
      superscript: !!el.superscript,
      subscript: !!el.subscript,
      color: (el.color as string) ?? '',
      highlight: (el.highlight as string) ?? '',
      font: (el.font as string) ?? '',
      size: Math.round(((el.size as number) ?? 0) * (72 / 96) * 2) / 2,
      level: el.type === 'title' ? (el.level as string) ?? null : null,
      rowFlex: (paraEl.rowFlex as string) ?? 'left',
      lineHeight: (paraEl.lineHeight as number) ?? 1.5,
      lineHeightRule: (paraEl.lineHeightRule as string) ?? 'auto',
      paragraphFirstLineIndent: (paraEl.paragraphFirstLineIndent as number) ?? 0,
      characterScale: (el.characterScale as number) ?? 100,
      painter: !!this._paintFmt,
      undo: this._historyManager?.canUndo() ?? false,
      redo: this._historyManager?.canRedo() ?? false
    }
  }

  /**
   * 获取光标所在行/列信息（基于布局可视行计数）
   * @returns 行列信息，-1 表示无有效光标
   */
  getRangeContext(): { startRowNo: number; startColNo: number } {
    const pos = this.range.getFocus()
    const layout = this.draw.getLayout()
    if (!pos || !layout) return { startRowNo: -1, startColNo: -1 }

    let rowNo = 0
    for (const page of layout.pages) {
      const result = this.findRowColInBlocks(page.blocks, pos, rowNo)
      if (result) return result
    }
    return { startRowNo: -1, startColNo: -1 }
  }

  /**
   * 在布局块中查找光标所在行/列信息。
   * @param blocks 布局块数组
   * @param pos 光标位置
   * @param startRow 起始行号
   * @returns 行列信息对象；未找到时返回 null
   */
  private findRowColInBlocks(blocks: BlockNode[], pos: IPosition, startRow: number): { startRowNo: number; startColNo: number } | null {
    let rowNo = startRow
    for (const b of blocks) {
      if (b.kind === 'paragraph') {
        for (const line of b.lines) {
          for (const inl of line.inlines) {
            if (isSamePath(inl.path, pos.path) && pos.offset >= inl.startOffset && pos.offset <= inl.endOffset) {
              let colNo = 0
              for (const prev of line.inlines) {
                if (prev === inl) {
                  colNo += pos.offset - prev.startOffset
                  break
                }
                colNo += prev.text.length
              }
              return { startRowNo: rowNo, startColNo: colNo }
            }
          }
          rowNo++
        }
      } else if (b.kind === 'table') {
        for (const row of b.rows) {
          let maxLinesInRow = 1
          for (const cell of row.cells) {
            const cellLines = this.countLinesInBlocks(cell.content)
            const result = this.findRowColInBlocks(cell.content, pos, rowNo)
            if (result) return result
            if (cellLines > maxLinesInRow) maxLinesInRow = cellLines
          }
          rowNo += maxLinesInRow
        }
      }
    }
    return null
  }

  /**
   * 统计布局块中的行数（表格按各行最大行数累加）。
   * @param blocks 布局块数组
   * @returns 行数总计
   */
  private countLinesInBlocks(blocks: BlockNode[]): number {
    let count = 0
    for (const b of blocks) {
      if (b.kind === 'paragraph') {
        count += b.lines.length
      } else if (b.kind === 'table') {
        for (const row of b.rows) {
          let maxLinesInRow = 1
          for (const cell of row.cells) {
            const cellLines = this.countLinesInBlocks(cell.content)
            if (cellLines > maxLinesInRow) maxLinesInRow = cellLines
          }
          count += maxLinesInRow
        }
      }
    }
    return count
  }

  /**
   * 获取编辑器能力状态快照（readonly/disabled/canUndo/canRedo）
   * @returns 能力状态对象
   */
  getAbility(): IEditorAbility {
    return {
      readonly: this.getIsReadonly(),
      disabled: this.getIsDisabled(),
      canInput: this.getIsCanInput(),
      canUndo: this._historyManager?.canUndo() ?? false,
      canRedo: this._historyManager?.canRedo() ?? false
    }
  }

  /**
   * 设置编辑器模式（paging/continuity/readonly/edit），并通知能力变更。
   * @param mode 模式字符串
   */
  setMode(mode: string): void {
    if (mode === 'paging' || mode === 'continuity') {
      this.draw.updateOptions({ pageMode: mode })
    } else if (mode === 'readonly') {
      this.draw.updateOptions({ readonly: true } as Partial<IEditorOption>)
    } else if (mode === 'edit') {
      this.draw.updateOptions({ readonly: false } as Partial<IEditorOption>)
    }
    // 模式切换后通知能力变更（readonly/disabled 状态可能变化）
    this.listener?.emit('abilityChange', this.getAbility())
  }

  /**
   * 导出为 docx 文档（调用 options.exportCallback）。
   * @param payload 导出参数
   * @returns 完成时 resolve 的 Promise
   */
  async exportDocx(payload: any): Promise<void> {
    const cb = this.draw.getOptions().exportCallback as ((data: any, opts?: any) => Promise<any>) | undefined
    if (cb) {
      await cb(this.draw.getDocument(), payload)
    }
  }

  /**
   * 预览 HTML 内容（调用 options.previewCallback）。
   * @param payload 预览参数
   */
  previewHtml(payload: any): void {
    const cb = this.draw.getOptions().previewCallback as ((data: any, opts?: any) => void) | undefined
    if (cb) {
      cb(this.draw.getDocument(), payload)
    }
  }

  /**
   * 替换当前选区范围。
   * @param range 新的选区范围，可为 null
   */
  replaceRange(range: IRange | null): void {
    this.range.setRange(range)
  }

  /** 将当前选区内的元素标记为同一群组，返回 groupId 或 null。 */
  setGroup(): string | null {
    const doc = this.draw.getActiveDocument()
    const ordered = this.range.getOrdered()
    if (!ordered) return null
    const groupId = `g_${Date.now()}`
    const startPath = ordered.start.path
    const endPath = ordered.end.path

    // 顶层段落选区：对段落元素打 groupId
    if (startPath.length === 1 && endPath.length === 1) {
      const start = startPath[0] as number
      const end = endPath[0] as number
      for (let i = start; i <= end; i++) {
        const el = doc.elements[i]
        if (el) (el as unknown as Record<string, unknown>).groupId = groupId
      }
      // 不可迁移：方法返回 string|null，且在循环中 commit 后 return
      this._commit(doc)
      return groupId
    }

    // inline 级选区/光标：对所在段落的 run 追加 groupIds
    const pos = ordered.start
    const parent = getParentContainer(doc.elements, pos.path)
    if (!parent) return null
    const cursorIdx = pos.path[pos.path.length - 1] as number
    const groups = splitParagraphs(parent)
    for (const g of groups) {
      if (cursorIdx < g.start || cursorIdx >= g.end) continue
      for (const r of g.runs) {
        const any = r as unknown as Record<string, unknown>
        const ids = (any.groupIds as string[] | undefined) ?? []
        if (!ids.includes(groupId)) any.groupIds = [...ids, groupId]
      }
      // 不可迁移：方法返回 string|null，且在循环中 commit 后 return
      this._commit(doc)
      return groupId
    }
    return null
  }

  /**
   * 定位到指定群组的第一个元素。
   * @param id 群组 ID
   */
  locationGroup(id: string): void {
    const doc = this.draw.getActiveDocument()
    for (let i = 0; i < doc.elements.length; i++) {
      const el = doc.elements[i]
      if ((el as unknown as Record<string, unknown>).groupId === id) {
        this.range.setCaret({ path: [i], offset: 0 })
        return
      }
    }
  }

  /* -------------------- 表格边框 -------------------- */

  /**
   * 设置当前光标所在表格的边框类型（none/outside/all 等）。
   * @param type 边框类型字符串
   */
  setTableBorderType(type: string): void {
    const t = String(type || '').trim().toLowerCase()
    const resolved =
      t === 'none' || t === 'empty' || t === 'no' ? 'none'
      : t === 'outside' || t === 'external' || t === 'box' ? 'outside'
      : t === 'all' || t === 'full' || t === '' ? 'all'
      : t
    this.execute(doc => {
      const pos = this.range.getFocus()
      if (!pos) return false
      const table = this._findEnclosingTable(doc.elements, pos.path)
      if (!table) return false
      const t2 = table as unknown as { border?: Record<string, unknown> }
      if (!t2.border) t2.border = {}
      t2.border.style = resolved
      return
    })
  }

  /**
   * 设置当前光标所在表格的边框颜色。
   * @param color 颜色值
   */
  setTableBorderColor(color: string): void {
    this.execute(doc => {
      const pos = this.range.getFocus()
      if (!pos) return false
      const table = this._findEnclosingTable(doc.elements, pos.path)
      if (!table) return false
      const t = table as unknown as { border?: Record<string, unknown> }
      if (!t.border) t.border = {}
      t.border.color = color
      return
    })
  }

  /**
   * 设置当前光标所在表格的边框宽度。
   * @param width 宽度数值
   */
  setTableBorderWidth(width: number): void {
    this.execute(doc => {
      const pos = this.range.getFocus()
      if (!pos) return false
      const table = this._findEnclosingTable(doc.elements, pos.path)
      if (!table) return false
      const t = table as unknown as { border?: Record<string, unknown> }
      if (!t.border) t.border = {}
      t.border.width = width
      return
    })
  }

  /**
   * 设置当前光标所在表格的外部边框宽度。
   * @param width 宽度数值
   */
  setTableBorderExternalWidth(width: number): void {
    this.execute(doc => {
      const pos = this.range.getFocus()
      if (!pos) return false
      const table = this._findEnclosingTable(doc.elements, pos.path)
      if (!table) return false
      const t = table as unknown as { border?: Record<string, unknown> }
      if (!t.border) t.border = {}
      t.border.externalWidth = width
      return
    })
  }

  /**
   * 沿路径查找包含指定路径的最近表格元素。
   * @param elements 文档元素树
   * @param path 目标路径
   * @returns 包裹该路径的表格元素；不存在时返回 null
   */
  private _findEnclosingTable(elements: IElement[], path: Path): ITableElement | null {
    for (let i = 0; i < path.length; i++) {
      const subPath = path.slice(0, i + 1) as Path
      const node = getByPath(elements, subPath)
      if (node && node.type === 'table') return node as ITableElement
    }
    return null
  }


  /* -------------------- 图表 -------------------- */

  /**
   * 在当前光标处插入图表元素（构造 IBlockElement 嵌套结构）。
   * @param payload 图表参数：chartType/subtype/dataSource/config/width/height
   */
  insertChart(payload: { chartType: string; subtype?: string; dataSource: any; config?: any; width?: number; height?: number }): void {
    this.execute(doc => {
      const pos = this.range.getFocus() ?? { path: [doc.elements.length], offset: 0 }
      const el: IElement = {
        type: 'block',
        value: '',
        id: `chart_${Date.now()}`,
        block: {
          type: 'chart',
          chartBlock: {
            chartType: payload.chartType,
            dataSource: payload.dataSource,
            config: payload.config,
            subtype: payload.subtype
          }
        },
        metrics: {
          width: payload.width ?? 420,
          height: payload.height ?? 320
        }
      } as unknown as IElement
      // chart 是块级元素，始终插入到顶层 doc.elements（光标可能在 title/list/table 等嵌套结构内，
      // 取 path[0] 作为顶层索引，插入到该顶层元素之后）
      const topLevelIndex = (pos.path[0] as number) ?? doc.elements.length
      const idx = Math.min(topLevelIndex + 1, doc.elements.length)
      doc.elements.splice(idx, 0, el)
      return
    })
  }

  /**
   * 更新指定图表的属性（写入 block.chartBlock）。
   * @param id 图表元素 ID
   * @param patch 属性补丁对象
   */
  updateChart(id: string, patch: Record<string, unknown>): void {
    this.execute(doc => {
      walkTree(doc.elements, (node) => {
        const n = node as unknown as {
          type: string; id?: string
          block?: { type: string; chartBlock?: Record<string, unknown> }
        }
        if (n.type === 'block' && n.id === id && n.block?.type === 'chart' && n.block.chartBlock) {
          Object.assign(n.block.chartBlock, patch)
        }
      })
    })
  }

  /**
   * 更新指定路径图表块的尺寸（写入 metrics.width/height）。
   * @param path 图表路径
   * @param width 新宽度
   * @param height 新高度
   */
  updateChartSize(path: Path, width: number, height: number): void {
    this.execute(doc => {
      const el = getByPath(doc.elements, path)
      if (!el || el.type !== 'block') return false
      const metrics = (el as unknown as { metrics?: { width: number; height: number } }).metrics
      if (!metrics) return false
      metrics.width = Math.max(1, Math.round(width))
      metrics.height = Math.max(1, Math.round(height))
      return
    })
  }

  /**
   * 删除指定路径的块元素（图表等）。
   * @param path 块路径
   */
  deleteBlock(path: Path): void {
    this.execute(doc => {
      const parent = getParentContainer(doc.elements, path)
      if (!parent) return false
      const idx = path[path.length - 1]
      if (typeof idx !== 'number' || idx < 0 || idx >= parent.length) return false
      if (parent[idx].type !== 'block') return false
      parent.splice(idx, 1)
      return
    })
  }

  /* -------------------- 评论组删除 -------------------- */

  /**
   * 删除指定评论组。
   * @param groupId 评论组 ID
   */
  deleteGroup(groupId: string): void {
    this.execute(doc => {
      walkTree(doc.elements, (node) => {
        const any = node as unknown as Record<string, unknown>
        const ids = any.groupIds as string[] | undefined
        if (ids && ids.includes(groupId)) {
          const next = ids.filter(id => id !== groupId)
          if (next.length === 0) delete any.groupIds
          else any.groupIds = next
        }
        if (any.groupId === groupId) delete any.groupId
      })
      const groups = (doc as unknown as { comments?: { groups?: { id: string }[] } }).comments?.groups
      if (groups) {
        const idx = groups.findIndex(g => g.id === groupId)
        if (idx >= 0) {
          groups.splice(idx, 1)
        }
      }
    })
  }
}
