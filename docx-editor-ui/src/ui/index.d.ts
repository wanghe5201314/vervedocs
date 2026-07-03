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

