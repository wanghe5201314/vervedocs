/**
 * vervedocs-for-node API 类型定义
 *
 * 与 vervedocs-for-java CLI 选项对齐，字段命名沿用 camelCase。
 */

/** 表格宽度模式 */
export type TableWidthMode = 'fit' | 'word'

/** 图表策略 */
export type ChartStrategy = 'preview' | 'xml' | 'skip'

/** 公式策略 */
export type MathStrategy = 'text' | 'placeholder' | 'skip'

/** 纸张方向 */
export type PaperDirection = 'vertical' | 'horizontal'

/**
 * docx → json 解析参数
 *
 * 对应 vervedocs-for-java CLI：
 *   --default-font / --default-size / --table-width-mode
 *   --force-line-height / --include-header-footer / --include-footnotes
 *   --chart-strategy / --math-strategy
 */
export interface ParseOptions {
  /** 默认字体，默认 'SimSun, serif' */
  defaultFont?: string
  /** 默认字号 px，默认 12 */
  defaultSize?: number
  /** 表格宽度模式，默认 fit */
  tableWidthMode?: TableWidthMode
  /** 强制行高倍率，默认 1 */
  forceLineHeight?: number
  /** 是否包含页眉页脚，默认 false */
  includeHeaderFooter?: boolean
  /** 是否包含脚注正文，默认 false */
  includeFootnotes?: boolean
  /** 图表策略，默认 preview */
  chartStrategy?: ChartStrategy
  /** 公式策略，默认 text */
  mathStrategy?: MathStrategy
}

/**
 * json → docx/pdf 导出参数
 *
 * 对应 vervedocs-for-java CLI：--default-font / --default-size
 */
export interface ExportOptions {
  /** 默认字体，默认 'SimSun, serif' */
  defaultFont?: string
  /** 默认字号 px，默认 12 */
  defaultSize?: number
}

/** 文档元素（与前端 IElement 同构，这里仅声明常用字段） */
export interface DocxElement {
  type: string
  value?: string
  [key: string]: unknown
}

/** 批注元数据 */
export interface CommentMeta {
  id: string
  author?: string
  date?: string
  content?: string
}

/**
 * docx 解析结果，对应 java 端 DocxParseResult
 *
 * JSON 结构示例见 vervedocs-for-java/README.md
 */
export interface DocxParseResult {
  success: boolean
  elements?: DocxElement[]
  comments?: CommentMeta[]
  pageWidth?: number
  pageHeight?: number
  margins?: number[]
  paperDirection?: PaperDirection
  error?: string
}

/** 统一错误响应 */
export interface ErrorResponse {
  success: false
  code: number
  error: string
  /** java 进程退出码（0 成功 / 1 解析失败 / 2 参数错误 / 3 IO 错误） */
  exitCode?: number
  /** java 进程 stderr 输出 */
  stderr?: string
}

/** 统一成功响应（解析场景） */
export interface ParseSuccessResponse {
  success: true
  code: 200
  data: DocxParseResult
}

export type ParseApiResponse = ParseSuccessResponse | ErrorResponse

/** 导出目标格式 */
export type ExportFormat = 'docx' | 'pdf'