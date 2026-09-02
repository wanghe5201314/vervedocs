/**
 * VerveDocs Schema —— 全新树模型
 *
 * 数据形态严格与 test-output.json 对齐，字段命名 1:1 保留，
 * 禁止扁平化：valueList / trList / tdList / colgroup 全部原样递归。
 */

/* ========== 基础枚举 ========== */

export type ElementType =
  | 'text'
  | 'title'
  | 'list'
  | 'table'
  | 'image'
  | 'pageBreak'
  // 扩展占位（后续实现，命名保持一致）
  | 'hyperlink'
  | 'separator'
  | 'superscript'
  | 'subscript'
  | 'checkbox'
  | 'radio'
  | 'latex'
  | 'date'
  | 'control'
  | 'block'
  | 'tab'
  | 'watermark'

export type RowFlex = 'left' | 'center' | 'right' | 'alignment' | 'justify'
export type LineHeightRule = 'auto' | 'exact' | 'atLeast'
export type VerticalAlign = 'top' | 'middle' | 'bottom'
export type TitleLevel = 'first' | 'second' | 'third' | 'fourth' | 'fifth' | 'sixth'
export type BorderStyleType = 'solid' | 'dashed' | 'dotted' | 'double' | 'none'
export type ListTypeName = 'ol' | 'ul'
export type PageBreakValue = 'manual' | 'auto'
export type ImgDisplay = 'inline' | 'block' | 'floatTop' | 'floatBottom' | 'surround'

/* ========== 段落级属性（可继承给同段 runs） ========== */

export interface IParagraphAttrs {
  rowFlex?: RowFlex
  paragraphStyleId?: string
  paragraphFirstLineIndent?: number
  paragraphIndentLeft?: number
  paragraphSpacingBefore?: number
  paragraphSpacingAfter?: number
  lineHeight?: number
  lineHeightRule?: LineHeightRule
  groupIds?: string[]
}

/* ========== 元素基类 ========== */

export interface IElementBase extends IParagraphAttrs {
  type: ElementType
  value: string
}

/* ========== 文本 run ========== */

export interface ITextElement extends IElementBase {
  type: 'text'
  font?: string
  size?: number
  bold?: boolean
  italic?: boolean
  color?: string
  highlight?: string
  strikeout?: boolean
  underline?: boolean
}

/* ========== 列表编号定义（来源 numbering.xml） ========== */

export interface IListNumbering {
  numId: string
  abstractNumId: string
  level: number
  numFmt: string
  lvlText: string
  start: number
  indentLeft: number
  indentHanging: number
  lvlJc: 'left' | 'center' | 'right'
}

/* ========== 段落容器（title/list 共享） ========== */

export interface IParagraphContainer extends IElementBase {
  valueList: IElement[]
}

export interface ITitleElement extends IParagraphContainer {
  type: 'title'
  level: TitleLevel
  listType?: ListTypeName
  listStyle?: string
  listLevel?: number
  listHanging?: number
  listIndent?: number
  listNumbering?: IListNumbering
}

export interface IListElement extends IParagraphContainer {
  type: 'list'
  listType: ListTypeName
  listStyle: string
  listLevel: number
  listHanging?: number
  listIndent?: number
  listNumbering?: IListNumbering
}

/* ========== 表格 ========== */

export interface IBorderSide {
  width: number
  color: string
  style: BorderStyleType
}

export interface ITdBorderStyle {
  top: IBorderSide
  right: IBorderSide
  bottom: IBorderSide
  left: IBorderSide
}

export interface ITd {
  width: number
  colspan: number
  rowspan: number
  value: IElement[]
  verticalAlign: VerticalAlign
  borderStyle: ITdBorderStyle
  padding: [number, number, number, number]
  /** 单元格背景色（含表头 shading） */
  backgroundColor?: string
  /** 是否被上方 rowspan 覆盖（排版时跳过） */
  merged?: boolean
  /** 单元格最小宽度（自适应内容用） */
  minWidth?: number
}

export interface ITr {
  height: number
  tdList: ITd[]
}

export interface IColgroupItem {
  width: number
}

export interface ITableElement extends IElementBase {
  type: 'table'
  colgroup: IColgroupItem[]
  trList: ITr[]
  borderType?: string
  borderWidth?: number
}

/* ========== 图片 ========== */

export interface IImageElement extends IElementBase {
  type: 'image'
  width: number
  height: number
  imgDisplay?: ImgDisplay
}

/* ========== 分页 ========== */

export interface IPageBreakElement extends IElementBase {
  type: 'pageBreak'
  value: PageBreakValue
}

/* ========== 联合类型 ========== */

export type IElement =
  | ITextElement
  | ITitleElement
  | IListElement
  | ITableElement
  | IImageElement
  | IPageBreakElement
  | (IElementBase & Record<string, unknown>) // 兜底扩展类型（不扁平化）

/* ========== 段落样式表 ========== */

export interface IParagraphStyle extends IParagraphAttrs {
  id: string
  name?: string
  basedOn?: string
  font?: string
  size?: number
  bold?: boolean
  color?: string
}

/* ========== 主题 ========== */

export interface IDocxTheme {
  fontScheme?: {
    majorFont?: string
    minorFont?: string
  }
  colorScheme?: Record<string, string>
}

/* ========== 顶层文档 ========== */

export interface IDocxDocument {
  success: boolean
  elements: IElement[]
  sections?: {
    header?: IElement[]
    footer?: IElement[]
    footnotes?: IElement[]
    endnotes?: IElement[]
  }
  meta?: {
    title?: string
    author?: string
    createdAt?: string
    modifiedAt?: string
  }
  styles?: Record<string, IParagraphStyle>
  numbering?: Record<string, IListNumbering>
  theme?: IDocxTheme
}

/* ========== 路径寻址 ========== */

/**
 * 从根到目标节点的索引路径：
 *   root.elements[path[0]].valueList[path[1]].valueList[path[2]] ...
 *
 * 对于 table 结构，路径分段约定：
 *   table -> ['trList', trIndex, 'tdList', tdIndex, 'value', childIndex, ...]
 *
 * Path 元素统一使用字符串 / 数字混合的元组，以支持进入命名容器（trList/tdList/value/valueList）。
 */
export type PathSegment = number | 'valueList' | 'trList' | 'tdList' | 'value'
export type Path = PathSegment[]

export interface IPosition {
  path: Path
  offset: number
}

export interface IRange {
  anchor: IPosition
  focus: IPosition
}

/* ========== 编辑器选项 ========== */

export interface IEditorOption {
  defaultFont?: string
  defaultSize?: number
  defaultLineHeight?: number
  defaultRowMargin?: number
  pageMode?: 'paging' | 'continuity'
  pageWidth?: number
  pageHeight?: number
  pageMargins?: [number, number, number, number]
  scale?: number
  devicePixelRatio?: number
  historyMaxRecordCount?: number
  [key: string]: unknown
}
