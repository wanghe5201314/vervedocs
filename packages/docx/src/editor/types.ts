import type { DocumentMeta } from '@/api/document.api'

/**
 * docx-editor UI 初始文档数据
 */
export interface DocxEditorUiInitialDocument {
  /** 文档元数据 */
  meta: DocumentMeta
  /** JSON 加载地址；仅当未提供 content 时生效 */
  url?: string
  /** 文档格式：word 或 canvas */
  format?: 'word' | 'canvas'
  /** 文档内容；优先于 url。二者皆无则空文档 */
  content?: any
}

/** JSON 文档 URL 导入选项。 */
export interface ImportJsonFromUrlOptions {
  /** 返回文档 JSON 的 URL。 */
  url: string
  /** 可选请求头，适用于需要鉴权的文档服务。 */
  headers?: NonNullable<Parameters<typeof fetch>[1]>['headers']
  /** 用于取消尚未完成的网络请求。 */
  signal?: NonNullable<Parameters<typeof fetch>[1]>['signal']
  /** 导入阶段进度，progress 范围为 0-100。 */
  onProgress?: (progress: number, status: string) => void
  /**
   * 兼容旧版回调；新代码优先使用 Promise 返回的结果。
   * @deprecated 请检查 importJsonFromUrl() 的返回结果。
   */
  onComplete?: (success: boolean, message?: string) => void
}

/** JSON 文档导入失败原因。 */
export type ImportJsonFromUrlErrorCode =
  | 'INVALID_URL'
  | 'REQUEST_FAILED'
  | 'ABORTED'
  | 'HTTP_ERROR'
  | 'INVALID_JSON'
  | 'INVALID_DATA'
  | 'EDITOR_NOT_READY'
  | 'IMPORT_FAILED'

/** JSON 文档导入结果。 */
export type ImportJsonFromUrlResult =
  | { success: true; elementCount: number }
  | {
      success: false
      error: {
        code: ImportJsonFromUrlErrorCode
        message: string
        status?: number
      }
    }

/** DOCX 导出失败原因。 */
export type ExportDocxErrorCode =
  | 'BUSY'
  | 'CALLBACK_MISSING'
  | 'EDITOR_NOT_READY'
  | 'EXPORT_FAILED'

/** DOCX 导出选项。 */
export interface ExportDocxOptions {
  /** 下载文件名，可省略 .docx 扩展名；未传时使用当前文档名。 */
  fileName?: string
}

/** 触发后端/宿主 DOCX 导出并下载的结果。 */
export type ExportDocxResult =
  | { success: true; fileName: string }
  | {
      success: false
      error: {
        code: ExportDocxErrorCode
        message: string
      }
    }

/**
 * 多人协作配置
 */
export interface CollaborationOptions {
  /** 协作服务器地址 */
  serverUrl: string
  /** 文档唯一标识 */
  docId: string
  /** 协作用户信息 */
  user: { userId: string; userName: string; color: string }
  /** 协作鉴权令牌 */
  token?: string
}

/**
 * docx-editor UI 对外暴露的事件名称类型
 */
export type DocxEditorUiExternalEventName =
  | 'ready'
  | 'metaChange'
  | 'statusChange'
  | 'modeChange'
  | 'abilityChange'
  | 'contentChange'
  | 'collabConnectionChange'
  | 'collabSyncStateChange'
  | 'collabSharedSyncStateChange'
  | 'collabUsersChange'
  | 'collabError'
