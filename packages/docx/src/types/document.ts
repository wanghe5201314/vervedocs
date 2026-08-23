export type { DocumentMeta, DocumentStatus } from '@/api/document.api'

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
