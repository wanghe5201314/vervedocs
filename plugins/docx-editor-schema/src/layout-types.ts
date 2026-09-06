/**
 * VerveDocs Schema —— Layout 布局类型定义
 *
 * 纯类型定义，供 view 和 transform 共享，避免循环依赖。
 */

import type { IElement, Path, ITd } from './types'

/** 矩形区域描述 */
export interface Rect {
  /** 左上角 x 坐标 */
  x: number
  /** 左上角 y 坐标 */
  y: number
  /** 宽度 */
  width: number
  /** 高度 */
  height: number
}

/** 行内盒（inline）：单个文本片段的布局结果 */
export interface InlineBox {
  /** 对应的源 run 节点 */
  run: IElement
  /** 节点路径 */
  path: Path
  /** 起始字符偏移 */
  startOffset: number
  /** 结束字符偏移 */
  endOffset: number
  /** 文本内容 */
  text: string
  /** 相对块本地坐标 */
  x: number
  /** 相对块本地坐标 */
  y: number
  /** 宽度 */
  width: number
  /** 高度 */
  height: number
  /** 字体名 */
  font: string
  /** 字号（px） */
  size: number
  /** 是否加粗 */
  bold: boolean
  /** 是否斜体 */
  italic: boolean
  /** 字体颜色 */
  color: string
  /** 背景色 */
  bgColor?: string
  /** 是否删除线 */
  strikeout?: boolean
  /** 是否下划线 */
  underline?: boolean
  /** 相对块本地基线 y */
  baseline: number
  /** 所属批注组 ID 列表（来自 run.groupIds） */
  groupIds?: string[]
  /** 两端对齐时按字分摊的额外字距（每个字符后附加的像素），默认 0 */
  letterSpacing?: number
  /** 若该 inline 属于超链接，存其 URL（用于命中跳转） */
  hyperlink?: string
}

/** 行盒（line）：一行 inline 的布局结果 */
export interface LineBox {
  /** 相对块本地 */
  y: number
  /** 相对块本地 x 坐标 */
  x: number
  /** 行宽 */
  width: number
  /** 行高 */
  height: number
  /** 基线 y 坐标 */
  baseline: number
  /** 该行包含的 inline 列表 */
  inlines: InlineBox[]
  /** 段落对齐方式 */
  rowFlex: 'left' | 'center' | 'right' | 'alignment' | 'justify'
  /** 是否是段落最后一行（影响两端对齐） */
  isLastLine: boolean
}

/** 块盒基类：所有块级布局节点共享的属性 */
export interface BlockBase {
  /** 全局唯一（同会话），用于缓存/脏标 */
  id: number
  /** rect 相对父容器（页面内容 or 单元格内容） */
  rect: Rect
}

/** 段落块：对应一个段落的布局结果 */
export interface ParagraphBlock extends BlockBase {
  /** 块类型固定为 'paragraph' */
  kind: 'paragraph'
  /** 段落类型：normal=普通段、title=标题、list=列表 */
  paragraphKind: 'normal' | 'title' | 'list'
  /** 对应的源节点（normal 段为 null） */
  block: IElement | null
  /** 段落在父数组中的起始索引 */
  startIndex: number
  /** 段落在父数组中的结束索引 */
  endIndex: number
  /** 父容器路径 */
  parentPath: Path

  /** 行盒列表 */
  lines: LineBox[]
  /** 项目符号 / 编号类型 */
  bulletKind?: 'symbol' | 'text'
  /** 绘制文本（符号 or 编号） */
  bulletText?: string
  /** 占位宽度（含尾随间距） */
  bulletWidth?: number
  /** 绘制字体（符号用符号字体栈；编号用文本字体） */
  bulletFont?: string
  /** 项目符号字号 */
  bulletSize?: number
  /** 项目符号颜色 */
  bulletColor?: string
  /** 项目符号是否加粗 */
  bulletBold?: boolean
  /**
   * 编号绘制起点相对首行 x 的偏移（含符号本身宽度）。
   * 有值时优先于按 bulletWidth 计算（用于 lvlJc 对齐）。
   */
  bulletX?: number
  /** 四周环绕图片（imgDisplay='surround' 时挂到相邻段落上） */
  surroundImage?: ImageBlock
}

/** 图片块：对应一个图片的布局结果 */
export interface ImageBlock extends BlockBase {
  /** 块类型固定为 'image' */
  kind: 'image'
  /** 对应的源节点 */
  block: IElement
  /** 父容器路径 */
  parentPath: Path
  /** 在父容器中的索引 */
  indexInParent: number
}

/** 分页符块 */
export interface PageBreakBlock extends BlockBase {
  /** 块类型固定为 'pageBreak' */
  kind: 'pageBreak'
  /** 对应的源节点 */
  block: IElement
  /** 父容器路径 */
  parentPath: Path
  /** 在父容器中的索引 */
  indexInParent: number
}

/** 分割线块 */
export interface SeparatorBlock extends BlockBase {
  /** 块类型固定为 'separator' */
  kind: 'separator'
  /** 对应的源节点 */
  block: IElement
  /** 父容器路径 */
  parentPath: Path
  /** 在父容器中的索引 */
  indexInParent: number
}

/** 表格单元格布局结果 */
export interface TableCellLayout {
  /** 源单元格定义 */
  cell: ITd
  /** rect 相对 table 本地 */
  rect: Rect
  /** 单元格路径 */
  cellPath: Path
  /** 单元格内容路径 */
  contentPath: Path
  /** 单元格内容块列表 */
  content: BlockNode[]
  /** 单元格内容原点偏移（padding 与垂直对齐） */
  contentPaddingTop: number
  /** 单元格内容左偏移 */
  contentPaddingLeft: number
  /** 垂直对齐偏移量 */
  verticalOffset: number
}

/** 表格行布局结果 */
export interface TableRowLayout {
  /** rect 相对 table 本地 */
  rect: Rect
  /** 该行各单元格布局 */
  cells: TableCellLayout[]
}

/** 表格块：对应一个表格的布局结果 */
export interface TableBlock extends BlockBase {
  /** 块类型固定为 'table' */
  kind: 'table'
  /** 对应的源节点 */
  block: IElement
  /** 父容器路径 */
  parentPath: Path
  /** 在父容器中的索引 */
  indexInParent: number
  /** 各行布局 */
  rows: TableRowLayout[]
  /** 各列宽度 */
  colWidths: number[]
}

/** 块节点联合类型：所有块级布局节点的联合 */
export type BlockNode = ParagraphBlock | ImageBlock | PageBreakBlock | SeparatorBlock | TableBlock

/** 页面布局结果 */
export interface PageLayout {
  /** 页码索引（从 0 开始） */
  index: number
  /** 页在文档坐标系（可滚动坐标）中的 rect */
  rect: Rect
  /** 页内容区（去 margin）在文档坐标系中的 rect */
  contentRect: Rect
  /** 页内块列表 */
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

/** 文档整体布局结果 */
export interface DocumentLayout {
  /** 各页布局 */
  pages: PageLayout[]
  /** 文档总高度 */
  totalHeight: number
  /** 页面宽度 */
  pageWidth: number
}