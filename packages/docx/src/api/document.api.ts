/**
 * 文档状态：edit=可编辑，lock=已锁定（需密码解锁），view=只读查看
 */
export type DocumentStatus = 'edit' | 'lock' | 'view'

/**
 * 文档元数据
 */
export interface DocumentMeta {
  /** 文档唯一标识 */
  id: string
  /** 文档路径或远程地址 */
  path: string
  /** 文档当前状态 */
  status: DocumentStatus
  /** 文档名称 */
  name?: string
  /** 创建时间（ISO 字符串） */
  createdAt?: string
  /** 最近一次提交保存时间（ISO 字符串） */
  submittedAt?: string
}

/**
 * 保存文档请求体
 */
export interface SaveDocumentRequest {
  /** 文档元数据 */
  meta: DocumentMeta
  /** 文档内容（编辑器导出的数据结构） */
  content: unknown
}

/**
 * 保存文档结果
 */
export interface SaveDocumentResult {
  /** 本次提交保存时间（ISO 字符串） */
  submittedAt: string
}

/**
 * 文档操作记录（用于操作历史/审计）
 */
export type DocumentOperationRecord = {
  /** 操作唯一标识 */
  operationId: string
  /** 操作用户 ID */
  userId: string
  /** 操作对应的文档版本号 */
  revision: number
  /** 操作时间戳（毫秒） */
  timestamp: number
  /** 本次操作涉及的组件数量 */
  componentsCount: number
}

/**
 * 设置文档状态请求体
 */
export interface SetStatusRequest {
  /** 文档唯一标识 */
  id: string
  /** 文档路径 */
  path: string
  /** 目标状态 */
  status: DocumentStatus
  /** 锁定/解锁所需密码（status=lock 或解锁时必填） */
  password?: string
}

/**
 * 文档 API 抽象接口（可由使用方注入自定义实现）
 */
export interface DocumentApi {
  /** 保存文档 */
  saveDocument(payload: SaveDocumentRequest): Promise<SaveDocumentResult>
  /** 设置文档状态（锁定/解锁/只读） */
  setStatus(payload: SetStatusRequest): Promise<void>
}

/**
 * 文档请求端点模板配置（支持 `{id}`、`{version}` 占位符）
 */
export interface DocumentRequestEndpoints {
  /** 文档详情接口模板 */
  documentDetail?: string
  /** 文档内容接口模板 */
  documentContent?: string
  /** 文档指定版本内容接口模板 */
  documentVersionContent?: string
}

/**
 * 文档请求全局配置
 */
export interface DocumentRequestConfig {
  /** 接口基地址 */
  baseUrl?: string
  /** 静态鉴权令牌 */
  token?: string
  /** 动态获取鉴权令牌的函数 */
  tokenGetter?: () => string | null | undefined
  /** 自定义请求头 */
  headers?: Record<string, string>
  /** fetch mode 选项 */
  mode?: RequestMode
  /** fetch credentials 选项 */
  credentials?: RequestCredentials
  /** 端点模板配置 */
  endpoints?: DocumentRequestEndpoints
}

/**
 * 鉴权令牌提供者类型
 */
export type AuthTokenProvider = () => string | null | undefined

let authTokenProvider: AuthTokenProvider | null = null
let requestConfig: DocumentRequestConfig | null = null

/**
 * 设置全局鉴权令牌提供者
 * @param provider 令牌提供者函数，传 null 清除
 */
export const setAuthProvider = (provider: AuthTokenProvider | null) => {
  authTokenProvider = provider
}

/**
 * 获取当前鉴权令牌
 * @returns 令牌字符串，无则返回 null
 */
export const getAuthToken = (): string | null => {
  if (!authTokenProvider) return null
  const token = authTokenProvider()
  return token ? String(token) : null
}

/**
 * 设置文档请求全局配置
 * @param config 配置对象，传 null 清除
 */
export const setDocumentRequestConfig = (config: DocumentRequestConfig | null) => {
  requestConfig = config
}

let injectedApi: DocumentApi | null = null

/**
 * 注入自定义 DocumentApi 实现
 * @param api 自定义 API 实现
 */
export const setDocumentApi = (api: DocumentApi) => {
  injectedApi = api
}

