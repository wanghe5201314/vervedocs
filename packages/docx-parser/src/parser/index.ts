export type {
  IDocxParseResult,
  IDocxParseOptions,
  IChartRenderer
} from './types'

export { DocxParser } from './docx.parser'

import { DocxParser } from './docx.parser'
import type { IDocxParseOptions, IDocxParseResult } from './types'

/**
 * 创建解析器实例的工厂函数
 */
export function createDocxParser(options?: IDocxParseOptions): DocxParser {
  return new DocxParser(options)
}

/**
 * 快捷解析函数（保持与旧 API 兼容）
 */
export async function parseDocx(
  data: ArrayBuffer | File,
  options?: IDocxParseOptions
): Promise<IDocxParseResult> {
  const parser = createDocxParser(options)

  if (data instanceof File) {
    return parser.parseFromFile(data)
  }

  return parser.parse(data)
}

export default DocxParser
