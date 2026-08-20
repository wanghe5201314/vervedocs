export function inferTypeAndFormat(url?: unknown, name?: unknown) {
  const u = String(url || '').toLowerCase()
  const n = String(name || '').toLowerCase()
  const text = `${u} ${n}`.trim()
  if (text.endsWith('.xlsx') || text.endsWith('.xls') || text.includes('.xlsx?') || text.includes('.xls?')) {
    return { type: 'sheet' as const, format: 'sheet' as const }
  }
  if (text.endsWith('.pptx') || text.endsWith('.ppt') || text.includes('.pptx?') || text.includes('.ppt?')) {
    return { type: 'slide' as const, format: 'slide' as const }
  }
  return { type: 'doc' as const, format: 'word' as const }
}

export type DocumentRow = {
  id: string
  type: 'doc' | 'sheet' | 'slide'
  name: string
  recent: string
  sizeBytes: number
  sizeText: string
  fav: boolean
  shared: boolean
  shareCode: string
  ownerName: string
  path: string
  format: 'word' | 'sheet' | 'slide'
  editLocked: boolean
  scope: string
}

type ToDocumentRowOptions = {
  defaultOwnerName?: string
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export function toDocumentRow(doc: any, options?: ToDocumentRowOptions): DocumentRow {
  const { type, format } = inferTypeAndFormat(doc?.url, doc?.name)
  return {
    id: String(doc?.id || ''),
    type,
    name: String(doc?.name || ''),
    recent: String(doc?.updatedAt || doc?.createdAt || ''),
    sizeBytes: Number(doc?.sizeBytes || 0),
    sizeText: formatBytes(doc?.sizeBytes),
    fav: Boolean(doc?.favorite),
    shared: Boolean(doc?.shared),
    shareCode: String(doc?.shareCode || ''),
    ownerName: String(doc?.ownerName || options?.defaultOwnerName || '我'),
    path: String(doc?.url || ''),
    format,
    editLocked: Boolean(doc?.editLocked),
    scope: String(doc?.scope || 'public')
  }
}
