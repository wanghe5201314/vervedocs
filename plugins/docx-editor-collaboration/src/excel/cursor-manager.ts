import type { Awareness } from 'y-protocols/awareness'
import type { UserInfo, ExcelSelection, RemoteSelection } from './types'

export class ExcelCursorManager {
  private awareness: Awareness | null = null
  private univerAPI: any = null

  private cursors = new Map<string, RemoteSelection>()
  private elements = new Map<string, SelectionElement>()
  private styleElement: HTMLStyleElement | null = null
  private container: HTMLElement | null = null
  private overlayRoot: HTMLDivElement | null = null
  private awarenessHandler: ((change: { added: number[]; updated: number[]; removed: number[] }) => void) | null = null
  private cleanupTimer: ReturnType<typeof setInterval> | null = null
  private refreshTimer: ReturnType<typeof setInterval> | null = null
  private resizeHandler: (() => void) | null = null

  bindAwareness(awareness: Awareness, localUser: UserInfo): void {
    this.awareness = awareness

    awareness.setLocalStateField('user', {
      userId: localUser.userId,
      userName: localUser.userName,
      color: localUser.color,
    })

    this.awarenessHandler = ({ added, updated, removed }) => {
      const changed = [...added, ...updated]
      for (const clientId of changed) {
        if (clientId === this.awareness!.clientID) continue
        const state = this.awareness!.getStates().get(clientId)
        if (!state?.user || !state?.selection) continue

        const user = state.user as UserInfo
        const sel = state.selection as ExcelSelection
        const remote: RemoteSelection = {
          userId: user.userId,
          userName: user.userName,
          color: user.color,
          selection: sel,
          lastUpdate: Date.now(),
        }
        this.cursors.set(user.userId, remote)
        this.renderSelection(remote)
      }
      if (removed.length > 0) {
        const allStates = this.awareness!.getStates()
        this.cleanupRemovedClients(allStates)
      }
    }
    awareness.on('change', this.awarenessHandler)
  }

  setLocalSelection(selection: ExcelSelection): void {
    this.awareness?.setLocalStateField('selection', selection)
  }

  initializeRendering(container: HTMLElement, univerAPI?: any): void {
    this.container = container
    this.univerAPI = univerAPI ?? this.univerAPI
    this.ensureOverlayRoot()
    this.injectStyles()
    this.startCleanupTimer()
    this.startRefreshTimer()
    this.bindResizeListener()
    this.refreshAllSelections()
  }

  refreshAllSelections(): void {
    this.cursors.forEach((sel) => this.renderSelection(sel))
  }

  getAllSelections(): RemoteSelection[] {
    return Array.from(this.cursors.values())
  }

  destroy(): void {
    if (this.awarenessHandler && this.awareness) {
      this.awareness.off('change', this.awarenessHandler)
      this.awarenessHandler = null
    }
    this.stopCleanupTimer()
    this.stopRefreshTimer()
    this.unbindResizeListener()
    this.clearAllElements()
    this.removeStyles()
    this.overlayRoot?.remove()
    this.overlayRoot = null
    this.container = null
    this.univerAPI = null
    this.awareness = null
  }

  private renderSelection(cursor: RemoteSelection): void {
    if (!this.container || !this.univerAPI) return

    const overlayRoot = this.ensureOverlayRoot()
    if (!overlayRoot) return

    let el = this.elements.get(cursor.userId)
    if (!el) {
      el = this.createSelectionElement(cursor)
      this.elements.set(cursor.userId, el)
    }

    const workbook = this.univerAPI.getActiveWorkbook?.()
    const activeSheet = workbook?.getActiveSheet?.()
    if (!workbook || !activeSheet || activeSheet.getSheetId?.() !== cursor.selection.sheetId) {
      el.overlay.style.display = 'none'
      return
    }

    const sel = cursor.selection
    const sheet = workbook.getSheetBySheetId?.(sel.sheetId) ?? activeSheet
    const startCell = sheet?.getRange?.(sel.startRow, sel.startCol)
    const endCell = sheet?.getRange?.(sel.endRow, sel.endCol)
    const startRect = startCell?.getCellRect?.()
    const endRect = endCell?.getCellRect?.()

    if (!startRect || !endRect) {
      el.overlay.style.display = 'none'
      return
    }

    const left = Math.min(startRect.left, endRect.left)
    const top = Math.min(startRect.top, endRect.top)
    const right = Math.max(startRect.right, endRect.right)
    const bottom = Math.max(startRect.bottom, endRect.bottom)
    const width = Math.max(0, right - left)
    const height = Math.max(0, bottom - top)

    if (!Number.isFinite(left) || !Number.isFinite(top) || width <= 0 || height <= 0) {
      el.overlay.style.display = 'none'
      return
    }

    el.overlay.style.left = `${left}px`
    el.overlay.style.top = `${top}px`
    el.overlay.style.width = `${width}px`
    el.overlay.style.height = `${height}px`
    el.overlay.style.display = 'block'
    el.overlay.style.borderColor = cursor.color
    el.overlay.style.backgroundColor = this.withAlpha(cursor.color, 0.12)
    el.overlay.style.boxShadow = `inset 0 0 0 0.5px ${this.withAlpha(cursor.color, 0.6)}`
    el.label.textContent = cursor.userName
    el.label.style.backgroundColor = cursor.color
    el.label.style.top = top < 24 ? `${height + 4}px` : '-22px'
  }

