import type { Awareness } from 'y-protocols/awareness'
import type { UserInfo, ExcelSelection, RemoteSelection } from './types'

/**
 * Excel 远程选区管理器
 *
 * 基于 Yjs Awareness 同步多用户选区，并在 Univer 容器上绘制远程选区矩形与用户标签。
 */
export class ExcelCursorManager {
  /** Awareness 实例 */
  private awareness: Awareness | null = null
  /** Univer API 实例 */
  private univerAPI: any = null

  /** 远程选区缓存，按 userId 索引 */
  private cursors = new Map<string, RemoteSelection>()
  /** 选区 DOM 元素缓存，按 userId 索引 */
  private elements = new Map<string, SelectionElement>()
  /** 注入的样式元素 */
  private styleElement: HTMLStyleElement | null = null
  /** 选区渲染容器 */
  private container: HTMLElement | null = null
  /** 选区覆盖层根节点 */
  private overlayRoot: HTMLDivElement | null = null
  /** Awareness 变更事件回调引用 */
  private awarenessHandler: ((change: { added: number[]; updated: number[]; removed: number[] }) => void) | null = null
  /** 过期选区清理定时器句柄 */
  private cleanupTimer: ReturnType<typeof setInterval> | null = null
  /** 选区刷新定时器句柄 */
  private refreshTimer: ReturnType<typeof setInterval> | null = null
  /** 窗口尺寸变更回调引用 */
  private resizeHandler: (() => void) | null = null

  /**
   * 绑定 Awareness，发布本地用户信息并监听远端选区变更
   *
   * @param awareness Awareness 实例
   * @param localUser 本地用户信息
   */
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

  /**
   * 设置本地选区并广播到 Awareness
   *
   * @param selection 本地选区
   */
  setLocalSelection(selection: ExcelSelection): void {
    this.awareness?.setLocalStateField('selection', selection)
  }

  /**
   * 初始化选区渲染环境
   *
   * @param container 选区渲染容器
   * @param univerAPI Univer API 实例（可选，未传则沿用已有实例）
   */
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

  /**
   * 刷新所有远程选区渲染
   */
  refreshAllSelections(): void {
    this.cursors.forEach((sel) => this.renderSelection(sel))
  }

  /**
   * 获取所有远程选区列表
   *
   * @returns 远程选区数组
   */
  getAllSelections(): RemoteSelection[] {
    return Array.from(this.cursors.values())
  }

  /**
   * 销毁管理器，解除所有监听并清理 DOM
   */
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

  /**
   * 渲染单个远程选区
   *
   * 根据选区起止单元格计算矩形位置与尺寸，更新对应 DOM 元素样式。
   *
   * @param cursor 远程选区数据
   */
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

  /**
   * 创建远程选区 DOM 元素
   *
   * @param cursor 远程选区数据
   * @returns 选区元素对象
   */
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

  /**
   * 确保选区覆盖层根节点存在并挂载到宿主
   *
   * @returns 覆盖层根节点，无法解析宿主时返回 null
   */
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

  /**
   * 解析选区覆盖层应挂载的宿主元素
   *
   * 优先选择 Univer 内部滚动容器，回退到外层 container。
   *
   * @returns 宿主元素，无法确定时返回 null
   */
  private resolveOverlayHost(): HTMLElement | null {
    if (!this.container) return null
    return (
      (this.container.querySelector('.univer-host') as HTMLElement | null) ??
      (this.container.querySelector('.grid-scroll.univer-grid-scroll') as HTMLElement | null) ??
      (this.container.querySelector('.univer-grid-viewport') as HTMLElement | null) ??
      this.container
    )
  }

  /**
   * 清理已断开连接的客户端对应的选区
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
      this.removeSelection(userId)
    }
  }

  /**
   * 移除指定用户的选区及其 DOM 元素
   *
   * @param userId 用户 ID
   */
  private removeSelection(userId: string): void {
    this.cursors.delete(userId)
    const el = this.elements.get(userId)
    if (el) {
      el.overlay.remove()
      this.elements.delete(userId)
    }
  }

  /**
   * 清除所有选区 DOM 元素与缓存
   */
  private clearAllElements(): void {
    this.elements.forEach((el) => el.overlay.remove())
    this.elements.clear()
    this.cursors.clear()
  }

  /**
   * 启动过期选区清理定时器
   *
   * 每 5 秒清理一次超过 30 秒未更新的选区。
   */
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

  /**
   * 停止过期选区清理定时器
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  /**
   * 启动选区刷新定时器
   *
   * 每 150 毫秒刷新一次所有选区，跟随 Univer 滚动位置变化。
   */
  private startRefreshTimer(): void {
    if (this.refreshTimer) return
    this.refreshTimer = setInterval(() => {
      if (this.cursors.size === 0) return
      this.refreshAllSelections()
    }, 150)
  }

  /**
   * 停止选区刷新定时器
   */
  private stopRefreshTimer(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }
  }

  /**
   * 绑定窗口尺寸变更监听，触发选区刷新
   */
  private bindResizeListener(): void {
    if (this.resizeHandler) return
    this.resizeHandler = () => this.refreshAllSelections()
    window.addEventListener('resize', this.resizeHandler)
  }

  /**
   * 解绑窗口尺寸变更监听
   */
  private unbindResizeListener(): void {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler)
      this.resizeHandler = null
    }
  }

  /**
   * 将十六进制颜色转换为带透明度的 rgba 字符串
   *
   * @param color 颜色值，支持 #RGB / #RRGGBB
   * @param alpha 透明度，0-1
   * @returns rgba 字符串；无法解析时返回原值
   */
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

  /**
   * 注入选区样式到 document.head
   */
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

/**
 * 选区 DOM 元素组合
 *
 * 包含选区外框与用户名标签两个节点。
 */
interface SelectionElement {
  /** 选区外框元素 */
  overlay: HTMLDivElement
  /** 用户名标签元素 */
  label: HTMLDivElement
}
