import * as Y from 'yjs'

export function yDocToWorkbookData(doc: Y.Doc): Record<string, unknown> | null {
  const yMap = doc.getMap('workbook')
  if (!yMap || yMap.size === 0) return null
  return yMap.toJSON() as Record<string, unknown>
}

export function workbookDataToYDoc(data: Record<string, unknown>, doc: Y.Doc): void {
  const yMap = doc.getMap('workbook')
  doc.transact(() => {
    yMap.clear()
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue
      yMap.set(key, value)
    }
  })
}