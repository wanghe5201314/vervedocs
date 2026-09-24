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
  IImageElement,
  IDocxDocumentMeta,
  IListElement,
  ITableElement,
  Path
} from '@vervedoc/docx-editor-schema'
import { splitParagraphs, FONT_FAMILY_CSS, resolveHeaderFooterPart } from '@vervedoc/docx-editor-schema'
import type {
  DocumentLayout, PageLayout, BlockNode, ParagraphBlock,
  ImageBlock, PageBreakBlock, SeparatorBlock, TableBlock, TableRowLayout, TableCellLayout,
  EmbedBlock, ChartBlock, LineBox, InlineBox, Rect
} from './layout-types'
import { TextMeasure, getSharedMeasure } from './text-measure'
import { resolveBullet, BULLET_FONT_STACK, BULLET_FONT_STACK_FALLBACK, detectWingdings } from './list-bullet'

/** 排版引擎配置选项 */
export interface LayoutOptions {
  /** 页面宽度（CSS 像素） */
  pageWidth: number
  /** 页面高度（CSS 像素） */
  pageHeight: number
  /** 页边距 [top, right, bottom, left] */
  pageMargins: [number, number, number, number]   // top, right, bottom, left
  /** 默认字体族名 */
  defaultFont: string
  /** 默认字号 */
  defaultSize: number
  /** 默认行高倍数 */
  defaultLineHeight: number
  /** 渲染缩放倍数 */
  scale: number
  /** 页首/尾垂直空白（渲染视觉上把纸张与边界隔开） */
  pageGap: number
}

/** 块 id 自增序列（跨 layout 调用持续递增，保证全局唯一） */
let _blockSeq = 0
/** 取下一个全局唯一的 block id。 */
function nextBlockId(): number { return ++_blockSeq }

interface ParagraphInput {
  paragraphKind: ParagraphBlock['paragraphKind']
  block: IElement | null
  runs: IElement[]
  runsParentPath: Path
  startIndex: number
  endIndex: number
  parentPath: Path
  availableWidth: number
  runStartIndex?: number
  exclusions?: { rect: Rect; side: string; topBottom: boolean }[]
}

interface ParagraphCache {
  signature: string
  input: ParagraphInput
  layout: ParagraphBlock
}

/**
 * 文档排版引擎：把 IElement[] 排版成分页 DocumentLayout，
 * 处理段落折行、列表编号、表格跨行/跨页、图片环绕等。
 */
export class LayoutEngine {
  /** 文本度量器（计算字符/文本宽度） */
  private measure: TextMeasure
  /** 排版选项 */
  private opts: LayoutOptions
  /** 跨列表的多级编号计数器（每次 layout() 重置） */
  private counters = new Map<string, number>()
  private paragraphCache = new Map<string, ParagraphCache>()
  private nextParagraphCache = new Map<string, ParagraphCache>()
  private layoutZone = 'main'
  private diagnostics: NonNullable<DocumentLayout['diagnostics']> = []
  private paragraphInputs = new WeakMap<ParagraphBlock, ParagraphInput>()

  /**
   * 创建排版引擎。
   * @param options 排版选项
   * @param measure 文本度量器，缺省时使用共享实例
   */
  constructor(options: LayoutOptions, measure?: TextMeasure) {
    this.opts = options
    this.measure = measure ?? getSharedMeasure()
  }

  /**
   * 更新排版选项（不立即触发重排，由调用方决定何时 layout()）。
   * @param options 新的排版选项
   */
  updateOptions(options: LayoutOptions): void {
    this.opts = options
    this.paragraphCache.clear()
  }

