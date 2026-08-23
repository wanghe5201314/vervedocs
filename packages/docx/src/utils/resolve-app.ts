import { createDefaultDocumentApi } from '@/api/document.api'
import { setDocumentApi } from '@/api/document.api'
import type { DocumentMeta } from '@/types/document'
import Editor from '@/views/Editor.vue'

/**
 * 初始文档数据（由 URL 参数或外部注入构造）
 */
export type InitialDocument = {
  /** 文档元数据（部分字段可缺省） */
  meta: Partial<DocumentMeta> & { fileName?: string }
  /** 文档加载地址 */
  url?: string
  /** 文档展示格式：word=文档视图，canvas=画布视图 */
  format?: 'word' | 'canvas'
  /** 文档内容 */
  content?: any
}

/**
 * 解析后的应用对象
 */
export type ResolvedApp = {
  /** Vue 根组件 */
  app: any
  /** 初始文档（无则 null） */
  initDocument?: InitialDocument | null
}

/**
 * 根据浏览器 location 解析要挂载的应用与初始文档
 * @param loc 浏览器 location 对象，默认 window.location
 * @returns 解析后的应用对象
 */
export function resolveAppFromLocation(loc: Location = window.location): ResolvedApp {
  setDocumentApi(createDefaultDocumentApi())
  const sp = new URLSearchParams(loc.search)

    /**
     * 根据 URL 参数构建初始文档对象
     * @returns 初始文档对象，无有效参数时返回 null
     */
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

