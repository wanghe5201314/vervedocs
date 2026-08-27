import type { IElement } from '@vervedoc/docx-editor-schema'
import { ALIGNMENT_MAP } from '../../constants'
import type {
  DocNode, ParagraphNode, TableNode, ColumnNode, InlineChunk,
  TextChunk, ImageChunk, HyperlinkChunk, BreakChunk,
  RunStyle, IDocxParseOptions, DocxCommentMeta
} from '../../types'

const ZERO_WIDTH_SPACE = '\u200B'

const TITLE_LEVEL_MAP: Record<number, string> = {
  1: 'first', 2: 'second', 3: 'third',
  4: 'fourth', 5: 'fifth', 6: 'sixth'
}

const VERTICAL_ALIGN_MAP: Record<string, string> = {
  top: 'top',
  center: 'middle',
  bottom: 'bottom'
}

let elementIdCounter = 0

function generateElementId(): string {
  return `docx_${Date.now()}_${++elementIdCounter}`
}

// ---- 公开入口 ----

/**
 * 将中间表示 DocNode[] 转换为编辑器 IElement[]
 */
export function buildElements(
  nodes: DocNode[],
  options: IDocxParseOptions,
  _commentMetas?: Map<string, DocxCommentMeta>
): IElement[] {
  const elements: IElement[] = []
  const activeCommentIds = new Set<string>()
  const defaultSize = options.defaultSize ?? 12

  // 预处理：合并连续空段落
  const processedNodes = collapseEmptyParagraphs(nodes, defaultSize)

  let prevEndSize = defaultSize

  for (let i = 0; i < processedNodes.length; i++) {
    const node = processedNodes[i]
    const isFirst = elements.length === 0

    if (node.type === 'paragraph') {
      const endSize = buildParagraph(
        node, elements, options, isFirst, activeCommentIds, prevEndSize
      )
      prevEndSize = endSize
    } else if (node.type === 'table') {
      buildTable(node, elements, options, activeCommentIds)
      prevEndSize = defaultSize
    } else if (node.type === 'column') {
      buildColumn(node, elements, options, activeCommentIds)
      prevEndSize = defaultSize
    }
  }

  if (elements.length === 0) {
    elements.push({ value: ZERO_WIDTH_SPACE })
  }

  return elements
}

// ---- 空段落预处理 ----

/**
 * 将连续的空段落合并为单个带 spacingAfter 的分隔，
 * 避免 N 个空段落产生 N 个大行高分隔符
 */
function collapseEmptyParagraphs(nodes: DocNode[], defaultSize: number): DocNode[] {
  const result: DocNode[] = []
  let emptyCount = 0

  const flushEmpty = () => {
    if (emptyCount <= 0) return
    // 连续 N 个空段落合并为一个，spacingAfter 叠加
    const accumulated = emptyCount
    emptyCount = 0
    result.push({
      type: 'paragraph',
      chunks: [{
        type: 'text',
        value: ZERO_WIDTH_SPACE,
        style: { size: defaultSize }
      }],
      style: {
        spacingAfter: accumulated > 1 ? (accumulated - 1) * defaultSize * 1.2 : 0
      }
    } as ParagraphNode)
  }

  for (const node of nodes) {
    if (node.type === 'paragraph' && isParagraphEmpty(node)) {
      emptyCount++
    } else {
      flushEmpty()
      result.push(node)
    }
  }
  flushEmpty()

  return result
}

function isParagraphEmpty(para: ParagraphNode): boolean {
  if (para.chunks.length === 0) return true
  if (para.chunks.length === 1) {
    const chunk = para.chunks[0]
    return chunk.type === 'text' && chunk.value === ZERO_WIDTH_SPACE
  }
  return false
}

// ---- 段落构建 ----

/**
 * 构建段落对应的 IElement[]，插入到 elements 中
 * 返回该段落末尾元素的字号（供下一个段落的分隔符使用）
 */
