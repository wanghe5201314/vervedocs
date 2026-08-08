import { computed, reactive } from 'vue'
import type { DocumentMeta, DocumentStats } from '@/types/document'
import type { InitialDocument } from '@/utils/resolve-app'
import { emitExternalEvent } from '@/composables/use-external-api'

export function useDocumentMeta(options: {
  initialDocument: InitialDocument | null
}) {
  const { initialDocument } = options

  const appNameWithVersion = computed(() => {
    const v = String(__APP_VERSION__ || '').trim()
    return v ? `docx-editor@${v}` : 'docx-editor'
  })

  const documentMeta = reactive<DocumentMeta>({
    id: String(initialDocument?.meta?.id || 'local'),
    path: String((initialDocument?.meta as any)?.path || ''),
    status: ((initialDocument?.meta as any)?.status || 'edit') as DocumentMeta['status'],
    name: String((initialDocument?.meta as any)?.name || initialDocument?.meta?.fileName || '新建文档'),
    createdAt: String((initialDocument?.meta as any)?.createdAt || ''),
    submittedAt: String((initialDocument?.meta as any)?.submittedAt || '')
  })

  const documentStats = reactive<DocumentStats>({
    totalPages: 1,
    wordCount: 0,
    paragraphCount: 0,
    charCount: 0,
    charCountWithSpaces: 0
  })

  const isViewMode = computed(() => documentMeta.status === 'view' || documentMeta.status === 'lock')
  const headerTitle = computed(() => {
    const name = String(documentMeta.name || '').trim()
    return name || '新建文档'
  })
  const headerLastSaveTime = computed(() => {
    const submittedAt = String(documentMeta.submittedAt || '').trim()
    if (!submittedAt) return ''
    const d = new Date(submittedAt)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  })

  const emitMetaChange = () => {
    emitExternalEvent('metaChange', { meta: { ...documentMeta } })
  }

  const setMeta = (patch: Partial<DocumentMeta> & { fileName?: string }) => {
    if (!patch || typeof patch !== 'object') return
    if (patch.id !== undefined) documentMeta.id = String(patch.id || 'local')
    if (patch.path !== undefined) documentMeta.path = String(patch.path || '')
    if (patch.status !== undefined) documentMeta.status = patch.status as DocumentMeta['status']
    const nextName = (patch as any).name ?? (patch as any).fileName
    if (nextName !== undefined) documentMeta.name = String(nextName || '新建文档')
    if (patch.createdAt !== undefined) documentMeta.createdAt = String(patch.createdAt || '')
    if (patch.submittedAt !== undefined) documentMeta.submittedAt = String(patch.submittedAt || '')
    emitMetaChange()
  }

  return {
    appNameWithVersion,
    documentMeta,
    documentStats,
    isViewMode,
    headerTitle,
    headerLastSaveTime,
    emitMetaChange,
    setMeta
  }
}