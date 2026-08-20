import type { Awareness } from 'y-protocols/awareness'
import type { CursorPosition, RemoteCursor, UserInfo } from './types'

export interface CursorRenderConfig {
  showLabel: boolean
  labelDuration: number
  enableBlink: boolean
  expireTime: number
}

const DEFAULT_CONFIG: CursorRenderConfig = {
  showLabel: true,
  labelDuration: 0,
  enableBlink: true,
  expireTime: 30000,
}

export interface CursorRenderLayout {
  x: number
  y: number
  width: number
  height: number
}

export type SelectionRenderLayout = CursorRenderLayout

export type PositionCalculator = (
  index: number,
) => CursorRenderLayout | null

export type SelectionCalculator = (
  position: CursorPosition,
) => CursorRenderLayout[]

interface CursorElement {
  root: HTMLDivElement
  selectionLayer: HTMLDivElement
  cursor: HTMLDivElement
  line: HTMLDivElement
  label: HTMLDivElement
  selectionNodes: HTMLDivElement[]
  labelTimer: ReturnType<typeof setTimeout> | null
}

export class AwarenessCursorManager {
  private awareness: Awareness | null = null
  private container: HTMLElement | null = null
  private overlay: HTMLDivElement | null = null
  private config: CursorRenderConfig
  private positionCalculator: PositionCalculator | null = null
  private selectionCalculator: SelectionCalculator | null = null
  private cursorEnabled = true
  private selectionEnabled = true

  private cursors = new Map<string, RemoteCursor>()
  private elements = new Map<string, CursorElement>()
  private styleElement: HTMLStyleElement | null = null
  private cleanupTimer: ReturnType<typeof setInterval> | null = null
  private awarenessHandler: ((change: { added: number[]; updated: number[]; removed: number[] }) => void) | null = null

  constructor(config: Partial<CursorRenderConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

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

  setLocalCursor(position: CursorPosition): void {
    this.awareness?.setLocalStateField('cursor', position)
  }

  clearLocalCursor(): void {
    this.awareness?.setLocalStateField('cursor', null)
  }

  setSyncVisibility(state: { cursor: boolean; selection: boolean }): void {
    this.cursorEnabled = state.cursor
    this.selectionEnabled = state.selection
    this.refreshAllCursors()
  }

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

  refreshAllCursors(): void {
    this.cursors.forEach((cursor) => this.renderCursor(cursor))
  }

  getAllCursors(): RemoteCursor[] {
    return Array.from(this.cursors.values())
  }

  reset(): void {
    this.clearAllElements()
  }

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

  private clearAllElements(): void {
    this.elements.forEach((el) => {
      if (el.labelTimer) clearTimeout(el.labelTimer)
      el.root.remove()
    })
    this.elements.clear()
    this.cursors.clear()
  }

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
      el.root.remove()
      this.elements.delete(userId)
    }
  }

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

  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

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

  private removeStyles(): void {
    if (this.styleElement) {
      this.styleElement.remove()
      this.styleElement = null
    }
  }
}
