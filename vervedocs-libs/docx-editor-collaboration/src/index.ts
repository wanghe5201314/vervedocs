/**
 * DocxEditor 协同编辑库
 * 基于 Yjs CRDT + Hocuspocus 实现实时协作
 *
 * @packageDocumentation
 */

// ==================== 类型 ====================
export {
  type UserInfo,
  type CollaborationConfig,
  type CursorPosition,
  type RemoteCursor,
  type SharedSyncState,
  type CollaborationComment,
  type CommentComponentBridge,
  type EditorInterface,
  ConnectionState,
  SyncState,
} from './types'

// ==================== 协同插件 ====================
export {
  CollaborationPlugin,
  type CollaborationPluginConfig,
  type PluginEvents,
} from './plugin/CollaborationPlugin'

// ==================== 光标管理 ====================
export {
  AwarenessCursorManager,
  type CursorRenderConfig,
  type PositionCalculator,
} from './cursor/AwarenessCursorManager'

// ==================== 绑定层 ====================
export { YjsBinding } from './binding/YjsBinding'

// ==================== Excel 协同 ====================
export {
  type ExcelCollaborationConfig,
  type ExcelSelection,
  type RemoteSelection,
} from './excel/types'

export {
  ExcelCollaborationPlugin,
  type ExcelCollaborationPluginConfig,
  type ExcelPluginEvents,
} from './excel/ExcelCollaborationPlugin'

export { UniverSyncBinding } from './excel/UniverSyncBinding'
export { ExcelCursorManager } from './excel/ExcelCursorManager'
