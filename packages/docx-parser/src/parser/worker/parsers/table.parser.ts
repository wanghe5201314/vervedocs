import { NS, twipToPx, BORDER_TYPE_MAP, eighthPtToPx } from '../../constants'
import type {
  TableNode, TableRowNode, TableCellNode, ParagraphNode
} from '../../types'
import { StyleResolver, resolveShdFill } from '../style.resolver'
import { ThemeData, resolveThemeColor } from '../theme.resolver'
import { NumberingResolver } from '../numbering.resolver'
import { RelationshipEntry } from '../relationship.resolver'
import { parseParagraph } from './paragraph.parser'
import type { PageMargins } from './image.parser'
import {
  getFirstChildByTag, getWVal, getChildrenByTag, forEachChild
} from '../xml.helper'

/**
 * 解析 <w:tbl> 元素为 TableNode
 * 支持嵌套表格、合并单元格（colspan / rowspan）、单元格边框
 */
export function parseTable(
  tableEl: Element,
  styleResolver: StyleResolver,
  theme: ThemeData,
  numberingResolver: NumberingResolver,
  rels: Map<string, RelationshipEntry>,
  mediaMap: Record<string, string>,
  pageMargins?: PageMargins
): TableNode {
  // 1. 列宽 <w:tblGrid>
  const colWidths = parseTableGrid(tableEl)

  // 2. 表格属性 <w:tblPr>
  const { borderType, borderColor, borderWidth } = parseTableBorders(tableEl, theme)

  // 3. 行解析 <w:tr>
  const trElements = getChildrenByTag(tableEl, NS.w, 'tr')
  const rawRows: RawRow[] = []

  for (const trEl of trElements) {
    rawRows.push(
      parseTableRow(trEl, styleResolver, theme, numberingResolver, rels, mediaMap, pageMargins)
    )
  }

  // 4. vMerge 处理：计算 rowspan 并移除被合并单元格
  const rows = resolveVerticalMerge(rawRows)

  return { type: 'table', rows, colWidths, borderType, borderColor, borderWidth }
}

// ---- 表格级属性解析 ----

function parseTableGrid(tableEl: Element): number[] {
  const colWidths: number[] = []
  const tblGridEl = getFirstChildByTag(tableEl, NS.w, 'tblGrid')
  if (!tblGridEl) return colWidths

  for (const colEl of getChildrenByTag(tblGridEl, NS.w, 'gridCol')) {
    const w = colEl.getAttributeNS(NS.w, 'w') ?? colEl.getAttribute('w:w')
    colWidths.push(w ? twipToPx(parseInt(w, 10)) : 100)
  }
  return colWidths
}

function parseTableBorders(
  tableEl: Element,
  theme: ThemeData
): { borderType?: string; borderColor?: string; borderWidth?: number } {
  const tblPrEl = getFirstChildByTag(tableEl, NS.w, 'tblPr')
  if (!tblPrEl) return {}

  const tblBordersEl = getFirstChildByTag(tblPrEl, NS.w, 'tblBorders')
  if (!tblBordersEl) return {}

  // 取上边框作为全局边框的代表（四边通常一致）
  const topBorderEl = getFirstChildByTag(tblBordersEl, NS.w, 'top')
  if (!topBorderEl) return {}

  const val = getWVal(topBorderEl)
  const borderType = val === 'none' || val === 'nil' ? 'EMPTY' : 'ALL'

  // 颜色：优先 themeColor
  const themeColor = topBorderEl.getAttributeNS(NS.w, 'themeColor') ?? topBorderEl.getAttribute('w:themeColor')
  let borderColor: string | undefined
  if (themeColor) {
    const resolved = resolveThemeColor(theme, themeColor)
    if (resolved) borderColor = resolved
  } else {
    const color = topBorderEl.getAttributeNS(NS.w, 'color') ?? topBorderEl.getAttribute('w:color')
    if (color && color !== 'auto') borderColor = `#${color}`
  }

  // 宽度：sz 单位为 1/8 磅
  const sz = topBorderEl.getAttributeNS(NS.w, 'sz') ?? topBorderEl.getAttribute('w:sz')
  const borderWidth = sz ? eighthPtToPx(parseInt(sz, 10)) : undefined

  return { borderType, borderColor, borderWidth }
}

// ---- 行解析 ----

interface RawRow {
  height?: number
  cells: RawCell[]
}

