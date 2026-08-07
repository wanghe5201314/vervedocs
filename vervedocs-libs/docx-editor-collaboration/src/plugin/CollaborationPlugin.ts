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
  EditorCursorOptions,
  EditorCursorPoint,
  UserInfo,
  RemoteCursor,
  CursorPosition,
  SharedSyncState,
  CommentComponentBridge,
} from '../types'
import { ConnectionState, SyncState } from '../types'
import { YjsBinding } from '../binding/YjsBinding'
import {
  AwarenessCursorManager,
  type PositionCalculator,
  type SelectionCalculator,
  type SelectionRenderLayout,
} from '../cursor/AwarenessCursorManager'
import EventEmitter from 'eventemitter3'

const CURSOR_AGENT_OFFSET_HEIGHT = 12
const DEFAULT_CURSOR_WIDTH = 1
const DEFAULT_SELECTION_MIN_WIDTH = 4
const SHARED_SYNC_STATE_KEY = 'sharedSyncState'
const DEFAULT_SHARED_SYNC_STATE: SharedSyncState = {
  cursor: true,
  selection: true,
}

interface PageCanvasOffset {
  left: number
  top: number
}

interface SelectionLayoutDraft extends SelectionRenderLayout {
  pageNo: number
  rowNo: number
}

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
  sharedSyncStateChange: (state: SharedSyncState) => void
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
  private sharedSyncStateMap: Y.Map<boolean> | null = null
  private sharedSyncStateObserver: ((event: Y.YMapEvent<boolean>) => void) | null = null
  private sharedSyncState: SharedSyncState = { ...DEFAULT_SHARED_SYNC_STATE }
  private commentComponent: CommentComponentBridge | null = null

  private connectionState: ConnectionState = ConnectionState.DISCONNECTED
  private syncState: SyncState = SyncState.SYNCING

  /** 光标节流 */
  private cursorThrottleTimer: ReturnType<typeof setTimeout> | null = null
  /** 编辑器事件引用 */
  private rangeChangeHandler: ((rangeStyle: unknown) => void) | null = null
  private rangeChangeSubscription: { unsubscribe: () => void } | null = null
  /** Awareness 用户监听引用 */
  private awarenessUsersHandler: ((change: { added: number[]; updated: number[]; removed: number[] }) => void) | null = null
  /** 光标视图刷新引用 */
  private cursorHostContainer: HTMLElement | null = null
  private cursorHostScrollHandler: (() => void) | null = null
  private windowResizeHandler: (() => void) | null = null
  private cursorMutationObserver: MutationObserver | null = null
  private cursorResizeObserver: ResizeObserver | null = null
  private observedCanvasElements = new Set<HTMLElement>()
  private pendingCursorRefreshFrame: number | null = null
  private pendingPositionDirty = false
  private pendingCanvasRebind = false

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
    this.commentComponent = null
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
            this.binding = new YjsBinding(this.doc, this.editor, this.commentComponent)
          }
          this.ensureSharedSyncStateDefaults()
          this.binding?.bindCommentBridge(this.commentComponent)
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
    this.setupSharedSyncState()

    // 5. 监听编辑器光标变化
    this.setupCursorSync()
    this.syncLocalCursorState()
  }

  disconnect(): void {
    this.teardownAwarenessUserTracking()
    this.teardownCursorRefreshBindings()
    this.teardownSharedSyncState()
    this.cursorManager.reset()
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
    this._cachedPositionList = null
    this._positionListDirty = true
    this.applySharedSyncState(DEFAULT_SHARED_SYNC_STATE, true)
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

  getSharedSyncState(): SharedSyncState {
    return { ...this.sharedSyncState }
  }

  setSharedSyncState(patch: Partial<SharedSyncState>): void {
    const nextState = this.normalizeSharedSyncState({
      ...this.sharedSyncState,
      ...patch,
    })

    if (this.sharedSyncStateMap && this.doc) {
      this.doc.transact(() => {
        this.sharedSyncStateMap!.set('cursor', nextState.cursor)
        this.sharedSyncStateMap!.set('selection', nextState.selection)
      })
      return
    }

    this.applySharedSyncState(nextState)
  }

  bindCommentComponent(component: CommentComponentBridge | null): void {
    this.commentComponent = component
    this.binding?.bindCommentBridge(component)
  }

  syncComments(): void {
    this.binding?.syncCommentsFromBridge()
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
    const positionCalculator: PositionCalculator = (index: number) => {
      return this.calculateCursorLayout(container, index)
    }
    const selectionCalculator: SelectionCalculator = (position) => {
      return this.calculateSelectionLayouts(container, position)
    }

    this.cursorManager.initializeCursorRendering(container, positionCalculator, selectionCalculator)
    this.setupCursorRefreshBindings(container)
  }

  refreshCursors(): void {
    this.refreshRemoteCursors()
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

    this.teardownAwarenessUserTracking()

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

    this.awarenessUsersHandler = handler
    awareness.on('change', handler)
  }

  /** 编辑器光标 → Awareness */
  private setupCursorSync(): void {
    if (!this.editor || this.rangeChangeSubscription) return

    this.rangeChangeHandler = () => {
      if (this.cursorThrottleTimer) return
      this.cursorThrottleTimer = setTimeout(() => {
        this.cursorThrottleTimer = null
        this.syncLocalCursorState()
      }, this.config.cursorThrottleMs)
    }
    this.rangeChangeSubscription = subscribeEventBus(
      this.editor.eventBus,
      'rangeStyleChange',
      this.rangeChangeHandler as any
    )
  }

  private teardownAwarenessUserTracking(): void {
    if (!this.awarenessUsersHandler || !this.provider?.awareness) return
    this.provider.awareness.off('change', this.awarenessUsersHandler)
    this.awarenessUsersHandler = null
  }

  private setupSharedSyncState(): void {
    if (!this.doc) return
    this.teardownSharedSyncState()

    const sharedMap = this.doc.getMap<boolean>(SHARED_SYNC_STATE_KEY)
    this.sharedSyncStateMap = sharedMap

    const applyState = () => {
      this.applySharedSyncState(this.readSharedSyncState(sharedMap), true)
    }

    this.sharedSyncStateObserver = () => {
      applyState()
    }
    sharedMap.observe(this.sharedSyncStateObserver)
    applyState()
  }

  private teardownSharedSyncState(): void {
    if (this.sharedSyncStateMap && this.sharedSyncStateObserver) {
      this.sharedSyncStateMap.unobserve(this.sharedSyncStateObserver)
    }
    this.sharedSyncStateMap = null
    this.sharedSyncStateObserver = null
  }

  private ensureSharedSyncStateDefaults(): void {
    if (!this.sharedSyncStateMap || !this.doc) return
    this.doc.transact(() => {
      if (!this.sharedSyncStateMap!.has('cursor')) {
        this.sharedSyncStateMap!.set('cursor', DEFAULT_SHARED_SYNC_STATE.cursor)
      }
      if (!this.sharedSyncStateMap!.has('selection')) {
        this.sharedSyncStateMap!.set('selection', DEFAULT_SHARED_SYNC_STATE.selection)
      }
    })
  }

  private readSharedSyncState(map: Y.Map<boolean>): SharedSyncState {
    return this.normalizeSharedSyncState({
      cursor: map.has('cursor') ? map.get('cursor') : DEFAULT_SHARED_SYNC_STATE.cursor,
      selection: map.has('selection') ? map.get('selection') : DEFAULT_SHARED_SYNC_STATE.selection,
    })
  }

  private normalizeSharedSyncState(state?: Partial<SharedSyncState>): SharedSyncState {
    return {
      cursor: state?.cursor ?? DEFAULT_SHARED_SYNC_STATE.cursor,
      selection: state?.selection ?? DEFAULT_SHARED_SYNC_STATE.selection,
    }
  }

  private applySharedSyncState(state: SharedSyncState, forceEmit = false): void {
    const nextState = this.normalizeSharedSyncState(state)
    const changed = this.sharedSyncState.cursor !== nextState.cursor
      || this.sharedSyncState.selection !== nextState.selection

    this.sharedSyncState = nextState
    this.cursorManager.setSyncVisibility(nextState)
    this.syncLocalCursorState()
    this.refreshRemoteCursors({ markPositionDirty: true })

    if (changed || forceEmit) {
      this.emitEvent('sharedSyncStateChange', this.getSharedSyncState())
    }
  }

  private syncLocalCursorState(): void {
    if (!this.editor) return
    const range = this.editor.command.getRange()
    if (!range) {
      this.cursorManager.clearLocalCursor()
      return
    }

    if (!this.sharedSyncState.cursor && !this.sharedSyncState.selection) {
      this.cursorManager.clearLocalCursor()
      return
    }

    const pos: CursorPosition = {
      index: range.startIndex,
      endIndex: this.sharedSyncState.selection && range.startIndex !== range.endIndex
        ? range.endIndex
        : undefined,
    }
    this.cursorManager.setLocalCursor(pos)
  }

  private setupCursorRefreshBindings(container: HTMLElement): void {
    this.teardownCursorRefreshBindings()
    this.cursorHostContainer = container

    this.cursorHostScrollHandler = () => {
      this.refreshRemoteCursors()
    }
    container.addEventListener('scroll', this.cursorHostScrollHandler, { passive: true })

    this.windowResizeHandler = () => {
      this.refreshRemoteCursors({ markPositionDirty: true })
    }
    window.addEventListener('resize', this.windowResizeHandler)

    if (typeof MutationObserver !== 'undefined') {
      this.cursorMutationObserver = new MutationObserver((mutations) => {
        let needsRefresh = false
        for (const mutation of mutations) {
          if (mutation.type !== 'childList') continue
          needsRefresh = true
          break
        }
        if (needsRefresh) {
          this.refreshRemoteCursors({ markPositionDirty: true, rebindCanvases: true })
        }
      })
      this.cursorMutationObserver.observe(container, { childList: true, subtree: true })
    }

    if (typeof ResizeObserver !== 'undefined') {
      this.cursorResizeObserver = new ResizeObserver(() => {
        this.refreshRemoteCursors({ markPositionDirty: true })
      })
      this.cursorResizeObserver.observe(container)
    }

    this.refreshRemoteCursors({ markPositionDirty: true, rebindCanvases: true })
  }

  private teardownCursorRefreshBindings(): void {
    if (this.pendingCursorRefreshFrame !== null) {
      window.cancelAnimationFrame(this.pendingCursorRefreshFrame)
      this.pendingCursorRefreshFrame = null
    }
    this.pendingPositionDirty = false
    this.pendingCanvasRebind = false

    if (this.cursorHostContainer && this.cursorHostScrollHandler) {
      this.cursorHostContainer.removeEventListener('scroll', this.cursorHostScrollHandler)
    }
    this.cursorHostScrollHandler = null

    if (this.windowResizeHandler) {
      window.removeEventListener('resize', this.windowResizeHandler)
      this.windowResizeHandler = null
    }

    this.cursorMutationObserver?.disconnect()
    this.cursorMutationObserver = null

    if (this.cursorResizeObserver) {
      this.observedCanvasElements.forEach((canvas) => {
        this.cursorResizeObserver?.unobserve(canvas)
      })
      this.cursorResizeObserver.disconnect()
      this.cursorResizeObserver = null
    }

    this.observedCanvasElements.clear()
    this.cursorHostContainer = null
  }

  private refreshRemoteCursors(options: { markPositionDirty?: boolean; rebindCanvases?: boolean } = {}): void {
    const { markPositionDirty = false, rebindCanvases = false } = options
    if (markPositionDirty) {
      this.markPositionListDirty()
    }
    if (!this.config.enableRemoteCursors) return
    this.pendingPositionDirty = this.pendingPositionDirty || markPositionDirty
    this.pendingCanvasRebind = this.pendingCanvasRebind || rebindCanvases
    if (this.pendingCursorRefreshFrame !== null) return

    this.pendingCursorRefreshFrame = window.requestAnimationFrame(() => {
      this.pendingCursorRefreshFrame = null
      const shouldRebind = this.pendingCanvasRebind || this.pendingPositionDirty
      this.pendingPositionDirty = false
      this.pendingCanvasRebind = false
      if (shouldRebind) {
        this.observeCanvasElements()
      }
      this.cursorManager.refreshAllCursors()
    })
  }

  private observeCanvasElements(): void {
    if (!this.cursorResizeObserver || !this.cursorHostContainer) return

    this.observedCanvasElements.forEach((canvas) => {
      this.cursorResizeObserver?.unobserve(canvas)
    })
    this.observedCanvasElements.clear()

    const canvases = this.cursorHostContainer.querySelectorAll('canvas[data-index]')
    canvases.forEach((canvas) => {
      const element = canvas as HTMLElement
      this.observedCanvasElements.add(element)
      this.cursorResizeObserver?.observe(element)
    })
  }

  private calculateCursorLayout(container: HTMLElement, index: number): SelectionRenderLayout | null {
    const positionList = this.getPositionList()
    if (!positionList || index < 0 || index >= positionList.length) return null

    const pos = positionList[index]
    const canvasOffset = this.getCanvasOffsetMap(container).get(pos?.pageNo ?? 0)
    if (!pos?.coordinate || !canvasOffset) return null

    const options = this.getEditorOptions()
    const scale = options.scale ?? 1
    const cursorWidth = (options.cursor?.width ?? DEFAULT_CURSOR_WIDTH) * scale
    const metricsHeight = Math.max(pos.metrics?.height ?? pos.lineHeight ?? 16, 1)
    const increaseHeight = Math.min(metricsHeight / 4, CURSOR_AGENT_OFFSET_HEIGHT * scale)
    const descent = Math.max(pos.metrics?.boundingBoxDescent ?? 0, 0)
    const height = metricsHeight + increaseHeight * 2
    const x = canvasOffset.left + (pos.coordinate.rightTop?.[0] ?? pos.coordinate.leftTop?.[0] ?? 0)
    const y = canvasOffset.top + (
      (pos.coordinate.leftTop?.[1] ?? 0) + (pos.ascent ?? 0) + descent - (height - increaseHeight)
    )

    return {
      x,
      y,
      width: Math.max(cursorWidth, DEFAULT_CURSOR_WIDTH),
      height: Math.max(height, 1),
    }
  }

  private calculateSelectionLayouts(
    container: HTMLElement,
    position: CursorPosition,
  ): SelectionRenderLayout[] {
    if (position.endIndex === undefined || position.endIndex === position.index) {
      return []
    }

    const positionList = this.getPositionList()
    if (!positionList?.length) return []

    const start = Math.min(position.index, position.endIndex)
    const end = Math.max(position.index, position.endIndex)
    const canvasOffsets = this.getCanvasOffsetMap(container)
    const layouts: SelectionLayoutDraft[] = []

    for (let index = start + 1; index <= end && index < positionList.length; index++) {
      const draft = this.buildSelectionLayout(positionList, index, end, canvasOffsets)
      if (!draft) continue

      const previous = layouts[layouts.length - 1]
      if (previous && this.canMergeSelectionLayout(previous, draft)) {
        const previousRight = previous.x + previous.width
        const nextRight = draft.x + draft.width
        previous.width = Math.max(previousRight, nextRight) - previous.x
      } else {
        layouts.push(draft)
      }
    }

    return layouts.map(({ pageNo: _pageNo, rowNo: _rowNo, ...layout }) => layout)
  }

  private buildSelectionLayout(
    positionList: EditorCursorPoint[],
    index: number,
    selectionEndIndex: number,
    canvasOffsets: Map<number, PageCanvasOffset>,
  ): SelectionLayoutDraft | null {
    const point = positionList[index]
    const leftTop = point?.coordinate.leftTop
    if (!point || !leftTop) return null

    const pageNo = point.pageNo ?? 0
    const canvasOffset = canvasOffsets.get(pageNo)
    if (!canvasOffset) return null

    const top = leftTop[1]
    const right = point.coordinate.rightTop?.[0] ?? leftTop[0]
    const bottom = point.coordinate.leftBottom?.[1] ?? (
      top + Math.max(point.lineHeight ?? 0, point.metrics?.height ?? 0, 1)
    )
    let width = Math.max(right - leftTop[0], 0)
    if (width <= 0) {
      width = this.resolveSelectionWidthFallback(positionList, index, selectionEndIndex)
    }

    const height = Math.max(bottom - top, point.lineHeight ?? 0, point.metrics?.height ?? 0, 1)
    if (width <= 0 || height <= 0) return null

    return {
      x: canvasOffset.left + leftTop[0],
      y: canvasOffset.top + top,
      width,
      height,
      pageNo,
      rowNo: point.rowNo ?? -1,
    }
  }

  private resolveSelectionWidthFallback(
    positionList: EditorCursorPoint[],
    index: number,
    selectionEndIndex: number,
  ): number {
    const point = positionList[index]
    const leftTopX = point?.coordinate.leftTop?.[0]
    if (leftTopX === undefined) {
      return this.getSelectionMinWidth()
    }

    const pageNo = point.pageNo ?? 0
    const rowNo = point.rowNo ?? -1
    for (let cursor = index + 1; cursor <= selectionEndIndex && cursor < positionList.length; cursor++) {
      const nextPoint = positionList[cursor]
      if (!nextPoint) break
      if ((nextPoint.pageNo ?? 0) !== pageNo || (nextPoint.rowNo ?? -1) !== rowNo) {
        break
      }
      const nextLeftTopX = nextPoint.coordinate.leftTop?.[0]
      if (nextLeftTopX !== undefined && nextLeftTopX > leftTopX) {
        return nextLeftTopX - leftTopX
      }
    }

    return Math.max(point.metrics?.width ?? 0, this.getSelectionMinWidth())
  }

  private canMergeSelectionLayout(
    previous: SelectionLayoutDraft,
    next: SelectionLayoutDraft,
  ): boolean {
    return previous.pageNo === next.pageNo
      && previous.rowNo === next.rowNo
      && Math.abs(previous.y - next.y) <= 1
      && Math.abs(previous.height - next.height) <= 1
      && next.x <= previous.x + previous.width + 1
  }

  private getCanvasOffsetMap(container: HTMLElement): Map<number, PageCanvasOffset> {
    const areaRect = container.getBoundingClientRect()
    const offsets = new Map<number, PageCanvasOffset>()
    const canvases = container.querySelectorAll('canvas[data-index]')

    canvases.forEach((canvas, order) => {
      const element = canvas as HTMLElement
      const pageNo = Number(element.dataset.index ?? order)
      const canvasRect = element.getBoundingClientRect()
      offsets.set(pageNo, {
        left: canvasRect.left - areaRect.left + container.scrollLeft,
        top: canvasRect.top - areaRect.top + container.scrollTop,
      })
    })

    return offsets
  }

  private getSelectionMinWidth(): number {
    const options = this.getEditorOptions()
    const scale = options.scale ?? 1
    const cursorWidth = (options.cursor?.width ?? DEFAULT_CURSOR_WIDTH) * scale
    return Math.max(cursorWidth * 2, DEFAULT_SELECTION_MIN_WIDTH * scale)
  }

  private getPositionList(): EditorCursorPoint[] | null {
    if (!this.editor) return null
    if (this._positionListDirty || !this._cachedPositionList) {
      this._cachedPositionList = this.editor.command.getPositionList?.() || null
      this._positionListDirty = false
    }
    return this._cachedPositionList
  }

  private getEditorOptions(): EditorCursorOptions {
    if (!this.editor) return {}
    return this.editor.command.getOptions?.() || {}
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
