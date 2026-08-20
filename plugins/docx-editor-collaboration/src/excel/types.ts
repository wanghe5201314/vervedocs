export interface UserInfo {
  userId: string
  userName: string
  color: string
}

export interface ExcelCollaborationConfig {
  serverUrl: string
  docId: string
  user: UserInfo
  token?: string
}

export interface ExcelSelection {
  sheetId: string
  startRow: number
  startCol: number
  endRow: number
  endCol: number
}

export interface RemoteSelection {
  userId: string
  userName: string
  color: string
  selection: ExcelSelection
  lastUpdate: number
}

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
}

export enum SyncState {
  SYNCING = 'syncing',
  SYNCED = 'synced',
}