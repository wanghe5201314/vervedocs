/**
 * 协同编辑插件（Yjs + Hocuspocus 实现）
 *
 * 外部 API 与旧 OT 版本保持一致，内部替换为：
 *  - HocuspocusProvider  → WebSocket 连接 & 文档同步
 *  - Y.Doc              → 文档状态（CRDT 自动合并冲突）
 *  - YjsBinding         → Y.Doc ↔ EditorInterface 双向绑定
 *  - AwarenessCursorManager → 远程光标同步
 */
import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'
import type {
  CollaborationConfig,
  EditorInterface,
  UserInfo,
  RemoteCursor,
  CursorPosition,
} from '../types'
import { ConnectionState, SyncState } from '../types'
import { YjsBinding } from '../binding/YjsBinding'
import {
  AwarenessCursorManager,
  type PositionCalculator,
} from '../cursor/AwarenessCursorManager'
import EventEmitter from 'eventemitter3'

function subscribeEventBus(
  eventBus: EditorInterface['eventBus'],
  event: string,
  handler: (...args: unknown[]) => void
): { unsubscribe: () => void } {
  if (typeof (eventBus as any).select === 'function') {
    return (eventBus as any).select(event).subscribe(handler)
  }
  if (typeof (eventBus as any).on === 'function') {
    ;(eventBus as any).on(event, handler)
    return {
      unsubscribe: () => {
        if (typeof (eventBus as any).off === 'function') {
          ;(eventBus as any).off(event, handler)
        }
      }
    }
  }
  return { unsubscribe: () => {} }
}

/**
 * 插件配置
 */
export interface CollaborationPluginConfig {
  collaboration: CollaborationConfig
  enableRemoteCursors?: boolean
  cursorThrottleMs?: number
}

/**
 * 插件事件
 */
export interface PluginEvents {
  connectionChange: (state: ConnectionState) => void
  syncStateChange: (state: SyncState) => void
  userJoin: (user: UserInfo) => void
  userLeave: (userId: string) => void
  usersChange: (users: UserInfo[]) => void
  error: (error: { code: string; message: string }) => void
}

/**
 * 协同编辑插件
 */
export class CollaborationPlugin {
  private editor: EditorInterface | null = null
  private config: Required<Pick<CollaborationPluginConfig, 'enableRemoteCursors' | 'cursorThrottleMs'>> & CollaborationPluginConfig

  private doc: Y.Doc | null = null
  private provider: HocuspocusProvider | null = null
  private binding: YjsBinding | null = null
  private cursorManager: AwarenessCursorManager

  private connectionState: ConnectionState = ConnectionState.DISCONNECTED
  private syncState: SyncState = SyncState.SYNCING

  /** 光标节流 */
  private cursorThrottleTimer: ReturnType<typeof setTimeout> | null = null
  /** 编辑器事件引用 */
  private rangeChangeHandler: ((rangeStyle: unknown) => void) | null = null
  private rangeChangeSubscription: { unsubscribe: () => void } | null = null

  private eventEmitter = new EventEmitter<PluginEvents>()

  /** 已知在线用户（从 Awareness 维护） */
  private onlineUsers = new Map<string, UserInfo>()

  constructor(config: CollaborationPluginConfig) {
    this.config = {
      enableRemoteCursors: true,
      cursorThrottleMs: 100,
      ...config,
    }
    this.cursorManager = new AwarenessCursorManager()
  }

  // ==================== 公开 API ====================

  install(editor: EditorInterface): void {
    this.editor = editor
  }

  uninstall(): void {
    this.disconnect()
    this.rangeChangeSubscription?.unsubscribe()
    this.rangeChangeSubscription = null
    this.rangeChangeHandler = null
    this.cursorManager.destroy()
    this.editor = null
  }

  async connect(): Promise<void> {
    if (!this.editor) throw new Error('Plugin not installed')
    if (this.provider) return // 已连接

    const { collaboration } = this.config

    // 1. 创建 Y.Doc
    this.doc = new Y.Doc()

    // 2. 构造 token
    const token =
      collaboration.token ??
      JSON.stringify({
        userId: collaboration.user.userId,
        userName: collaboration.user.userName,
        color: collaboration.user.color,
      })

    // 3. 创建 HocuspocusProvider
    this.setConnectionState(ConnectionState.CONNECTING)

    this.provider = new HocuspocusProvider({
      url: collaboration.serverUrl,
      name: collaboration.docId,
      document: this.doc,
      token,
      // 连接事件
      onConnect: () => {
        this.setConnectionState(ConnectionState.CONNECTED)
      },
      onDisconnect: () => {
        this.setConnectionState(ConnectionState.DISCONNECTED)
      },
      onSynced: ({ state }) => {
        if (state) {
          this.setSyncState(SyncState.SYNCED)
          // 同步完成后再建立双向绑定，避免绑定期间的空文档问题
          if (!this.binding && this.editor && this.doc) {
            this.binding = new YjsBinding(this.doc, this.editor)
          }
        }
      },
      onAuthenticationFailed: ({ reason }) => {
        this.emitEvent('error', { code: 'AUTH_FAILED', message: reason })
      },
    })

    // 4. Awareness 光标
    if (this.config.enableRemoteCursors) {
      this.cursorManager.bindAwareness(this.provider.awareness!, collaboration.user)
      this.setupAwarenessUserTracking()
    }

    // 5. 监听编辑器光标变化
    this.setupCursorSync()
  }

