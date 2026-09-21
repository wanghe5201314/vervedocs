import type { IDocxDocumentMeta, IElement, IPosition } from './types'
import { cloneTree, comparePosition, getByPath, isParagraphContainer, isTable } from './walk'

interface BookmarkBoundary {
  offset: number
  name: string
  position: 'start' | 'end'
}

/** Convert editor-only state to the document protocol accepted by DOCX writers. */
export function toDocxExportDocument(document: IDocxDocumentMeta): IDocxDocumentMeta {
  const result = cloneTree(document)
  const { bookmarks, contentZones } = result
  delete result.bookmarks
  delete result.contentZones
  delete result.meta
  result.header ??= contentZones?.header
  result.footer ??= contentZones?.footer
  if (!bookmarks) return result

  // Resolve all paths before splitting runs so overlapping ranges keep their positions.
  const boundaries = new Map<IElement, BookmarkBoundary[]>()
  const addBoundary = (name: string, position: BookmarkBoundary['position'], point: IPosition) => {
    const node = getByPath(result.elements, point.path)
    const length = node?.extension?.bookmarkMarker ? 0 : node?.type === 'text' ? node.value.length : 1
    if (!node || !Number.isInteger(point.offset) || point.offset < 0 || point.offset > length) {
      throw new Error(`Invalid bookmark position: ${name}`)
    }
    const entries = boundaries.get(node) ?? []
    entries.push({ name, position, offset: point.offset })
    boundaries.set(node, entries)
  }
  for (const bookmark of bookmarks) {
    const { anchor, focus } = bookmark.range
    const [start, end] = comparePosition(anchor, focus) <= 0 ? [anchor, focus] : [focus, anchor]
    addBoundary(bookmark.name, 'start', start)
    addBoundary(bookmark.name, 'end', end)
  }

  const marker = (boundary: BookmarkBoundary): IElement => ({
    type: 'text',
    value: '',
    extension: { bookmarkMarker: { name: boundary.name, position: boundary.position } }
  })
  const convert = (elements: IElement[]): IElement[] => elements.flatMap(node => {
    if (isParagraphContainer(node)) {
      node.valueList = convert(node.valueList)
    } else if (isTable(node)) {
      for (const row of node.trList) {
        for (const cell of row.tdList) cell.value = convert(cell.value)
      }
    }
    const entries = boundaries.get(node)?.sort((a, b) => a.offset - b.offset) ?? []
    // Runtime ranges are authoritative; replace imported markers instead of duplicating them.
    if (node.extension?.bookmarkMarker) return entries.map(marker)
    if (!entries.length) return [node]
    if (node.type !== 'text') {
      return [
        ...entries.filter(entry => entry.offset === 0).map(marker),
        node,
        ...entries.filter(entry => entry.offset !== 0).map(marker)
      ]
    }
    const parts: IElement[] = []
    let offset = 0
    for (const entry of entries) {
      if (entry.offset > offset) parts.push({ ...node, value: node.value.slice(offset, entry.offset) })
      parts.push(marker(entry))
      offset = entry.offset
    }
    if (offset < node.value.length || !node.value.length) {
      parts.push({ ...node, value: node.value.slice(offset) })
    }
    return parts
  })
  result.elements = convert(result.elements)
  return result
}
