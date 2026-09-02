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
import { splitParagraphs, FONT_FAMILY_CSS } from '@vervedoc/docx-editor-schema'
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
   * headerElements / footerElements 为页眉/页脚内容，每页都会渲染一份。
   */
  layout(elements: IElement[], headerElements?: IElement[], footerElements?: IElement[]): DocumentLayout {
    this.counters.clear()
    const { pageWidth, pageHeight, pageMargins, pageGap } = this.opts
    const [mt, mr, mb, ml] = pageMargins
    const contentWidth = pageWidth - ml - mr
    const contentHeight = pageHeight - mt - mb

    // 生成顶层 block 列表（rect.y 相对父容器，需要重排以分页）
    const rawBlocks = this.layoutBlocks(elements, [], contentWidth)

    // 页眉/页脚 block 预布局（rect.y 相对各自区域原点）
    const headerBlocks = headerElements?.length ? this.layoutBlocks(headerElements, [], contentWidth) : []
    const footerBlocks = footerElements?.length ? this.layoutBlocks(footerElements, [], contentWidth) : []

    // 分页
    const pages: PageLayout[] = []
    let pageIndex = 0
    let cursorY = 0
    let currentBlocks: BlockNode[] = []

    // 页面承载上限判定的浮点容差：
    // 行高经多次浮点累加（cursorY += rowHeight）后，可能出现微小正偏离
    // （如 903 累加为 903.0000000000001）。若用严格 ">" 比较，会让"恰好
    // 填满页面"的内容被误判为超出，从而提前触发分页。这里引入亚像素级
    // 容差（0.5px，小于半像素，视觉上不可感知），仅当真实超出容差才分页。
    const PAGE_FIT_EPSILON = 0.5

    const pushPage = () => {
      const pageOriginY = pageGap + pageIndex * (pageHeight + pageGap)
      const pageRect: Rect = { x: 0, y: pageOriginY, width: pageWidth, height: pageHeight }
      const contentRect: Rect = {
        x: ml,
        y: pageOriginY + mt,
        width: contentWidth,
        height: contentHeight
      }
      const headerRect: Rect = { x: ml, y: pageOriginY, width: contentWidth, height: mt }
      const footerRect: Rect = { x: ml, y: pageOriginY + mt + contentHeight, width: contentWidth, height: mb }
      pages.push({
        index: pageIndex, rect: pageRect, contentRect, blocks: currentBlocks,
        headerRect, headerBlocks: headerBlocks.length ? headerBlocks.map(b => ({ ...b })) : undefined,
        footerRect, footerBlocks: footerBlocks.length ? footerBlocks.map(b => ({ ...b })) : undefined
      })
      pageIndex++
      currentBlocks = []
      cursorY = 0
    }

    for (let i = 0; i < rawBlocks.length; i++) {
      const b = rawBlocks[i]
      if (b.kind === 'pageBreak') {
        // 分节符/手动分页：结束时当前页并开启全新页。
        // 若当前页虽为空但前面已产出页面（相邻分节符/前块恰满页），也需补一个
        // 新页，否则附表标题会落到前一节的同一页上（分页符"失效"）。
        if (currentBlocks.length > 0 || pages.length > 0) pushPage()
        continue
      }
      const bh = b.rect.height
      const overflow = cursorY + bh - contentHeight
      // 仅当内容真实超出页面承载上限（超出浮点容差）才分页；
      // 恰好填满（|cum - contentHeight| <= epsilon）时留在本页。
      if (overflow > PAGE_FIT_EPSILON) {
        // 表格特判：先在当前页放能容纳的行，放不下的行推到下一页，
        // 后续每页重新用整页高度计算能放几行。
        // 跨行（rowspan）格被切割时自动裁剪（见 buildFragment），因此任意行边界都可切割。
        if (b.kind === 'table') {
          const remaining = contentHeight - cursorY
          let frags = this.tryPaginateTableFlow(b, remaining, contentHeight)
          if (!frags && currentBlocks.length > 0) {
            // 当前页剩余空间连首行都放不下：整表推到新页，按整页高度拆分
            pushPage()
            cursorY = 0
            frags = this.tryPaginateTableFlow(b, contentHeight, contentHeight)
          }
          if (frags) {
            for (let fi = 0; fi < frags.length; fi++) {
              const frag = frags[fi]
              if (fi === 0) {
                // 第 1 片：留在当前页（即使当前页尚为空页）
                frag.rect.y = cursorY
                currentBlocks.push(frag)
                cursorY += frag.rect.height
              } else {
                // 第 2 片及以后：结束当前页，开启新页放置
                pushPage()
                frag.rect.y = 0
                currentBlocks.push(frag)
                cursorY = frag.rect.height
              }
            }
            continue
          }
          // 表无法拆分（如单行高于整页）：回退为整表处理。
        }
        if (currentBlocks.length > 0) pushPage()
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
    // 段落左右缩进：docx 可能出现负值（"悬入左边距"）。若不夹到 0，会使
    // usableWidth > availableWidth，行宽越过 block 边界，超出的字符会被
    // block bitmap 裁掉，表现为文字丢失。此处按可视排版约束夹到 [0, +inf)。
    let indentLeft = Math.max(0, Number(attr('paragraphIndentLeft') ?? 0))
    const indentRight = Math.max(0, Number(attr('paragraphIndentRight') ?? 0))
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
    let bulletX: number | undefined
    // 项目符号/编号：list 段落必定处理；title 段落若带 listNumbering（Word heading 关联多级列表）也一并处理
    const hasNumbering = !!(block as unknown as { listNumbering?: unknown } | undefined)?.listNumbering
    if (block && (paragraphKind === 'list' || (paragraphKind === 'title' && hasNumbering))) {
      const listEl = block as IListElement
      const res = resolveBullet(listEl, this.counters)
      // 层级缩进
      const level = Math.max(0, listEl.listLevel ?? 0)
      const listHanging = Number(listEl.listHanging ?? listEl.listNumbering?.indentHanging ?? 24)
      const listBaseIndent = Number(listEl.listIndent ?? listEl.listNumbering?.indentLeft ?? 0)
      // title 段落（Word heading 关联多级列表）：段落本身已带自己的缩进/对齐，
      // numbering.indentLeft 只作为"编号列宽提示"，不应再叠加到段落 indentLeft，
      // 否则整段被推到右侧（源数据里 indentLeft 常带异常大值，如 368px）。
      if (paragraphKind !== 'title') {
        const proposed = listBaseIndent + level * listHanging
        // 保护性上限：新缩进不得占用 > 60% 可用宽度，防止数据异常导致整段跑飞
        const cap = availableWidth * 0.6
        indentLeft = Math.max(indentLeft, Math.min(proposed, cap))
      }
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
        const rawBulletFont = String(fa?.font ?? this.opts.defaultFont)
        bulletFont = FONT_FAMILY_CSS[rawBulletFont] ?? rawBulletFont
        bulletText = res.text
      }
      // 度量宽度：符号后加固定间距（half em）
      const symbolGap = bulletSize * 0.4
      const glyphW = this.measure.textWidth(bulletText, bulletFont, bulletSize, bulletBold)
      bulletWidth = glyphW + symbolGap
      // 编号列内对齐（lvlJc）：
      //   编号列 = [firstLine.x - bulletWidth, firstLine.x]（尾部含 symbolGap 作为编号与正文的间距）
      //   编号绘制 x = firstLine.x + bulletX（bulletX 通常为负）
      //   - left  : 编号左端贴列左侧 → bulletX = -bulletWidth
      //   - center: 编号在编号列（去掉 gap）内居中 → bulletX = -bulletWidth + (bulletWidth - symbolGap - glyphW)/2
      //   - right (默认): 编号右端贴 gap 左边（等价于原来的行为） → bulletX = -bulletWidth
      // 说明：因为原行为已经是 "编号紧邻 gap"，right/left 视觉一致（都从列左起，右边留 gap）；
      //       仅 center 会显著不同。此处保留三分支，方便后续独立微调。
      const jc = res.lvlJc
      if (jc === 'center') {
        const inner = Math.max(0, bulletWidth - symbolGap - glyphW)
        bulletX = -bulletWidth + inner / 2
      } else {
        bulletX = -bulletWidth
      }
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
      const rawFont = String(anyRun.font ?? this.opts.defaultFont)
      const font = FONT_FAMILY_CSS[rawFont] ?? rawFont
      const size = Number(anyRun.size ?? this.opts.defaultSize)
      const bold = !!anyRun.bold
      const italic = !!anyRun.italic
      const color = String(anyRun.color ?? '#000000')
      const bgColor = anyRun.highlight ? String(anyRun.highlight) : undefined
      const strikeout = !!anyRun.strikeout
      const underline = !!anyRun.underline
      const groupIds = Array.isArray(anyRun.groupIds) ? anyRun.groupIds as string[] : undefined
      const value = String(anyRun.value ?? '')

      if (!value) continue
      // 跳过段落终止符（零宽字符），不产出 inline，但 ri 仍递进以保持索引对齐
      if (/^[\u200B\uFEFF]+$/.test(value)) continue

      // normal 段落用 elements 原索引（startIndex + ri）作为 path 末段，保证 path 唯一；
      // title/list 的 runsParentPath 已含段索引，ri 是 valueList 内索引，直接用。
      // 表格单元格内 normal 段落需拼上 runsParentPath（contentPath）以保证 path 全局唯一。
      const runPath: Path = paragraphKind === 'normal'
        ? [...runsParentPath, startIndex + ri]
        : [...runsParentPath, ri]
      let cursorInRun = 0

      while (cursorInRun < value.length) {
        const maxLineWidth = currentLineMaxWidth()
        const remaining = maxLineWidth - currentLineWidth
        // 若当前行已有内容且首个字符放不下 → 先换行再试，避免溢出被裁
        if (currentLineWidth > 0 && value[cursorInRun] !== '\n') {
          const firstW = this.measure.charWidth(value[cursorInRun], font, size, bold, italic)
          if (firstW > remaining) {
            finalizeLine(false)
            continue
          }
        }
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
          baseline: 0,
          groupIds
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
    // 跟踪块内内容实际右边缘（含 rowFlex 平移后的最大 x），用于兜底 bitmap 宽度
    let contentRight = 0
    for (const line of lines) {
      line.y = yy
      line.baseline = 0.8 * line.height
      for (const inl of line.inlines) {
        inl.y = yy
        inl.baseline = yy + line.baseline
      }
      applyRowFlex(line, usableWidth)
      for (const inl of line.inlines) {
        const r = inl.x + inl.width
        if (r > contentRight) contentRight = r
      }
      yy += line.height
    }
    yy += spacingAfter

    // rect.width 必须能覆盖实际内容最大右边缘，避免行末字符被 bitmap 裁掉
    // （浮点误差 / rowFlex 分散对齐 / 负缩进兜底后仍可能微超 availableWidth）
    const rectWidth = Math.max(availableWidth, Math.ceil(contentRight))
    const rect: Rect = { x: 0, y: 0, width: rectWidth, height: yy }
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
      bulletBold,
      bulletX
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
    // 先假设每行最小 = max(tr.height, tr.minHeight)，之后可能被合并单元格撑高
    const rowHeights: number[] = table.trList.map(tr => Math.max(tr.height || 0, tr.minHeight || 0))
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

  /**
   * 跨页表格拆分。被 `layout()` 分页循环调用。
   *
   * 逻辑：
   *  - 任意行边界都可切割；跨行（rowspan）格被切割时由 buildFragment 裁剪，
   *    上片保留上半（含内容），下片生成空内容的续接格，边框/背景保持连续。
   *  - 第 1 片最多占用当前页剩余空间 (firstFit)；剩余行逐页推进，
   *    每页用整页高度 (fullHeight) 计算能放几行。
   *
   * 返回的每个片段都是独立 TableBlock，带自己的 rows / colWidths，
   * 其 rect 重建为"从 0 开始的片段高度"（y 由上层分页循环重新分配）。
   * 不重复表头，因此不复制表头行。
   *
   * @returns 片段数组（至少 2 片）；null 表示不可拆分（首片连一行都放不下，
   *          或整表本就能容纳）。调用方负责把片段落页。
   */
  private tryPaginateTableFlow(
    b: TableBlock,
    firstFit: number,
    fullHeight: number
  ): TableBlock[] | null {
    const totalRows = b.rows.length
    if (totalRows <= 1) return null

    // 收集"表头行"（从第 0 行起连续被标记为 pagingRepeat 的行）：
    // Word 语义只有从表首开始连续的行才可作为跨页重复表头
    const repeatRows: number[] = []
    for (let i = 0; i < b.rows.length; i++) {
      const tr = (b.block as ITableElement).trList[i]
      if (tr && tr.pagingRepeat) repeatRows.push(i)
      else break
    }
    // 表头行占用的高度（不能小于表头本身，避免第 1 片就装不下）
    const repeatHeight = repeatRows.reduce((s, ri) => s + b.rows[ri].rect.height, 0)

    // 第 1 片：用当前页剩余空间
    const firstEnd = this.findSliceEnd(b, 0, firstFit)
    if (firstEnd < 0) return null
    // 若第 1 片就已覆盖整张表（能整表容纳），说明本不该走进拆分分支，直接回退。
    if (firstEnd >= totalRows - 1) return null

    // 先组装全部片段，任一步失败则整体返回 null（事务性，避免半放置）
    const frags: TableBlock[] = [this.buildFragment(b, 0, firstEnd)]
    let startRow = firstEnd + 1
    while (startRow < totalRows) {
      // 后续片段预留表头高度
      const budget = repeatRows.length > 0 ? Math.max(0, fullHeight - repeatHeight) : fullHeight
      const endRow = this.findSliceEnd(b, startRow, budget)
      if (endRow < 0) return null
      frags.push(this.buildFragment(b, startRow, endRow, repeatRows))
      startRow = endRow + 1
    }
    return frags
  }

  /** 在 [startRow, totalRows) 内，累计行高不超过 fit，找到最大可容纳的行下标；找不到返回 -1。 */
  private findSliceEnd(b: TableBlock, startRow: number, fit: number): number {
    let endRow = -1
    let subAcc = 0
    for (let ri = startRow; ri < b.rows.length; ri++) {
      subAcc += b.rows[ri].rect.height
      if (subAcc > fit) break
      endRow = ri
    }
    return endRow
  }

  /** 从 TableBlock b 中切出行区间 [s, e]（含两端），重建一个独立 TableBlock 片段。
   *  跨切割点的 rowspan 格做裁剪处理：
   *  - 本片内起始、但延伸出本片的格：高度裁剪到本片底部，并重算垂直偏移；
   *  - 起始于本片之前、延伸进本片的格：在首行补一个空内容的续接格，
   *    使边框 / 背景在续页保持连续（内容只在上半显示一次）。
   *  注意：不修改原表 b 的任何行 / 格对象（后续片段还要复用）。
   *  @param repeatRowsBefore 需要在片段最前面复制一份的"表头行"下标列表（w:tblHeader），仅在非第一片时使用。 */
  private buildFragment(b: TableBlock, s: number, e: number, repeatRowsBefore?: number[]): TableBlock {
    // 先深拷贝主体行
    const bodyRows = b.rows.slice(s, e + 1).map(r => ({
      ...r,
      rect: { ...r.rect },
      cells: r.cells.map(c => ({ ...c, rect: { ...c.rect } }))
    }))
    // 表头重复行（跨页时）：仅当 s>0（非首片）且 repeatRowsBefore 中的行不在当前区间内时才复制
    const headerRows = (s > 0 && repeatRowsBefore && repeatRowsBefore.length > 0)
      ? repeatRowsBefore
          .filter(ri => ri < s) // 首片已经含表头则不重复
          .map(ri => ({
            ...b.rows[ri],
            rect: { ...b.rows[ri].rect },
            cells: b.rows[ri].cells.map(c => ({ ...c, rect: { ...c.rect } }))
          }))
      : []
    const rows = [...headerRows, ...bodyRows]
    // 重建行 rect.y 为片段本地坐标（从 0 重新累加）
    let y = 0
    for (const r of rows) {
      r.rect.y = y
      r.rect.x = b.rect.x
      y += r.rect.height
    }
    const spanHeight = (from: number, to: number): number => {
      let h = 0
      for (let rr = from; rr <= to; rr++) h += b.rows[rr].rect.height
      return h
    }
    const headerOffset = headerRows.length
    // 本片内起始的格：定位到行 y；延伸出本片的裁剪高度
    for (let ri = s; ri <= e; ri++) {
      const r = rows[headerOffset + (ri - s)]
      for (const c of r.cells) {
        c.rect.y = r.rect.y
        const rs = Math.max(1, c.cell.rowspan || 1)
        const end = ri + rs - 1
        if (end > e) {
          c.rect.height = spanHeight(ri, e)
          c.verticalOffset = this.fitVerticalOffset(c, c.rect.height)
        }
      }
    }
    // 重复表头行：定位其内 cell 的 rect.y 到片段本地
    for (let hi = 0; hi < headerOffset; hi++) {
      const r = rows[hi]
      for (const c of r.cells) {
        c.rect.y = r.rect.y
        // 表头行不参与 rowspan 裁剪（表头通常独立），保持原 height
      }
    }
    // 起始于本片之前的 rowspan 格：body 首行补续接格（空内容）
    if (s > 0) {
      const cont: TableCellLayout[] = []
      for (let ri = 0; ri < s; ri++) {
        for (const c of b.rows[ri].cells) {
          const rs = Math.max(1, c.cell.rowspan || 1)
          const end = ri + rs - 1
          if (rs > 1 && end >= s) {
            cont.push({
              ...c,
              rect: { x: c.rect.x, y: 0, width: c.rect.width, height: spanHeight(s, Math.min(e, end)) },
              content: [],
              verticalOffset: 0
            })
          }
        }
      }
      if (cont.length > 0) {
        const bodyFirst = rows[headerOffset]
        bodyFirst.cells = [...cont, ...bodyFirst.cells].sort((a, a2) => a.rect.x - a2.rect.x)
      }
    }
    // 分页处"封口"：数据中共享边常只由邻格单侧定义，切开后邻格落在另一页，
    // 因此片段首行缺 top / 末行缺 bottom 时补齐，保证合并格续接处边框连续。
    if (s > 0) {
      // 若有重复表头，封口对象是表头首行；否则是 body 首行
      for (const c of rows[0].cells) this.ensureFragmentEdge(c, 'top')
    }
    if (e < b.rows.length - 1) {
      for (const c of rows[rows.length - 1].cells) this.ensureFragmentEdge(c, 'bottom')
    }
    return {
      kind: 'table',
      id: nextBlockId(),
      block: b.block,
      parentPath: b.parentPath,
      indexInParent: b.indexInParent,
      rect: { x: b.rect.x, y: 0, width: b.rect.width, height: y },
      rows,
      colWidths: b.colWidths
    }
  }

  /** 片段边界封口：该侧无边框时从本格其他边复制样式补齐（仅改片段副本，不动原数据）。 */
  private ensureFragmentEdge(c: TableCellLayout, side: 'top' | 'bottom'): void {
    const bs = c.cell.borderStyle as unknown as Record<string, { width: number; color: string; style: string } | undefined>
    const cur = bs[side]
    if (cur && cur.style !== 'none' && cur.width > 0) return
    const src = bs[side === 'top' ? 'bottom' : 'top'] ?? bs.left ?? bs.right ??
      { width: 1, color: '#000000', style: 'solid' }
    const newBs = { ...bs, [side]: src }
    c.cell = { ...c.cell, borderStyle: newBs as unknown as typeof c.cell.borderStyle }
  }

  /** 按裁剪后的格高重算垂直偏移（规则同 layoutTable）。 */
  private fitVerticalOffset(c: TableCellLayout, cellH: number): number {
    const [pt, , pb] = c.cell.padding
    const contentHeight = c.content.reduce((acc, blk) => acc + blk.rect.height, 0)
    const inner = Math.max(0, cellH - pt - pb - contentHeight)
    if (c.cell.verticalAlign === 'middle') return inner / 2
    if (c.cell.verticalAlign === 'bottom') return inner
    return 0
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
  if ((line.rowFlex === 'justify' || line.rowFlex === 'alignment') && !line.isLastLine && line.inlines.length > 0) {
    // 按"字符间隙"分配额外空白（接近 Word 的两端对齐视觉效果）：
    // 全行字符数 N，可拉伸缝隙数 = N - 1，均分 free 到每个字符后。
    // 每个 inline 的宽度按 letterSpacing * charCount 扩展，后续 inline
    // 依次右移；inline 之间不再额外插入间隙，避免出现大块空白。
    let totalChars = 0
    for (const inl of line.inlines) totalChars += inl.text.length
    const gaps = totalChars - 1
    if (gaps <= 0) return
    const extra = free / gaps
    let dx = 0
    for (let i = 0; i < line.inlines.length; i++) {
      const inl = line.inlines[i]
      inl.x += dx
      const n = inl.text.length
      if (n > 0) {
        inl.letterSpacing = extra
        // 若该 inline 是行尾，其最后一个字符后不再有缝隙需要承担
        const isLast = i === line.inlines.length - 1
        const add = isLast ? extra * (n - 1) : extra * n
        inl.width += add
        dx += add
      }
    }
  }
}
