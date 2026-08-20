import { NS, twipToPx } from '../../constants'
import type { ParagraphNode, ColumnNode } from '../../types'
import { getFirstChildByTag, getChildrenByTag } from '../xml.helper'

/** 分节类型：nextPage / evenPage / oddPage 均产生分页，continuous / nextColumn 不分页 */
export type SectionBreakType = 'nextPage' | 'evenPage' | 'oddPage' | 'continuous' | 'nextColumn'

export interface SectionProperties {
  /** 分节类型，默认 nextPage */
  breakType: SectionBreakType
  columns: number
  colWidths: number[]
  colSpace: number
  separator: boolean
}

/**
 * 解析 <w:sectPr> 中的分节属性（分页类型 + 分栏）
 */
export function parseSectionProperties(sectPrEl: Element): SectionProperties {
  const result: SectionProperties = {
    breakType: 'nextPage',
    columns: 1,
    colWidths: [],
    colSpace: 0,
    separator: false
  }

  // 分节类型 <w:type w:val="continuous"/>
  const typeEl = getFirstChildByTag(sectPrEl, NS.w, 'type')
  if (typeEl) {
    const typeVal = typeEl.getAttributeNS(NS.w, 'val') ?? typeEl.getAttribute('w:val')
    if (typeVal === 'continuous' || typeVal === 'nextColumn' ||
        typeVal === 'evenPage' || typeVal === 'oddPage' || typeVal === 'nextPage') {
      result.breakType = typeVal
    }
  }

  const colsEl = getFirstChildByTag(sectPrEl, NS.w, 'cols')
  if (!colsEl) return result

  const numAttr = colsEl.getAttributeNS(NS.w, 'num') ?? colsEl.getAttribute('w:num')
  const spaceAttr = colsEl.getAttributeNS(NS.w, 'space') ?? colsEl.getAttribute('w:space')
  const sepAttr = colsEl.getAttributeNS(NS.w, 'sep') ?? colsEl.getAttribute('w:sep')

  if (numAttr) result.columns = Math.max(1, parseInt(numAttr, 10))
  if (spaceAttr) result.colSpace = twipToPx(parseInt(spaceAttr, 10))
  // sep="1" 表示分栏之间显示分隔线
  result.separator = sepAttr === '1' || sepAttr === 'true'

  // 各列独立宽度 <w:col w:w="..." w:space="..."/>
  for (const colEl of getChildrenByTag(colsEl, NS.w, 'col')) {
    const w = colEl.getAttributeNS(NS.w, 'w') ?? colEl.getAttribute('w:w')
    if (w) result.colWidths.push(twipToPx(parseInt(w, 10)))
  }

  return result
}

/**
 * 将段落列表按分栏属性分组，构建 ColumnNode
 * ColumnNode 是编辑器原生分栏格式（推荐）
 */
export function buildColumnNode(
  paragraphs: ParagraphNode[],
  sectionProps: SectionProperties,
  targetInnerWidth: number
): ColumnNode {
  const { columns, colWidths, colSpace, separator } = sectionProps

  // 计算每列宽度
  const calculatedColWidths = calculateColumnWidths(columns, colWidths, colSpace, targetInnerWidth)

  // 按 column break 将段落分组到各列
  const columnGroups = groupParagraphsByColumnBreak(paragraphs, columns)

  return {
    type: 'column',
    columns,
    colWidths: calculatedColWidths,
    colSpace,
    separator,
    groups: columnGroups
  }
}

// ---- 工具函数 ----

/**
 * 计算各列实际宽度
 * 优先使用文档中声明的列宽；不足时等分 targetInnerWidth
 */
function calculateColumnWidths(
  columns: number,
  declaredWidths: number[],
  colSpace: number,
  targetInnerWidth: number
): number[] {
  if (declaredWidths.length >= columns) {
    return declaredWidths.slice(0, columns)
  }

  // 等分：减去列间距
  const totalGap = colSpace * Math.max(0, columns - 1)
  const colWidth = (targetInnerWidth - totalGap) / columns

  return Array.from({ length: columns }, () => Math.max(colWidth, 50))
}

/**
 * 按 column break chunk 将段落切分到各列数组
 * column break 所在段落：break 前内容留在当前列，break 后（若有）开启下一列
 */
function groupParagraphsByColumnBreak(
  paragraphs: ParagraphNode[],
  columns: number
): ParagraphNode[][] {
  const groups: ParagraphNode[][] = [[]]

  for (const para of paragraphs) {
    const hasColumnBreak = para.chunks.some(
      (c) => c.type === 'break' && c.breakType === 'column'
    )

    if (hasColumnBreak && groups.length < columns) {
      // 过滤掉 column break chunk 后，将段落内容放到新列开头
      const chunksWithoutBreak = para.chunks.filter(
        (c) => !(c.type === 'break' && c.breakType === 'column')
      )
      // 有实质内容才放入新列
      if (chunksWithoutBreak.length > 0) {
        groups.push([{ ...para, chunks: chunksWithoutBreak }])
      } else {
        groups.push([])
      }
    } else {
      groups[groups.length - 1].push(para)
    }
  }

  return groups
}