function buildParagraph(
  para: ParagraphNode,
  elements: IElement[],
  options: IDocxParseOptions,
  isFirst: boolean,
  activeCommentIds: Set<string>,
  prevEndSize: number
): number {
  const { style, chunks } = para
  const defaultSize = options.defaultSize ?? 12
  const forceLineHeight = options.forceDefaultLineHeight

  // 段落级属性
  const paragraphAttrs: Partial<IElement> = {}

  // 对齐
  if (style.rowFlex) {
    const mapped = ALIGNMENT_MAP[style.rowFlex]
    if (mapped) paragraphAttrs.rowFlex = mapped as any
  }

  // 段前 / 段后间距
  if (style.spacingBefore !== undefined) {
    paragraphAttrs.paragraphSpacingBefore = style.spacingBefore
  }
  if (style.spacingAfter !== undefined) {
    paragraphAttrs.paragraphSpacingAfter = style.spacingAfter
  }

  // 行高：forceDefaultLineHeight > exact/atLeast (px) > auto (倍率)
  if (forceLineHeight) {
    paragraphAttrs.lineHeight = forceLineHeight
  } else if (style.lineHeight !== undefined) {
    paragraphAttrs.lineHeight = style.lineHeight
  }

  // 缩进
  if (style.indentLeft !== undefined) {
    paragraphAttrs.paragraphIndentLeft = style.indentLeft
  }
  if (style.firstLineIndent !== undefined) {
    paragraphAttrs.paragraphFirstLineIndent = style.firstLineIndent
  }

  // 段落背景色
  if (style.paragraphColor) {
    (paragraphAttrs as any).paragraphColor = style.paragraphColor
  }

  const isTitled = style.titleLevel !== undefined && style.titleLevel >= 1 && style.titleLevel <= 6
  const isList = !!style.listType

  // 段落间分隔符（非第一个段落前插入）
  // 字号使用上一个段落末尾的字号，避免继承大字号标题行高
  if (!isFirst && elements.length > 0) {
    const separatorEl: IElement = { value: ZERO_WIDTH_SPACE, size: prevEndSize as any }
    elements.push(separatorEl)
  }

  // 构建内容元素
  const contentElements: IElement[] = []
  for (const chunk of chunks) {
    buildChunk(chunk, contentElements, options, activeCommentIds)
  }

  if (contentElements.length === 0) {
    contentElements.push({ value: ZERO_WIDTH_SPACE, size: defaultSize as any })
  }

  // 应用段落属性
  if (isTitled) {
    applyRowFlexToChildren(contentElements, paragraphAttrs)
    const titleEl: IElement = {
      value: '',
      type: 'title' as any,
      level: TITLE_LEVEL_MAP[style.titleLevel!] as any,
      valueList: contentElements,
      ...paragraphAttrs
    }
    elements.push(titleEl)
  } else if (isList) {
    applyRowFlexToChildren(contentElements, paragraphAttrs)
    const listEl: IElement = {
      value: '',
      type: 'list' as any,
      listType: style.listType as any,
      listStyle: style.listStyle as any,
      listLevel: style.listLevel,
      valueList: contentElements,
      ...paragraphAttrs
    }
    elements.push(listEl)
  } else {
    // 普通段落：段落属性应用到每个元素
    for (let i = 0; i < contentElements.length; i++) {
      const el = contentElements[i]
      if (i === 0) {
        Object.assign(el, paragraphAttrs)
      } else {
        // rowFlex、段落背景色需传播到每个元素
        if (paragraphAttrs.rowFlex) el.rowFlex = paragraphAttrs.rowFlex
        if ((paragraphAttrs as any).paragraphColor) {
          (el as any).paragraphColor = (paragraphAttrs as any).paragraphColor
        }
      }
      elements.push(el)
    }
  }

  // 返回该段落末尾文字元素的字号
  return resolveEndSize(contentElements, defaultSize)
}

/** 将 rowFlex 和 paragraphColor 传播到 valueList 子元素 */
function applyRowFlexToChildren(children: IElement[], paragraphAttrs: Partial<IElement>): void {
  for (const el of children) {
    if (paragraphAttrs.rowFlex) el.rowFlex = paragraphAttrs.rowFlex
    if ((paragraphAttrs as any).paragraphColor) {
      (el as any).paragraphColor = (paragraphAttrs as any).paragraphColor
    }
  }
}

/** 取最后一个有字号的元素的 size，回退到 defaultSize */
function resolveEndSize(elements: IElement[], defaultSize: number): number {
  for (let i = elements.length - 1; i >= 0; i--) {
    const size = (elements[i] as any).size
    if (typeof size === 'number' && size > 0) return size
  }
  return defaultSize
}

// ---- Chunk 构建 ----

function buildChunk(
  chunk: InlineChunk,
  elements: IElement[],
  options: IDocxParseOptions,
  activeCommentIds: Set<string>
): void {
  switch (chunk.type) {
    case 'text':
      buildTextChunk(chunk, elements, options, activeCommentIds)
      break
    case 'image':
      buildImageChunk(chunk, elements, activeCommentIds)
      break
    case 'hyperlink':
      buildHyperlinkChunk(chunk, elements, options, activeCommentIds)
      break
    case 'break':
      buildBreakChunk(chunk, elements)
      break
    case 'tab':
      elements.push({ value: '', type: 'tab' as any })
      break
    case 'commentMarker':
      if (chunk.markType === 'start') {
        activeCommentIds.add(`comment_${chunk.commentId}`)
      } else {
        activeCommentIds.delete(`comment_${chunk.commentId}`)
      }
      break
    case 'bookmark':
      // 书签：忽略
      break
    default:
      // 嵌套表格 chunk（来自单元格内的 parseTable 结果）
      if ((chunk as any).type === 'nestedTable') {
        // 嵌套表格在 buildTable 中处理，此处跳过（已在 parseCellContent 中作为 ParagraphNode 包装）
      }
  }
}

