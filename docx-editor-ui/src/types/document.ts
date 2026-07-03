export type { DocumentMeta, DocumentStatus } from '@/api/document.api'

export interface DocumentStats {
  totalPages: number
  wordCount: number
  paragraphCount: number
  charCount: number
  charCountWithSpaces: number
}
