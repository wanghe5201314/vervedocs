// DocumentApi 相关类型定义（从 editor/integration 移入）
export type DocumentStatus = 'edit' | 'lock' | 'view'

export interface DocumentMeta {
  id: string
  path: string
  status: DocumentStatus
  name?: string
  createdAt?: string
  submittedAt?: string
}

export interface SaveDocumentRequest {
  meta: DocumentMeta
  content: unknown
}

export interface SaveDocumentResult {
  submittedAt: string
}

export type DocumentOperationRecord = {
  operationId: string
  userId: string
  revision: number
  timestamp: number
  componentsCount: number
}

export interface SetStatusRequest {
  id: string
  path: string
  status: DocumentStatus
  password?: string
}

export interface DocumentApi {
  saveDocument(payload: SaveDocumentRequest): Promise<SaveDocumentResult>
  setStatus(payload: SetStatusRequest): Promise<void>
}

export interface DocumentRequestEndpoints {
  documentDetail?: string
  documentContent?: string
  documentVersionContent?: string
}

export interface DocumentRequestConfig {
  baseUrl?: string
  token?: string
  tokenGetter?: () => string | null | undefined
  headers?: Record<string, string>
  mode?: RequestMode
  credentials?: RequestCredentials
  endpoints?: DocumentRequestEndpoints
}

// ==================== 全局鉴权 ====================
export type AuthTokenProvider = () => string | null | undefined

let authTokenProvider: AuthTokenProvider | null = null
let requestConfig: DocumentRequestConfig | null = null

export const setAuthProvider = (provider: AuthTokenProvider | null) => {
  authTokenProvider = provider
}

export const getAuthToken = (): string | null => {
  if (!authTokenProvider) return null
  const token = authTokenProvider()
  return token ? String(token) : null
}

export const setDocumentRequestConfig = (config: DocumentRequestConfig | null) => {
  requestConfig = config
}

// DocumentApi 注入机制
let injectedApi: DocumentApi | null = null

export const setDocumentApi = (api: DocumentApi) => {
  injectedApi = api
}

export const documentApi: DocumentApi = {
  async saveDocument(payload) {
    if (injectedApi) return injectedApi.saveDocument(payload)
    // 未注入时使用本地 fallback
    console.warn('[DocumentApi] 未注入，使用本地保存')
    return { submittedAt: new Date().toISOString() }
  },
  async setStatus(payload) {
    if (injectedApi) return injectedApi.setStatus(payload)
    // 未注入时使用本地 fallback
    console.warn('[DocumentApi] 未注入，使用本地状态管理')
    await localSetStatus(payload)
  }
}

const DOC_LOCK_HASH_PREFIX = 'docx-editor:document:lockhash:'

const toHex = (buf: ArrayBuffer) => {
  const bytes = new Uint8Array(buf)
  let out = ''
  for (const b of bytes) out += b.toString(16).padStart(2, '0')
  return out
}

const sha256 = async (text: string) => {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) throw new Error('当前环境不支持密码保护')
  const data = new TextEncoder().encode(text)
  const hash = await subtle.digest('SHA-256', data)
  return toHex(hash)
}

const getLockHashKey = (id: string) => `${DOC_LOCK_HASH_PREFIX}${String(id)}`

const localSetStatus = async (payload: SetStatusRequest) => {
  const id = String(payload.id || 'local')
  const key = getLockHashKey(id)

  if (payload.status === 'lock') {
    if (!payload.password) throw new Error('请输入保护密码')
    const hash = await sha256(payload.password)
    localStorage.setItem(key, hash)
    return
  }

  if (payload.status === 'edit') {
    const existed = localStorage.getItem(key)
    if (existed) {
      if (!payload.password) throw new Error('请输入解锁密码')
      const hash = await sha256(payload.password)
      if (hash !== existed) throw new Error('密码错误')
      localStorage.removeItem(key)
    }
    return
  }
}

export const getDocumentApiBaseUrl = () => {
  const fromConfig = String(requestConfig?.baseUrl || '').trim()
  const raw = fromConfig || String((import.meta as any).env?.VITE_DOCUMENT_API_BASE_URL || (import.meta as any).env?.VITE_API_BASE_URL || '')
  return raw.trim().replace(/\/+$/, '')
}