interface RawCell {
  paragraphs: ParagraphNode[]
  colspan: number
  vMerge: 'restart' | 'continue' | null
  backgroundColor?: string
  verticalAlign?: string
  borderTypes?: number[]
  borderColor?: string
  width?: number
}

function parseTableRow(
  rowEl: Element,
  styleResolver: StyleResolver,
  theme: ThemeData,
  numberingResolver: NumberingResolver,
  rels: Map<string, RelationshipEntry>,
  mediaMap: Record<string, string>,
  pageMargins?: PageMargins
): RawRow {
  let height: number | undefined
  const trPrEl = getFirstChildByTag(rowEl, NS.w, 'trPr')
  if (trPrEl) {
    const trHeightEl = getFirstChildByTag(trPrEl, NS.w, 'trHeight')
    if (trHeightEl) {
      const val = trHeightEl.getAttributeNS(NS.w, 'val') ?? trHeightEl.getAttribute('w:val')
      const hRule = trHeightEl.getAttributeNS(NS.w, 'hRule') ?? trHeightEl.getAttribute('w:hRule')
      if (val) {
        const px = twipToPx(parseInt(val, 10))
        if (hRule === 'exact') {
          height = px
        } else {
          // atLeast / auto：限制上限防止极端值
          height = Math.min(px, 200)
        }
      }
    }
  }

  const cells: RawCell[] = []
  for (const tcEl of getChildrenByTag(rowEl, NS.w, 'tc')) {
    cells.push(parseTableCell(tcEl, styleResolver, theme, numberingResolver, rels, mediaMap, pageMargins))
  }

  return { height, cells }
}

function parseTableCell(
  cellEl: Element,
  styleResolver: StyleResolver,
  theme: ThemeData,
  numberingResolver: NumberingResolver,
  rels: Map<string, RelationshipEntry>,
  mediaMap: Record<string, string>,
  pageMargins?: PageMargins
): RawCell {
  const tcPrEl = getFirstChildByTag(cellEl, NS.w, 'tcPr')

  // colspan <w:gridSpan>
  let colspan = 1
  if (tcPrEl) {
    const gridSpanEl = getFirstChildByTag(tcPrEl, NS.w, 'gridSpan')
    if (gridSpanEl) {
      const val = getWVal(gridSpanEl)
      if (val) colspan = parseInt(val, 10)
    }
  }

  // vMerge
  let vMerge: 'restart' | 'continue' | null = null
  if (tcPrEl) {
    const vMergeEl = getFirstChildByTag(tcPrEl, NS.w, 'vMerge')
    if (vMergeEl) {
      const val = getWVal(vMergeEl)
      vMerge = val === 'restart' ? 'restart' : 'continue'
    }
  }

  // 背景色
  let backgroundColor: string | undefined
  if (tcPrEl) {
    const shdEl = getFirstChildByTag(tcPrEl, NS.w, 'shd')
    if (shdEl) {
      backgroundColor = resolveShdFill(shdEl, theme) ?? undefined
    }
  }

  // 垂直对齐
  let verticalAlign: string | undefined
  if (tcPrEl) {
    const vAlignEl = getFirstChildByTag(tcPrEl, NS.w, 'vAlign')
    if (vAlignEl) verticalAlign = getWVal(vAlignEl) ?? undefined
  }

  // 单元格宽度
  let width: number | undefined
  if (tcPrEl) {
    const tcWEl = getFirstChildByTag(tcPrEl, NS.w, 'tcW')
    if (tcWEl) {
      const w = tcWEl.getAttributeNS(NS.w, 'w') ?? tcWEl.getAttribute('w:w')
      const wType = tcWEl.getAttributeNS(NS.w, 'type') ?? tcWEl.getAttribute('w:type')
      if (w && wType === 'dxa') {
        width = twipToPx(parseInt(w, 10))
      }
    }
  }

  // 单元格边框（上右下左）
  const borderTypes = parseCellBorders(tcPrEl)

  // 解析单元格内容：段落 + 嵌套表格
  const paragraphs: ParagraphNode[] = []
  parseCellContent(cellEl, paragraphs, styleResolver, theme, numberingResolver, rels, mediaMap, pageMargins)

  return { paragraphs, colspan, vMerge, backgroundColor, verticalAlign, borderTypes, width }
}

/**
 * 解析单元格边框，返回 [top, right, bottom, left] 的 BORDER_TYPE_MAP 值
 * -1 表示未声明（继承表格边框）
 */
