
/**
 * VerveDocs Schema —— 树遍历与路径寻址
 *
 * 所有遍历严格保持树形语义，不做扁平化。
 */

import rfdc from 'rfdc'
import type { IElement, Path, PathSegment, IPosition, ITableElement, ITd, ITr } from './types'

/* -------------------- 深拷贝 -------------------- */

/** rfdc 深拷贝实例（关闭原型拷贝与循环引用检测以提升性能） */
const _clone = rfdc({ proto: false, circles: false })

/**
 * 深拷贝树节点。
 * @param node 待拷贝的节点
 * @returns 拷贝后的新节点（基本类型直接返回）
 */
export function cloneTree<T>(node: T): T {
  if (node === null || typeof node !== 'object') return node
  return _clone(node)
}

/* -------------------- 类型守卫 -------------------- */

/**
 * 判断元素是否为段落容器（title/list 且拥有 valueList 数组）。
 * @param el 待判断元素
 * @returns 是段落容器则返回 true，并收窄类型
 */
export function isParagraphContainer(el: IElement): el is IElement & { valueList: IElement[] } {
  return (el?.type === 'title' || el?.type === 'list') && Array.isArray((el as { valueList?: unknown }).valueList)
}

/**
 * 判断元素是否为表格（type='table' 且拥有 trList 数组）。
 * @param el 待判断元素
 * @returns 是表格则返回 true，并收窄类型
 */
export function isTable(el: IElement): el is ITableElement {
  return el?.type === 'table' && Array.isArray((el as ITableElement).trList)
}

/* -------------------- 访问器 -------------------- */

/** 遍历上下文：携带父节点、路径与索引信息 */
export interface VisitContext {
  /** 父节点（数组或单个元素，根数组时为 null） */
  parent: IElement[] | IElement | null
  /** 当前节点路径 */
  path: Path
  /** 在父容器中的索引 */
  index: number
}

/** 访问者函数类型：返回 false 可跳过当前节点的子树 */
export type Visitor = (node: IElement, ctx: VisitContext) => void | boolean

/**
 * 深度优先遍历（返回 false 可跳过子树）。
 * 遍历顺序：elements[i] → 若为段落容器则 valueList[i]；若为 table 则 trList[j].tdList[k].value[m]。
 */
export function walkTree(elements: IElement[], visitor: Visitor, parentPath: Path = []): void {
  for (let i = 0; i < elements.length; i++) {
    const node = elements[i]
    const path: Path = [...parentPath, i]
    const shouldDescend = visitor(node, { parent: elements, path, index: i })
    if (shouldDescend === false) continue

    if (isParagraphContainer(node)) {
      walkTree(node.valueList, visitor, [...path, 'valueList'])
    } else if (isTable(node)) {
      for (let tr = 0; tr < node.trList.length; tr++) {
        const row = node.trList[tr]
        for (let td = 0; td < row.tdList.length; td++) {
          const cell = row.tdList[td]
          walkTree(cell.value, visitor, [...path, 'trList', tr, 'tdList', td, 'value'])
        }
      }
    }
  }
}

/* -------------------- 路径寻址 -------------------- */

/**
 * 根据路径获取节点。
 * 路径示例：
 *   [3]                                → elements[3]
 *   [3, 'valueList', 1]                → elements[3].valueList[1]
 *   [5, 'trList', 0, 'tdList', 2, 'value', 1] → table 第 0 行第 2 单元格第 1 子元素
 */
export function getByPath(root: IElement[], path: Path): IElement | null {
  if (path.length === 0) return null
  let current: unknown = root
  for (const seg of path) {
    if (current == null) return null
    if (typeof seg === 'number') {
      if (!Array.isArray(current)) return null
      current = current[seg]
    } else {
      current = (current as Record<string, unknown>)[seg]
    }
  }
  return (current as IElement) ?? null
}

/**
 * 获取路径末段对应的父容器数组。
 * @param root 根元素数组
 * @param path 目标路径
 * @returns 父容器数组；若路径非法或末段不是数组索引则返回 null
 */
