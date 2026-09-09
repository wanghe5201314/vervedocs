/**
 * VerveDocs Schema —— Collaboration 层跨包共享接口
 *
 * 从 docx-editor-collaboration 包迁移的跨包共享类型。
 */

/** 用户信息 */
export interface UserInfo {
  /** 用户唯一标识 */
  userId: string
  /** 用户展示名称 */
  userName: string
  /** 用户光标/选区展示颜色（通常为十六进制色值） */
  color: string
}

/** 共享同步状态 */
export interface SharedSyncState {
  /** 是否同步光标 */
  cursor: boolean
  /** 是否同步选区 */
  selection: boolean
}

/** 编辑器接口（与 DocxEditor 兼容） */
export interface EditorInterface {
  /** 编辑器命令接口 */
  command: {
    /** 获取当前文档完整值 */
    getValue(): {
      version: string
      data: { header?: unknown[]; main: unknown[]; footer?: unknown[] }
      options: unknown
    }
    /** 设置文档内容并触发渲染 */
    executeSetValue(
      payload: { header?: unknown[]; main?: unknown[]; footer?: unknown[] },
      options?: { isSetCursor?: boolean },
    ): void
    /** 获取当前选区范围 */
    getRange(): { startIndex: number; endIndex: number } | null
    /** 设置选区范围 */
    executeSetRange(startIndex: number, endIndex: number): void
    /** 获取光标位置点列表（可选） */
    getPositionList?(): unknown[]
    /** 获取编辑器渲染选项（可选） */
    getOptions?(): unknown
  }
  /** 编辑器事件监听器（状态变更事件，与 Listener 类接口对齐） */
  listener: {
    /** 内容事件命名空间 */
    content: {
      /** 内容变更回调 */
      contentListener(handler: () => void): () => void
    }
    /** 选区事件命名空间 */
    range: {
      /** 格式变更回调 */
      formatListener(handler: (style: unknown) => void): () => void
    }
  }
  /** 事件总线，支持 select 风格与传统 on/off 风格 */
  eventBus: {
    /** 订阅指定事件，返回可取消订阅的句柄 */
    select(event: string): {
      subscribe(callback: (...args: unknown[]) => void): { unsubscribe: () => void }
    }
    /** 传统事件注册（可选） */
    on?(event: string, callback: (...args: unknown[]) => void): void
    /** 传统事件取消注册（可选） */
    off?(event: string, callback: (...args: unknown[]) => void): void
  }
}

/** Excel 协同会话配置 */
export interface ExcelCollaborationConfig {
  /** Hocuspocus WebSocket 服务器地址，例如 ws://localhost:1234 */
  serverUrl: string
  /** 文档 ID（对应 Hocuspocus documentName） */
  docId: string
  /** 当前用户信息 */
  user: UserInfo
  /** 认证令牌（传给 Hocuspocus onAuthenticate）；不传则自动从 user 构造 */
  token?: string
}
