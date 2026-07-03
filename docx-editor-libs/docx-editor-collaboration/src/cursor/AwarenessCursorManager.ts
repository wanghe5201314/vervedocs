/**
 * 基于 Yjs Awareness 协议的远程光标管理器
 *
 * 与旧版 RemoteCursorManager 保持相同的 DOM 渲染逻辑，
 * 但数据源从手动 WebSocket 消息切换为 Awareness 状态自动同步。
 */
import type { Awareness } from 'y-protocols/awareness'
import type { CursorPosition, RemoteCursor, UserInfo } from '../types'

/**
 * 光标渲染配置
 */
export interface CursorRenderConfig {
  showLabel: boolean
  labelDuration: number
  enableBlink: boolean
  expireTime: number
}

const DEFAULT_CONFIG: CursorRenderConfig = {
  showLabel: true,
  labelDuration: 3000,
  enableBlink: true,
  expireTime: 30000,
}

interface CursorElement {
  container: HTMLDivElement
  cursor: HTMLDivElement
  label: HTMLDivElement
  labelTimer: ReturnType<typeof setTimeout> | null
}

/**
 * 位置计算回调：将文档中的元素索引转换为屏幕像素坐标
 */
export type PositionCalculator = (
  index: number,
) => { x: number; y: number; height: number } | null

export class AwarenessCursorManager {
  private awareness: Awareness | null = null

  private container: HTMLElement | null = null
  private config: CursorRenderConfig
  private positionCalculator: PositionCalculator | null = null

  private cursors = new Map<string, RemoteCursor>()
  private elements = new Map<string, CursorElement>()
  private styleElement: HTMLStyleElement | null = null
  private cleanupTimer: ReturnType<typeof setInterval> | null = null
  private awarenessHandler: ((change: { added: number[]; updated: number[]; removed: number[] }) => void) | null = null

