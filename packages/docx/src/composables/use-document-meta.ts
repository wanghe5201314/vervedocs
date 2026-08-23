import { computed, reactive } from 'vue'
import type { DocumentMeta, DocumentStats } from '@/types/document'
import type { InitialDocument } from '@/utils/resolve-app'
import { emitExternalEvent } from '@/composables/use-external-events'

/**
 * 文档元数据 composable
 * @param options 配置项
 * @returns 文档元数据状态与计算属性
 */
export function useDocumentMeta(options: {
  /** 初始文档数据 */
  initialDocument: InitialDocument | null
}) {
  const { initialDocument } = options

  /** 应用名称与版本号组合字符串，形如 `docx-editor@x.y.z` */
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

  /** 是否为查看或锁定模式（不可编辑） */
  const isViewMode = computed(() => documentMeta.status === 'view' || documentMeta.status === 'lock')
  /** 头部显示的标题文本，文档名为空时回退为“新建文档” */
  const headerTitle = computed(() => {
    const name = String(documentMeta.name || '').trim()
    return name || '新建文档'
  })
  /** 头部显示的最后保存时间（仅时分），无效时返回空字符串 */
  const headerLastSaveTime = computed(() => {
    const submittedAt = String(documentMeta.submittedAt || '').trim()
    if (!submittedAt) return ''
    const d = new Date(submittedAt)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  })

  /** 向外触发 metaChange 事件，携带当前文档元数据快照 */
  const emitMetaChange = () => {
    emitExternalEvent('metaChange', { meta: { ...documentMeta } })
  }

  /**
   * 以补丁方式更新文档元数据，并在更新后触发 metaChange 事件
   * @param patch 需要更新的元数据字段，支持 fileName 作为 name 的别名
   */
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