  disconnect(): void {
    if (this.binding) {
      this.binding.destroy()
      this.binding = null
    }
    if (this.cursorThrottleTimer) {
      clearTimeout(this.cursorThrottleTimer)
      this.cursorThrottleTimer = null
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

  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  getSyncState(): SyncState {
    return this.syncState
  }

  getOnlineUsers(): UserInfo[] {
    return Array.from(this.onlineUsers.values())
  }

  getRemoteCursors(): RemoteCursor[] {
    return this.cursorManager.getAllCursors()
  }

  initializeCursors(container: HTMLElement, positionCalculator: PositionCalculator): void {
    if (this.config.enableRemoteCursors) {
      this.cursorManager.initializeCursorRendering(container, positionCalculator)
    }
  }

  private _positionListDirty = true
  private _cachedPositionList: any[] | null = null

  markPositionListDirty(): void {
    this._positionListDirty = true
  }

  initializeCursorsWithEditor(container: HTMLElement): void {
    if (!this.config.enableRemoteCursors || !this.editor) return
    const editor = this.editor
    const positionCalculator: PositionCalculator = (index: number) => {
      if (this._positionListDirty || !this._cachedPositionList) {
        this._cachedPositionList = (editor.command as any).getPositionList?.() || null
        this._positionListDirty = false
      }
      if (!this._cachedPositionList || index < 0 || index >= this._cachedPositionList.length) return null
      const pos = this._cachedPositionList[index]
      if (!pos?.coordinate) return null
      const pageNo = pos.pageNo ?? 0
      const canvases = container.querySelectorAll('canvas[data-index]')
      const canvas = canvases[pageNo] as HTMLElement
      if (!canvas) return null
      const canvasRect = canvas.getBoundingClientRect()
      const areaRect = container.getBoundingClientRect()
      const x = canvasRect.left - areaRect.left + container.scrollLeft + (pos.coordinate.leftTop?.[0] || 0)
      const y = canvasRect.top - areaRect.top + container.scrollTop + (pos.coordinate.leftTop?.[1] || 0)
      const height = pos.lineHeight || 16
      return { x, y, height }
    }
    this.cursorManager.initializeCursorRendering(container, positionCalculator)
  }

  refreshCursors(): void {
    this.cursorManager.refreshAllCursors()
  }

  on<K extends keyof PluginEvents>(event: K, callback: PluginEvents[K]): () => void {
    return this.addEventListener(event, callback)
  }

  addEventListener<K extends keyof PluginEvents>(event: K, callback: PluginEvents[K]): () => void {
    this.eventEmitter.on(event, callback as any)
    return () => {
      this.eventEmitter.off(event, callback as any)
    }
  }

  // ==================== 内部 ====================

  /** 监听 Awareness 变化维护在线用户列表 */
  private setupAwarenessUserTracking(): void {
    const awareness = this.provider!.awareness!
    const localUser = this.config.collaboration.user

    // 把自己加入在线用户列表
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
        // 重建在线用户列表（保留自己）
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

  /** 编辑器光标 → Awareness */
  private setupCursorSync(): void {
    if (!this.editor) return

    this.rangeChangeHandler = () => {
      if (this.cursorThrottleTimer) return
      this.cursorThrottleTimer = setTimeout(() => {
        this.cursorThrottleTimer = null
        const range = this.editor?.command.getRange()
        if (!range) return
        const pos: CursorPosition = {
          index: range.startIndex,
          endIndex: range.startIndex !== range.endIndex ? range.endIndex : undefined,
        }
        this.cursorManager.setLocalCursor(pos)
      }, this.config.cursorThrottleMs)
    }
    this.rangeChangeSubscription = subscribeEventBus(
      this.editor.eventBus,
      'rangeStyleChange',
      this.rangeChangeHandler as any
    )
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState === state) return
    this.connectionState = state
    this.emitEvent('connectionChange', state)
  }

  private setSyncState(state: SyncState): void {
    if (this.syncState === state) return
    this.syncState = state
    this.emitEvent('syncStateChange', state)
  }

  private emitEvent<K extends keyof PluginEvents>(event: K, ...args: Parameters<PluginEvents[K]>): void {
    const callbacks = this.eventEmitter.listeners(event) as Array<(...payload: unknown[]) => void>
    callbacks.forEach((callback) => {
      try {
        callback(...args as unknown[])
      } catch (err) {
        console.error(`[CollaborationPlugin] Error in ${String(event)} handler:`, err)
      }
    })
  }
}
