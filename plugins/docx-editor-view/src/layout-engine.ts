/**
 * VerveDocs View —— LayoutEngine
 *
 * 坐标系约定：
 *  - block.rect.x/y = 相对父容器（页面内容原点 或 单元格内容原点）
 *  - line.x/y      = 相对块本地（0 起始）
 *  - inline.x/y/baseline = 相对块本地
 *  - TableRow/Cell rect = 相对 table 本地
 *
 * 绘制时递归传入偏移量（origin），把局部坐标累加为屏幕坐标。
 */

import type {
  IElement,
  IListElement,
  ITableElement,
  Path
} from '@vervedoc/docx-editor-schema'
import { splitParagraphs } from '@vervedoc/docx-editor-schema'
import type {
  DocumentLayout, PageLayout, BlockNode, ParagraphBlock,
  ImageBlock, PageBreakBlock, TableBlock, TableRowLayout, TableCellLayout,
  LineBox, InlineBox, Rect
} from './layout-types'
import { TextMeasure, getSharedMeasure } from './text-measure'
import { resolveBullet, BULLET_FONT_STACK, BULLET_FONT_STACK_FALLBACK, detectWingdings } from './list-bullet'

export interface LayoutOptions {
  pageWidth: number
  pageHeight: number
  pageMargins: [number, number, number, number]   // top, right, bottom, left
  defaultFont: string
  defaultSize: number
  defaultLineHeight: number
  scale: number
  /** 页首/尾垂直空白（渲染视觉上把纸张与边界隔开） */
  pageGap: number
}

let _blockSeq = 0
function nextBlockId(): number { return ++_blockSeq }

export class LayoutEngine {
  private measure: TextMeasure
  private opts: LayoutOptions
  /** 跨列表的多级编号计数器（每次 layout() 重置） */
  private counters = new Map<string, number>()

  constructor(options: LayoutOptions, measure?: TextMeasure) {
    this.opts = options
    this.measure = measure ?? getSharedMeasure()
  }

  updateOptions(options: LayoutOptions): void {
    this.opts = options
  }

  /**
   * 顶层入口：把 elements 排版成分页 layout。
   */
  layout(elements: IElement[]): DocumentLayout {
    this.counters.clear()
    const { pageWidth, pageHeight, pageMargins, pageGap } = this.opts
    const [mt, mr, mb, ml] = pageMargins
    const contentWidth = pageWidth - ml - mr
    const contentHeight = pageHeight - mt - mb

    // 生成顶层 block 列表（rect.y 相对父容器，需要重排以分页）
    const rawBlocks = this.layoutBlocks(elements, [], contentWidth)

    // 分页
    const pages: PageLayout[] = []
    let pageIndex = 0
    let cursorY = 0
    let currentBlocks: BlockNode[] = []

    const pushPage = () => {
      const pageOriginY = pageGap + pageIndex * (pageHeight + pageGap)
      const pageRect: Rect = { x: 0, y: pageOriginY, width: pageWidth, height: pageHeight }
      const contentRect: Rect = {
        x: ml,
        y: pageOriginY + mt,
        width: contentWidth,
        height: contentHeight
      }
      pages.push({ index: pageIndex, rect: pageRect, contentRect, blocks: currentBlocks })
      pageIndex++
      currentBlocks = []
      cursorY = 0
    }

    for (let i = 0; i < rawBlocks.length; i++) {
      const b = rawBlocks[i]
      if (b.kind === 'pageBreak') {
        if (currentBlocks.length > 0) pushPage()
        else { pageIndex++ }
        continue
      }
      const bh = b.rect.height
      if (cursorY + bh > contentHeight && currentBlocks.length > 0) {
        pushPage()
      }
      b.rect.y = cursorY
      currentBlocks.push(b)
      cursorY += bh
    }
    if (currentBlocks.length > 0) pushPage()
    else if (pages.length === 0) pushPage()

    const totalHeight = pageGap + pages.length * (pageHeight + pageGap)
    return { pages, totalHeight, pageWidth }
  }