  /**
   * 顶层入口：把 elements 排版成分页 layout。
   * headerElements / footerElements 为页眉/页脚内容，每页都会渲染一份。
   */
  layout(elements: IElement[], headerElements?: IElement[], footerElements?: IElement[], document?: IDocxDocumentMeta): DocumentLayout {
    this.counters.clear()
    this.diagnostics = []
    this.nextParagraphCache = new Map()
    this.layoutZone = 'main'
    const { pageGap } = this.opts
    let sectionIndex = 0
    let sectionFirstPage = 0
    let pageWidth = this.opts.pageWidth
    let pageHeight = this.opts.pageHeight
    let [mt, mr, mb, ml] = this.opts.pageMargins
    let contentWidth = pageWidth - ml - mr
    let contentHeight = pageHeight - mt - mb
    const setSection = (index: number) => {
      const section = document?.sections?.[index]
      if (section) {
        if (section.pageWidth === undefined || section.pageHeight === undefined || !section.margins) {
          throw new TypeError(`Java sections[${index}] 缺少页面尺寸或页边距`)
        }
        pageWidth = section.pageWidth
        pageHeight = section.pageHeight
        ;[mt, mr, mb, ml] = section.margins
      } else if (document && !document.sections) {
        pageWidth = document.pageWidth ?? this.opts.pageWidth
        pageHeight = document.pageHeight ?? this.opts.pageHeight
        ;[mt, mr, mb, ml] = document.margins ?? this.opts.pageMargins
      }
      contentWidth = pageWidth - ml - mr
      contentHeight = pageHeight - mt - mb
    }
    setSection(0)
    const sectionBreaks = new Set(['continuous', 'nextPage', 'evenPage', 'oddPage'])
    const sectionColumns = (index: number) => {
      const section = document?.sections?.[index]
      const count = section?.columnCount ?? document?.columnCount ?? 1
      const gap = section?.columnGap ?? document?.columnGap ?? 20
      const width = section?.pageWidth !== undefined && section.margins
        ? section.pageWidth - section.margins[1] - section.margins[3] : contentWidth
      return { widths: Array(count).fill((width - gap * (count - 1)) / count) as number[], gap }
    }
    const sectionWidths = (document?.sections ?? [undefined]).map((_, index) => sectionColumns(index).widths[0])
    const columnGroups = new Map<string, { widths: number[]; gap: number }>()
    let columnSection = 0
    for (const element of elements) {
      const data = element as IElement & { columnId?: string; columnCount?: number; columnWidths?: number[]; columnGap?: number }
      if (data.columnId && data.columnCount) {
        const gap = data.columnGap ?? 0
        const width = sectionWidths?.[columnSection] ?? contentWidth
        columnGroups.set(data.columnId, { gap, widths: data.columnWidths ?? Array(data.columnCount).fill((width - gap * (data.columnCount - 1)) / data.columnCount) })
      }
      if (element.type === 'pageBreak' && sectionBreaks.has(element.value)) columnSection++
    }
    const rawBlocks = this.layoutBlocks(elements, [], contentWidth, sectionWidths)
    for (let index = 0; index < rawBlocks.length; index++) {
      const block = rawBlocks[index]
      if (block.kind !== 'paragraph') continue
      const input = this.paragraphInputs.get(block)!
      const columnId = input.runs.find(run => (run as Record<string, unknown>).columnId)?.columnId as string | undefined
      const columns = columnId ? columnGroups.get(columnId) : undefined
      if (columns) rawBlocks[index] = this.layoutParagraph({ ...input, availableWidth: columns.widths[0] })
    }
    const anchorParagraphs = new Map<string, ParagraphBlock>()
    for (const block of rawBlocks) {
      if (block.kind !== 'paragraph') continue
      for (const run of this.paragraphInputs.get(block)?.runs ?? []) {
        if (run.sourceParagraphId && !anchorParagraphs.has(run.sourceParagraphId)) anchorParagraphs.set(run.sourceParagraphId, block)
      }
    }
    // Schedule floating drawings with their Java-identified paragraph, never an adjacent run.
    const attachedImages = new Map<ParagraphBlock, ImageBlock[]>()
    for (let index = rawBlocks.length - 1; index >= 0; index--) {
      const block = rawBlocks[index]
      if (block.kind !== 'image') continue
      const id = (block.block as IImageElement).imageLayout?.anchorParagraphId
      const anchor = id ? anchorParagraphs.get(id) : undefined
      if (!anchor) continue
      attachedImages.set(anchor, [block, ...(attachedImages.get(anchor) ?? [])])
      rawBlocks.splice(index, 1)
    }
    for (let index = rawBlocks.length - 1; index >= 0; index--) {
      const block = rawBlocks[index]
      if (block.kind === 'paragraph') rawBlocks.splice(index + 1, 0, ...(attachedImages.get(block) ?? []))
    }
    const placedAnchors = new Map<string, { paragraph: ParagraphBlock; column: Rect }>()

    // 页眉/页脚 block 预布局（rect.y 相对各自区域原点）
    this.layoutZone = 'header'
    const headerBlocks = headerElements?.length ? this.layoutBlocks(headerElements, [], contentWidth) : []
    this.layoutZone = 'footer'
    const footerBlocks = footerElements?.length ? this.layoutBlocks(footerElements, [], contentWidth) : []
    this.paragraphCache = this.nextParagraphCache

    // 页眉内容在上边距区域内靠下排列（底部贴近正文顶部），避免紧贴页面顶部
    let headerOffsetY = 0
    if (headerBlocks.length > 0) {
      const last = headerBlocks[headerBlocks.length - 1]
      const headerContentHeight = last.rect.y + last.rect.height
      headerOffsetY = Math.max(0, mt - headerContentHeight)
    }
    // 页脚内容在下边距区域内靠上排列（顶部贴近正文底部），偏移为 0
    const footerOffsetY = 0

    // 分页
    const pages: PageLayout[] = []
    let pageIndex = 0
    let cursorY = 0
    let currentBlocks: BlockNode[] = []
    let activeColumns: { widths: number[]; gap: number } | undefined
    let activeColumnId: string | undefined
    let columnIndex = 0
    let columnTop = 0
    let columnBottom = 0
    const columnX = () => activeColumns ? activeColumns.widths.slice(0, columnIndex).reduce((sum, width) => sum + width + activeColumns!.gap, 0) : 0
    const advanceColumn = () => {
      columnBottom = Math.max(columnBottom, cursorY)
      if (activeColumns && columnIndex + 1 < activeColumns.widths.length) { columnIndex++; cursorY = columnTop }
      else { pushPage(); columnIndex = 0; columnTop = 0; columnBottom = 0 }
    }

    // 页面承载上限判定的浮点容差：
    // 行高经多次浮点累加（cursorY += rowHeight）后，可能出现微小正偏离
    // （如 903 累加为 903.0000000000001）。若用严格 ">" 比较，会让"恰好
    // 填满页面"的内容被误判为超出，从而提前触发分页。这里引入亚像素级
    // 容差（0.5px，小于半像素，视觉上不可感知），仅当真实超出容差才分页。
    const PAGE_FIT_EPSILON = 0.5

    const pushPage = () => {
      const previous = pages[pages.length - 1]
      const pageOriginY = previous ? previous.rect.y + previous.rect.height + pageGap : pageGap
      const section = document?.sections?.[sectionIndex]
      const headerPartId = document?.sections ? resolveHeaderFooterPart(document, 'header', sectionIndex, pageIndex, pageIndex === sectionFirstPage) : undefined
      const footerPartId = document?.sections ? resolveHeaderFooterPart(document, 'footer', sectionIndex, pageIndex, pageIndex === sectionFirstPage) : undefined
      this.layoutZone = `header:${headerPartId ?? ''}`
      const pageHeaders = document?.sections ? this.layoutBlocks(headerPartId ? document.headerFooterParts?.[headerPartId] ?? [] : [], [], contentWidth) : headerBlocks
      this.layoutZone = `footer:${footerPartId ?? ''}`
      const pageFooters = document?.sections ? this.layoutBlocks(footerPartId ? document.headerFooterParts?.[footerPartId] ?? [] : [], [], contentWidth) : footerBlocks
      this.layoutZone = 'main'
      const footerHeight = pageFooters.reduce((height, block) => Math.max(height, block.rect.y + block.rect.height), 0)
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
        index: pageIndex, sectionIndex, headerPartId, footerPartId, rect: pageRect, contentRect, blocks: currentBlocks,
        headerRect,
        headerBlocks: pageHeaders.length
          ? pageHeaders.map(b => ({ ...b, rect: { ...b.rect, y: b.rect.y + (section?.headerDistance ?? headerOffsetY) } }))
          : undefined,
        footerRect,
        footerBlocks: pageFooters.length
          ? pageFooters.map(b => ({ ...b, rect: { ...b.rect, y: b.rect.y + (section?.footerDistance !== undefined ? mb - section.footerDistance - footerHeight : footerOffsetY) } }))
          : undefined
      })
      pageIndex++
      currentBlocks = []
      cursorY = 0
      columnIndex = 0
      columnTop = 0
      columnBottom = 0
    }

    for (let i = 0; i < rawBlocks.length; i++) {
      let b = rawBlocks[i]
      const source = b.kind === 'paragraph' ? this.paragraphInputs.get(b)?.runs.find(run => run.value !== '\u200B') : b.block
      const legacyColumnId = (source as { columnId?: string } | undefined)?.columnId
      const sourceColumnId = legacyColumnId ?? `section:${sectionIndex}`
      if (sourceColumnId !== activeColumnId) {
        cursorY = Math.max(cursorY, columnBottom)
        activeColumnId = sourceColumnId
        activeColumns = legacyColumnId ? columnGroups.get(legacyColumnId) : sectionColumns(sectionIndex)
        columnIndex = 0; columnTop = cursorY; columnBottom = cursorY
      }
      if (b.kind === 'paragraph' && activeColumns) {
        const input = this.paragraphInputs.get(b)!
        b = this.layoutParagraph({ ...input, availableWidth: activeColumns.widths[columnIndex] })
      }
      if (b.kind === 'paragraph' && b.paragraphKind !== 'list') {
        const exclusions: NonNullable<ParagraphInput['exclusions']> = []
        for (const placed of currentBlocks) {
          if (placed.kind !== 'image') continue
          const geometry = (placed.block as IImageElement).imageLayout
          if (!geometry?.anchored) continue
          const wrap = geometry.positioning?.find(node => node.name === 'wrapSquare' || node.name === 'wrapTopAndBottom')
          if (!wrap) continue
          const attrs = geometry.anchorAttributes
          const distance = (name: string) => {
            if (attrs?.[name] === undefined) throw new TypeError(`Java anchored image 缺少 ${name}`)
            return Number(attrs[name]) / 9525
          }
          exclusions.push({ rect: { x: placed.rect.x - columnX() - distance('distL'), y: placed.rect.y - cursorY - distance('distT'),
            width: placed.rect.width + distance('distL') + distance('distR'), height: placed.rect.height + distance('distT') + distance('distB') },
            side: wrap.name === 'wrapTopAndBottom' ? '' : wrap.attributes.wrapText, topBottom: wrap.name === 'wrapTopAndBottom' })
        }
        const input = this.paragraphInputs.get(b)
        if (input && exclusions.length) b = this.computeParagraph({ ...input, exclusions })
      }
      if (b.kind === 'pageBreak') {
        if (b.block.type === 'columnBreak') { advanceColumn(); continue }
        const breakType = String(b.block.value)
        const nextSection = sectionBreaks.has(breakType) ? document?.sections?.[sectionIndex + 1] : undefined
        const geometryChanged = nextSection && (nextSection.pageWidth !== pageWidth || nextSection.pageHeight !== pageHeight ||
          nextSection.margins?.some((margin, index) => margin !== [mt, mr, mb, ml][index]))
        if (breakType !== 'continuous' || geometryChanged) pushPage()
        if (sectionBreaks.has(breakType) && document?.sections) {
          sectionIndex++
          if (!document.sections[sectionIndex]) throw new TypeError('Java sections 与正文分节符数量不一致')
          setSection(sectionIndex)
          sectionFirstPage = pageIndex
        }
        if (breakType === 'evenPage' && (pageIndex + 1) % 2 !== 0) pushPage()
        if (breakType === 'oddPage' && (pageIndex + 1) % 2 !== 1) pushPage()
        if (breakType === 'evenPage' || breakType === 'oddPage') sectionFirstPage = pageIndex
        continue
      }
      // 多栏段落按行流入下一栏/页，而非把整个长段落移出页面。
      if (b.kind === 'paragraph' && activeColumns && activeColumns.widths.length > 1 && !b.surroundImage && !attachedImages.has(rawBlocks[i] as ParagraphBlock)) {
        let start = 0
        while (start < b.lines.length) {
          const origin = start === 0 ? 0 : b.lines[start].y
          let end = start
          while (end < b.lines.length && cursorY + b.lines[end].y + b.lines[end].height - origin <= contentHeight + PAGE_FIT_EPSILON) end++
          if (end === start) {
            if (cursorY > columnTop) { advanceColumn(); continue }
            end++
          }
          const lines = b.lines.slice(start, end).map(line => ({ ...line, y: line.y - origin, baseline: line.baseline - origin }))
          const height = end === b.lines.length ? b.rect.height - origin : lines.at(-1)!.y + lines.at(-1)!.height
          currentBlocks.push({ ...b, id: nextBlockId(), bulletText: start === 0 ? b.bulletText : undefined,
            rect: { ...b.rect, x: b.rect.x + columnX(), y: cursorY, height }, lines })
          cursorY += height
          start = end
          if (start < b.lines.length) advanceColumn()
        }
        continue
      }
      let bh = b.rect.height
      const overflow = cursorY + bh - contentHeight
      // 仅当内容真实超出页面承载上限（超出浮点容差）才分页；
      // 恰好填满（|cum - contentHeight| <= epsilon）时留在本页。
      if (overflow > PAGE_FIT_EPSILON && !(b.kind === 'image' && (b.block as IImageElement).imageLayout?.anchored)) {
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
        if (currentBlocks.length > 0) {
          advanceColumn()
          if (b.kind === 'paragraph' && activeColumns) b = this.layoutParagraph({ ...this.paragraphInputs.get(rawBlocks[i] as ParagraphBlock)!, availableWidth: activeColumns.widths[columnIndex] })
          if (b.kind === 'paragraph' && !activeColumns && b !== rawBlocks[i]) {
            b = rawBlocks[i]
            bh = b.rect.height
          }
        }
      }
      b.rect.y = cursorY
      if (activeColumns) b.rect.x += columnX()
      bh = b.rect.height
      if (b.kind === 'paragraph') {
        for (const [id, anchor] of anchorParagraphs) {
          if (anchor === rawBlocks[i]) placedAnchors.set(id, { paragraph: b, column: { x: columnX(), y: columnTop, width: activeColumns?.widths[columnIndex] ?? contentWidth, height: contentHeight - columnTop } })
        }
      }
      const floating = b.kind === 'image' && (b.block as IImageElement).imageLayout?.anchored
      const image = b.kind === 'image' ? b : b.kind === 'paragraph' ? b.surroundImage : undefined
      if (image && (image.block as IImageElement).imageLayout?.anchored) {
        const geometry = (image.block as IImageElement).imageLayout!
        const horizontal = geometry.positioning?.find(node => node.name === 'positionH')
        const vertical = geometry.positioning?.find(node => node.name === 'positionV')
        const resolve = (node: typeof horizontal, axis: 'x' | 'y'): number => {
          if (!node) throw new TypeError('Java anchored image 缺少定位节点')
          const ref = node.attributes.relativeFrom
          const isX = axis === 'x'
          let origin: number, length: number
          if (ref === 'page') { origin = isX ? -ml : -mt; length = isX ? pageWidth : pageHeight }
          else if (ref === 'margin') { origin = 0; length = isX ? contentWidth : contentHeight }
          else if ((isX && ref === 'column') || (!isX && ref === 'paragraph')) {
            const anchor = geometry.anchorParagraphId ? placedAnchors.get(geometry.anchorParagraphId) : undefined
            if (!anchor) throw new TypeError('Java anchored image 缺少已排版的 anchorParagraphId')
            origin = isX ? anchor.column.x : anchor.paragraph.rect.y + (anchor.paragraph.lines[0]?.y ?? 0)
            length = isX ? anchor.column.width : anchor.paragraph.lines.reduce((height, line) => Math.max(height, line.y + line.height - (anchor.paragraph.lines[0]?.y ?? 0)), 0)
          }
          else if (ref === 'paragraph' || ref === 'line' || ref === 'character' || ref === 'column') {
            throw new TypeError(`尚未支持 OOXML 图片 ${ref} 参考系：需要真实锚点上下文与布局边界`)
          }
          else if (ref === 'leftMargin' || ref === 'topMargin') { origin = isX ? -ml : -mt; length = isX ? ml : mt }
          else if (ref === 'rightMargin' || ref === 'bottomMargin') { origin = isX ? contentWidth : contentHeight; length = isX ? mr : mb }
          else if (ref === 'insideMargin' || ref === 'outsideMargin') {
            const leading = (ref === 'insideMargin') === ((pageIndex + 1) % 2 === 1)
            origin = leading ? (isX ? -ml : -mt) : (isX ? contentWidth : contentHeight)
            length = leading ? (isX ? ml : mt) : (isX ? mr : mb)
          } else throw new TypeError(`不支持的 OOXML 图片定位参考系: ${ref}`)
          const offset = node.children.find(child => child.name === 'posOffset')
          if (offset) return origin + Number(offset.text) / 9525
          const align = node.children.find(child => child.name === 'align')?.text
          const size = isX ? image.rect.width : image.rect.height
          if (align === 'center') return origin + (length - size) / 2
          if (align === 'right' || align === 'bottom') return origin + length - size
          if (align === 'inside' || align === 'outside') return origin + (((align === 'inside') === ((pageIndex + 1) % 2 === 1)) ? 0 : length - size)
          if (align === 'left' || align === 'top') return origin
          throw new TypeError('Java anchored image 缺少 align/posOffset')
        }
        image.rect.x = resolve(horizontal, 'x')
        image.rect.y = resolve(vertical, 'y') - (b.kind === 'paragraph' ? b.rect.y : 0)
        const wrap = geometry.positioning?.find(node => node.name.startsWith('wrap'))
        if (wrap && wrap.name !== 'wrapNone' && b.kind === 'image') {
          const distance = (name: string) => Number(geometry.anchorAttributes?.[name] ?? 0) / 9525
          const top = image.rect.y - distance('distT'), bottom = image.rect.y + image.rect.height + distance('distB')
          const left = image.rect.x - distance('distL'), right = image.rect.x + image.rect.width + distance('distR')
          const intersects = currentBlocks.some(block => block.kind === 'paragraph' && block.lines.some(line =>
            block.rect.y + line.y < bottom && block.rect.y + line.y + line.height > top &&
            (wrap.name === 'wrapTopAndBottom' || (block.rect.x + line.x < right && block.rect.x + line.x + line.width > left))))
          if (intersects) {
            this.diagnostics.push({ code: 'unsupported-floating-image', severity: 'warning', feature: 'anchor-reflow',
              message: '尚未支持浮动图片对已排版段落的回流；此浮动图片暂不显示，原始数据保留用于导出。',
              zone: 'main', path: [...image.parentPath, image.indexInParent], action: 'image-omitted' })
            continue
          }
        }
      }
      currentBlocks.push(b)
      if (!floating) cursorY += bh
    }
    if (currentBlocks.length > 0) pushPage()
    else if (pages.length === 0 || rawBlocks.at(-1)?.block?.type === 'pageBreak' && rawBlocks.at(-1)?.block?.value === 'manual') pushPage()

    const lastPage = pages[pages.length - 1]
    const totalHeight = lastPage.rect.y + lastPage.rect.height + pageGap
    return { pages, totalHeight, pageWidth: Math.max(...pages.map(page => page.rect.width)), diagnostics: this.diagnostics }
  }

  /**
   * 将 elements 数组转换为 BlockNode 列表（y 起始为 0，返回后由上层重新分配 y）。
   */
  private layoutBlocks(elements: IElement[], parentPath: Path, availableWidth: number, sectionWidths?: number[]): BlockNode[] {
    let section = 0
    const paragraphs = splitParagraphs(elements)

    const blocks: BlockNode[] = []
    for (let gi = 0; gi < paragraphs.length; gi++) {
      const g = paragraphs[gi]
      if (g.kind === 'table') {
        blocks.push(this.layoutTable(g.block as ITableElement, parentPath, g.start, availableWidth))
      } else if (g.kind === 'image') {
        const imgEl = g.block as IElement
        const geometry = (imgEl as IImageElement).imageLayout
        if (geometry?.anchored) {
          const issues: { feature: string; reason: string }[] = []
          const issue = (feature: string, reason: string) => issues.push({ feature, reason })
          if (this.layoutZone !== 'main' || parentPath.length) issue('anchor-context', '页眉页脚或表格内浮动图片定位与绕排')
          for (const axis of ['positionH', 'positionV']) {
            const node = geometry.positioning?.find(node => node.name === axis)
            const reference = node?.attributes.relativeFrom
            const hasAnchor = geometry.anchorParagraphId && paragraphs.some(paragraph => paragraph.runs.some(run => run.sourceParagraphId === geometry.anchorParagraphId))
            const supported = axis === 'positionH'
              ? ['page', 'margin', 'leftMargin', 'rightMargin', 'insideMargin', 'outsideMargin', ...(hasAnchor ? ['column'] : [])]
              : ['page', 'margin', 'topMargin', 'bottomMargin', 'insideMargin', 'outsideMargin', ...(hasAnchor ? ['paragraph'] : [])]
            if (!reference || !supported.includes(reference)) issue(`${axis}.${reference ?? 'missing'}`, `${axis} 的 ${reference ?? '缺失'} 参考系（需要真实锚点上下文）`)
            const offset = node?.children.find(child => child.name === 'posOffset')
            const align = node?.children.find(child => child.name === 'align')?.text
            if (offset ? !Number.isFinite(Number(offset.text)) : !['center', 'right', 'bottom', 'inside', 'outside', 'left', 'top'].includes(align ?? '')) {
              issue(`${axis}.position`, `${axis} 缺少有效 align/posOffset`)
            }
          }
          const wrap = geometry.positioning?.find(node => node.name.startsWith('wrap'))
          if (!wrap || !['wrapNone', 'wrapSquare', 'wrapTopAndBottom'].includes(wrap.name)) {
            issue(wrap?.name ?? 'wrap.missing', `${wrap?.name ?? '缺失绕排节点'} 多边形轮廓绕排`)
          }
          if (wrap?.name === 'wrapSquare' && !['left', 'right', 'largest'].includes(wrap.attributes.wrapText)) {
            issue(`wrapSquare.${wrap.attributes.wrapText}`, `${wrap.attributes.wrapText ?? '缺失 wrapText'} 同行排文`)
          }
          if (wrap?.name !== 'wrapNone') {
            const bound = geometry.anchorParagraphId && paragraphs.some(paragraph => paragraph.runs.some(run => run.sourceParagraphId === geometry.anchorParagraphId))
            if (!bound && blocks.some(block => block.kind === 'paragraph')) issue('anchor-reflow', '后置浮动锚点触发前文回流')
            if (paragraphs.some(paragraph => paragraph.kind === 'list')) issue('list-wrap', '浮动图片与列表绕排')
            for (const name of ['distT', 'distB', 'distL', 'distR']) {
              if (geometry.anchorAttributes?.[name] === undefined || !Number.isFinite(Number(geometry.anchorAttributes[name]))) issue(name, `缺少有效 ${name} 绕排距离`)
            }
          }
          if (issues.length) {
            const path: Path = [...parentPath, g.start]
            for (const { feature, reason } of issues) {
              if (!this.diagnostics.some(item => item.zone === this.layoutZone && item.feature === feature && JSON.stringify(item.path) === JSON.stringify(path))) {
                this.diagnostics.push({ code: 'unsupported-floating-image', severity: 'warning', feature,
                  message: `尚未支持 OOXML ${reason}；此浮动图片暂不显示，原始数据保留用于导出，周围内容布局可能与 Office 不一致。`,
                  zone: this.layoutZone, path, action: 'image-omitted' })
              }
            }
            continue
          }
        }
        const imgDisplay = String((imgEl as unknown as Record<string, unknown>).imgDisplay ?? 'block')
        if (imgDisplay === 'surround' || imgDisplay === 'float-top' || imgDisplay === 'float-bottom') {
          const imgBlock = this.layoutImage(imgEl, parentPath, g.start, availableWidth)
          const next = paragraphs[gi + 1]
          if (!(imgEl as IImageElement).imageLayout?.anchored && next && (next.kind === 'normal' || next.kind === 'title' || next.kind === 'list')) {
            const kind: ParagraphBlock['paragraphKind'] = next.kind === 'normal' ? 'normal' : next.kind
            const runsParentPath: Path = (kind === 'normal')
              ? parentPath
              : [...parentPath, next.start, 'valueList']
            const pb = this.layoutParagraph({
              paragraphKind: kind,
              block: next.block,
              runs: next.runs,
              runsParentPath,
              startIndex: next.start,
              endIndex: next.end,
              parentPath,
              availableWidth,
              runStartIndex: next.runStartIndex ?? 0
            })
            pb.surroundImage = imgBlock
            if (imgBlock.rect.height > pb.rect.height) {
              pb.rect.height = imgBlock.rect.height
            }
            blocks.push(pb)
            gi++
            continue
          }
          blocks.push(imgBlock)
        } else {
          blocks.push(this.layoutImage(imgEl, parentPath, g.start, availableWidth))
        }
      } else if (g.kind === 'pageBreak') {
        blocks.push({
          kind: 'pageBreak',
          id: nextBlockId(),
          block: g.block as IElement,
          parentPath,
          indexInParent: g.start,
          rect: { x: 0, y: 0, width: availableWidth, height: 0 }
        } as PageBreakBlock)
        if (sectionWidths && ['continuous', 'nextPage', 'evenPage', 'oddPage'].includes(String(g.block?.value))) {
          section++
          if (sectionWidths[section] === undefined) throw new TypeError('Java sections 与正文分节符数量不一致')
          availableWidth = sectionWidths[section]
        }
      } else if (g.kind === 'separator') {
        // 分割线：独立块，高度含上下间距（各 6px）+ 线宽 1px
        const sepHeight = 13
        blocks.push({
          kind: 'separator',
          id: nextBlockId(),
          block: g.block as IElement,
          parentPath,
          indexInParent: g.start,
          rect: { x: 0, y: 0, width: availableWidth, height: sepHeight }
        } as SeparatorBlock)
      } else if (g.kind === 'block') {
        const blockEl = g.block as IElement
        const anyEl = blockEl as unknown as Record<string, unknown>
        const metrics = anyEl.metrics as { width?: number; height?: number } | undefined
        const w = Math.max(1, Number(metrics?.width ?? 420))
        const h = Math.max(1, Number(metrics?.height ?? 320))
        const innerBlock = anyEl.block as { type?: string } | undefined
        if (innerBlock?.type === 'chart') {
          blocks.push({
            kind: 'chart',
            id: nextBlockId(),
            block: blockEl,
            parentPath,
            indexInParent: g.start,
            rect: { x: 0, y: 0, width: w, height: h }
          } as ChartBlock)
        } else {
          blocks.push({
            kind: 'block',
            id: nextBlockId(),
            block: blockEl,
            parentPath,
            indexInParent: g.start,
            rect: { x: 0, y: 0, width: w, height: h }
          } as EmbedBlock)
        }
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
          availableWidth,
          runStartIndex: g.runStartIndex ?? 0
        }))
      }
    }
    return blocks
  }

  /**
   * 将单个段落（normal/title/list）排版为 ParagraphBlock：解析段落属性、计算项目符号、
   * 折行、行高、行内定位、rowFlex 对齐，并产出 inline 列表。
   * @param input 段落排版输入（类型/容器/runs/路径/可用宽度等）
   * @returns 段落块（含 lines/inlines 与 rect）
   */
  private layoutParagraph(input: ParagraphInput): ParagraphBlock {
    // Numbered lists depend on preceding counters and must still be evaluated.
    if (input.paragraphKind === 'list') {
      const result = this.computeParagraph(input)
      this.paragraphInputs.set(result, input)
      return result
    }
    const key = JSON.stringify([this.layoutZone, input.runsParentPath, input.startIndex, input.runStartIndex])
    const signature = JSON.stringify(input)
    const cached = this.paragraphCache.get(key)
    // Undo/document replacement may have identical text but different source refs.
    const sameSources = cached?.input.block === input.block &&
      cached.input.runs.length === input.runs.length &&
      input.runs.every((run, index) => run === cached.input.runs[index])
    const layout = cached && sameSources && cached.signature === signature
      ? cached.layout
      : this.computeParagraph(input)
    this.nextParagraphCache.set(key, { signature, input, layout })
    // Pagination, table placement and surrounding images mutate the outer block.
    const result = { ...layout, rect: { ...layout.rect } }
    this.paragraphInputs.set(result, input)
    return result
  }

  private computeParagraph(input: ParagraphInput): ParagraphBlock {
    const {
      paragraphKind, block, runs, runsParentPath,
      startIndex, endIndex, parentPath, availableWidth,
      runStartIndex = 0
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
    // 是否使用 Word 悬挂缩进模型（有 indentHanging 时为 true）
    let useWordHanging = false
    // 悬挂缩进量（编号在文字左侧的偏移）
    let bulletHanging = 0
    // 项目符号/编号：list 段落必定处理；title 段落若带 listNumbering（Word heading 关联多级列表）也一并处理
    const hasNumbering = !!(block as unknown as { listNumbering?: unknown } | undefined)?.listNumbering
    if (block && (paragraphKind === 'list' || (paragraphKind === 'title' && hasNumbering))) {
      const listEl = block as IListElement
      const res = resolveBullet(listEl, this.counters)
      // 层级缩进
      const level = Math.max(0, listEl.listLevel ?? 0)
      const listHanging = Number(listEl.listHanging ?? 24)
      const listBaseIndent = Number(listEl.listIndent ?? listEl.listNumbering?.indentLeft ?? 0)
      // 编号悬挂：仅当 listNumbering 明确定义 indentHanging 时才用 Word 悬挂模型
      bulletHanging = Number(listEl.listNumbering?.indentHanging ?? 0)
      useWordHanging = bulletHanging > 0
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
      //   useWordHanging（有 indentHanging）：indentLeft = 文字位置，编号在 indentLeft - bulletHanging
      //   否则（无 indentHanging）：indentLeft = 编号位置，文字在 indentLeft + bulletWidth（原行为）
      //   编号绘制 x = firstLine.x + bulletX（bulletX 为负）
      const jc = res.lvlJc
      const hangingOffset = useWordHanging ? bulletHanging : bulletWidth
      if (jc === 'center') {
        const inner = Math.max(0, hangingOffset - symbolGap - glyphW)
        bulletX = -hangingOffset + inner / 2
      } else {
        bulletX = -hangingOffset
      }
    }

    // 每行可用宽度：Word 悬挂模型下编号在悬挂区不占行宽；否则编号占 bulletWidth
    const bulletWidthForLine = useWordHanging ? 0 : bulletWidth
    const usableWidth = Math.max(20, availableWidth - indentLeft - indentRight - bulletWidthForLine)
    const lines: LineBox[] = []
    let currentInlines: InlineBox[] = []
    let currentLineWidth = 0
    let currentMaxSize = this.opts.defaultSize
    let isFirstLine = true

    // 首行偏移相对于文本前缩进，负值表示悬挂。
    const firstLineOffset = attr('indentHanging') != null ? -indentHanging : firstIndent
    let flowY = spacingBefore
    const lineRegion = (): { x: number; width: number } => {
      let left = indentLeft + bulletWidthForLine + (isFirstLine ? firstLineOffset : 0)
      let right = availableWidth - indentRight
      for (const exclusion of input.exclusions ?? []) {
        const r = exclusion.rect
        if (flowY >= r.y + r.height || flowY + computeLineHeight(currentMaxSize) <= r.y) continue
        if (exclusion.topBottom || (r.x <= left && r.x + r.width >= right)) {
          flowY = r.y + r.height
          return lineRegion()
        }
        const leftWidth = Math.max(0, r.x - left), rightWidth = Math.max(0, right - r.x - r.width)
        const useLeft = exclusion.side === 'left' || (exclusion.side !== 'right' && leftWidth >= rightWidth)
        if (useLeft) right = Math.min(right, r.x)
        else left = Math.max(left, r.x + r.width)
        if (right - left < currentMaxSize) {
          flowY = r.y + r.height
          return lineRegion()
        }
      }
      return { x: left, width: Math.max(1, right - left) }
    }
    const currentLineMaxWidth = (): number => lineRegion().width

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
      const region = lineRegion()
      const lineXBase = region.x
      // 把 inline.x 从"相对 line 起点"平移到"相对块起点"
      for (const inl of currentInlines) inl.x += lineXBase
      const line: LineBox = {
        x: lineXBase,
        y: flowY,
        width: region.width,
        height: lh,
        baseline: lh * 0.82,
        inlines: currentInlines,
        rowFlex,
        isLastLine
      }
      lines.push(line)
      flowY += lh
      currentInlines = []
      currentLineWidth = 0
      currentMaxSize = this.opts.defaultSize
      isFirstLine = false
    }

    const layoutRuns = runs.map(rawRun => {
      if (rawRun.type === 'hyperlink') {
        const vl = (rawRun as unknown as { valueList?: IElement[] }).valueList ?? []
        const text = vl.map(r => r.type === 'tab' ? '\t' : String(r.value ?? '')).join('')
        const base = (vl.find(r => r.type === 'text' && r.value) as unknown as Record<string, unknown>) ?? {}
        const tocEntry = (rawRun.extension?.toc as { role?: string } | undefined)?.role === 'entry'
        return {
          type: 'text', value: text,
          font: base.font, size: base.size, bold: base.bold, italic: base.italic,
          color: tocEntry ? base.color : '#0000FF', underline: tocEntry ? base.underline : true,
          extension: rawRun.extension
        } as unknown as IElement
      }
      return rawRun
    })
    // Imported PAGEREF results may follow the tab in separate runs, with hidden fields in between.
    const tocPageWidth = (runIndex: number, offset: number): number => {
      let width = 0
      for (let i = runIndex; i < layoutRuns.length; i++) {
        const run = layoutRuns[i]
        if (run.type !== 'text' || run.extension?.fieldMarker || run.extension?.bookmarkMarker) continue
        const text = String(run.value ?? '').slice(i === runIndex ? offset : 0)
        const family = String(run.font ?? this.opts.defaultFont)
        const font = FONT_FAMILY_CSS[family] ?? family
        const size = Number(run.size ?? this.opts.defaultSize)
        for (const ch of text) {
          if (ch === '\n' || ch === '\t') return width
          if (ch === '\u200B' || ch === '\uFEFF') continue
          width += this.measure.charWidth(ch, font, size, !!run.bold, !!run.italic)
        }
      }
      return width
    }

    for (let ri = 0; ri < runs.length; ri++) {
      const rawRun = runs[ri]
      const run = layoutRuns[ri]
      if (run.type !== 'text') continue
      const hyperlinkUrl = rawRun.type === 'hyperlink' ? String(rawRun.url ?? rawRun.value ?? '') : undefined
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
      // title/list 的 runsParentPath 已含段索引，ri 是 valueList 切片内索引，需加 runStartIndex 还原原 valueList 索引。
      // 表格单元格内 normal 段落需拼上 runsParentPath（contentPath）以保证 path 全局唯一。
      const runPath: Path = paragraphKind === 'normal'
        ? [...runsParentPath, startIndex + ri]
        : [...runsParentPath, runStartIndex + ri]
      let cursorInRun = 0

      while (cursorInRun < value.length) {
        const maxLineWidth = currentLineMaxWidth()
        const remaining = maxLineWidth - currentLineWidth
        const tocEntry = (run.extension?.toc as { role?: string } | undefined)?.role === 'entry'
        if (tocEntry && value[cursorInRun] === '\t') {
          const pageWidth = tocPageWidth(ri, cursorInRun + 1)
          if (currentLineWidth > 0 && remaining < pageWidth + size) {
            finalizeLine(false)
            continue
          }
          const width = Math.max(0, remaining - pageWidth)
          currentInlines.push({
            run, path: runPath, startOffset: cursorInRun, endOffset: cursorInRun + 1,
            text: '\t', x: currentLineWidth, y: 0, width, height: size,
            font, size, bold, italic, color, baseline: 0
          })
          currentLineWidth += width
          currentMaxSize = Math.max(currentMaxSize, size)
          cursorInRun++
          continue
        }
        // 若当前行已有内容且首个字符放不下 → 先换行再试，避免溢出被裁
        if (currentLineWidth > 0 && value[cursorInRun] !== '\n') {
          const firstW = this.measure.charWidth(value[cursorInRun], font, size, bold, italic)
          if (firstW > remaining + 0.001) {
            finalizeLine(false)
            continue
          }
        }
        let take = 0
        let takenWidth = 0
        for (let i = cursorInRun; i < value.length; i++) {
          const ch = value[i]
          if (tocEntry && ch === '\t') break
          const w = this.measure.charWidth(ch, font, size, bold, italic)
          if (ch === '\n') { take = i - cursorInRun; break }
          if (takenWidth + w > remaining + 0.001 && take > 0) break
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
          groupIds,
          hyperlink: hyperlinkUrl
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
    // 空段兜底：若整个段落未产出任何 inline（所有 text run 为空字符串或零宽占位），
    // 为首个空 text run 生成零宽 caret 承载 inline，确保光标可定位、行高不塌陷。
    if (currentInlines.length === 0 && lines.length === 0) {
      let placeholderRun: IElement | null = null
      let placeholderRi = -1
      // 优先选空字符串 run（光标通常落在 rest run），跳过零宽分隔符 run
      for (let ri = 0; ri < runs.length; ri++) {
        if (runs[ri].type !== 'text') continue
        const v = String((runs[ri] as unknown as Record<string, unknown>).value ?? '')
        if (v === '') { placeholderRun = runs[ri]; placeholderRi = ri; break }
      }
      // 退而求其次：用首个 text run（可能是零宽分隔符）
      if (!placeholderRun) {
        for (let ri = 0; ri < runs.length; ri++) {
          if (runs[ri].type === 'text') { placeholderRun = runs[ri]; placeholderRi = ri; break }
        }
      }
      if (placeholderRun) {
        const pr = placeholderRun as unknown as Record<string, unknown>
        const rawFont = String(pr.font ?? this.opts.defaultFont)
        const font = FONT_FAMILY_CSS[rawFont] ?? rawFont
        const size = Number(pr.size ?? this.opts.defaultSize)
        const runPath: Path = paragraphKind === 'normal'
          ? [...runsParentPath, startIndex + placeholderRi]
          : [...runsParentPath, runStartIndex + placeholderRi]
        currentInlines.push({
          run: placeholderRun,
          path: runPath,
          startOffset: 0,
          endOffset: 0,
          text: '',
          x: 0,
          y: 0,
          width: 0,
          height: size,
          font,
          size,
          bold: !!pr.bold,
          italic: !!pr.italic,
          color: String(pr.color ?? '#000000'),
          bgColor: undefined,
          strikeout: false,
          underline: false,
          baseline: 0,
          groupIds: undefined
        })
        currentMaxSize = size
      }
    }
    if (currentInlines.length > 0 || lines.length === 0) finalizeLine(true)

    // 分配行 y 与 inline y/baseline（相对块本地坐标）
    let yy = spacingBefore
    // 跟踪块内内容实际右边缘（含 rowFlex 平移后的最大 x），用于兜底 bitmap 宽度
    let contentRight = 0
    for (const line of lines) {
      yy = Math.max(yy, line.y)
      line.y = yy
      line.baseline = 0.8 * line.height
      for (const inl of line.inlines) {
        inl.y = yy
        inl.baseline = yy + line.baseline
      }
      applyRowFlex(line, input.exclusions?.length ? line.width : usableWidth)
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

  /**
   * 将图片元素排版为 ImageBlock：根据 width/height/rotate 计算占位尺寸与水平对齐位置。
   * @param el 图片元素
   * @param parentPath 父容器路径
   * @param index 在父容器中的索引
   * @param availableWidth 可用宽度（用于对齐计算）
   * @returns 图片块
   */
  private layoutImage(el: IElement, parentPath: Path, index: number, availableWidth: number): ImageBlock {
    const anyEl = el as unknown as Record<string, unknown>
    const w = Number(anyEl.width)
    const h = Number(anyEl.height)
    const rotate = Number(anyEl.rotate ?? 0) * Math.PI / 180
    const occupiedW = Math.abs(w * Math.cos(rotate)) + Math.abs(h * Math.sin(rotate))
    const occupiedH = Math.abs(w * Math.sin(rotate)) + Math.abs(h * Math.cos(rotate))
    // 水平对齐：rowFlex 决定 x 位置
    const rowFlex = String(anyEl.rowFlex ?? 'left')
    let x = 0
    if (occupiedW < availableWidth) {
      if (rowFlex === 'center') x = (availableWidth - occupiedW) / 2
      else if (rowFlex === 'right') x = availableWidth - occupiedW
    }
    return {
      kind: 'image',
      id: nextBlockId(),
      block: el,
      parentPath,
      indexInParent: index,
      rect: { x, y: 0, width: occupiedW, height: occupiedH }
    }
  }

  /**
   * 将表格元素排版为 TableBlock：计算列宽、rowspan 占用矩阵、各行高、单元格内容排版、
   * 跨行 cell 撑高与垂直对齐。
   * @param table 表格元素
   * @param parentPath 父容器路径
   * @param index 在父容器中的索引
   * @param availableWidth 可用宽度
   * @returns 表格块
   */
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
    // 分页片段不能补造源文档未提供或显式关闭的边框。
    void c
    void side
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

/**
 * 数组前 upto 项求和。
 * @param arr 数值数组
 * @param upto 求和上界（不含）
 * @returns 前 upto 项之和
 */
function sumUp(arr: number[], upto: number): number {
  let s = 0
  for (let i = 0; i < upto; i++) s += arr[i]
  return s
}

/**
 * 对单行 inline 列表应用水平对齐：left/center/right 直接平移；
 * justify/alignment 将剩余空白均分到字符间隙（仅非末行）。
 * @param line 行盒
 * @param containerWidth 容器可用宽度
 */
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
  const isJustify = line.rowFlex === 'justify' || line.rowFlex === 'alignment'
  const isDistribute = line.rowFlex === 'distribute'
  if ((isJustify || isDistribute) && line.inlines.length > 0) {
    if (isJustify && line.isLastLine) return
    // 按"字符间隙"分配额外空白（接近 Word 的两端对齐视觉效果）：
    // 全行字符数 N，可拉伸缝隙数 = N - 1，均分 free 到每个字符后。
    // 每个 inline 的宽度按 letterSpacing * charCount 扩展，后续 inline
    // 依次右移；inline 之间不再额外插入间隙，避免出现大块空白。
    // distribute 与 justify 唯一区别：末行也分散对齐。
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