function parseCellBorders(tcPrEl: Element | null): number[] | undefined {
  if (!tcPrEl) return undefined

  const tcBordersEl = getFirstChildByTag(tcPrEl, NS.w, 'tcBorders')
  if (!tcBordersEl) return undefined

  const sides = ['top', 'right', 'bottom', 'left'] as const
  const types: number[] = []
  let hasAnyBorder = false

  for (const side of sides) {
    const borderEl = getFirstChildByTag(tcBordersEl, NS.w, side)
    if (borderEl) {
      const val = getWVal(borderEl) ?? 'single'
      types.push(BORDER_TYPE_MAP[val] ?? 1)
      hasAnyBorder = true
    } else {
      types.push(-1) // -1 = 继承表格边框
    }
  }

  return hasAnyBorder ? types : undefined
}

/**
 * 解析单元格内容：段落和嵌套表格均支持
 */
function parseCellContent(
  cellEl: Element,
  paragraphs: ParagraphNode[],
  styleResolver: StyleResolver,
  theme: ThemeData,
  numberingResolver: NumberingResolver,
  rels: Map<string, RelationshipEntry>,
  mediaMap: Record<string, string>,
  pageMargins?: PageMargins
): void {
  forEachChild(cellEl, (child) => {
    if (child.localName === 'p' && child.namespaceURI === NS.w) {
      paragraphs.push(
        parseParagraph(child, styleResolver, theme, numberingResolver, rels, mediaMap, pageMargins)
      )
    } else if (child.localName === 'tbl' && child.namespaceURI === NS.w) {
      // 嵌套表格：转换为带 table chunk 的特殊段落节点
      const nestedTable = parseTable(child, styleResolver, theme, numberingResolver, rels, mediaMap, pageMargins)
      // 将嵌套表格包装成 ParagraphNode 占位（element.builder 中会识别并处理）
      paragraphs.push({
        type: 'paragraph',
        chunks: [{ type: 'nestedTable', table: nestedTable } as any],
        style: {}
      })
    } else if (child.localName === 'sdt' && child.namespaceURI === NS.w) {
      // 结构化文档标签：提取内容
      const sdtContentEl = getFirstChildByTag(child, NS.w, 'sdtContent')
      if (sdtContentEl) {
        forEachChild(sdtContentEl, (sdtChild) => {
          if (sdtChild.localName === 'p' && sdtChild.namespaceURI === NS.w) {
            paragraphs.push(
              parseParagraph(sdtChild, styleResolver, theme, numberingResolver, rels, mediaMap, pageMargins)
            )
          }
        })
      }
    }
  })
}

// ---- vMerge 处理 ----

function resolveVerticalMerge(rawRows: RawRow[]): TableRowNode[] {
  const rows: TableRowNode[] = []
  // 跟踪每列位置的合并起始位置：colIndex → { rowIdx, cellIdx }
  const mergeTracker = new Map<number, { rowIdx: number; cellIdx: number }>()

  for (let rowIdx = 0; rowIdx < rawRows.length; rowIdx++) {
    const rawRow = rawRows[rowIdx]
    const cells: TableCellNode[] = []
    let colIndex = 0

    for (const rawCell of rawRow.cells) {
      if (rawCell.vMerge === 'restart') {
        mergeTracker.set(colIndex, { rowIdx: rows.length, cellIdx: cells.length })
        cells.push(buildCellNode(rawCell, 1))
      } else if (rawCell.vMerge === 'continue') {
        // 增加起始单元格的 rowspan
        const tracker = mergeTracker.get(colIndex)
        if (tracker) {
          rows[tracker.rowIdx].cells[tracker.cellIdx].rowspan++
        }
        // 被合并的单元格不放入 cells
      } else {
        mergeTracker.delete(colIndex)
        cells.push(buildCellNode(rawCell, 1))
      }
      colIndex += rawCell.colspan
    }

    rows.push({ height: rawRow.height, cells })
  }

  return rows
}

function buildCellNode(raw: RawCell, rowspan: number): TableCellNode {
  return {
    paragraphs: raw.paragraphs,
    colspan: raw.colspan,
    rowspan,
    backgroundColor: raw.backgroundColor,
    verticalAlign: raw.verticalAlign,
    borderTypes: raw.borderTypes,
    width: raw.width
  }
}
