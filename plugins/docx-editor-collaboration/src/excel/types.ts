/**
 * Excel 协同编辑类型定义
 *
 * 描述 Excel 协同场景下的用户信息、会话配置、选区数据以及连接/同步状态。
 */


// 重新导出迁移至 schema 的跨包共享类型，保持 excel 协同包 API 兼容
export type { UserInfo, ExcelCollaborationConfig } from '@vervedoc/docx-editor-schema'

/**
 * Excel 选区
 *
 * 描述工作表中的矩形选区，以起止行列坐标表示。
 */
export interface ExcelSelection {
  /** 工作表 ID */
  sheetId: string
  /** 起始行号 */
  startRow: number
  /** 起始列号 */
  startCol: number
  /** 结束行号 */
  endRow: number
  /** 结束列号 */
  endCol: number
}

/**
 * 远程用户选区
 *
 * 包含远程用户的身份信息与其当前选区，以及最近一次更新时间戳。
 */
export interface RemoteSelection {
  /** 用户唯一标识 */
  userId: string
  /** 用户展示名称 */
  userName: string
  /** 用户展示颜色 */
  color: string
  /** 用户当前选区 */
  selection: ExcelSelection
  /** 最近一次更新时间戳（毫秒） */
  lastUpdate: number
}

/**
 * 连接状态
 */
export enum ConnectionState {
  /** 已断开连接 */
  DISCONNECTED = 'disconnected',
  /** 正在连接 */
  CONNECTING = 'connecting',
  /** 已连接 */
  CONNECTED = 'connected',
}

/**
 * 同步状态
 */
export enum SyncState {
  /** 同步中 */
  SYNCING = 'syncing',
  /** 已同步 */
  SYNCED = 'synced',
}