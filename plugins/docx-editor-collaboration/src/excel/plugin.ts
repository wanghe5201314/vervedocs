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

export interface ExcelCollaborationPluginConfig {
  collaboration: ExcelCollaborationConfig
  enableRemoteSelections?: boolean
  selectionThrottleMs?: number
}

export interface ExcelPluginEvents {
  connectionChange: (state: ConnectionState) => void
  syncStateChange: (state: SyncState) => void
  userJoin: (user: UserInfo) => void
  userLeave: (userId: string) => void
  usersChange: (users: UserInfo[]) => void
  error: (error: { code: string; message: string }) => void
}

export class ExcelCollaborationPlugin {
  private univerAPI: any = null
  private config: Required<Pick<ExcelCollaborationPluginConfig, 'enableRemoteSelections' | 'selectionThrottleMs'>> & ExcelCollaborationPluginConfig

  private doc: Y.Doc | null = null
  private provider: HocuspocusProvider | null = null
  private binding: UniverSyncBinding | null = null
  private cursorManager: ExcelCursorManager
  private filterSyncManager: ExcelFilterSyncManager

  private connectionState: ConnectionState = ConnectionState.DISCONNECTED
  private syncState: SyncState = SyncState.SYNCING

  private selectionThrottleTimer: ReturnType<typeof setTimeout> | null = null
  private selectionChangeHandler: ((event: any) => void) | null = null
  private selectionContainer: HTMLElement | null = null

  private eventEmitter = new EventEmitter<ExcelPluginEvents>()
  private onlineUsers = new Map<string, UserInfo>()

  constructor(config: ExcelCollaborationPluginConfig) {
    this.config = {
      enableRemoteSelections: true,
      selectionThrottleMs: 100,
      ...config,
    }
    this.cursorManager = new ExcelCursorManager()
    this.filterSyncManager = new ExcelFilterSyncManager()
  }

  install(univerAPI: any): void {
    this.univerAPI = univerAPI
  }

  uninstall(): void {
    this.disconnect()
    this.cursorManager.destroy()
    this.univerAPI = null
  }

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

  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  getSyncState(): SyncState {
    return this.syncState
  }

  getOnlineUsers(): UserInfo[] {
    return Array.from(this.onlineUsers.values())
  }

  setSyncFilter(enabled: boolean): void {
    this.filterSyncManager.setEnabled(enabled)
  }

  setSyncSort(enabled: boolean): void {
    if (this.binding) {
      this.binding.syncSort = enabled
    }
  }

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

  initializeSelections(container: HTMLElement): void {
    this.selectionContainer = container
    if (this.config.enableRemoteSelections) {
      this.cursorManager.initializeRendering(container, this.univerAPI)
    }
  }

  forceSyncWorkbook(force = true): void {
    this.binding?.flushCurrentWorkbook(force)
  }

  on<K extends keyof ExcelPluginEvents>(event: K, callback: ExcelPluginEvents[K]): () => void {
    return this.addEventListener(event, callback)
  }

  addEventListener<K extends keyof ExcelPluginEvents>(event: K, callback: ExcelPluginEvents[K]): () => void {
    this.eventEmitter.on(event, callback as any)
    return () => {
      this.eventEmitter.off(event, callback as any)
    }
  }

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

  private emitEvent<K extends keyof ExcelPluginEvents>(event: K, ...args: Parameters<ExcelPluginEvents[K]>): void {
    const callbacks = this.eventEmitter.listeners(event) as Array<(...payload: unknown[]) => void>
    callbacks.forEach((callback) => {
      try {
        callback(...args as unknown[])
      } catch {}
    })
  }
}
