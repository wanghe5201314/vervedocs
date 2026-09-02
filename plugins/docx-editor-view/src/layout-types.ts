/**
 * VerveDocs View —— Layout 类型定义
 */

import type { IElement, Path, ITd } from '@vervedoc/docx-editor-schema'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface InlineBox {
  run: IElement
  path: Path
  startOffset: number
  endOffset: number
  text: string
  /** 相对块本地坐标 */
  x: number
  y: number
  width: number
  height: number
  font: string
  size: number
  bold: boolean
  italic: boolean
  color: string
  bgColor?: string
  strikeout?: boolean
  underline?: boolean
  /** 相对块本地基线 y */
  baseline: number
  /** 所属批注组 ID 列表（来自 run.groupIds） */
  groupIds?: string[]
  /** 两端对齐时按字分摊的额外字距（每个字符后附加的像素），默认 0 */
  letterSpacing?: number
}

export interface LineBox {
  /** 相对块本地 */
  y: number
  x: number
  width: number
  height: number
  baseline: number
  inlines: InlineBox[]
  rowFlex: 'left' | 'center' | 'right' | 'alignment' | 'justify'
  isLastLine: boolean
}

export interface BlockBase {
  /** 全局唯一（同会话），用于缓存/脏标 */
  id: number
  /** rect 相对父容器（页面内容 or 单元格内容） */
  rect: Rect
}

export interface ParagraphBlock extends BlockBase {
  kind: 'paragraph'
  paragraphKind: 'normal' | 'title' | 'list'
  block: IElement | null
  startIndex: number
  endIndex: number
  parentPath: Path

  lines: LineBox[]
  /** 项目符号 / 编号类型 */
  bulletKind?: 'symbol' | 'text'
  /** 绘制文本（符号 or 编号） */
  bulletText?: string
  /** 占位宽度（含尾随间距） */
  bulletWidth?: number
  /** 绘制字体（符号用符号字体栈；编号用文本字体） */
  bulletFont?: string
  bulletSize?: number
  bulletColor?: string
  bulletBold?: boolean
  /**
   * 编号绘制起点相对首行 x 的偏移（含符号本身宽度）。
   * 有值时优先于按 bulletWidth 计算（用于 lvlJc 对齐）。
   */
  bulletX?: number
}

export interface ImageBlock extends BlockBase {
  kind: 'image'
  block: IElement
  parentPath: Path
  indexInParent: number
}

export interface PageBreakBlock extends BlockBase {
  kind: 'pageBreak'
  block: IElement
  parentPath: Path
  indexInParent: number
}

export interface TableCellLayout {
  cell: ITd
  /** rect 相对 table 本地 */
  rect: Rect
  cellPath: Path
  contentPath: Path
  content: BlockNode[]
  /** 单元格内容原点偏移（padding 与垂直对齐） */
  contentPaddingTop: number
  contentPaddingLeft: number
  verticalOffset: number
}

export interface TableRowLayout {
  /** rect 相对 table 本地 */
  rect: Rect
  cells: TableCellLayout[]
}

export interface TableBlock extends BlockBase {
  kind: 'table'
  block: IElement
  parentPath: Path
  indexInParent: number
  rows: TableRowLayout[]
  colWidths: number[]
}

export type BlockNode = ParagraphBlock | ImageBlock | PageBreakBlock | TableBlock

export interface PageLayout {
  index: number
  /** 页在文档坐标系（可滚动坐标）中的 rect */
  rect: Rect
  /** 页内容区（去 margin）在文档坐标系中的 rect */
  contentRect: Rect
  blocks: BlockNode[]
  /** 页眉区域在文档坐标系中的 rect */
  headerRect?: Rect
  /** 页眉布局 blocks */
  headerBlocks?: BlockNode[]
  /** 页脚区域在文档坐标系中的 rect */
  footerRect?: Rect
  /** 页脚布局 blocks */
  footerBlocks?: BlockNode[]
}

export interface DocumentLayout {
  pages: PageLayout[]
  totalHeight: number
  pageWidth: number
}
