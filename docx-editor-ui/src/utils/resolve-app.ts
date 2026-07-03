import { createDefaultDocumentApi } from '@/api/document.api'
import { setDocumentApi } from '@/api/document.api'
import type { DocumentMeta } from '@/types/document'
import Editor from '@/views/Editor.vue'

export type InitialDocument = {
  meta: Partial<DocumentMeta> & { fileName?: string }
  url?: string
  format?: 'word' | 'canvas'
  content?: any
}

export type ResolvedApp = {
  app: any
  initDocument?: InitialDocument | null
}

export function resolveAppFromLocation(loc: Location = window.location): ResolvedApp {
  setDocumentApi(createDefaultDocumentApi())
  const sp = new URLSearchParams(loc.search)

  const buildInitialDocumentFromUrl = (): InitialDocument | null => {
    const docId = String(sp.get('docId') || '').trim() || 'local'
    const docName = String(sp.get('docName') || '').trim()
    const meta: Partial<DocumentMeta> & { fileName?: string } = {
      id: docId,
      status: 'edit',
      name: docName || undefined
    }
    const format = String(sp.get('docFormat') || '').trim().toLowerCase()
    const normalizedFormat =
      format === 'word' || format === 'canvas'
        ? (format as InitialDocument['format'])
        : undefined
    return { meta, format: normalizedFormat }
  }

  return {
    app: Editor,
    initDocument: buildInitialDocumentFromUrl()
  }
}