function buildTextChunk(
  chunk: TextChunk,
  elements: IElement[],
  options: IDocxParseOptions,
  activeCommentIds: Set<string>
): void {
  const { value, style } = chunk
  const defaultSize = options.defaultSize ?? 12

  for (const char of value) {
    const el: IElement = { value: char }
    applyRunStyle(el, style, defaultSize)

    if (style.vertAlign === 'superscript') {
      el.type = 'superscript' as any
      el.actualSize = ((style.size ?? defaultSize) * 0.6) as any
    } else if (style.vertAlign === 'subscript') {
      el.type = 'subscript' as any
      el.actualSize = ((style.size ?? defaultSize) * 0.6) as any
    }

    if (activeCommentIds.size > 0) {
      el.groupIds = [...activeCommentIds]
    }

    if (chunk.revision) {
      el.revisionId = chunk.revision.id
      el.revisionType = chunk.revision.type
      el.revisionAuthor = chunk.revision.author
      el.revisionDate = chunk.revision.date
      if (chunk.revision.type === 'insert') {
        el.color = el.color || '#1a73e8'
      } else if (chunk.revision.type === 'delete') {
        el.color = el.color || '#f56c6c'
      }

    }

    elements.push(el)
  }
}

function buildImageChunk(
  chunk: ImageChunk,
  elements: IElement[],
  activeCommentIds: Set<string>
): void {
  const el: IElement = {
    value: chunk.src,
    type: 'image' as any,
    width: chunk.width,
    height: chunk.height,
    id: generateElementId()
  }

  if (chunk.display) {
    el.imgDisplay = normalizeImageDisplay(chunk.display) as any
    if (chunk.floatPosition && el.imgDisplay !== 'inline' && el.imgDisplay !== 'block') {
      el.imgFloatPosition = chunk.floatPosition
    }
  }

  if (activeCommentIds.size > 0) {
    el.groupIds = [...activeCommentIds]
  }

  elements.push(el)
}

function normalizeImageDisplay(display: string): string {
  const displayMap: Record<string, string> = {
    'inline': 'inline',
    'block': 'block',
    'surround': 'surround',
    'float-top': 'float-top',
    'float-bottom': 'float-bottom',
    'floatTop': 'float-top'   // 兼容旧值
  }
  return displayMap[display] ?? 'inline'
}

function buildHyperlinkChunk(
  chunk: HyperlinkChunk,
  elements: IElement[],
  options: IDocxParseOptions,
  activeCommentIds: Set<string>
): void {
  const defaultSize = options.defaultSize ?? 12
  const valueList: IElement[] = []

  for (const textChunk of chunk.children) {
    for (const char of textChunk.value) {
      const el: IElement = { value: char }
      applyRunStyle(el, textChunk.style, defaultSize)
      if (activeCommentIds.size > 0) el.groupIds = [...activeCommentIds]
      if (textChunk.revision) {
        el.revisionId = textChunk.revision.id
        el.revisionType = textChunk.revision.type
        el.revisionAuthor = textChunk.revision.author
        el.revisionDate = textChunk.revision.date
        if (textChunk.revision.type === 'insert') {
          el.color = el.color || '#1a73e8'
        } else if (textChunk.revision.type === 'delete') {
          el.color = el.color || '#f56c6c'
        }
      }
      valueList.push(el)
    }
  }

  if (valueList.length === 0) return

  const hyperlinkEl: IElement = {
    value: '',
    type: 'hyperlink' as any,
    url: chunk.url,
    hyperlinkId: generateElementId(),
    valueList
  }
  if (activeCommentIds.size > 0) hyperlinkEl.groupIds = [...activeCommentIds]
  elements.push(hyperlinkEl)
}

function buildBreakChunk(chunk: BreakChunk, elements: IElement[]): void {
  if (chunk.breakType === 'page') {
    elements.push({ value: '\n', type: 'pageBreak' as any })
  } else if (chunk.breakType === 'line') {
    elements.push({ value: '\n' })
  }
  // column break 在 buildColumn 中通过 columnBreak 元素处理
}

