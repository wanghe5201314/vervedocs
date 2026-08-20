import { parseXml, forEachChild, getAttr } from './xml.helper'
import type { RelationshipEntry } from './types'

export function parseRelationships(relsXml: string): Map<string, RelationshipEntry> {
  const map = new Map<string, RelationshipEntry>()
  if (!relsXml) return map

  const doc = parseXml(relsXml)
  const root = doc.documentElement
  
  forEachChild(root, (child) => {
    if (child.localName === 'Relationship') {
      const id = getAttr(child, 'Id')
      const target = getAttr(child, 'Target')
      const type = getAttr(child, 'Type')
      if (id && target && type) {
        map.set(id, { target, type })
      }
    }
  })

  return map
}

export function getTargetByRId(rels: Map<string, RelationshipEntry>, rId: string): string | null {
  const entry = rels.get(rId)
  return entry ? entry.target : null
}

export function getRelsByType(rels: Map<string, RelationshipEntry>, type: string): RelationshipEntry[] {
  const result: RelationshipEntry[] = []
  rels.forEach((entry) => {
    if (entry.type === type) {
      result.push(entry)
    }
  })
  return result
}

/**
 * Resolve a relative target path against a base path.
 * e.g., base="ppt/slides/", target="../media/image1.png" -> "ppt/media/image1.png"
 */
export function resolveRelativePath(basePath: string, target: string): string {
  if (target.startsWith('/')) return target.slice(1)
  
  const baseParts = basePath.replace(/\\/g, '/').split('/').filter(Boolean)
  // Remove the filename from base if it has one
  if (baseParts.length > 0 && baseParts[baseParts.length - 1].includes('.')) {
    baseParts.pop()
  }
  
  const targetParts = target.replace(/\\/g, '/').split('/')
  const resultParts = [...baseParts]
  
  for (const part of targetParts) {
    if (part === '..') {
      resultParts.pop()
    } else if (part !== '.' && part !== '') {
      resultParts.push(part)
    }
  }
  
  return resultParts.join('/')
}
