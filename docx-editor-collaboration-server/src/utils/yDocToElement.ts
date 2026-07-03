/**
 * Y.Doc -> IElement[] JSON 快照导出
 * 从 Yjs 文档中提取 elements 数组并转为普通 JSON
 */
import * as Y from 'yjs'

/**
 * 将 Y.Doc 的 "elements" 数组导出为 IElement[] 兼容的 JSON
 * Y.Array.toJSON() 会递归将嵌套的 Y.Map/Y.Array 转为普通对象/数组
 */
export function yDocToElementArray(doc: Y.Doc): Record<string, unknown>[] {
  const yArray = doc.getArray('elements')
  return yArray.toJSON() as Record<string, unknown>[]
}