/**
 * 默认文档 API 实例（未注入时使用本地 fallback）
 */
export const documentApi: DocumentApi = {
  /** 保存文档（已注入则委托注入实现，否则使用本地 fallback） */
  async saveDocument(payload) {
    if (injectedApi) return injectedApi.saveDocument(payload)
    console.warn('[DocumentApi] 未注入，使用本地保存')
    return { submittedAt: new Date().toISOString() }
  },
  /** 设置文档状态（已注入则委托注入实现，否则使用本地状态管理） */
  async setStatus(payload) {
    if (injectedApi) return injectedApi.setStatus(payload)
    console.warn('[DocumentApi] 未注入，使用本地状态管理')
    await localSetStatus(payload)
  }
}

const DOC_LOCK_HASH_PREFIX = 'docx-editor:document:lockhash:'

/**
 * 将 ArrayBuffer 转换为十六进制字符串
 * @param buf 字节缓冲区
 * @returns 十六进制字符串
 */
const toHex = (buf: ArrayBuffer) => {
  const bytes = new Uint8Array(buf)
  let out = ''
  for (const b of bytes) out += b.toString(16).padStart(2, '0')
  return out
}

/**
 * 计算文本的 SHA-256 哈希值
 * @param text 原始文本
 * @returns 十六进制哈希字符串
 */
const sha256 = async (text: string) => {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) throw new Error('当前环境不支持密码保护')
  const data = new TextEncoder().encode(text)
  const hash = await subtle.digest('SHA-256', data)
  return toHex(hash)
}

/**
 * 生成文档锁定哈希的本地存储键
 * @param id 文档 ID
 * @returns 本地存储键名
 */
const getLockHashKey = (id: string) => `${DOC_LOCK_HASH_PREFIX}${String(id)}`

/**
 * 本地设置文档状态（锁定/解锁），通过 localStorage 保存密码哈希
 * @param payload 状态设置请求
 */
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

/**
 * 获取文档接口基地址（优先使用 setDocumentRequestConfig 配置，其次环境变量，末尾斜杠会被去除）
 * @returns 处理后的基地址字符串
 */
export const getDocumentApiBaseUrl = () => {
  const fromConfig = String(requestConfig?.baseUrl || '').trim()
  const raw = fromConfig || String((import.meta as any).env?.VITE_DOCUMENT_API_BASE_URL || (import.meta as any).env?.VITE_API_BASE_URL || '')
  return raw.trim().replace(/\/+$/, '')
}

/**
 * 后端响应包装结构
 */
type WrappedResponse<T> = {
  /** 是否成功 */
  success: boolean
  /** 业务状态码 */
  code: number
  /** 提示消息 */
  message?: string
  /** 业务数据 */
  data?: T
}

/**
 * 发起 JSON 请求并解析响应，自动附加鉴权头并处理包装响应
 * @param url 请求 URL
 * @param init fetch 初始化参数
 * @returns 解析后的业务数据
 */
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

/**
 * 解析端点模板为最终 URL，替换占位符并按需拼接基地址
 * @param template 端点模板字符串
 * @param params 占位符参数
 * @returns 解析后的完整 URL
 */