type WrappedResponse<T> = {
  success: boolean
  code: number
  message?: string
  data?: T
}

const requestJson = async <T>(url: string, init: RequestInit): Promise<T> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(requestConfig?.headers || {}),
    ...(init.headers as Record<string, string> || {})
  }
  const token = getAuthToken()
    || String(requestConfig?.tokenGetter?.() || '').trim()
    || String(requestConfig?.token || '').trim()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const resp = await fetch(url, {
    ...init,
    headers,
    mode: init.mode || requestConfig?.mode || 'cors',
    credentials: init.credentials || requestConfig?.credentials || 'same-origin'
  })
  const data = await resp.json().catch(() => null)
  if (data && typeof data === 'object' && 'success' in data && 'code' in data) {
    const wrapped = data as WrappedResponse<T>
    if (wrapped.success) return wrapped.data as T
    throw new Error(String(wrapped.message || '请求失败'))
  }
  if (!resp.ok) {
    let message = `请求失败(${resp.status})`
    if (data && typeof data === 'object' && 'message' in data) {
      message = String((data as any).message || message)
    }
    throw new Error(message)
  }
  return data as T
}

const DEFAULT_ENDPOINTS: Required<DocumentRequestEndpoints> = {
  documentDetail: '/api/documents/{id}',
  documentContent: '/api/documents/{id}/content',
  documentVersionContent: '/api/documents/{id}/versions/{version}/content'
}