  /**
   * 将 elements 数组转换为 BlockNode 列表（y 起始为 0，返回后由上层重新分配 y）。
   */
  private layoutBlocks(elements: IElement[], parentPath: Path, availableWidth: number): BlockNode[] {
    const paragraphs = splitParagraphs(elements)
    const blocks: BlockNode[] = []
    for (const g of paragraphs) {
      if (g.kind === 'table') {
        blocks.push(this.layoutTable(g.block as ITableElement, parentPath, g.start, availableWidth))
      } else if (g.kind === 'image') {
        blocks.push(this.layoutImage(g.block as IElement, parentPath, g.start, availableWidth))
      } else if (g.kind === 'pageBreak') {
        blocks.push({
          kind: 'pageBreak',
          id: nextBlockId(),
          block: g.block as IElement,
          parentPath,
          indexInParent: g.start,
          rect: { x: 0, y: 0, width: availableWidth, height: 0 }
        } as PageBreakBlock)
      } else {
        const kind: ParagraphBlock['paragraphKind'] = g.kind === 'normal' ? 'normal' : g.kind
        const runsParentPath: Path = (kind === 'normal')
          ? parentPath
          : [...parentPath, g.start, 'valueList']
        blocks.push(this.layoutParagraph({
          paragraphKind: kind,
          block: g.block,
          runs: g.runs,
          runsParentPath,
          startIndex: g.start,
          endIndex: g.end,
          parentPath,
          availableWidth
        }))
      }
    }
    return blocks
  }