const resolveEndpointUrl = (template: string, params: Record<string, string>) => {
  const replaced = String(template || '').replace(/\{(\w+)\}/g, (_, key: string) => {
    return encodeURIComponent(String(params[key] || ''))
  })
  if (/^https?:\/\//i.test(replaced)) return replaced
  const base = getDocumentApiBaseUrl()
  if (!base) return replaced
  return `${base}${replaced.startsWith('/') ? '' : '/'}${replaced}`
}

/**
 * 获取指定端点的模板字符串，优先使用自定义配置，否则使用默认值
 * @param key 端点键名
 * @returns 端点模板字符串
 */
const getEndpointTemplate = (key: keyof DocumentRequestEndpoints) => {
  return String(requestConfig?.endpoints?.[key] || DEFAULT_ENDPOINTS[key]).trim()
}

/**
 * 创建基于 HTTP 的 DocumentApi 实现
 * @param baseUrl 接口基地址
 * @returns DocumentApi 实例
 */
export const createHttpDocumentApi = (baseUrl: string): DocumentApi => {
  const normalized = String(baseUrl || '').trim().replace(/\/+$/, '')
  /** 将路径拼接上基地址前缀 */
  const withBase = (path: string) => (normalized ? `${normalized}${path}` : path)
  return {
    /** 保存文档内容到远端 */
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
    /** 设置文档状态（委托注入的 API 或本地实现） */
    async setStatus(payload) {
      if (injectedApi) return injectedApi.setStatus(payload)
      await localSetStatus(payload)
    }
  }
}

/**
 * 创建默认 DocumentApi（基于当前配置的基地址）
 * @returns DocumentApi 实例
 */
export const createDefaultDocumentApi = (): DocumentApi => {
  return createHttpDocumentApi(getDocumentApiBaseUrl())
}

/**
 * 拉取文档内容
 * @param id 文档 ID
 * @returns 文档内容，本地文档或失败时返回 null
 */
export const fetchDocumentContent = async (id: string) => {
  const docId = String(id || '').trim()
  if (!docId || docId === 'local') return null
  const url = resolveEndpointUrl(getEndpointTemplate('documentContent'), { id: docId })
  return await requestJson<any>(url, { method: 'GET' }).catch(() => null)
}

/**
 * 拉取文档详情信息
 * @param id 文档 ID
 * @returns 文档详情，本地文档或失败时返回 null
 */
export const fetchDocumentInfo = async (id: string) => {
  const docId = String(id || '').trim()
  if (!docId || docId === 'local') return null
  const url = resolveEndpointUrl(getEndpointTemplate('documentDetail'), { id: docId })
  return await requestJson<any>(url, { method: 'GET' }).catch(() => null)
}

/**
 * 拉取文档操作记录列表
 * @param id 文档 ID
 * @param limit 最多返回的记录数（1-1000，默认 200）
 * @returns 操作记录数组，本地文档或失败时返回空数组
 */
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


// ==================== 版本历史 API ====================

/**
 * 拼接文档版本集合的接口地址
 * @param docId 文档 ID
 * @returns 版本集合接口 URL
 */
const versionApiBase = (docId: string) => {
  const base = getDocumentApiBaseUrl()
  return base
    ? `${base}/api/documents/${encodeURIComponent(docId)}/versions`
    : `/api/documents/${encodeURIComponent(docId)}/versions`
}

/**
 * 拉取文档版本列表
 * @param docId 文档 ID
 * @returns 版本数组，本地文档或失败时返回空数组
 */
export const fetchDocumentVersions = async (docId: string): Promise<any[]> => {
  const id = String(docId || '').trim()
  if (!id || id === 'local') return []
  const data = await requestJson<any>(versionApiBase(id), { method: 'GET' }).catch(() => [])
  return Array.isArray(data) ? data : []
}

/**
 * 拉取指定版本的文档内容
 * @param docId 文档 ID
 * @param versionNum 版本号
 * @returns 版本内容，本地文档或失败时返回 null
 */
export const fetchDocumentVersionContent = async (docId: string, versionNum: number): Promise<any> => {
  const id = String(docId || '').trim()
  if (!id || id === 'local') return null
  return await requestJson<any>(`${versionApiBase(id)}/${versionNum}/content`, { method: 'GET' }).catch(() => null)
}

/**
 * 创建新的文档版本快照
 * @param docId 文档 ID
 * @param name 版本名称（可选）
 * @returns 创建结果，本地文档返回 null
 */
export const createDocumentVersion = async (docId: string, name?: string): Promise<any> => {
  const id = String(docId || '').trim()
  if (!id || id === 'local') return null
  return requestJson(versionApiBase(id), {
    method: 'POST',
    body: JSON.stringify(name ? { name } : {})
  })
}

/**
 * 重命名指定版本
 * @param versionId 版本 ID
 * @param name 新版本名称
 */
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

/**
 * 恢复文档到指定版本
 * @param docId 文档 ID
 * @param versionNum 版本号
 * @returns 恢复结果，本地文档返回 null
 */
export const restoreDocumentVersion = async (docId: string, versionNum: number): Promise<any> => {
  const id = String(docId || '').trim()
  if (!id || id === 'local') return null
  return requestJson(`${versionApiBase(id)}/${versionNum}/restore`, { method: 'POST' })
}