const resolveEndpointUrl = (template: string, params: Record<string, string>) => {
  const replaced = String(template || '').replace(/\{(\w+)\}/g, (_, key: string) => {
    return encodeURIComponent(String(params[key] || ''))
  })
  if (/^https?:\/\//i.test(replaced)) return replaced
  const base = getDocumentApiBaseUrl()
  if (!base) return replaced
  return `${base}${replaced.startsWith('/') ? '' : '/'}${replaced}`
}

const getEndpointTemplate = (key: keyof DocumentRequestEndpoints) => {
  return String(requestConfig?.endpoints?.[key] || DEFAULT_ENDPOINTS[key]).trim()
}

export const createHttpDocumentApi = (baseUrl: string): DocumentApi => {
  const normalized = String(baseUrl || '').trim().replace(/\/+$/, '')
  const withBase = (path: string) => (normalized ? `${normalized}${path}` : path)
  return {
    async saveDocument(payload) {
      const id = String(payload?.meta?.id || '').trim()
      if (!id) throw new Error('文档ID为空')
      if (id === 'local') return { submittedAt: new Date().toISOString() }
      const template = getEndpointTemplate('documentContent')
      const url = template
        ? resolveEndpointUrl(template, { id })
        : withBase(`/api/documents/${encodeURIComponent(id)}/content`)
      return await requestJson<SaveDocumentResult>(url, {
        method: 'PUT',
        body: JSON.stringify(payload)
      })
    },
    async setStatus(payload) {
      if (injectedApi) return injectedApi.setStatus(payload)
      await localSetStatus(payload)
    }
  }
}

export const createDefaultDocumentApi = (): DocumentApi => {
  return createHttpDocumentApi(getDocumentApiBaseUrl())
}

export const fetchDocumentContent = async (id: string) => {
  const docId = String(id || '').trim()
  if (!docId || docId === 'local') return null
  const url = resolveEndpointUrl(getEndpointTemplate('documentContent'), { id: docId })
  return await requestJson<any>(url, { method: 'GET' }).catch(() => null)
}

export const fetchDocumentInfo = async (id: string) => {
  const docId = String(id || '').trim()
  if (!docId || docId === 'local') return null
  const url = resolveEndpointUrl(getEndpointTemplate('documentDetail'), { id: docId })
  return await requestJson<any>(url, { method: 'GET' }).catch(() => null)
}

export const fetchDocumentOperations = async (id: string, limit = 200): Promise<DocumentOperationRecord[]> => {
  const docId = String(id || '').trim()
  if (!docId || docId === 'local') return []
  const lim = Math.max(1, Math.min(1000, Math.floor(Number(limit) || 200)))
  const base = getDocumentApiBaseUrl()
  const url = base
    ? `${base}/api/documents/${encodeURIComponent(docId)}/operations?limit=${lim}`
    : `/api/documents/${encodeURIComponent(docId)}/operations?limit=${lim}`
  const data = await requestJson<any>(url, { method: 'GET' })
  return Array.isArray(data) ? (data as DocumentOperationRecord[]) : []
}

// ==================== 评论 API ====================

const commentApiBase = (docId: string) => {
  const base = getDocumentApiBaseUrl()
  return base
    ? `${base}/api/documents/${encodeURIComponent(docId)}/comments`
    : `/api/documents/${encodeURIComponent(docId)}/comments`
}

const commentApiById = (commentId: string | number) => {
  const base = getDocumentApiBaseUrl()
  return base
    ? `${base}/api/comments/${encodeURIComponent(commentId)}`
    : `/api/comments/${encodeURIComponent(commentId)}`
}

export const fetchDocumentComments = async (docId: string): Promise<any[]> => {
  const id = String(docId || '').trim()
  if (!id || id === 'local') return []
  const data = await requestJson<any>(commentApiBase(id), { method: 'GET' }).catch(() => [])
  return Array.isArray(data) ? data : []
}

export const createDocumentComment = async (docId: string, payload: {
  content: string
  groupId?: string
  rangeText?: string
  startIndex?: number
  endIndex?: number
}): Promise<any> => {
  const id = String(docId || '').trim()
  if (!id || id === 'local') return null
  return requestJson(commentApiBase(id), {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export const replyDocumentComment = async (commentId: string | number, content: string): Promise<any> => {
  return requestJson(`${commentApiById(commentId)}/reply`, {
    method: 'POST',
    body: JSON.stringify({ content })
  })
}

export const updateDocumentComment = async (commentId: string | number, content: string): Promise<void> => {
  await requestJson<void>(commentApiById(commentId), {
    method: 'PUT',
    body: JSON.stringify({ content })
  })
}

export const deleteDocumentComment = async (commentId: string | number): Promise<void> => {
  await requestJson<void>(commentApiById(commentId), { method: 'DELETE' })
}

export const resolveDocumentComment = async (commentId: string | number, resolved: boolean): Promise<void> => {
  await requestJson<void>(`${commentApiById(commentId)}/resolve`, {
    method: 'PUT',
    body: JSON.stringify({ resolved })
  })
}

// ==================== 版本历史 API ====================

const versionApiBase = (docId: string) => {
  const base = getDocumentApiBaseUrl()
  return base
    ? `${base}/api/documents/${encodeURIComponent(docId)}/versions`
    : `/api/documents/${encodeURIComponent(docId)}/versions`
}

export const fetchDocumentVersions = async (docId: string): Promise<any[]> => {
  const id = String(docId || '').trim()
  if (!id || id === 'local') return []
  const data = await requestJson<any>(versionApiBase(id), { method: 'GET' }).catch(() => [])
  return Array.isArray(data) ? data : []
}

export const fetchDocumentVersionContent = async (docId: string, versionNum: number): Promise<any> => {
  const id = String(docId || '').trim()
  if (!id || id === 'local') return null
  return await requestJson<any>(`${versionApiBase(id)}/${versionNum}/content`, { method: 'GET' }).catch(() => null)
}

export const createDocumentVersion = async (docId: string, name?: string): Promise<any> => {
  const id = String(docId || '').trim()
  if (!id || id === 'local') return null
  return requestJson(versionApiBase(id), {
    method: 'POST',
    body: JSON.stringify(name ? { name } : {})
  })
}

export const nameDocumentVersion = async (versionId: number, name: string): Promise<void> => {
  const base = getDocumentApiBaseUrl()
  const url = base
    ? `${base}/api/versions/${encodeURIComponent(versionId)}/name`
    : `/api/versions/${encodeURIComponent(versionId)}/name`
  await requestJson<void>(url, {
    method: 'PUT',
    body: JSON.stringify({ name })
  })
}

export const restoreDocumentVersion = async (docId: string, versionNum: number): Promise<any> => {
  const id = String(docId || '').trim()
  if (!id || id === 'local') return null
  return requestJson(`${versionApiBase(id)}/${versionNum}/restore`, { method: 'POST' })
}