  constructor(config: Partial<CursorRenderConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * 绑定 Awareness 实例和当前用户信息
   */
  bindAwareness(awareness: Awareness, localUser: UserInfo): void {
    this.awareness = awareness

    // 设置本地 awareness 用户信息
    awareness.setLocalStateField('user', {
      userId: localUser.userId,
      userName: localUser.userName,
      color: localUser.color,
    })

    // 监听远程 awareness 变化
    this.awarenessHandler = ({ added, updated, removed }) => {
      const changed = [...added, ...updated]
      for (const clientId of changed) {
        if (clientId === this.awareness!.clientID) continue
        const state = this.awareness!.getStates().get(clientId)
        if (!state?.user || !state?.cursor) continue

        const user = state.user as UserInfo
        const cursor = state.cursor as CursorPosition
        const remoteCursor: RemoteCursor = {
          userId: user.userId,
          userName: user.userName,
          color: user.color,
          position: cursor,
          lastUpdate: Date.now(),
        }
        this.cursors.set(user.userId, remoteCursor)
        this.renderCursor(remoteCursor)
      }
      if (removed.length > 0) {
        const allStates = this.awareness!.getStates()
        this.cleanupRemovedClients(allStates)
      }
    }
    awareness.on('change', this.awarenessHandler)
  }

  /**
   * 更新本地光标位置（写入 Awareness，自动广播到其他客户端）
   */
  setLocalCursor(position: CursorPosition): void {
    this.awareness?.setLocalStateField('cursor', position)
  }

  /**
   * 初始化 DOM 渲染
   */
  initializeCursorRendering(container: HTMLElement, positionCalculator: PositionCalculator): void {
    this.container = container
    this.positionCalculator = positionCalculator
    this.injectStyles()
    this.startCleanupTimer()
  }

  /**
   * 刷新所有光标位置（文档内容变化后调用）
   */
  refreshAllCursors(): void {
    this.cursors.forEach((cursor) => this.renderCursor(cursor))
  }

  /**
   * 获取所有远程光标
   */
  getAllCursors(): RemoteCursor[] {
    return Array.from(this.cursors.values())
  }

  /**
   * 销毁
   */
  destroy(): void {
    if (this.awarenessHandler && this.awareness) {
      this.awareness.off('change', this.awarenessHandler)
      this.awarenessHandler = null
    }
    this.stopCleanupTimer()
    this.clearAllElements()
    this.removeStyles()
    this.container = null
    this.positionCalculator = null
    this.awareness = null
  }

  // ---- 内部渲染 ----

  private renderCursor(cursor: RemoteCursor): void {
    if (!this.container || !this.positionCalculator) return

    const position = this.positionCalculator(cursor.position.index)
    if (!position) {
      const el = this.elements.get(cursor.userId)
      if (el) el.container.style.display = 'none'
      return
    }

    let el = this.elements.get(cursor.userId)
    if (!el) {
      el = this.createCursorElement(cursor)
      this.elements.set(cursor.userId, el)
    }

    el.container.style.left = `${position.x}px`
    el.container.style.top = `${position.y}px`
    el.container.style.display = 'block'
    el.cursor.style.height = `${position.height}px`
    el.cursor.style.backgroundColor = cursor.color
    el.label.textContent = cursor.userName
    el.label.style.backgroundColor = cursor.color

    if (this.config.showLabel) this.showLabel(el)
  }

  private createCursorElement(cursor: RemoteCursor): CursorElement {
    const container = document.createElement('div')
    container.className = 'remote-cursor-container'
    container.dataset.userId = cursor.userId

    const cursorLine = document.createElement('div')
    cursorLine.className = 'remote-cursor-line'
    if (this.config.enableBlink) cursorLine.classList.add('remote-cursor-blink')

    const label = document.createElement('div')
    label.className = 'remote-cursor-label'
    label.textContent = cursor.userName

    container.appendChild(cursorLine)
    container.appendChild(label)
    this.container!.appendChild(container)

    return { container, cursor: cursorLine, label, labelTimer: null }
  }

  private showLabel(el: CursorElement): void {
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

  private clearAllElements(): void {
    this.elements.forEach((el) => {
      if (el.labelTimer) clearTimeout(el.labelTimer)
      el.container.remove()
    })
    this.elements.clear()
    this.cursors.clear()
  }

  /** 移除已经不在 awareness 中的客户端光标 */
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

  private removeCursor(userId: string): void {
    this.cursors.delete(userId)
    const el = this.elements.get(userId)
    if (el) {
      if (el.labelTimer) clearTimeout(el.labelTimer)
      el.container.remove()
      this.elements.delete(userId)
    }
  }

  // ---- 过期清理 ----

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now()
      this.cursors.forEach((cursor, userId) => {
        if (now - cursor.lastUpdate > this.config.expireTime) {
          this.removeCursor(userId)
        }
      })
    }, 5000)
  }

  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  // ---- 样式注入 ----

  private injectStyles(): void {
    if (this.styleElement) return
    this.styleElement = document.createElement('style')
    this.styleElement.textContent = `
      .remote-cursor-container {
        position: absolute;
        pointer-events: none;
        z-index: 1000;
      }
      .remote-cursor-line {
        width: 2px;
        min-height: 16px;
        border-radius: 1px;
      }
      .remote-cursor-blink {
        animation: remote-cursor-blink 1s infinite;
      }
      @keyframes remote-cursor-blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0; }
      }
      .remote-cursor-label {
        position: absolute;
        top: -20px;
        left: 0;
        padding: 2px 6px;
        border-radius: 3px;
        color: white;
        font-size: 12px;
        white-space: nowrap;
        transition: opacity 0.3s ease;
        opacity: 0;
      }
      .remote-cursor-selection {
        position: absolute;
        opacity: 0.3;
        pointer-events: none;
      }
    `
    document.head.appendChild(this.styleElement)
  }

  private removeStyles(): void {
    if (this.styleElement) {
      this.styleElement.remove()
      this.styleElement = null
    }
  }
}
