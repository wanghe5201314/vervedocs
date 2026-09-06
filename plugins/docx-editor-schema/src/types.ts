/**
 * VerveDocs Schema —— 全新树模型
 *
 * 数据形态严格与 test-output.json 对齐，字段命名 1:1 保留，
 * 禁止扁平化：valueList / trList / tdList / colgroup 全部原样递归。
 */

/* ========== 基础枚举 ========== */

/** 元素类型枚举：标识文档树中每个节点的种类（text/title/list/table 等） */
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

/** 段落水平对齐方式 */
export type RowFlex = 'left' | 'center' | 'right' | 'alignment' | 'justify' | 'distribute'
/** 行高规则：auto=倍数行距、exact=固定值、atLeast=最小值 */
export type LineHeightRule = 'auto' | 'exact' | 'atLeast'
/** 垂直对齐方式（用于表格单元格） */
export type VerticalAlign = 'top' | 'middle' | 'bottom'
/** 标题级别：first~sixth 对应标题 1~6 */
export type TitleLevel = 'first' | 'second' | 'third' | 'fourth' | 'fifth' | 'sixth'
/** 边框线型 */
export type BorderStyleType = 'solid' | 'dashed' | 'dotted' | 'double' | 'none'
/** 列表类型名：ol=有序列表、ul=无序列表 */
export type ListTypeName = 'ol' | 'ul'
/** 分页符取值：manual=手动插入、auto=自动分页 */
export type PageBreakValue = 'manual' | 'auto'
/** 图片显示方式：inline=行内、block=块级、floatTop/floatBottom=浮动、surround=环绕 */
export type ImgDisplay = 'inline' | 'block' | 'floatTop' | 'floatBottom' | 'surround'

/* ========== 段落级属性（可继承给同段 runs） ========== */

/** 段落级属性集合，可被同段 run 继承 */
export interface IParagraphAttrs {
  /** 段落水平对齐方式 */
  rowFlex?: RowFlex
  /** 引用的段落样式 ID（对应 styles 表中的项） */
  paragraphStyleId?: string
  /** 首行缩进（px） */
  paragraphFirstLineIndent?: number
  /** 左缩进（px） */
  paragraphIndentLeft?: number
  /** 段前间距（px） */
  paragraphSpacingBefore?: number
  /** 段后间距（px） */
  paragraphSpacingAfter?: number
  /** 行高数值（与 lineHeightRule 配合使用） */
  lineHeight?: number
  /** 行高规则 */
  lineHeightRule?: LineHeightRule
  /** 所属批注组 ID 列表 */
  groupIds?: string[]
}

/* ========== 元素基类 ========== */

/** 元素基类：所有元素类型都共享 type 与 value 字段，并继承段落级属性 */
export interface IElementBase extends IParagraphAttrs {
  /** 元素类型 */
  type: ElementType
  /** 元素值（text 为文本内容，其他类型为占位或子类型标识） */
  value: string
}

/* ========== 文本 run ========== */

/** 文本 run 元素：承载实际文字内容及字符级格式 */
export interface ITextElement extends IElementBase {
  /** 元素类型固定为 'text' */
  type: 'text'
  /** 字体名 */
  font?: string
  /** 字号（pt） */
  size?: number
  /** 是否加粗 */
  bold?: boolean
  /** 是否斜体 */
  italic?: boolean
  /** 字体颜色 */
  color?: string
  /** 高亮色（背景色） */
  highlight?: string
  /** 是否删除线 */
  strikeout?: boolean
  /** 是否下划线 */
  underline?: boolean
}

/* ========== 列表编号定义（来源 numbering.xml） ========== */

/** 列表编号定义，来源于 docx 的 numbering.xml */
export interface IListNumbering {
  /** 编号实例 ID */
  numId: string
  /** 抽象编号 ID */
  abstractNumId: string
  /** 编号级别 */
  level: number
  /** 编号格式（decimal/lowerLetter/chineseCounting 等） */
  numFmt: string
  /** 级别文本模板（如 '%1.'） */
  lvlText: string
  /** 起始值 */
  start: number
  /** 左缩进（px） */
  indentLeft: number
  /** 悬挂缩进（px） */
  indentHanging: number
  /** 级别对齐方式 */
  lvlJc: 'left' | 'center' | 'right'
}

