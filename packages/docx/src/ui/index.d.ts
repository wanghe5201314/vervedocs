import type { DocumentMeta } from '@/api/document.api'

export interface DocxEditorUiInitialDocument {
  meta: DocumentMeta
  /** JSON 加载地址；仅当未提供 content 时生效 */
  url?: string
  format?: 'word' | 'canvas'
  /** 文档内容；优先于 url。二者皆无则空文档 */
  content?: any
}

export interface CollaborationOptions {
  serverUrl: string
  docId: string
  user: { userId: string; userName: string; color: string }
  token?: string
}

export type DocxEditorUiExternalEventName =
  | 'ready'
  | 'metaChange'
  | 'statusChange'
  | 'modeChange'
  | 'abilityChange'
  | 'contentChange'
  | 'collabConnectionChange'
  | 'collabSyncStateChange'
  | 'collabUsersChange'
  | 'collabError'

