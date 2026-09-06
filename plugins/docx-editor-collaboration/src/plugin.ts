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
} from './types'
import { ConnectionState, SyncState } from './types'
import { YjsBinding } from './binding'
import {
  AwarenessCursorManager,
  type PositionCalculator,
  type SelectionCalculator,
  type SelectionRenderLayout,
} from './cursor-manager'
import EventEmitter from 'eventemitter3'
import { subscribeEventBus } from './event-bus'

/** 光标代理相对字符高度的额外偏移量 */
const CURSOR_AGENT_OFFSET_HEIGHT = 12
/** 默认光标宽度 */
const DEFAULT_CURSOR_WIDTH = 1
/** 默认选区最小宽度 */
const DEFAULT_SELECTION_MIN_WIDTH = 4

/** 默认共享同步状态：光标与选区均同步 */
const DEFAULT_SHARED_SYNC_STATE: SharedSyncState = {
  cursor: true,
  selection: true,
}

/**
 * 页面画布偏移量
 *
 * 描述某一页 canvas 相对渲染容器的左上角偏移。
 */
interface PageCanvasOffset {
  /** 水平偏移 */
  left: number
  /** 垂直偏移 */
  top: number
}

/**
 * 选区布局草稿
 *
 * 在 SelectionRenderLayout 基础上附加页号与行号，用于跨行选区合并判断。
 */
interface SelectionLayoutDraft extends SelectionRenderLayout {
  /** 页号 */
  pageNo: number
  /** 行号 */
  rowNo: number
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
  /** 编辑器接口实例 */
  private editor: EditorInterface | null = null
  /** 插件配置（已合并默认值） */
  private config: Required<Pick<CollaborationPluginConfig, 'enableRemoteCursors' | 'cursorThrottleMs'>> & CollaborationPluginConfig

  /** Yjs 文档实例 */
  private doc: Y.Doc | null = null
  /** HocuspocusProvider 实例 */
  private provider: HocuspocusProvider | null = null
  /** Yjs 与编辑器双向绑定器 */
  private binding: YjsBinding | null = null
  /** 远程光标管理器 */
  private cursorManager: AwarenessCursorManager

  /** 当前共享同步状态（光标/选区开关） */
  private sharedSyncState: SharedSyncState = { ...DEFAULT_SHARED_SYNC_STATE }
  /** 批注组件桥接层 */
  private commentComponent: CommentComponentBridge | null = null

  /** 当前连接状态 */
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED
  /** 当前同步状态 */
  private syncState: SyncState = SyncState.SYNCING

  /** 光标节流定时器句柄 */
  private cursorThrottleTimer: ReturnType<typeof setTimeout> | null = null
  /** 编辑器选区变更回调引用 */
  private rangeChangeHandler: ((rangeStyle: unknown) => void) | null = null
  /** 编辑器选区变更订阅句柄 */
  private rangeChangeSubscription: { unsubscribe: () => void } | null = null
  /** Awareness 用户监听引用 */
  private awarenessUsersHandler: ((change: { added: number[]; updated: number[]; removed: number[] }) => void) | null = null
  /** 光标视图刷新引用 */
  private cursorHostContainer: HTMLElement | null = null
  /** 光标宿主滚动回调引用 */
  private cursorHostScrollHandler: (() => void) | null = null
  /** 窗口尺寸变更回调引用 */
  private windowResizeHandler: (() => void) | null = null
  /** 光标宿主 DOM 变更观察器 */
  private cursorMutationObserver: MutationObserver | null = null
  /** 光标宿主尺寸观察器 */
  private cursorResizeObserver: ResizeObserver | null = null
  /** 已观察的 canvas 元素集合 */
  private observedCanvasElements = new Set<HTMLElement>()
  /** 待刷新光标的 requestAnimationFrame 句柄 */
  private pendingCursorRefreshFrame: number | null = null
  /** 是否有待处理的位置脏标记 */
  private pendingPositionDirty = false
  /** 是否有待处理的 canvas 重新绑定 */
  private pendingCanvasRebind = false

  /** 内部事件发射器 */
  private eventEmitter = new EventEmitter<PluginEvents>()

  /** 已知在线用户（从 Awareness 维护） */
  private onlineUsers = new Map<string, UserInfo>()

