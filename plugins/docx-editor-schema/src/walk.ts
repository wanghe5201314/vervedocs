
/**
 * VerveDocs Schema —— 树遍历与路径寻址
 *
 * 所有遍历严格保持树形语义，不做扁平化。
 */

import rfdc from 'rfdc'
import type { IElement, Path, PathSegment, IPosition, ITableElement, ITd, ITr } from './types'

/* -------------------- 深拷贝 -------------------- */

const _clone = rfdc({ proto: false, circles: false })

export function cloneTree<T>(node: T): T {
  if (node === null || typeof node !== 'object') return node
  return _clone(node)
}

/* -------------------- 类型守卫 -------------------- */

export function isParagraphContainer(el: IElement): el is IElement & { valueList: IElement[] } {
  return (el?.type === 'title' || el?.type === 'list') && Array.isArray((el as { valueList?: unknown }).valueList)
}

export function isTable(el: IElement): el is ITableElement {
  return el?.type === 'table' && Array.isArray((el as ITableElement).trList)
}

/* -------------------- 访问器 -------------------- */

export interface VisitContext {
  parent: IElement[] | IElement | null
  path: Path
  index: number
}

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

export function replaceAtPath(root: IElement[], path: Path, node: IElement): boolean {
  const parent = getParentContainer(root, path)
  if (!parent) return false
  const idx = path[path.length - 1] as number
  parent[idx] = node
  return true
}

export function insertAtPath(root: IElement[], path: Path, node: IElement): boolean {
  const parent = getParentContainer(root, path)
  if (!parent) return false
  const idx = path[path.length - 1] as number
  parent.splice(idx, 0, node)
  return true
}

export function removeAtPath(root: IElement[], path: Path): IElement | null {
  const parent = getParentContainer(root, path)
  if (!parent) return null
  const idx = path[path.length - 1] as number
  const [removed] = parent.splice(idx, 1)
  return removed ?? null
}

/* -------------------- 位置工具 -------------------- */

export function isSamePath(a: Path, b: Path): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

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

export function comparePosition(a: IPosition, b: IPosition): number {
  const c = comparePath(a.path, b.path)
  if (c !== 0) return c
  return a.offset - b.offset
}

/* -------------------- 表格辅助 -------------------- */

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
