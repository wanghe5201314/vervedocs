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

