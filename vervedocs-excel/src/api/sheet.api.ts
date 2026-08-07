export type SheetDocumentStatus = 'edit' | 'lock' | 'view'

export interface SheetDocumentMeta {
  id: string
  path: string
  status: SheetDocumentStatus
  name?: string
  createdAt?: string
  submittedAt?: string
}

export interface SaveSheetDocumentRequest {
  meta: SheetDocumentMeta
  content: unknown
}

export interface SaveSheetDocumentResult {
  submittedAt: string
}

export interface SetSheetStatusRequest {
  id: string
  path: string
  status: SheetDocumentStatus
  password?: string
}

export interface SheetDocumentApi {
  saveDocument(payload: SaveSheetDocumentRequest): Promise<SaveSheetDocumentResult>
  setStatus(payload: SetSheetStatusRequest): Promise<void>
}

export interface SheetRequestEndpoints {
  documentDetail?: string
  documentContent?: string
}

export interface SheetRequestConfig {
  baseUrl?: string
  token?: string
  tokenGetter?: () => string | null | undefined
  headers?: Record<string, string>
  mode?: RequestMode
  credentials?: RequestCredentials
  endpoints?: SheetRequestEndpoints
}

export type AuthTokenProvider = () => string | null | undefined

let authTokenProvider: AuthTokenProvider | null = null
let requestConfig: SheetRequestConfig | null = null

export const setAuthProvider = (provider: AuthTokenProvider | null) => {
  authTokenProvider = provider
}

export const getAuthToken = (): string | null => {
  if (!authTokenProvider) return null
  const token = authTokenProvider()
  return token ? String(token) : null
}

export const setSheetRequestConfig = (config: SheetRequestConfig | null) => {
  requestConfig = config
}

let injectedApi: SheetDocumentApi | null = null

export const setSheetDocumentApi = (api: SheetDocumentApi) => {
  injectedApi = api
}

export const sheetDocumentApi: SheetDocumentApi = {
  async saveDocument(payload) {
    if (injectedApi) return injectedApi.saveDocument(payload)
    console.warn('[SheetDocumentApi] 未注入，使用本地保存')
    return { submittedAt: new Date().toISOString() }
  },
  async setStatus(payload) {
    if (injectedApi) return injectedApi.setStatus(payload)
    console.warn('[SheetDocumentApi] 未注入，使用本地状态管理')
    await localSetStatus(payload)
  }
}

const DOC_LOCK_HASH_PREFIX = 'excel-editor:document:lockhash:'

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

const localSetStatus = async (payload: SetSheetStatusRequest) => {
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

export const getSheetApiBaseUrl = () => {
  const fromConfig = String(requestConfig?.baseUrl || '').trim()
  const raw = fromConfig || String((import.meta as any).env?.VITE_SHEET_API_BASE_URL || (import.meta as any).env?.VITE_API_BASE_URL || '')
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

const DEFAULT_ENDPOINTS: Required<SheetRequestEndpoints> = {
  documentDetail: '/api/documents/{id}',
  documentContent: '/api/documents/{id}/content'
}

const resolveEndpointUrl = (template: string, params: Record<string, string>) => {
  const replaced = String(template || '').replace(/\{(\w+)\}/g, (_, key: string) => {
    return encodeURIComponent(String(params[key] || ''))
  })
  if (/^https?:\/\//i.test(replaced)) return replaced
  const base = getSheetApiBaseUrl()
  if (!base) return replaced
  return `${base}${replaced.startsWith('/') ? '' : '/'}${replaced}`
}

const getEndpointTemplate = (key: keyof SheetRequestEndpoints) => {
  return String(requestConfig?.endpoints?.[key] || DEFAULT_ENDPOINTS[key]).trim()
}

export const createHttpSheetDocumentApi = (baseUrl: string): SheetDocumentApi => {
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
      return await requestJson<SaveSheetDocumentResult>(url, {
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

export const createDefaultSheetDocumentApi = (): SheetDocumentApi => {
  return createHttpSheetDocumentApi(getSheetApiBaseUrl())
}

export const fetchSheetDocumentContent = async (id: string) => {
  const docId = String(id || '').trim()
  if (!docId || docId === 'local') return null
  const url = resolveEndpointUrl(getEndpointTemplate('documentContent'), { id: docId })
  return await requestJson<any>(url, { method: 'GET' }).catch(() => null)
}

export const fetchSheetDocumentInfo = async (id: string) => {
  const docId = String(id || '').trim()
  if (!docId || docId === 'local') return null
  const url = resolveEndpointUrl(getEndpointTemplate('documentDetail'), { id: docId })
  return await requestJson<any>(url, { method: 'GET' }).catch(() => null)
}