function applyRunStyle(el: IElement, style: RunStyle, _defaultSize: number): void {
  if (style.bold) el.bold = true
  if (style.italic) el.italic = true
  if (style.underline !== undefined) el.underline = style.underline
  if (style.strikeout) el.strikeout = true
  if (style.font) el.font = style.font
  if (style.size) el.size = style.size as any
  if (style.color) el.color = style.color
  if (style.highlight) el.highlight = style.highlight
  if (style.letterSpacing) el.letterSpacing = style.letterSpacing
}

// ---- 表格构建 ----

function buildTable(
  table: TableNode,
  elements: IElement[],
  options: IDocxParseOptions,
  activeCommentIds: Set<string>
): void {
  const targetInnerWidth = options.targetInnerWidth
  const tableWidthMode = options.tableWidthMode ?? 'fit'
  const defaultRowHeight = options.defaultTableRowHeight ?? 32
  const defaultTdPadding = options.defaultTableTdPadding ?? [0, 4, 0, 4]

  // 计算列宽
  let colWidths = [...table.colWidths]
  if (targetInnerWidth && tableWidthMode === 'fit' && colWidths.length > 0) {
    const totalWidth = colWidths.reduce((a, b) => a + b, 0)
    if (totalWidth > 0) {
      const ratio = targetInnerWidth / totalWidth
      colWidths = colWidths.map(w => Math.round(w * ratio))
    }
  }

  const colgroup = colWidths.map(w => ({ width: w }))

  const trList: any[] = []
  for (const row of table.rows) {
    const tdList: any[] = []
    for (const cell of row.cells) {
      const cellElements: IElement[] = []

      for (let pi = 0; pi < cell.paragraphs.length; pi++) {
        const para = cell.paragraphs[pi]
        // 检测嵌套表格包装段落
        if (isNestedTableParagraph(para)) {
          const nestedTable = (para.chunks[0] as any).table as TableNode
          buildTable(nestedTable, cellElements, options, activeCommentIds)
        } else {
          buildParagraph(para, cellElements, options, pi === 0 && cellElements.length === 0, activeCommentIds, options.defaultSize ?? 12)
        }
      }

      if (cellElements.length === 0) {
        cellElements.push({ value: ZERO_WIDTH_SPACE })
      }

      const td: any = {
        value: cellElements,
        colspan: cell.colspan,
        rowspan: cell.rowspan
      }

      if (cell.backgroundColor) td.backgroundColor = cell.backgroundColor
      if (cell.verticalAlign) {
        td.verticalAlign = VERTICAL_ALIGN_MAP[cell.verticalAlign] ?? 'top'
      }
      if (cell.borderTypes) td.borderTypes = cell.borderTypes
      if (cell.width) td.width = cell.width

      tdList.push(td)
    }

    trList.push({
      height: row.height ?? defaultRowHeight,
      tdList
    })
  }

  const tableEl: IElement = {
    value: '',
    type: 'table' as any,
    colgroup,
    trList,
    tdPadding: defaultTdPadding as any
  }

  if (table.borderType === 'EMPTY') {
    tableEl.borderType = 0 as any
  } else if (table.borderType === 'ALL') {
    tableEl.borderType = 1 as any
  }
  if (table.borderColor) tableEl.borderColor = table.borderColor
  if (table.borderWidth) tableEl.borderWidth = table.borderWidth

  elements.push(tableEl)
}

function isNestedTableParagraph(para: ParagraphNode): boolean {
  return para.chunks.length === 1 && (para.chunks[0] as any).type === 'nestedTable'
}

// ---- 分栏构建 ----

function buildColumn(
  column: ColumnNode,
  elements: IElement[],
  options: IDocxParseOptions,
  activeCommentIds: Set<string>
): void {
  const columnId = generateElementId()

  // 分栏开始标记
  elements.push({
    value: ZERO_WIDTH_SPACE,
    columnId,
    columnCount: column.columns,
    columnGap: column.colSpace,
    columnSeparator: column.separator,
    columnWidths: column.colWidths
  } as IElement)

  for (let colIdx = 0; colIdx < column.groups.length; colIdx++) {
    const group = column.groups[colIdx]

    // 非第一列前插入 column break
    if (colIdx > 0) {
      elements.push({
        value: '\n',
        type: 'columnBreak' as any,
        columnId
      } as IElement)
    }

    let prevEndSize = options.defaultSize ?? 12
    for (let pi = 0; pi < group.length; pi++) {
      const isFirst = pi === 0 && colIdx === 0
      const endSize = buildParagraph(group[pi], elements, options, isFirst, activeCommentIds, prevEndSize)
      prevEndSize = endSize

      // 为该列的元素附加 columnId
      const lastEl = elements[elements.length - 1]
      if (lastEl && !(lastEl as any).columnId) {
        (lastEl as any).columnId = columnId
      }
    }
  }

  // 分栏结束标记
  elements.push({ value: ZERO_WIDTH_SPACE } as IElement)
}
