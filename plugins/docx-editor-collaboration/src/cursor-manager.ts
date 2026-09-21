import type { Awareness } from 'y-protocols/awareness'
import type { CursorPosition, RemoteCursor, UserInfo } from './types'

/**
 * 光标渲染配置
 *
 * 控制远程光标的标签显示、闪烁与过期清理等行为。
 */
export interface CursorRenderConfig {
  /** 是否显示用户名标签 */
  showLabel: boolean
  /** 标签显示时长（毫秒），0 表示常驻 */
  labelDuration: number
  /** 是否启用光标闪烁动画 */
  enableBlink: boolean
  /** 光标过期时间（毫秒），超时后自动清理 */
  expireTime: number
}

/** 默认光标渲染配置 */
const DEFAULT_CONFIG: CursorRenderConfig = {
  showLabel: true,
  labelDuration: 0,
  enableBlink: true,
  expireTime: 30000,
}

/**
 * 光标/选区渲染布局
 *
 * 描述光标或选区矩形在容器中的绝对位置与尺寸。
 */
export interface CursorRenderLayout {
  /** 左上角 X 坐标 */
  x: number
  /** 左上角 Y 坐标 */
  y: number
  /** 宽度 */
  width: number
  /** 高度 */
  height: number
}

/** 选区渲染布局，与光标布局同形 */
export type SelectionRenderLayout = CursorRenderLayout

/**
 * 位置计算函数
 *
 * 根据字符索引返回对应光标的渲染布局，无法计算时返回 null。
 */
export type PositionCalculator = (
  index: number,
) => CursorRenderLayout | null

/**
 * 选区计算函数
 *
 * 根据光标位置返回选区矩形布局列表（跨行时可能返回多个）。
 */
export type SelectionCalculator = (
  position: CursorPosition,
) => CursorRenderLayout[]

/**
 * 光标 DOM 元素组合
 *
 * 包含远程光标所需的根节点、选区层、光标线、标签等全部 DOM 节点。
 */
interface CursorElement {
  /** 根节点 */
  root: HTMLDivElement
  /** 选区层容器 */
  selectionLayer: HTMLDivElement
  /** 光标外层 */
  cursor: HTMLDivElement
  /** 光标竖线 */
  line: HTMLDivElement
  /** 用户名标签 */
  label: HTMLDivElement
  /** 选区矩形节点列表 */
  selectionNodes: HTMLDivElement[]
  /** 标签自动隐藏定时器句柄 */
  labelTimer: ReturnType<typeof setTimeout> | null
}

/**
 * Awareness 远程光标管理器
 *
 * 基于 Yjs Awareness 同步多用户光标与选区，并在容器上绘制远程光标 DOM。
 */
export class AwarenessCursorManager {
  /** Awareness 实例 */
  private awareness: Awareness | null = null
  /** 光标渲染容器 */
  private container: HTMLElement | null = null
  /** 光标覆盖层根节点 */
  private overlay: HTMLDivElement | null = null
  /** 渲染配置 */
  private config: CursorRenderConfig
  /** 位置计算函数 */
  private positionCalculator: PositionCalculator | null = null
  /** 选区计算函数 */
  private selectionCalculator: SelectionCalculator | null = null
  /** 是否同步本地光标 */
  private cursorEnabled = true
  /** 是否同步本地选区 */
  private selectionEnabled = true

  /** 远程光标缓存，按 userId 索引 */
  private cursors = new Map<string, RemoteCursor>()
  /** 光标 DOM 元素缓存，按 userId 索引 */
  private elements = new Map<string, CursorElement>()
  /** 注入的样式元素 */
  private styleElement: HTMLStyleElement | null = null
  /** 过期光标清理定时器句柄 */
  private cleanupTimer: ReturnType<typeof setInterval> | null = null
  /** Awareness 变更事件回调引用 */
  private awarenessHandler: ((change: { added: number[]; updated: number[]; removed: number[] }) => void) | null = null

