/**
 * 协同编辑类型定义
 * 基于 Yjs CRDT + Hocuspocus
 */

import type { UserInfo } from '@vervedoc/docx-editor-schema'

// 重新导出迁移至 schema 的跨包共享类型，保持 collaboration 包 API 兼容
export type { UserInfo, SharedSyncState, EditorInterface } from '@vervedoc/docx-editor-schema'

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
 *
 * 描述编辑器中以字符索引表示的光标位置，可选 endIndex 表示选区终点。
 */
export interface CursorPosition {
  /** 光标起始字符索引 */
  index: number
  /** 选区结束字符索引；与 index 相等或未定义时表示纯光标 */
  endIndex?: number
}

/**

 * 协同批注锚点坐标
 *
 * 描述批注在文档中基于字符坐标的锚点位置，用于定位批注引线。
 */
export interface CollaborationCommentAnchor {
  /** 锚点起始 X 坐标 */
  startX: number
  /** 锚点起始 Y 坐标 */
  startY: number
  /** 锚点结束 X 坐标 */
  endX: number
  /** 锚点结束 Y 坐标 */
  endY: number
  /** 行高（可选，用于绘制引线） */
  lineHeight?: number
}

/**
 * 协同批注渲染位置
 *
 * 描述批注卡片在页面上的绝对定位信息。
 */
export interface CollaborationCommentPosition {
  /** 顶部偏移 */
  top: number
  /** 左侧偏移 */
  left: number
  /** 引线宽度 */
  lineWidth: number
  /** 原始顶部偏移（未经过滚动调整） */
  originalTop?: number
}

/**
 * 协同批注
 *
 * 描述一条批注的内容、作者、位置及交互状态，支持嵌套回复。
 */
export interface CollaborationComment {
  /** 批注唯一标识 */
  id: string
  /** 批注分组标识（同组批注共享同一锚点） */
  groupId: string
  /** 批注正文内容 */
  content: string
  /** 批注作者名称 */
  userName: string
  /** 作者头像颜色（可选） */
  avatarColor?: string
  /** 创建时间字符串 */
  createdDate: string
  /** 批注所引用的文档文本片段 */
  rangeText: string
  /** 批注状态码（可选，业务自定义含义） */
  status?: number
  /** 嵌套回复列表 */
  replies?: CollaborationComment[]
  /** 批注卡片渲染位置 */
  position?: CollaborationCommentPosition
  /** 批注锚点坐标 */
  anchor?: CollaborationCommentAnchor
  /** 是否处于悬停态 */
  isHovered?: boolean
  /** 是否处于编辑态 */
  isEditing?: boolean
  /** 是否处于回复态 */
  isReplying?: boolean
}

/**
 * 批注组件桥接接口
 *
 * 协同插件通过该接口与外部批注 UI 组件交互，实现批注数据的读取、写入与刷新渲染。
 */
export interface CommentComponentBridge {
  /** 获取当前批注列表 */
  getComments(): CollaborationComment[]
  /** 设置批注列表（远端变更回填） */
  setComments(comments: CollaborationComment[]): void
  /** 触发批注 UI 重新渲染 */
  render(): void
}

/**
 * 远程用户光标
 */
export interface RemoteCursor {
  /** 用户唯一标识 */
  userId: string
  /** 用户展示名称 */
  userName: string
  /** 用户展示颜色 */
  color: string
  /** 光标位置 */
  position: CursorPosition
  /** 最近一次更新时间戳（毫秒） */
  lastUpdate: number
}

/**
 * 编辑器光标度量信息
 *
 * 描述光标所在字符的字形度量，用于精确绘制光标高度与基线。
 */
export interface EditorCursorMetrics {
  /** 字符宽度 */
  width: number
  /** 字符高度 */
  height: number
  /** 字形边界 ascent（基线以上距离） */
  boundingBoxAscent: number
  /** 字形边界 descent（基线以下距离） */
  boundingBoxDescent: number
}

/**
 * 编辑器光标四角坐标
 *
 * 描述光标所在字符的四角二维坐标，用于绘制选区矩形。
 */
export interface EditorCursorCoordinate {
  /** 左上角坐标 [x, y] */
  leftTop: number[]
  /** 左下角坐标 [x, y] */
  leftBottom: number[]
  /** 右上角坐标 [x, y] */
  rightTop: number[]
  /** 右下角坐标 [x, y] */
  rightBottom: number[]
}

/**
 * 编辑器光标位置点
 *
 * 描述光标在文档中的具体位置，包含页号、行号、字形度量与四角坐标。
 */
export interface EditorCursorPoint {
  /** 页号 */
  pageNo: number
  /** 行索引 */
  rowIndex: number
  /** 行号 */
  rowNo: number
  /** 基线以上距离 */
  ascent: number
  /** 行高 */
  lineHeight: number
  /** 字形度量（高度必填） */
  metrics: Partial<EditorCursorMetrics> & Pick<EditorCursorMetrics, 'height'>
  /** 四角坐标（部分字段可选） */
  coordinate: Partial<EditorCursorCoordinate>
}

/**
 * 编辑器光标渲染选项
 *
 * 控制光标绘制的缩放比例与宽度等参数。
 */
export interface EditorCursorOptions {
  /** 渲染缩放比例 */
  scale?: number
  /** 光标样式配置 */
  cursor?: {
    /** 光标宽度 */
    width?: number
  }
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