  private createSelectionElement(cursor: RemoteSelection): SelectionElement {
    const overlay = document.createElement('div')
    overlay.className = 'remote-excel-selection'
    overlay.dataset.userId = cursor.userId

    const label = document.createElement('div')
    label.className = 'remote-excel-selection-label'
    label.textContent = cursor.userName

    overlay.appendChild(label)
    this.ensureOverlayRoot()?.appendChild(overlay)

    return { overlay, label }
  }

  private ensureOverlayRoot(): HTMLDivElement | null {
    if (!this.container) return null
    const host = this.resolveOverlayHost()
    if (!host) return null

    if (this.overlayRoot && this.overlayRoot.parentElement === host) {
      return this.overlayRoot
    }

    this.overlayRoot?.remove()
    const root = document.createElement('div')
    root.className = 'remote-excel-selection-layer'
    host.appendChild(root)
    this.overlayRoot = root
    return root
  }

  private resolveOverlayHost(): HTMLElement | null {
    if (!this.container) return null
    return (
      (this.container.querySelector('.univer-host') as HTMLElement | null) ??
      (this.container.querySelector('.grid-scroll.univer-grid-scroll') as HTMLElement | null) ??
      (this.container.querySelector('.univer-grid-viewport') as HTMLElement | null) ??
      this.container
    )
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
      this.removeSelection(userId)
    }
  }

  private removeSelection(userId: string): void {
    this.cursors.delete(userId)
    const el = this.elements.get(userId)
    if (el) {
      el.overlay.remove()
      this.elements.delete(userId)
    }
  }

  private clearAllElements(): void {
    this.elements.forEach((el) => el.overlay.remove())
    this.elements.clear()
    this.cursors.clear()
  }

  private startCleanupTimer(): void {
    if (this.cleanupTimer) return
    this.cleanupTimer = setInterval(() => {
      const now = Date.now()
      this.cursors.forEach((cursor, userId) => {
        if (now - cursor.lastUpdate > 30000) {
          this.removeSelection(userId)
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

  private startRefreshTimer(): void {
    if (this.refreshTimer) return
    this.refreshTimer = setInterval(() => {
      if (this.cursors.size === 0) return
      this.refreshAllSelections()
    }, 150)
  }

  private stopRefreshTimer(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }
  }

  private bindResizeListener(): void {
    if (this.resizeHandler) return
    this.resizeHandler = () => this.refreshAllSelections()
    window.addEventListener('resize', this.resizeHandler)
  }

  private unbindResizeListener(): void {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler)
      this.resizeHandler = null
    }
  }

  private withAlpha(color: string, alpha: number): string {
    const normalized = color.trim()
    if (normalized.startsWith('#')) {
      const hex = normalized.slice(1)
      const hexValue = hex.length === 3
        ? hex.split('').map(ch => ch + ch).join('')
        : hex.length === 6
          ? hex
          : ''
      if (hexValue) {
        const r = Number.parseInt(hexValue.slice(0, 2), 16)
        const g = Number.parseInt(hexValue.slice(2, 4), 16)
        const b = Number.parseInt(hexValue.slice(4, 6), 16)
        return `rgba(${r}, ${g}, ${b}, ${alpha})`
      }
    }
    return normalized
  }

  private injectStyles(): void {
    if (this.styleElement) return
    this.styleElement = document.createElement('style')
    this.styleElement.textContent = `
      .remote-excel-selection-layer {
        position: absolute;
        inset: 0;
        pointer-events: none;
        overflow: hidden;
        z-index: 30;
      }
      .remote-excel-selection {
        position: absolute;
        pointer-events: none;
        z-index: 1;
        border: 1px solid transparent;
        border-radius: 2px;
        box-sizing: border-box;
      }
      .remote-excel-selection-label {
        position: absolute;
        top: -22px;
        left: 0;
        padding: 2px 6px;
        border-radius: 3px;
        color: white;
        font-size: 12px;
        white-space: nowrap;
        opacity: 0.95;
        line-height: 1.2;
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

interface SelectionElement {
  overlay: HTMLDivElement
  label: HTMLDivElement
}