  private layoutParagraph(input: {
    paragraphKind: ParagraphBlock['paragraphKind']
    block: IElement | null
    runs: IElement[]
    runsParentPath: Path
    startIndex: number
    endIndex: number
    parentPath: Path
    availableWidth: number
  }): ParagraphBlock {
    const {
      paragraphKind, block, runs, runsParentPath,
      startIndex, endIndex, parentPath, availableWidth
    } = input

    // 段落属性优先级：block（title/list 容器） > 段内任一 run（docx-parser 会把 pPr 附在 run 上，未必是第 1 个）
    // 段落级属性字段集合
    const PARA_KEYS = [
      'rowFlex',
      'paragraphStyleId',
      'paragraphFirstLineIndent',
      'paragraphIndentLeft',
      'paragraphIndentRight',
      'indentHanging',
      'paragraphSpacingBefore',
      'paragraphSpacingAfter',
      'lineHeight',
      'lineHeightRule'
    ] as const
    const containerAttrs = (block ?? {}) as unknown as Record<string, unknown>
    // 扫描所有 runs，收集段落级属性（第一个非空值胜出）
    const collectedRunAttrs: Record<string, unknown> = {}
    for (const r of runs) {
      const ra = r as unknown as Record<string, unknown>
      for (const k of PARA_KEYS) {
        if (collectedRunAttrs[k] == null && ra[k] != null) {
          collectedRunAttrs[k] = ra[k]
        }
      }
    }
    const attr = (key: string): unknown =>
      containerAttrs[key] != null ? containerAttrs[key] : collectedRunAttrs[key]

    const rowFlex = (attr('rowFlex') as LineBox['rowFlex']) || 'left'
    const firstIndent = Number(attr('paragraphFirstLineIndent') ?? 0)
    let indentLeft = Number(attr('paragraphIndentLeft') ?? 0)
    const indentRight = Number(attr('paragraphIndentRight') ?? 0)
    // 悬挂缩进：正值表示首行相对后续行左移 hangIndent
    const indentHanging = Number(attr('indentHanging') ?? 0)
    const spacingBefore = Number(attr('paragraphSpacingBefore') ?? 0)
    const spacingAfter = Number(attr('paragraphSpacingAfter') ?? 0)
    const rawLineHeight = Number(attr('lineHeight') ?? this.opts.defaultLineHeight)
    const lineHeightRule = (attr('lineHeightRule') as string) || 'auto'

    // 项目符号（跟随首个 run 的字体/字号/颜色/粗细）
    let bulletKind: 'symbol' | 'text' | undefined
    let bulletText: string | undefined
    let bulletWidth = 0
    let bulletFont: string | undefined
    let bulletSize: number | undefined
    let bulletColor: string | undefined
    let bulletBold: boolean | undefined
    if (paragraphKind === 'list' && block) {
      const listEl = block as IListElement
      const res = resolveBullet(listEl, this.counters)
      // 层级缩进
      const level = Math.max(0, listEl.listLevel ?? 0)
      const listHanging = Number(listEl.listHanging ?? listEl.listNumbering?.indentHanging ?? 24)
      const listBaseIndent = Number(listEl.listIndent ?? listEl.listNumbering?.indentLeft ?? 0)
      indentLeft = Math.max(indentLeft, listBaseIndent + level * listHanging)
      // 字体/字号/颜色 取自首个 text run
      const firstText = runs.find(r => r.type === 'text') as IElement | undefined
      const fa = firstText as unknown as Record<string, unknown> | undefined
      bulletSize = Number(fa?.size ?? this.opts.defaultSize)
      bulletColor = String(fa?.color ?? '#000000')
      bulletBold = !!fa?.bold

      if (res.isSymbol) {
        // 无序符号：使用符号字体栈（含 Wingdings）
        bulletKind = 'symbol'
        bulletFont = detectWingdings() ? BULLET_FONT_STACK : BULLET_FONT_STACK_FALLBACK
        bulletText = res.text
      } else {
        // 有序编号：使用文本字体
        bulletKind = 'text'
        bulletFont = String(fa?.font ?? this.opts.defaultFont)
        bulletText = res.text
      }
      // 度量宽度：符号后加固定间距（half em）
      const symbolGap = bulletSize * 0.4
      const glyphW = this.measure.textWidth(bulletText, bulletFont, bulletSize, bulletBold)
      bulletWidth = glyphW + symbolGap
    }

    // 每一行的可用宽度基准（去掉左右缩进 + bullet 宽度；首行额外扣 firstIndent；悬挂缩进影响非首行的起点）
    const usableWidth = Math.max(20, availableWidth - indentLeft - indentRight - bulletWidth)
    const lines: LineBox[] = []
    let currentInlines: InlineBox[] = []
    let currentLineWidth = 0
    let currentMaxSize = this.opts.defaultSize
    let isFirstLine = true

    // 悬挂缩进：首行使用 indentLeft，非首行 = indentLeft + hangIndent
    // 首行缩进（firstIndent）与悬挂缩进互斥（Word 语义）：hangIndent 有值时 firstIndent 视为 0
    const useHanging = indentHanging > 0
    const currentLineMaxWidth = (): number => {
      let w = usableWidth
      if (isFirstLine) {
        if (firstIndent > 0 && !useHanging) w -= firstIndent
      } else if (useHanging) {
        w -= indentHanging
      }
      return Math.max(20, w)
    }

    // Word 行距 4 种模式：
    //   'auto'    → lineHeight 是倍数（1.0 单倍；1.5 一倍半；2.0 双倍；数值任意）
    //   'exact'   → lineHeight 是像素固定值（不小于字号）
    //   'atLeast' → lineHeight 是像素最小值，字号 > lineHeight 时会自动扩展
    //   'multiple'→ 与 auto 同义（Word 里"多倍行距"）
    const computeLineHeight = (size: number): number => {
      const lh = rawLineHeight
      switch (lineHeightRule) {
        case 'exact':    return Math.max(1, lh) // 固定值
        case 'atLeast':  return Math.max(size * 1.15, lh) // 最小值
        case 'multiple':
        case 'auto':
        default: {
          // auto：若给的是"合理的倍数"（0.5..5）按倍数处理；否则按 px 处理（部分导出用 px 值 + auto）
          if (lh > 0 && lh <= 5) return size * lh * 1.15
          return Math.max(size, lh)
        }
      }
    }

    const finalizeLine = (isLastLine: boolean) => {
      const size = currentMaxSize
      const lh = computeLineHeight(size)
      let lineXBase = indentLeft + bulletWidth
      if (isFirstLine && firstIndent > 0 && !useHanging) lineXBase += firstIndent
      else if (!isFirstLine && useHanging) lineXBase += indentHanging
      // 把 inline.x 从"相对 line 起点"平移到"相对块起点"
      for (const inl of currentInlines) inl.x += lineXBase
      const line: LineBox = {
        x: lineXBase,
        y: 0,
        width: currentLineMaxWidth(),
        height: lh,
        baseline: lh * 0.82,
        inlines: currentInlines,
        rowFlex,
        isLastLine
      }
      lines.push(line)
      currentInlines = []
      currentLineWidth = 0
      currentMaxSize = this.opts.defaultSize
      isFirstLine = false
    }

    for (let ri = 0; ri < runs.length; ri++) {
      const run = runs[ri]
      if (run.type !== 'text') continue
      const anyRun = run as unknown as Record<string, unknown>
      const font = String(anyRun.font ?? this.opts.defaultFont)
      const size = Number(anyRun.size ?? this.opts.defaultSize)
      const bold = !!anyRun.bold
      const italic = !!anyRun.italic
      const color = String(anyRun.color ?? '#000000')
      const bgColor = anyRun.highlight ? String(anyRun.highlight) : undefined
      const strikeout = !!anyRun.strikeout
      const underline = !!anyRun.underline
      const value = String(anyRun.value ?? '')

      if (!value) continue

      const runPath: Path = [...runsParentPath, ri]
      let cursorInRun = 0

      while (cursorInRun < value.length) {
        const maxLineWidth = currentLineMaxWidth()
        const remaining = maxLineWidth - currentLineWidth
        let take = 0
        let takenWidth = 0
        for (let i = cursorInRun; i < value.length; i++) {
          const ch = value[i]
          const w = this.measure.charWidth(ch, font, size, bold, italic)
          if (ch === '\n') { take = i - cursorInRun; break }
          if (takenWidth + w > remaining && take > 0) break
          takenWidth += w
          take++
        }
        if (take === 0 && cursorInRun < value.length && value[cursorInRun] === '\n') {
          // 显式换行
          finalizeLine(false)
          cursorInRun++
          continue
        }
        if (take === 0) {
          // 剩余空间放不下一个字符 → 换行重试
          finalizeLine(false)
          continue
        }
        const segEnd = cursorInRun + take
        const text = value.slice(cursorInRun, segEnd)
        const segWidth = takenWidth
        const inline: InlineBox = {
          run,
          path: runPath,
          startOffset: cursorInRun,
          endOffset: segEnd,
          text,
          x: currentLineWidth, // 暂存为"相对 line 起点"，finalizeLine 会平移
          y: 0,
          width: segWidth,
          height: size,
          font,
          size,
          bold,
          italic,
          color,
          bgColor,
          strikeout,
          underline,
          baseline: 0
        }
        currentInlines.push(inline)
        currentLineWidth += segWidth
        if (size > currentMaxSize) currentMaxSize = size
        cursorInRun = segEnd
        if (cursorInRun < value.length && value[cursorInRun] === '\n') {
          finalizeLine(false)
          cursorInRun++ // 消费换行符
        } else if (cursorInRun < value.length && currentLineWidth >= maxLineWidth) {
          finalizeLine(false)
        }
      }
    }
    if (currentInlines.length > 0 || lines.length === 0) finalizeLine(true)

    // 分配行 y 与 inline y/baseline（相对块本地坐标）
    let yy = spacingBefore
    for (const line of lines) {
      line.y = yy
      line.baseline = 0.8 * line.height
      for (const inl of line.inlines) {
        inl.y = yy
        inl.baseline = yy + line.baseline
      }
      applyRowFlex(line, usableWidth)
      yy += line.height
    }
    yy += spacingAfter

    const rect: Rect = { x: 0, y: 0, width: availableWidth, height: yy }
    return {
      kind: 'paragraph',
      id: nextBlockId(),
      paragraphKind,
      block,
      startIndex,
      endIndex,
      parentPath,
      rect,
      lines,
      bulletKind,
      bulletText,
      bulletWidth,
      bulletFont,
      bulletSize,
      bulletColor,
      bulletBold
    }
  }