/* ========== 段落容器（title/list 共享） ========== */

/** 段落容器接口：title 与 list 共享 valueList 子节点结构 */
export interface IParagraphContainer extends IElementBase {
  /** 子节点列表（段内 runs） */
  valueList: IElement[]
}

/** 标题元素：携带级别与可选列表属性 */
export interface ITitleElement extends IParagraphContainer {
  /** 元素类型固定为 'title' */
  type: 'title'
  /** 标题级别 */
  level: TitleLevel
  /** 当标题作为列表项时的列表类型 */
  listType?: ListTypeName
  /** 列表样式名 */
  listStyle?: string
  /** 列表级别 */
  listLevel?: number
  /** 列表悬挂缩进（px） */
  listHanging?: number
  /** 列表左缩进（px） */
  listIndent?: number
  /** 列表编号定义 */
  listNumbering?: IListNumbering
}

/** 列表元素：承载列表项内容与编号信息 */
export interface IListElement extends IParagraphContainer {
  /** 元素类型固定为 'list' */
  type: 'list'
  /** 列表类型（ol/ul） */
  listType: ListTypeName
  /** 列表样式名 */
  listStyle: string
  /** 列表级别 */
  listLevel: number
  /** 列表悬挂缩进（px） */
  listHanging?: number
  /** 列表左缩进（px） */
  listIndent?: number
  /** 列表编号定义 */
  listNumbering?: IListNumbering
  /** 独立列表实例 ID（同 numId 下也能隔离计数） */
  listId?: string
}

/* ========== 表格 ========== */

/** 表格边框单边描述 */
export interface IBorderSide {
  /** 边框宽度（px） */
  width: number
  /** 边框颜色 */
  color: string
  /** 边框线型 */
  style: BorderStyleType
}

/** 单元格四边边框样式 */
export interface ITdBorderStyle {
  /** 上边框 */
  top: IBorderSide
  /** 右边框 */
  right: IBorderSide
  /** 下边框 */
  bottom: IBorderSide
  /** 左边框 */
  left: IBorderSide
}

/** 表格单元格 */
export interface ITd {
  /** 单元格宽度（px） */
  width: number
  /** 跨列数 */
  colspan: number
  /** 跨行数 */
  rowspan: number
  /** 单元格子元素列表 */
  value: IElement[]
  /** 垂直对齐方式 */
  verticalAlign: VerticalAlign
  /** 四边边框样式 */
  borderStyle: ITdBorderStyle
  /** 内边距 [top, right, bottom, left]（px） */
  padding: [number, number, number, number]
  /** 单元格背景色（含表头 shading） */
  backgroundColor?: string
  /** 是否被上方 rowspan 覆盖（排版时跳过） */
  merged?: boolean
  /** 单元格最小宽度（自适应内容用） */
  minWidth?: number
  /**
   * 单元格四边可见性开关（顺序 [top, right, bottom, left]，1=显示 0=隐藏）。
   * 用于三线表等场景；若为空则按 borderStyle 全部显示。
   */
  borderTypes?: number[]
  /**
   * 单元格斜线方向：'forward'=/  'backward'=\  'cross'=×
   */
  slashTypes?: ('forward' | 'backward' | 'cross')[]
}

/** 表格行 */
export interface ITr {
  /** 行高（px） */
  height: number
  /** 单元格列表 */
  tdList: ITd[]
  /** 行最小高度（w:trHeight rule=atLeast），有值时以 max(内容高, minHeight) 决定行高 */
  minHeight?: number
  /** 该行是否作为表头在跨页时重复显示（w:tblHeader） */
  pagingRepeat?: boolean
}

/** 列定义项（colgroup 中的一项） */
export interface IColgroupItem {
  /** 列宽（px） */
  width: number
}

/** 表格元素 */
export interface ITableElement extends IElementBase {
  /** 元素类型固定为 'table' */
  type: 'table'
  /** 列定义列表 */
  colgroup: IColgroupItem[]
  /** 行列表 */
  trList: ITr[]
  /** 表格边框类型（none/outside/all 等） */
  borderType?: string
  /** 表格边框宽度（px） */
  borderWidth?: number
}

