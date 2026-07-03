import '../assets/fonts/material-icons/material-icons.css'
import '../style.css'
import 'prismjs/themes/prism.css'
import type { DocumentMeta } from '@/api/document.api'

export interface DocxEditorUiInitialDocument {
  meta: DocumentMeta
  url?: string
  format?: 'word' | 'canvas'
  content?: any
}

export interface CollaborationOptions {
  serverUrl: string
  docId: string
  user: { userId: string; userName: string; color: string }
  /** 认证令牌；不传则自动从 user 构造 JSON */
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

