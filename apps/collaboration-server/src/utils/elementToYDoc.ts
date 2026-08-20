/**
 * IElement[] -> Y.Doc 转换工具
 * 将旧文档的 IElement[] JSON 格式转换为 Yjs Y.Array<Y.Map> 结构
 */
import * as Y from 'yjs'

/** 需要作为 Y.Array 嵌套的数组字段 */
const NESTED_ARRAY_KEYS = new Set([
  'valueList', 'trList', 'tdList', 'colgroup',
])

/**
 * 判断一个值是否是需要递归转为 Y.Array<Y.Map> 的数组
 */
function isNestedElementArray(key: string, value: unknown): value is Record<string, unknown>[] {
  return NESTED_ARRAY_KEYS.has(key) && Array.isArray(value) && value.length > 0 && typeof value[0] === 'object'
}

/**
 * 将单个 IElement 对象转换为 Y.Map
 * 标量属性直接 set，嵌套数组属性递归转为 Y.Array<Y.Map>
 */
export function elementToYMap(element: Record<string, unknown>, doc: Y.Doc): Y.Map<unknown> {
  const yMap = new Y.Map<unknown>()

  for (const [key, value] of Object.entries(element)) {
    if (value === undefined || value === null) continue

    if (isNestedElementArray(key, value)) {
      // 嵌套数组 -> Y.Array<Y.Map> 递归
      const yArray = new Y.Array<Y.Map<unknown>>()
      const yMaps = value.map((child) => elementToYMap(child as Record<string, unknown>, doc))
      yArray.insert(0, yMaps)
      yMap.set(key, yArray)
    } else {
      // 标量值或非嵌套对象 -> 直接存储 (对象会被 JSON 序列化)
      yMap.set(key, value)
    }
  }

  return yMap
}

/**
 * 将 IElement[] JSON 数组初始化到 Y.Doc 的 "elements" Y.Array 中
 */
export function elementArrayToYDoc(elements: Record<string, unknown>[], doc: Y.Doc): void {
  const yArray = doc.getArray<Y.Map<unknown>>('elements')

  doc.transact(() => {
    // 清空已有内容
    if (yArray.length > 0) {
      yArray.delete(0, yArray.length)
    }
    // 批量插入转换后的 Y.Map
    const yMaps = elements.map((el) => elementToYMap(el, doc))
    yArray.insert(0, yMaps)
  })
}
