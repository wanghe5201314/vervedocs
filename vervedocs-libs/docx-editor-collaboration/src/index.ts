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