  /**
   * 构造协同编辑插件
   *
   * @param config 插件配置
   */
  constructor(config: CollaborationPluginConfig) {
    this.config = {
      enableRemoteCursors: true,
      cursorThrottleMs: 100,
      ...config,
    }
    this.cursorManager = new AwarenessCursorManager()
  }

  // ==================== 公开 API ====================

  /**
   * 安装插件，注入编辑器实例
   *
   * @param editor 编辑器接口实例
   */
  install(editor: EditorInterface): void {
    this.editor = editor
  }

  /**
   * 卸载插件，断开连接并清理资源
   */
  uninstall(): void {
    this.disconnect()
    this.rangeChangeSubscription?.unsubscribe()
    this.rangeChangeSubscription = null
    this.rangeChangeHandler = null
    this.cursorManager.destroy()
    this.commentComponent = null
    this.editor = null
  }

  /**
   * 连接协同服务并建立同步
   *
   * 创建 Y.Doc 与 HocuspocusProvider，同步完成后建立 YjsBinding 双向绑定，
   * 并启动 Awareness 光标与用户追踪。
   *
   * @returns 连接完成的 Promise
   */
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


    // 5. 监听编辑器光标变化
    this.setupCursorSync()
    this.syncLocalCursorState()
  }

  /**
   * 断开协同连接并清理资源
   */
  disconnect(): void {
    this.teardownAwarenessUserTracking()
    this.teardownCursorRefreshBindings()

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
    this.cachedPositionList = null
    this.positionListDirty = true
    this.applySharedSyncState(DEFAULT_SHARED_SYNC_STATE, true)
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
   * 获取所有远程光标
   *
   * @returns 远程光标数组
   */
  getRemoteCursors(): RemoteCursor[] {
    return this.cursorManager.getAllCursors()
  }

  /**
   * 获取共享同步状态副本
   *
   * @returns 共享同步状态
   */
  getSharedSyncState(): SharedSyncState {
    return { ...this.sharedSyncState }
  }

  /**
   * 更新共享同步状态（光标/选区开关）
   *
   * @param patch 状态补丁
   */
  setSharedSyncState(patch: Partial<SharedSyncState>): void {
    const nextState = this.normalizeSharedSyncState({
      ...this.sharedSyncState,
      ...patch,
    })

    this.applySharedSyncState(nextState)
  }

  /**
   * 绑定批注组件桥接层
   *
   * @param component 批注组件桥接层（可为 null 表示解绑）
   */
  bindCommentComponent(component: CommentComponentBridge | null): void {
    this.commentComponent = component
    this.binding?.bindCommentBridge(component)
  }

  /**
   * 主动从桥接层同步批注到 Y.Doc
   */
  syncComments(): void {
    this.binding?.syncCommentsFromBridge()
  }

  /**
   * 初始化远程光标渲染
   *
   * @param container 光标渲染容器
   * @param positionCalculator 位置计算函数
   */
  initializeCursors(container: HTMLElement, positionCalculator: PositionCalculator): void {
    if (this.config.enableRemoteCursors) {
      this.cursorManager.initializeCursorRendering(container, positionCalculator)
    }
  }

  /** 位置列表是否已变更待重新读取 */
  private positionListDirty = true
  /** 缓存的位置列表 */
  private cachedPositionList: EditorCursorPoint[] | null = null

  /**
   * 标记位置列表为脏，下次获取时重新读取
   */
  markPositionListDirty(): void {
    this.positionListDirty = true
  }

  /**
   * 基于编辑器初始化远程光标渲染
   *
   * 自动构造位置与选区计算函数，并绑定光标刷新监听。
   *
   * @param container 光标渲染容器
   */
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

  /**
   * 刷新远程光标渲染
   */
  refreshCursors(): void {
    this.refreshRemoteCursors()
  }

  /**
   * 订阅插件事件（on 别名）
   *
   * @param event 事件名
   * @param callback 事件回调
   * @returns 取消订阅函数
   */
  on<K extends keyof PluginEvents>(event: K, callback: PluginEvents[K]): () => void {
    return this.addEventListener(event, callback)
  }

  /**
   * 订阅插件事件
   *
   * @param event 事件名
   * @param callback 事件回调
   * @returns 取消订阅函数
   */
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

  /**
   * 解除 Awareness 用户变更监听
   */
  private teardownAwarenessUserTracking(): void {
    if (!this.awarenessUsersHandler || !this.provider?.awareness) return
    this.provider.awareness.off('change', this.awarenessUsersHandler)
    this.awarenessUsersHandler = null
  }


  /**
   * 规范化共享同步状态，补全缺省字段
   *
   * @param state 原始状态补丁
   * @returns 完整的共享同步状态
   */
  private normalizeSharedSyncState(state?: Partial<SharedSyncState>): SharedSyncState {
    return {
      cursor: state?.cursor ?? DEFAULT_SHARED_SYNC_STATE.cursor,
      selection: state?.selection ?? DEFAULT_SHARED_SYNC_STATE.selection,
    }
  }

  /**
   * 应用新的共享同步状态并刷新光标
   *
   * @param state 新状态
   * @param forceEmit 是否强制广播事件（即使状态未变）
   */
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

  /**
   * 读取编辑器当前选区并同步到 Awareness
   *
   * 根据共享同步状态决定是否携带选区终点。
   */
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

  /**
   * 绑定光标刷新所需的滚动、尺寸与 DOM 变更监听
   *
   * @param container 光标宿主容器
   */
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

  /**
   * 解除光标刷新相关的所有监听与观察器
   */
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

  /**
   * 刷新远程光标，合并多次请求到单次 requestAnimationFrame
   *
   * @param options 刷新选项
   * @param options.markPositionDirty 是否标记位置列表为脏
   * @param options.rebindCanvases 是否需要重新绑定 canvas 观察
   */
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

  /**
   * 重新观察容器内所有 canvas 元素，用于跟随分页变化
   */
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

  /**
   * 计算指定字符索引处的光标渲染布局
   *
   * @param container 光标渲染容器
   * @param index 字符索引
   * @returns 光标布局，无法计算时返回 null
   */
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

  /**
   * 计算选区跨行渲染布局列表
   *
   * @param container 光标渲染容器
   * @param position 光标位置（含选区终点）
   * @returns 选区布局列表，同行相邻布局会合并
   */
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

  /**
   * 构建单个字符索引处的选区布局草稿
   *
   * @param positionList 位置点列表
   * @param index 当前字符索引
   * @param selectionEndIndex 选区结束索引
   * @param canvasOffsets 各页 canvas 偏移映射
   * @returns 选区布局草稿，无法构建时返回 null
   */
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

  /**
   * 选区宽度回退计算
   *
   * 当字符自身宽度为 0 时，向右扫描同页同行的下一个字符作为右边界，
   * 仍无法确定时使用字形宽度或最小选区宽度。
   *
   * @param positionList 位置点列表
   * @param index 当前字符索引
   * @param selectionEndIndex 选区结束索引
   * @returns 回退宽度
   */
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

  /**
   * 判断两个选区布局草稿是否可合并
   *
   * 同页同行且 y/height 相近、x 相邻时返回 true。
   *
   * @param previous 前一个布局
   * @param next 后一个布局
   * @returns 是否可合并
   */
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

  /**
   * 获取容器内各页 canvas 的偏移映射
   *
   * @param container 光标渲染容器
   * @returns 页号到 canvas 偏移的映射
   */
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

  /**
   * 获取选区最小宽度（受缩放与光标宽度影响）
   *
   * @returns 选区最小宽度
   */
  private getSelectionMinWidth(): number {
    const options = this.getEditorOptions()
    const scale = options.scale ?? 1
    const cursorWidth = (options.cursor?.width ?? DEFAULT_CURSOR_WIDTH) * scale
    return Math.max(cursorWidth * 2, DEFAULT_SELECTION_MIN_WIDTH * scale)
  }

  /**
   * 获取编辑器位置点列表，按需刷新缓存
   *
   * @returns 位置点列表，编辑器未安装时返回 null
   */
  private getPositionList(): EditorCursorPoint[] | null {
    if (!this.editor) return null
    if (this.positionListDirty || !this.cachedPositionList) {
      this.cachedPositionList = (this.editor.command.getPositionList?.() as EditorCursorPoint[] | undefined) || null
      this.positionListDirty = false
    }
    return this.cachedPositionList
  }

  /**
   * 获取编辑器渲染选项
   *
   * @returns 渲染选项，编辑器未安装时返回空对象
   */
  private getEditorOptions(): EditorCursorOptions {
    if (!this.editor) return {}
    return (this.editor.command.getOptions?.() as EditorCursorOptions | undefined) || {}
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
   * 触发指定插件事件，捕获并打印回调异常
   *
   * @param event 事件名
   * @param args 事件参数
   */
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
