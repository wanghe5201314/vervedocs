/**
 * Excel 协同编辑库入口
 *
 * 统一导出 Excel 协同相关的类型、插件、绑定层与光标管理器，
 * 供外部按需引入。
 */

/** Excel 协同基础类型与状态枚举 */
export {
  type UserInfo,
  type ExcelCollaborationConfig,
  type ExcelSelection,
  type RemoteSelection,
  ConnectionState,
  SyncState,
} from './types'

/** Excel 协同插件及其配置、事件类型 */
export {
  ExcelCollaborationPlugin,
  type ExcelCollaborationPluginConfig,
  type ExcelPluginEvents,
} from './plugin'

/** Y.Doc ↔ Univer 工作簿双向绑定 */
export { UniverSyncBinding } from './binding'

/** Excel 远程选区管理器 */
export { ExcelCursorManager } from './cursor-manager'