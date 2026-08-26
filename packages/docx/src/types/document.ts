import type { DocumentMeta, DocumentStatus } from '@/api/document.api'

export type { DocumentMeta, DocumentStatus }

/**
 * 编辑器内部使用的初始文档（meta 允许部分字段缺省）
 */
export type InitialDocument = {
  /** 文档元数据（部分字段可缺省） */
  meta: Partial<DocumentMeta> & { fileName?: string }
  /** 文档加载地址 */
  url?: string
  /** 文档展示格式：word=文档视图，canvas=画布视图 */
  format?: 'word' | 'canvas'
  /** 文档内容 */
  content?: any
}

/**
 * 文档统计信息
 */
export interface DocumentStats {
  /** 总页数 */
  totalPages: number
  /** 字数统计 */
  wordCount: number
  /** 段落数量 */
  paragraphCount: number
  /** 字符数（不含空格） */
  charCount: number
  /** 字符数（含空格） */
  charCountWithSpaces: number
}