  private layoutImage(el: IElement, parentPath: Path, index: number, availableWidth: number): ImageBlock {
    const anyEl = el as unknown as Record<string, unknown>
    const w = Math.max(1, Number(anyEl.width ?? 200))
    const h = Math.max(1, Number(anyEl.height ?? 150))
    // 水平对齐：rowFlex 决定 x 位置
    const rowFlex = String(anyEl.rowFlex ?? 'left')
    let x = 0
    if (w < availableWidth) {
      if (rowFlex === 'center' || rowFlex === 'alignment') x = (availableWidth - w) / 2
      else if (rowFlex === 'right') x = availableWidth - w
    }
    return {
      kind: 'image',
      id: nextBlockId(),
      block: el,
      parentPath,
      indexInParent: index,
      rect: { x, y: 0, width: w, height: h }
    }
  }

  private layoutTable(
    table: ITableElement,
    parentPath: Path,
    index: number,
    availableWidth: number
  ): TableBlock {
    // ---------- 列宽计算 ----------
    // 1) 优先使用 colgroup 定义
    let colWidths = table.colgroup.map(c => c.width || 0)

    // 2) colgroup 缺失或列数不足 → 用首行 tdList 补齐（每个 td 按 colspan 展开）
    if (colWidths.length === 0 || colWidths.every(v => v <= 0)) {
      const firstTr = table.trList[0]
      if (firstTr) {
        const inferred: number[] = []
        for (const td of firstTr.tdList) {
          const span = td.colspan || 1
          const per = (td.width || 0) / span
          for (let k = 0; k < span; k++) inferred.push(per)
        }
        colWidths = inferred
      }
    }

    const totalDefined = colWidths.reduce((s, v) => s + v, 0)
    // 3) 若 totalDefined 超过 availableWidth 太多，才等比缩放（避免小数误差反复缩放导致数据被改）
    if (totalDefined > availableWidth * 1.02) {
      const k = availableWidth / totalDefined
      colWidths = colWidths.map(v => v * k)
    } else if (totalDefined <= 0) {
      // 兜底：均分
      const n = Math.max(1, colWidths.length || (table.trList[0]?.tdList.length ?? 1))
      colWidths = Array.from({ length: n }, () => availableWidth / n)
    }
    // 表格实际宽度 = 列宽之和（保留自然宽度，不撑满 availableWidth）
    const tableWidth = colWidths.reduce((s, v) => s + v, 0)

    // ---------- rowspan 网格占用矩阵 ----------
    // occupied[ri][ci] = true 表示该格已被上方 rowspan 覆盖
    const occupied: boolean[][] = table.trList.map(() => new Array(colWidths.length).fill(false))

    // ---------- 逐行排版 ----------
    const rows: TableRowLayout[] = []
    // 先假设每行最小 = tr.height，之后可能被合并单元格撑高
    const rowHeights: number[] = table.trList.map(tr => tr.height || 0)
    // 收集所有 cellLayouts，后面统一定位
    const rowCells: TableCellLayout[][] = table.trList.map(() => [])
    // 收集跨行单元格：{ startRow, endRow, cellLayout, requiredHeight }
    interface RowspanPending {
      startRow: number
      endRow: number
      layout: TableCellLayout
      contentHeight: number
      padTop: number
      padBottom: number
    }
    const rowspanPending: RowspanPending[] = []

    for (let ri = 0; ri < table.trList.length; ri++) {
      const tr = table.trList[ri]
      let colCursor = 0
      for (let ci = 0; ci < tr.tdList.length; ci++) {
        // 跳过已被上方 rowspan 覆盖的位置
        while (colCursor < colWidths.length && occupied[ri][colCursor]) colCursor++
        if (colCursor >= colWidths.length) break

        const td = tr.tdList[ci]
        const colspan = Math.max(1, td.colspan || 1)
        const rowspan = Math.max(1, td.rowspan || 1)

        // 标记被此 td 覆盖的格子
        for (let rr = ri; rr < Math.min(ri + rowspan, table.trList.length); rr++) {
          for (let cc = colCursor; cc < Math.min(colCursor + colspan, colWidths.length); cc++) {
            if (rr !== ri || cc !== colCursor) occupied[rr][cc] = true
          }
        }

        const cellWidth = colWidths.slice(colCursor, colCursor + colspan).reduce((s, v) => s + v, 0)
        const cellX = sumUp(colWidths, colCursor)
        const [pt, pr, pb, pl] = td.padding
        const contentWidth = Math.max(10, cellWidth - pl - pr)
        const cellPath: Path = [...parentPath, index, 'trList', ri, 'tdList', ci]
        const contentPath: Path = [...cellPath, 'value']
        const content = this.layoutBlocks(td.value, contentPath, contentWidth)

        // 内容 y 累加
        let innerY = 0
        for (const cb of content) {
          cb.rect.y = innerY
          innerY += cb.rect.height
        }
        const contentHeight = innerY

        const layout: TableCellLayout = {
          cell: td,
          cellPath,
          contentPath,
          rect: { x: cellX, y: 0, width: cellWidth, height: 0 },
          content,
          contentPaddingTop: pt,
          contentPaddingLeft: pl,
          verticalOffset: 0
        }
        rowCells[ri].push(layout)

        if (rowspan === 1) {
          // 单行 cell：直接撑高当前行
          const required = contentHeight + pt + pb
          if (required > rowHeights[ri]) rowHeights[ri] = required
        } else {
          // 跨行 cell：先记录，最后再检查是否需要撑高 endRow
          rowspanPending.push({
            startRow: ri,
            endRow: Math.min(ri + rowspan - 1, table.trList.length - 1),
            layout,
            contentHeight,
            padTop: pt,
            padBottom: pb
          })
        }
        colCursor += colspan
      }
    }

    // ---------- 处理跨行 cell 的高度需求：若跨行区间累加高度 < 需求，则把差额加到最后一行 ----------
    for (const rp of rowspanPending) {
      let acc = 0
      for (let r = rp.startRow; r <= rp.endRow; r++) acc += rowHeights[r]
      const required = rp.contentHeight + rp.padTop + rp.padBottom
      if (required > acc) {
        rowHeights[rp.endRow] += (required - acc)
      }
    }

    // ---------- 定位每行 y、每 cell 的最终 rect + 垂直对齐 ----------
    let cursorY = 0
    for (let ri = 0; ri < table.trList.length; ri++) {
      const rowHeight = rowHeights[ri]
      const cellLayouts = rowCells[ri]
      for (const cl of cellLayouts) {
        cl.rect.y = cursorY
        // 高度：单行 = 当前行高；跨行 = 从起始行到结束行的高度累加
        const rowspan = Math.max(1, cl.cell.rowspan || 1)
        let cellH = rowHeight
        if (rowspan > 1) {
          cellH = 0
          for (let r = ri; r < Math.min(ri + rowspan, table.trList.length); r++) cellH += rowHeights[r]
        }
        cl.rect.height = cellH
        // 垂直对齐
        const [pt, , pb] = cl.cell.padding
        const contentHeight = cl.content.reduce((s, b) => s + b.rect.height, 0)
        const inner = Math.max(0, cellH - pt - pb - contentHeight)
        if (cl.cell.verticalAlign === 'middle') cl.verticalOffset = inner / 2
        else if (cl.cell.verticalAlign === 'bottom') cl.verticalOffset = inner
        else cl.verticalOffset = 0
      }
      rows.push({
        rect: { x: 0, y: cursorY, width: tableWidth, height: rowHeight },
        cells: cellLayouts
      })
      cursorY += rowHeight
    }

    return {
      kind: 'table',
      id: nextBlockId(),
      block: table,
      parentPath,
      indexInParent: index,
      rect: { x: 0, y: 0, width: tableWidth, height: cursorY },
      rows,
      colWidths
    }
  }

}

/* -------------------- 工具 -------------------- */

function sumUp(arr: number[], upto: number): number {
  let s = 0
  for (let i = 0; i < upto; i++) s += arr[i]
  return s
}

function applyRowFlex(line: LineBox, containerWidth: number): void {
  const used = line.inlines.reduce((s, inl) => s + inl.width, 0)
  const free = containerWidth - used
  if (free <= 0) return
  if (line.rowFlex === 'left') return
  if (line.rowFlex === 'center') {
    const dx = free / 2
    for (const inl of line.inlines) inl.x += dx
    return
  }
  if (line.rowFlex === 'right') {
    for (const inl of line.inlines) inl.x += free
    return
  }
  if ((line.rowFlex === 'justify' || line.rowFlex === 'alignment') && !line.isLastLine && line.inlines.length > 1) {
    const gapCount = line.inlines.length - 1
    const gap = free / gapCount
    for (let i = 1; i < line.inlines.length; i++) line.inlines[i].x += gap * i
  }
}
