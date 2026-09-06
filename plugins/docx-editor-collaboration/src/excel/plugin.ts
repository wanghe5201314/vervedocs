import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'
import EventEmitter from 'eventemitter3'
import type {
  ExcelCollaborationConfig,
  UserInfo,
  ExcelSelection,
} from './types'
import { ConnectionState, SyncState } from './types'
import { UniverSyncBinding } from './binding'
import { ExcelCursorManager } from './cursor-manager'
import { ExcelFilterSyncManager } from './filter-sync-manager'

/**
 * Excel 协同插件配置
 *
 * 在 Excel 协同会话配置基础上扩展远程选区与节流参数。
 */
export interface ExcelCollaborationPluginConfig {
  /** Excel 协同会话配置 */
  collaboration: ExcelCollaborationConfig
  /** 是否启用远程选区同步，默认 true */
  enableRemoteSelections?: boolean
  /** 选区同步节流时间（毫秒），默认 100 */
  selectionThrottleMs?: number
}

/**
 * Excel 协同插件事件
 *
 * 描述插件对外暴露的连接、同步、用户变更与错误事件回调签名。
 */
export interface ExcelPluginEvents {
  /** 连接状态变更 */
  connectionChange: (state: ConnectionState) => void
  /** 同步状态变更 */
  syncStateChange: (state: SyncState) => void
  /** 用户加入 */
  userJoin: (user: UserInfo) => void
  /** 用户离开 */
  userLeave: (userId: string) => void
  /** 在线用户列表变更 */
  usersChange: (users: UserInfo[]) => void
  /** 错误事件 */
  error: (error: { code: string; message: string }) => void
}

/**
 * Excel 协同编辑插件
 *
 * 基于 Yjs + Hocuspocus 实现 Univer 工作簿的实时协同，
 * 集成工作簿同步、远程选区、筛选同步与在线用户管理。
 */
export class ExcelCollaborationPlugin {
  /** Univer API 实例 */
  private univerAPI: any = null
  /** 插件配置（已合并默认值） */
  private config: Required<Pick<ExcelCollaborationPluginConfig, 'enableRemoteSelections' | 'selectionThrottleMs'>> & ExcelCollaborationPluginConfig

  /** Yjs 文档实例 */
  private doc: Y.Doc | null = null
  /** HocuspocusProvider 实例 */
  private provider: HocuspocusProvider | null = null
  /** 工作簿同步绑定器 */
  private binding: UniverSyncBinding | null = null
  /** 远程选区管理器 */
  private cursorManager: ExcelCursorManager
  /** 筛选同步管理器 */
  private filterSyncManager: ExcelFilterSyncManager

  /** 当前连接状态 */
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED
  /** 当前同步状态 */
  private syncState: SyncState = SyncState.SYNCING

  /** 选区同步节流定时器句柄 */
  private selectionThrottleTimer: ReturnType<typeof setTimeout> | null = null
  /** 选区变更事件回调引用 */
  private selectionChangeHandler: ((event: any) => void) | null = null
  /** 选区渲染容器 */
  private selectionContainer: HTMLElement | null = null

  /** 内部事件发射器 */
  private eventEmitter = new EventEmitter<ExcelPluginEvents>()
  /** 已知在线用户（从 Awareness 维护） */
  private onlineUsers = new Map<string, UserInfo>()

  /**
   * 构造 Excel 协同插件
   *
   * @param config 插件配置
   */
  constructor(config: ExcelCollaborationPluginConfig) {
    this.config = {
      enableRemoteSelections: true,
      selectionThrottleMs: 100,
      ...config,
    }
    this.cursorManager = new ExcelCursorManager()
    this.filterSyncManager = new ExcelFilterSyncManager()
  }

  /**
   * 安装插件，注入 Univer API
   *
   * @param univerAPI Univer API 实例
   */
  install(univerAPI: any): void {
    this.univerAPI = univerAPI
  }

  /**
   * 卸载插件，断开连接并销毁管理器
   */
  uninstall(): void {
    this.disconnect()
    this.cursorManager.destroy()
    this.univerAPI = null
  }