  /**
   * 构造光标管理器
   *
   * @param config 渲染配置（部分字段，缺省使用默认值）
   */
  constructor(config: Partial<CursorRenderConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * 绑定 Awareness，发布本地用户信息并监听远端光标变更
   *
   * @param awareness Awareness 实例
   * @param localUser 本地用户信息
   */
  bindAwareness(awareness: Awareness, localUser: UserInfo): void {
    if (this.awarenessHandler && this.awareness) {
      this.awareness.off('change', this.awarenessHandler)
    }

    this.awareness = awareness

    awareness.setLocalStateField('user', {
      userId: localUser.userId,
      userName: localUser.userName,
      color: localUser.color,
    })

    this.awarenessHandler = ({ added, updated, removed }) => {
      this.syncRemoteCursors([...added, ...updated])
      if (removed.length > 0) {
        const allStates = this.awareness!.getStates()
        this.cleanupRemovedClients(allStates)
      }
    }
    awareness.on('change', this.awarenessHandler)
    this.syncRemoteCursors(Array.from(awareness.getStates().keys()))
  }

  /**
   * 设置本地光标位置并广播到 Awareness
   *
   * @param position 光标位置
   */
  setLocalCursor(position: CursorPosition): void {
    this.awareness?.setLocalStateField('cursor', position)
  }

  /**
   * 清除本地光标（广播 null 到 Awareness）
   */
  clearLocalCursor(): void {
    this.awareness?.setLocalStateField('cursor', null)
  }

  /**
   * 设置光标/选区同步开关并刷新渲染
   *
   * @param state 同步开关状态
   */
  setSyncVisibility(state: { cursor: boolean; selection: boolean }): void {
    this.cursorEnabled = state.cursor
    this.selectionEnabled = state.selection
    this.refreshAllCursors()
  }

  /**
   * 初始化光标渲染环境
   *
   * @param container 光标渲染容器
   * @param positionCalculator 位置计算函数
   * @param selectionCalculator 选区计算函数（可选）
   */
  initializeCursorRendering(
    container: HTMLElement,
    positionCalculator: PositionCalculator,
    selectionCalculator?: SelectionCalculator,
  ): void {
    if (this.container !== container) {
      this.clearAllElements()
      this.overlay?.remove()
      this.overlay = null
    }
    this.container = container
    this.positionCalculator = positionCalculator
    this.selectionCalculator = selectionCalculator ?? null
    this.injectStyles()
    this.ensureOverlay()
    this.startCleanupTimer()
    this.refreshAllCursors()
  }

  /**
   * 刷新所有远程光标渲染
   */
  refreshAllCursors(): void {
    this.cursors.forEach((cursor) => this.renderCursor(cursor))
  }

  /**
   * 获取所有远程光标列表
   *
   * @returns 远程光标数组
   */
  getAllCursors(): RemoteCursor[] {
    return Array.from(this.cursors.values())
  }

  /**
   * 重置管理器，清除全部光标 DOM 元素
   */
  reset(): void {
    this.clearAllElements()
  }

  /**
   * 销毁管理器，解除 Awareness 监听并清理 DOM 与样式
   */
  destroy(): void {
    if (this.awarenessHandler && this.awareness) {
      this.awareness.off('change', this.awarenessHandler)
      this.awarenessHandler = null
    }
    this.stopCleanupTimer()
    this.clearAllElements()
    this.overlay?.remove()
    this.overlay = null
    this.removeStyles()
    this.container = null
    this.positionCalculator = null
    this.selectionCalculator = null
    this.awareness = null
  }

  /**
   * 渲染单个远程光标
   *
   * 根据光标位置计算布局，更新光标线、选区矩形与标签样式。
   *
   * @param cursor 远程光标数据
   */
  private renderCursor(cursor: RemoteCursor): void {
    if (!this.container || !this.positionCalculator) return

    let el = this.elements.get(cursor.userId)
    if (!el) {
      el = this.createCursorElement(cursor)
      this.elements.set(cursor.userId, el)
    }

    const selectionLayouts = this.selectionEnabled
      ? (this.selectionCalculator?.(cursor.position) ?? [])
      : []
    const anchorIndex = cursor.position.endIndex ?? cursor.position.index
    const position = this.cursorEnabled ? this.positionCalculator(anchorIndex) : null

    this.renderSelection(cursor, el, selectionLayouts)

    if (position) {
      el.cursor.style.left = `${position.x}px`
      el.cursor.style.top = `${position.y}px`
      el.cursor.style.display = 'block'
      el.line.style.width = `${position.width}px`
      el.line.style.height = `${position.height}px`
      el.line.style.backgroundColor = cursor.color
      el.line.style.borderRadius = `${Math.max(position.width / 2, 1)}px`
      el.label.textContent = cursor.userName
      el.label.style.backgroundColor = cursor.color

      if (this.config.showLabel) {
        this.showLabel(el)
      } else {
        el.label.style.display = 'none'
      }
    } else {
      el.cursor.style.display = 'none'
    }

    el.root.style.display = position || selectionLayouts.length > 0 ? 'block' : 'none'
  }

  /**
   * 创建远程光标 DOM 元素
   *
   * @param cursor 远程光标数据
   * @returns 光标元素对象
   */
  private createCursorElement(cursor: RemoteCursor): CursorElement {
    const root = document.createElement('div')
    root.className = 'vd-remote-presence'
    root.dataset.userId = cursor.userId

    const selectionLayer = document.createElement('div')
    selectionLayer.className = 'vd-remote-selection-layer'

    const cursorWrapper = document.createElement('div')
    cursorWrapper.className = 'vd-remote-cursor'

    const line = document.createElement('div')
    line.className = 'vd-remote-cursor__line'
    if (this.config.enableBlink) {
      line.classList.add('vd-remote-cursor__line--blink')
    }

    const label = document.createElement('div')
    label.className = 'vd-remote-cursor__label'
    label.textContent = cursor.userName

    cursorWrapper.appendChild(line)
    cursorWrapper.appendChild(label)
    root.appendChild(selectionLayer)
    root.appendChild(cursorWrapper)
    this.ensureOverlay().appendChild(root)

    return {
      root,
      selectionLayer,
      cursor: cursorWrapper,
      line,
      label,
      selectionNodes: [],
      labelTimer: null,
    }
  }

  /**
   * 显示光标用户名标签
   *
   * 若配置了 labelDuration，则在指定时长后自动隐藏。
   *
   * @param el 光标元素对象
   */
  private showLabel(el: CursorElement): void {
    el.label.style.display = 'block'
    el.label.style.opacity = '1'
    if (el.labelTimer) {
      clearTimeout(el.labelTimer)
      el.labelTimer = null
    }
    if (this.config.labelDuration > 0) {
      el.labelTimer = setTimeout(() => {
        el.label.style.opacity = '0'
        el.labelTimer = null
      }, this.config.labelDuration)
    }
  }

  /**
   * 渲染选区矩形
   *
   * 复用已有 DOM 节点，按需增删，并更新位置与颜色。
   *
   * @param cursor 远程光标数据
   * @param el 光标元素对象
   * @param layouts 选区布局列表
   */
  private renderSelection(
    cursor: RemoteCursor,
    el: CursorElement,
    layouts: SelectionRenderLayout[],
  ): void {
    while (el.selectionNodes.length > layouts.length) {
      const node = el.selectionNodes.pop()
      node?.remove()
    }

    layouts.forEach((layout, index) => {
      let node = el.selectionNodes[index]
      if (!node) {
        node = document.createElement('div')
        node.className = 'vd-remote-selection'
        el.selectionLayer.appendChild(node)
        el.selectionNodes.push(node)
      }

      node.style.left = `${layout.x}px`
      node.style.top = `${layout.y}px`
      node.style.width = `${layout.width}px`
      node.style.height = `${layout.height}px`
      node.style.backgroundColor = cursor.color
      node.style.display = 'block'
    })
  }

  /**
   * 清除所有光标 DOM 元素与缓存
   */
  private clearAllElements(): void {
    this.elements.forEach((el) => {
      if (el.labelTimer) clearTimeout(el.labelTimer)
      el.root.remove()
    })
    this.elements.clear()
    this.cursors.clear()
  }

  /**
   * 清理已断开连接的客户端对应的光标
   *
   * @param allStates 当前 Awareness 全部状态
   */
  private cleanupRemovedClients(allStates: Map<number, Record<string, unknown>>): void {
    const activeUserIds = new Set<string>()
    allStates.forEach((state, clientId) => {
      if (clientId === this.awareness!.clientID) return
      const user = state.user as UserInfo | undefined
      if (user?.userId) activeUserIds.add(user.userId)
    })

    const toRemove: string[] = []
    this.cursors.forEach((_, userId) => {
      if (!activeUserIds.has(userId)) toRemove.push(userId)
    })
    for (const userId of toRemove) {
      this.removeCursor(userId)
    }
  }

  /**
   * 移除指定用户的光标及其 DOM 元素
   *
   * @param userId 用户 ID
   */
  private removeCursor(userId: string): void {
    this.cursors.delete(userId)
    const el = this.elements.get(userId)
    if (el) {
      if (el.labelTimer) clearTimeout(el.labelTimer)
      el.root.remove()
      this.elements.delete(userId)
    }
  }

  /**
   * 启动过期光标清理定时器
   *
   * 每 5 秒清理一次超过 expireTime 未更新的光标。
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) return
    this.cleanupTimer = setInterval(() => {
      const now = Date.now()
      this.cursors.forEach((cursor, userId) => {
        if (now - cursor.lastUpdate > this.config.expireTime) {
          this.removeCursor(userId)
        }
      })
    }, 5000)
  }

  /**
   * 停止过期光标清理定时器
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  /**
   * 同步远程光标缓存
   *
   * 遍历指定 Awareness 客户端状态，更新本地光标缓存并移除已失效光标。
   *
   * @param clientIds 待同步的客户端 ID 列表
   */
  private syncRemoteCursors(clientIds: number[]): void {
    if (!this.awareness) return

    for (const clientId of clientIds) {
      if (clientId === this.awareness.clientID) continue
      const state = this.awareness.getStates().get(clientId)
      if (!state?.user || !state?.cursor) continue

      const user = state.user as UserInfo
      const cursor = state.cursor as CursorPosition
      this.cursors.set(user.userId, {
        userId: user.userId,
        userName: user.userName,
        color: user.color,
        position: cursor,
        lastUpdate: Date.now(),
      })
    }

    const states = this.awareness.getStates()
    this.cursors.forEach((_, userId) => {
      const matchedState = Array.from(states.values()).find((state) => {
        const user = state.user as UserInfo | undefined
        return user?.userId === userId
      })
      if (!matchedState?.cursor) {
        this.removeCursor(userId)
      }
    })

    this.refreshAllCursors()
  }

  /**
   * 确保光标覆盖层根节点存在
   *
   * @returns 覆盖层根节点
   */
  private ensureOverlay(): HTMLDivElement {
    if (this.overlay) return this.overlay
    if (!this.container) {
      throw new Error('Cursor container is not initialized')
    }

    const overlay = document.createElement('div')
    overlay.className = 'vd-remote-cursor-layer'
    this.container.appendChild(overlay)
    this.overlay = overlay
    return overlay
  }

  /**
   * 注入光标样式到 document.head
   */
  private injectStyles(): void {
    if (this.styleElement) return
    this.styleElement = document.createElement('style')
    this.styleElement.textContent = `
      .vd-remote-cursor-layer {
        position: absolute;
        inset: 0;
        overflow: visible;
        pointer-events: none;
        z-index: 1000;
      }
      .vd-remote-presence {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }
      .vd-remote-selection-layer {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }
      .vd-remote-selection {
        position: absolute;
        pointer-events: none;
        border-radius: 2px;
        opacity: 0.22;
      }
      .vd-remote-cursor {
        position: absolute;
        pointer-events: none;
      }
      .vd-remote-cursor__line {
        min-height: 1px;
      }
      .vd-remote-cursor__line--blink {
        animation: remote-cursor-blink 1s infinite;
      }
      @keyframes remote-cursor-blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0; }
      }
      .vd-remote-cursor__label {
        position: absolute;
        top: -20px;
        left: 0;
        padding: 2px 6px;
        border-radius: 3px;
        color: #ffffff;
        font-size: 12px;
        line-height: 16px;
        font-weight: 500;
        white-space: nowrap;
        transition: opacity 0.3s ease;
        opacity: 1;
      }
    `
    document.head.appendChild(this.styleElement)
  }

  /**
   * 移除注入的样式元素
   */
  private removeStyles(): void {
    if (this.styleElement) {
      this.styleElement.remove()
      this.styleElement = null
    }
  }
}