export function getParentContainer(root: IElement[], path: Path): IElement[] | null {
  if (path.length === 0) return null
  const parentPath = path.slice(0, -1)
  const lastSeg = path[path.length - 1]
  if (typeof lastSeg !== 'number') return null // 末段必须是数组索引
  if (parentPath.length === 0) return root
  let current: unknown = root
  for (const seg of parentPath) {
    if (typeof seg === 'number') {
      if (!Array.isArray(current)) return null
      current = current[seg]
    } else {
      current = (current as Record<string, unknown>)[seg]
    }
  }
  return Array.isArray(current) ? (current as IElement[]) : null
}

/**
 * 在路径指定位置替换节点。
 * @param root 根元素数组
 * @param path 目标路径
 * @param node 新节点
 * @returns 替换成功返回 true，路径非法返回 false
 */
export function replaceAtPath(root: IElement[], path: Path, node: IElement): boolean {
  const parent = getParentContainer(root, path)
  if (!parent) return false
  const idx = path[path.length - 1] as number
  parent[idx] = node
  return true
}

/**
 * 在路径指定位置插入节点（插入到该索引前）。
 * @param root 根元素数组
 * @param path 目标路径
 * @param node 待插入节点
 * @returns 插入成功返回 true，路径非法返回 false
 */
export function insertAtPath(root: IElement[], path: Path, node: IElement): boolean {
  const parent = getParentContainer(root, path)
  if (!parent) return false
  const idx = path[path.length - 1] as number
  parent.splice(idx, 0, node)
  return true
}

/**
 * 移除路径指定位置的节点。
 * @param root 根元素数组
 * @param path 目标路径
 * @returns 被移除的节点；路径非法返回 null
 */
export function removeAtPath(root: IElement[], path: Path): IElement | null {
  const parent = getParentContainer(root, path)
  if (!parent) return null
  const idx = path[path.length - 1] as number
  const [removed] = parent.splice(idx, 1)
  return removed ?? null
}

/* -------------------- 位置工具 -------------------- */

/**
 * 判断两条路径是否完全相同。
 * @param a 路径 a
 * @param b 路径 b
 * @returns 相同返回 true
 */
export function isSamePath(a: Path, b: Path): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

/**
 * 比较两条路径的字典序（数字段按数值比较，字符串段按字符串比较）。
 * @param a 路径 a
 * @param b 路径 b
 * @returns a<b 返回负数，a=b 返回 0，a>b 返回正数
 */
export function comparePath(a: Path, b: Path): number {
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) {
    const av = a[i]; const bv = b[i]
    if (av === bv) continue
    if (typeof av === 'number' && typeof bv === 'number') return av - bv
    return String(av) < String(bv) ? -1 : 1
  }
  return a.length - b.length
}

/**
 * 比较两个文档位置：先比较路径，路径相同再比较 offset。
 * @param a 位置 a
 * @param b 位置 b
 * @returns a<b 返回负数，a=b 返回 0，a>b 返回正数
 */
export function comparePosition(a: IPosition, b: IPosition): number {
  const c = comparePath(a.path, b.path)
  if (c !== 0) return c
  return a.offset - b.offset
}

/* -------------------- 表格辅助 -------------------- */

/**
 * 遍历表格所有单元格，对每个单元格调用回调。
 * @param table 表格元素
 * @param fn 回调函数，接收单元格、行、行索引、列索引
 */
export function forEachCell(
  table: ITableElement,
  fn: (cell: ITd, tr: ITr, trIndex: number, tdIndex: number) => void
) {
  for (let i = 0; i < table.trList.length; i++) {
    const row = table.trList[i]
    for (let j = 0; j < row.tdList.length; j++) {
      fn(row.tdList[j], row, i, j)
    }
  }
}

/** 计算表格列数（不考虑合并） */
export function getTableColCount(table: ITableElement): number {
  if (Array.isArray(table.colgroup)) return table.colgroup.length
  return table.trList[0]?.tdList.reduce((sum, td) => sum + (td.colspan || 1), 0) ?? 0
}

/** 计算某段路径所在的段落容器（title/list/纯段落用父数组表示） */
export function _pathSegAsKey(seg: PathSegment): string {
  return typeof seg === 'number' ? String(seg) : seg
}