  /**
   * 连接协同服务并建立同步
   *
   * 创建 Y.Doc 与 HocuspocusProvider，绑定工作簿、选区与筛选同步。
   *
   * @returns 连接完成的 Promise
   */
  async connect(): Promise<void> {
    if (!this.univerAPI) throw new Error('Plugin not installed')
    if (this.provider) return

    const { collaboration } = this.config

    this.doc = new Y.Doc()

    const token =
      collaboration.token ??
      JSON.stringify({
        userId: collaboration.user.userId,
        userName: collaboration.user.userName,
        color: collaboration.user.color,
      })

    this.setConnectionState(ConnectionState.CONNECTING)

    const docName = UniverSyncBinding.getDocName(collaboration.docId)

    this.provider = new HocuspocusProvider({
      url: collaboration.serverUrl,
      name: docName,
      document: this.doc,
      token,
      onConnect: () => {
        this.setConnectionState(ConnectionState.CONNECTED)
      },
      onDisconnect: () => {
        this.setConnectionState(ConnectionState.DISCONNECTED)
      },
      onSynced: ({ state }) => {
        if (state) {
          this.setSyncState(SyncState.SYNCED)
          if (!this.binding && this.univerAPI && this.doc) {
            this.binding = new UniverSyncBinding(this.doc, this.univerAPI)
          }
        }
      },
      onAuthenticationFailed: ({ reason }) => {
        this.emitEvent('error', { code: 'AUTH_FAILED', message: reason })
      },
    })

    if (this.config.enableRemoteSelections) {
      this.cursorManager.bindAwareness(this.provider.awareness!, collaboration.user)
      this.setupAwarenessUserTracking()
    }

    this.filterSyncManager.bindAwareness(this.provider.awareness!, this.univerAPI)

    this.setupSelectionSync()
  }

  /**
   * 断开协同连接并清理资源
   */
  disconnect(): void {
    if (this.binding) {
      this.binding.destroy()
      this.binding = null
    }
    this.filterSyncManager.destroy()
    if (this.selectionThrottleTimer) {
      clearTimeout(this.selectionThrottleTimer)
      this.selectionThrottleTimer = null
    }
    if (this.provider) {
      this.provider.destroy()
      this.provider = null
    }
    if (this.doc) {
      this.doc.destroy()
      this.doc = null
    }
    this.onlineUsers.clear()
    this.setConnectionState(ConnectionState.DISCONNECTED)
  }

  /**
   * 获取当前连接状态
   *
   * @returns 连接状态
   */
  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  /**
   * 获取当前同步状态
   *
   * @returns 同步状态
   */
  getSyncState(): SyncState {
    return this.syncState
  }

  /**
   * 获取在线用户列表
   *
   * @returns 在线用户数组
   */
  getOnlineUsers(): UserInfo[] {
    return Array.from(this.onlineUsers.values())
  }

  /**
   * 启用或禁用筛选同步
   *
   * @param enabled 是否启用
   */
  setSyncFilter(enabled: boolean): void {
    this.filterSyncManager.setEnabled(enabled)
  }

  /**
   * 启用或禁用排序同步
   *
   * @param enabled 是否启用
   */
  setSyncSort(enabled: boolean): void {
    if (this.binding) {
      this.binding.syncSort = enabled
    }
  }

  /**
   * 启用或禁用远程选区同步
   *
   * 启用时绑定 Awareness 与渲染容器；禁用时清除本地选区并销毁选区管理器。
   *
   * @param enabled 是否启用
   */
  setSyncSelection(enabled: boolean): void {
    this.config.enableRemoteSelections = enabled

    if (enabled) {
      if (this.provider?.awareness) {
        this.cursorManager.bindAwareness(this.provider.awareness, this.config.collaboration.user)
      }
      if (this.selectionContainer) {
        this.cursorManager.initializeRendering(this.selectionContainer, this.univerAPI)
      }
    } else {
      if (this.provider?.awareness) {
        this.provider.awareness.setLocalStateField('selection', null)
      }
      this.cursorManager.destroy()
    }
  }

  /**
   * 初始化选区渲染容器
   *
   * @param container 选区渲染容器
   */
  initializeSelections(container: HTMLElement): void {
    this.selectionContainer = container
    if (this.config.enableRemoteSelections) {
      this.cursorManager.initializeRendering(container, this.univerAPI)
    }
  }

  /**
   * 主动将当前工作簿推送到 Y.Doc
   *
   * @param force 是否强制推送
   */
  forceSyncWorkbook(force = true): void {
    this.binding?.flushCurrentWorkbook(force)
  }