/* ========== 图片 ========== */

/** 图片元素 */
export interface IImageElement extends IElementBase {
  /** 元素类型固定为 'image' */
  type: 'image'
  /** 图片宽度（px） */
  width: number
  /** 图片高度（px） */
  height: number
  /** 图片显示方式 */
  imgDisplay?: ImgDisplay
  /** 旋转角度（度） */
  rotate?: number
}

/* ========== 分页 ========== */

/** 分页符元素 */
export interface IPageBreakElement extends IElementBase {
  /** 元素类型固定为 'pageBreak' */
  type: 'pageBreak'
  /** 分页符取值（manual/auto） */
  value: PageBreakValue
}

/** 分割线样式类型 */
export type SeparatorLineType = 'solid' | 'dotted' | 'dashed' | 'double' | 'triple' | 'wavy' | 'gradient' | 'shadow' | 'emboss'

/** 分割线元素 */
export interface ISeparatorElement extends IElementBase {
  /** 元素类型固定为 'separator' */
  type: 'separator'
  /** 线型 */
  lineType?: SeparatorLineType
  /** 线宽 */
  lineWidth?: number
  /** 虚线/点线间距模式 */
  dashArray?: number[]
  /** 线颜色 */
  color?: string
}

/* ========== 联合类型 ========== */

/** 文档元素联合类型：涵盖所有具体元素类型，并提供兜底扩展类型以避免扁平化 */
export type IElement =
  | ITextElement
  | ITitleElement
  | IListElement
  | ITableElement
  | IImageElement
  | IPageBreakElement
  | ISeparatorElement
  | (IElementBase & Record<string, unknown>) // 兜底扩展类型（不扁平化）

/* ========== 段落样式表 ========== */

/** 段落样式定义，对应 styles 表中的一项 */
export interface IParagraphStyle extends IParagraphAttrs {
  /** 样式 ID */
  id: string
  /** 样式显示名 */
  name?: string
  /** 基于的父样式 ID */
  basedOn?: string
  /** 默认字体 */
  font?: string
  /** 默认字号（pt） */
  size?: number
  /** 默认是否加粗 */
  bold?: boolean
  /** 默认字体颜色 */
  color?: string
}

/* ========== 主题 ========== */

/** 文档主题（字体方案与颜色方案） */
export interface IDocxTheme {
  /** 字体方案 */
  fontScheme?: {
    /** 主标题字体 */
    majorFont?: string
    /** 正文字体 */
    minorFont?: string
  }
  /** 颜色方案（键值对） */
  colorScheme?: Record<string, string>
}

/* ========== 顶层文档 ========== */

/** 批注元数据（来自 comments.xml 解析或 JSON 导入） */
export interface IDocxCommentMeta {
  /** 批注 ID */
  id: string
  /** 作者 */
  author?: string
  /** 创建时间 */
  date?: string
  /** 批注内容 */
  content: string
}

/** 批注组颜色信息 */
export interface IGroupColor {
  /** 组颜色 */
  color: string
  /** 组状态 */
  status: number
}

/** 批注信息（含回复与定位） */
export interface IComment {
  /** 批注 ID */
  id: string
  /** 所属组 ID */
  groupId: string
  /** 批注内容 */
  content: string
  /** 用户名 */
  userName: string
  /** 头像颜色 */
  avatarColor?: string
  /** 创建时间 */
  createdDate: string
  /** 批注选区文本 */
  rangeText: string
  /** 批注状态 */
  status?: number
  /** 是否处于编辑中 */
  isEditing?: boolean
  /** 是否处于回复中 */
  isReplying?: boolean
  /** 回复列表 */
  replies?: IComment[]
  /** 批注定位信息 */
  position?: { top: number; left?: number; lineWidth?: number; originalTop?: number }
  /** 批注锚点信息（选区起止坐标） */
  anchor?: { startX: number; startY: number; endX: number; endY: number; lineHeight?: number; glyphHeight?: number; startGlyphTop?: number; endGlyphTop?: number }
}

