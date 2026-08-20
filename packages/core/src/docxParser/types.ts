import type { IElement } from '@vervedoc/docx-editor-schema'

// ---- 解析结果 & 选项（对外 API） ----

export interface IDocxParseResult {
  success: boolean
  elements: IElement[]
  comments?: DocxCommentMeta[]
  html?: string
  error?: string
}

export interface IChartRenderer {
  renderToDataUrl(option: unknown, width: number, height: number, pixelRatio?: number): string
}

export interface IDocxParseOptions {
  preserveStyles?: boolean
  defaultFont?: string
  defaultSize?: number
  targetInnerWidth?: number
  tableWidthMode?: 'fit' | 'word'
  defaultTableRowHeight?: number
  defaultTableTdPadding?: [number, number, number, number]
  forceDefaultLineHeight?: number
  chartRenderer?: IChartRenderer
}

export const DEFAULT_OPTIONS: Required<
  Pick<
    IDocxParseOptions,
    | 'preserveStyles'
    | 'defaultFont'
    | 'defaultSize'
    | 'tableWidthMode'
    | 'defaultTableRowHeight'
    | 'forceDefaultLineHeight'
  >
> & { defaultTableTdPadding: [number, number, number, number] } = {
  preserveStyles: true,
  defaultFont: 'SimSun, serif',
  defaultSize: 12,
  tableWidthMode: 'fit',
  defaultTableRowHeight: 32,
  defaultTableTdPadding: [0, 4, 0, 4],
  forceDefaultLineHeight: 1
}

// ---- Worker 消息 ----

export interface IWorkerRequest {
  documentXml: string
  stylesXml: string | null
  numberingXml: string | null
  themeXml: string | null
  documentRels: string | null
  commentsXml: string | null
  chartRelsMap: Record<string, string>
  chartXmlMap: Record<string, string>
  mediaMap: Record<string, string>
  options: IDocxParseOptions
}

export interface IWorkerResponse {
  success: boolean
  elements: IElement[]
  error?: string
}

// ---- 中间表示（IR） ----

export type DocNode = ParagraphNode | TableNode | ColumnNode

export interface ParagraphNode {
  type: 'paragraph'
  chunks: InlineChunk[]
  style: ParagraphStyle
}

export interface TableNode {
  type: 'table'
  rows: TableRowNode[]
  colWidths: number[]
  borderType?: string
  borderColor?: string
  borderWidth?: number
}

export interface ColumnNode {
  type: 'column'
  columns: number
  colWidths: number[]
  colSpace: number
  separator: boolean
  groups: ParagraphNode[][]
}

export interface TableRowNode {
  height?: number
  cells: TableCellNode[]
}

export interface TableCellNode {
  paragraphs: ParagraphNode[]
  colspan: number
  rowspan: number
  backgroundColor?: string
  verticalAlign?: string
  borderTypes?: number[]
  borderStyle?: string
  width?: number
}

export interface ParagraphStyle {
  rowFlex?: string
  spacingBefore?: number
  spacingAfter?: number
  lineHeight?: number
  /** 行高规则：auto=倍率, exact=精确值(px), atLeast=最小值(px) */
  lineHeightRule?: 'auto' | 'exact' | 'atLeast'
  indentLeft?: number
  indentRight?: number
  firstLineIndent?: number
  paragraphColor?: string
  titleLevel?: number
  listType?: string
  listStyle?: string
  listLevel?: number
  numId?: string
  /** 制表符停止位 */
  tabStops?: Array<{ pos: number; type: string }>
}

export type InlineChunk =
  | TextChunk
  | ImageChunk
  | HyperlinkChunk
  | BreakChunk
  | TabChunk
  | BookmarkChunk
  | CommentMarkerChunk

export interface TextChunk {
  type: 'text'
  value: string
  style: RunStyle
  revision?: {
    id: string
    type: 'insert' | 'delete'
    author: string
    date: string
  }
}

export interface ImageChunk {
  type: 'image'
  src: string
  width: number
  height: number
  display?: string
  floatPosition?: { x: number; y: number }
}

export interface HyperlinkChunk {
  type: 'hyperlink'
  url: string
  children: TextChunk[]
}

export interface BreakChunk {
  type: 'break'
  breakType: 'line' | 'page' | 'column'
}

export interface TabChunk {
  type: 'tab'
}

export interface BookmarkChunk {
  type: 'bookmark'
  name: string
}

export interface CommentMarkerChunk {
  type: 'commentMarker'
  markType: 'start' | 'end'
  commentId: string
}

export interface RunStyle {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikeout?: boolean
  font?: string
  size?: number
  color?: string
  highlight?: string
  letterSpacing?: number
  vertAlign?: 'superscript' | 'subscript'
  textDecoration?: { style: string }
}

// ---- 样式解析辅助 ----

export interface ResolvedStyle {
  paragraph: ParagraphStyle
  run: RunStyle
}

// ---- 批注元数据 ----

export interface DocxCommentMeta {
  id: string
  author: string
  date: string
  initials?: string
  content: string
}
