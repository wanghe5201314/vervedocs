/**
 * 协同编辑类型定义
 * 基于 Yjs CRDT + Hocuspocus
 */

/**
 * 用户信息
 */
export interface UserInfo {
  userId: string
  userName: string
  color: string
}

/**
 * 协同会话配置
 */
export interface CollaborationConfig {
  /** Hocuspocus WebSocket 服务器地址，例如 ws://localhost:1234 */
  serverUrl: string
  /** 文档 ID（对应 Hocuspocus documentName） */
  docId: string
  /** 当前用户信息 */
  user: UserInfo
  /** 认证令牌（传给 Hocuspocus onAuthenticate）；不传则自动从 user 构造 */
  token?: string
}

/**
 * 光标位置
 */
export interface CursorPosition {
  index: number
  endIndex?: number
}

export interface SharedSyncState {
  cursor: boolean
  selection: boolean
}

/**
 * 远程用户光标
 */
export interface RemoteCursor {
  userId: string
  userName: string
  color: string
  position: CursorPosition
  lastUpdate: number
}

export interface EditorCursorMetrics {
  width: number
  height: number
  boundingBoxAscent: number
  boundingBoxDescent: number
}

export interface EditorCursorCoordinate {
  leftTop: number[]
  leftBottom: number[]
  rightTop: number[]
  rightBottom: number[]
}

export interface EditorCursorPoint {
  pageNo: number
  rowIndex: number
  rowNo: number
  ascent: number
  lineHeight: number
  metrics: Partial<EditorCursorMetrics> & Pick<EditorCursorMetrics, 'height'>
  coordinate: Partial<EditorCursorCoordinate>
}

export interface EditorCursorOptions {
  scale?: number
  cursor?: {
    width?: number
  }
}

/**
 * 编辑器接口（与 DocxEditor 兼容）
 */
export interface EditorInterface {
  command: {
    getValue(): {
      version: string
      data: { header?: unknown[]; main: unknown[]; footer?: unknown[] }
      options: unknown
    }
    executeSetValue(
      payload: { header?: unknown[]; main?: unknown[]; footer?: unknown[] },
      options?: { isSetCursor?: boolean },
    ): void
    getRange(): { startIndex: number; endIndex: number } | null
    executeSetRange(startIndex: number, endIndex: number): void
    getPositionList?(): EditorCursorPoint[]
    getOptions?(): EditorCursorOptions
  }
  listener: {
    contentChange?: () => void
    rangeStyleChange?: (rangeStyle: unknown) => void
  }
  eventBus: {
    select(event: string): {
      subscribe(callback: (...args: unknown[]) => void): { unsubscribe: () => void }
    }
    on?(event: string, callback: (...args: unknown[]) => void): void
    off?(event: string, callback: (...args: unknown[]) => void): void
  }
}

/**
 * 连接状态
 */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
}

/**
 * 同步状态
 */
export enum SyncState {
  SYNCING = 'syncing',
  SYNCED = 'synced',
}
