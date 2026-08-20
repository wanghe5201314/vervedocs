import { parseXml, forEachChild } from './xml.helper'

export interface RelationshipEntry {
  id: string
  type: string
  target: string
}

/**
 * 解析 .rels 文件，建立 rId → target 映射
 */
export function parseRelationships(relsXml: string): Map<string, RelationshipEntry> {
  const map = new Map<string, RelationshipEntry>()
  const doc = parseXml(relsXml)
  const root = doc.documentElement
  forEachChild(root, (child) => {
    if (child.localName === 'Relationship') {
      const id = child.getAttribute('Id') || ''
      const type = child.getAttribute('Type') || ''
      const target = child.getAttribute('Target') || ''
      if (id) {
        map.set(id, { id, type, target })
      }
    }
  })
  return map
}

/**
 * 通过 rId 获取 target 路径
 */
export function getTargetByRId(
  rels: Map<string, RelationshipEntry>,
  rId: string
): string | null {
  const entry = rels.get(rId)
  return entry?.target || null
}

/**
 * 查找指定类型的 relationship
 */
export function findRelByType(
  rels: Map<string, RelationshipEntry>,
  typeSubstring: string
): RelationshipEntry | null {
  for (const entry of rels.values()) {
    if (entry.type.includes(typeSubstring)) {
      return entry
    }
  }
  return null
}