/** 顶层文档元数据，对应整个 docx 文档的解析结果 */
export interface IDocxDocumentMeta {
  /** 解析是否成功 */
  success: boolean
  /** 文档元素列表（正文） */
  elements: IElement[]
  /** 节区内容（页眉/页脚/脚注/尾注） */
  sections?: {
    /** 页眉元素列表 */
    header?: IElement[]
    /** 页脚元素列表 */
    footer?: IElement[]
    /** 脚注元素列表 */
    footnotes?: IElement[]
    /** 尾注元素列表 */
    endnotes?: IElement[]
  }
  /** 文档元信息 */
  meta?: {
    /** 标题 */
    title?: string
    /** 作者 */
    author?: string
    /** 创建时间 */
    createdAt?: string
    /** 修改时间 */
    modifiedAt?: string
  }
  /** 段落样式表 */
  styles?: Record<string, IParagraphStyle>
  /** 列表编号定义表 */
  numbering?: Record<string, IListNumbering>
  /** 文档主题 */
  theme?: IDocxTheme
  /** 批注元数据，来自 comments.xml 解析或 JSON 导入 */
  comments?: IDocxCommentMeta[]
  /** 书签列表 */
  bookmarks?: IBookmark[]
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
/** 路径段：数字索引或命名容器键 */
export type PathSegment = number | 'valueList' | 'trList' | 'tdList' | 'value'
/** 路径：路径段数组 */
export type Path = PathSegment[]

/** 文档位置：路径 + 在目标节点内的字符偏移 */
export interface IPosition {
  /** 节点路径 */
  path: Path
  /** 在节点 value 内的字符偏移 */
  offset: number
}

/** 文档范围：由锚点和焦点位置确定 */
export interface IRange {
  /** 范围起点 */
  anchor: IPosition
  /** 范围终点 */
  focus: IPosition
}

/* ========== 书签 ========== */

/** 书签：命名文档位置范围 */
export interface IBookmark {
  /** 书签名 */
  name: string
  /** 书签范围 */
  range: IRange
  /** 是否折叠为光标 */
  collapsed?: boolean
  /** 是否隐藏 */
  hidden?: boolean
}

/* ========== 编辑器选项 ========== */

/** 编辑器选项 */
export interface IEditorOption {
  /** 默认字体 */
  defaultFont?: string
  /** 默认字号（pt） */
  defaultSize?: number
  /** 默认行高 */
  defaultLineHeight?: number
  /** 默认行间距（px） */
  defaultRowMargin?: number
  /** 分页模式：paging=分页、continuity=连续 */
  pageMode?: 'paging' | 'continuity'
  /** 页面宽度（px） */
  pageWidth?: number
  /** 页面高度（px） */
  pageHeight?: number
  /** 页边距 [top, right, bottom, left]（px） */
  pageMargins?: [number, number, number, number]
  /** 缩放比例 */
  scale?: number
  /** 设备像素比 */
  devicePixelRatio?: number
  /** 历史记录最大条数 */
  historyMaxRecordCount?: number
  /** 其他扩展字段 */
  [key: string]: unknown
}

/* ========== 导入 / 导出回调 ========== */

/** docx 导入回调类型：将 ArrayBuffer/File 解析为元素列表 */
export type DocxImportCallback = (
  data: ArrayBuffer | File,
  options?: { [key: string]: unknown }
) => Promise<{ success: boolean; elements?: IElement[]; error?: string }>

/** docx 导出回调类型：将文档元数据序列化为 ArrayBuffer */
export type DocxExportCallback = (
  data: IDocxDocumentMeta | IElement[],
  options?: { defaultFont?: string; defaultSize?: number }
) => Promise<{ success: boolean; data?: ArrayBuffer; error?: string }>

/* ========== 自动目录 ========== */

/** 自动目录项 */
export interface IAutoTocItem {
  /** 目录项 ID */
  id: string
  /** 标题级别 */
  level: number
  /** 标题文本 */
  name: string
  /** 所在页码 */
  pageNo: number
  /** 多级编号（如 "1"、"1.1"、"1.1.1"，来源：排版块 bulletText 或 listNumbering 计算） */
  number?: string
}

/** 自动目录结果：按层级分组 */
export interface IAutoTocResult {
  /** 一级目录项 */
  toc1: IAutoTocItem[]
  /** 二级目录项 */
  toc2: IAutoTocItem[]
  /** 三级目录项 */
  toc3: IAutoTocItem[]
}