  /**
   * 订阅插件事件（on 别名）
   *
   * @param event 事件名
   * @param callback 事件回调
   * @returns 取消订阅函数
   */
  on<K extends keyof ExcelPluginEvents>(event: K, callback: ExcelPluginEvents[K]): () => void {
    return this.addEventListener(event, callback)
  }

  /**
   * 订阅插件事件
   *
   * @param event 事件名
   * @param callback 事件回调
   * @returns 取消订阅函数
   */
  addEventListener<K extends keyof ExcelPluginEvents>(event: K, callback: ExcelPluginEvents[K]): () => void {
    this.eventEmitter.on(event, callback as any)
    return () => {
      this.eventEmitter.off(event, callback as any)
    }
  }

  /**
   * 监听 Awareness 变化维护在线用户列表
   */
  private setupAwarenessUserTracking(): void {
    const awareness = this.provider!.awareness!
    const localUser = this.config.collaboration.user

    this.onlineUsers.set(localUser.userId, localUser)
    this.emitEvent('usersChange', this.getOnlineUsers())

    const handler = ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
      let changed = false

      for (const clientId of [...added, ...updated]) {
        if (clientId === awareness.clientID) continue
        const state = awareness.getStates().get(clientId)
        const user = state?.user as UserInfo | undefined
        if (user?.userId && !this.onlineUsers.has(user.userId)) {
          this.onlineUsers.set(user.userId, user)
          this.emitEvent('userJoin', user)
          changed = true
        }
      }

      if (removed.length > 0) {
        const activeIds = new Set<string>()
        activeIds.add(localUser.userId)
        awareness.getStates().forEach((state, cid) => {
          if (cid === awareness.clientID) return
          const u = state.user as UserInfo | undefined
          if (u?.userId) activeIds.add(u.userId)
        })
        this.onlineUsers.forEach((_, uid) => {
          if (!activeIds.has(uid)) {
            this.onlineUsers.delete(uid)
            this.emitEvent('userLeave', uid)
            changed = true
          }
        })
      }

      if (changed) {
        this.emitEvent('usersChange', this.getOnlineUsers())
      }
    }
    awareness.on('change', handler)
  }

  /**
   * 监听 Univer 选区变更事件并节流同步到 Awareness
   */
  private setupSelectionSync(): void {
    if (!this.univerAPI) return

    this.selectionChangeHandler = () => {
      if (!this.config.enableRemoteSelections) return
      if (this.selectionThrottleTimer) return
      this.selectionThrottleTimer = setTimeout(() => {
        this.selectionThrottleTimer = null
        const workbook = this.univerAPI?.getActiveWorkbook()
        if (!workbook) return
        const sheet = workbook.getActiveSheet()
        if (!sheet) return
        const range = sheet.getActiveRange()
        if (!range) return
        const r = range.getRange()
        if (!r) return

        const selection: ExcelSelection = {
          sheetId: sheet.getSheetId(),
          startRow: r.startRow,
          startCol: r.startColumn,
          endRow: r.endRow,
          endCol: r.endColumn,
        }
        this.cursorManager.setLocalSelection(selection)
      }, this.config.selectionThrottleMs)
    }
    this.univerAPI.addEvent(this.univerAPI.Event.SelectionChanged, this.selectionChangeHandler)
  }

  /**
   * 更新连接状态并广播事件
   *
   * @param state 新的连接状态
   */
  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState === state) return
    this.connectionState = state
    this.emitEvent('connectionChange', state)
  }

  /**
   * 更新同步状态并广播事件
   *
   * @param state 新的同步状态
   */
  private setSyncState(state: SyncState): void {
    if (this.syncState === state) return
    this.syncState = state
    this.emitEvent('syncStateChange', state)
  }

  /**
   * 触发指定插件事件，捕获并忽略回调异常
   *
   * @param event 事件名
   * @param args 事件参数
   */
  private emitEvent<K extends keyof ExcelPluginEvents>(event: K, ...args: Parameters<ExcelPluginEvents[K]>): void {
    const callbacks = this.eventEmitter.listeners(event) as Array<(...payload: unknown[]) => void>
    callbacks.forEach((callback) => {
      try {
        callback(...args as unknown[])
      } catch {}
    })
  }
}
