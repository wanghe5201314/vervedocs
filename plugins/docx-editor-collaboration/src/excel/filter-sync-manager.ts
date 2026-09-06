import type { Awareness } from 'y-protocols/awareness'

/** 触发筛选同步的 Univer 命令 ID 集合 */
const FILTER_COMMANDS = new Set([
  'sheet.command.set-filter-range',
  'sheet.command.remove-sheet-filter',
  'sheet.command.smart-toggle-filter',
  'sheet.command.set-filter-criteria',
  'sheet.command.clear-filter-criteria',
  'sheet.command.re-calc-filter',
])

/**
 * 远程筛选数据
 *
 * 通过 Awareness 在客户端之间广播的筛选状态。
 */
interface RemoteFilterData {
  /** 工作表 ID */
  sheetId: string
  /** 自动筛选模型，包含引用范围与各列筛选条件；为 null 表示清除筛选 */
  autoFilter: {
    /** 筛选引用范围 */
    ref?: { startRow: number; startColumn: number; endRow: number; endColumn: number }
    /** 各列筛选条件列表 */
    filterColumns?: any[]
  } | null
}

/**
 * Excel 筛选状态同步管理器
 *
 * 监听本地筛选命令并广播到 Awareness，同时监听 Awareness 远端筛选变更并应用到 Univer。
 */
export class ExcelFilterSyncManager {
  /** Awareness 实例 */
  private awareness: Awareness | null = null
  /** Univer API 实例 */
  private univerAPI: any = null
  /** 是否启用筛选同步 */
  private enabled = true
  /** 是否正在应用远端筛选（防回环） */
  private isApplyingRemote = false
  /** Univer 命令执行事件回调引用 */
  private commandHandler: ((event: any) => void) | null = null
  /** Awareness 变更事件回调引用 */
  private awarenessHandler: ((change: { added: number[]; updated: number[]; removed: number[] }) => void) | null = null

  /**
   * 绑定 Awareness 与 Univer API，建立双向筛选同步
   *
   * @param awareness Awareness 实例
   * @param univerAPI Univer API 实例
   */
  bindAwareness(awareness: Awareness, univerAPI: any): void {
    this.awareness = awareness
    this.univerAPI = univerAPI

    this.awarenessHandler = ({ added, updated }) => {
      if (!this.enabled) return
      const changed = [...added, ...updated]
      for (const clientId of changed) {
        if (clientId === this.awareness!.clientID) continue
        const state = this.awareness!.getStates().get(clientId)
        if (!state?.filter) continue
        this.applyRemoteFilter(state.filter as RemoteFilterData)
      }
    }
    awareness.on('change', this.awarenessHandler)

    this.commandHandler = (event: any) => {
      if (!this.enabled) return
      if (this.isApplyingRemote) return
      const id = event?.id || event?.commandInfo?.id || ''
      if (!FILTER_COMMANDS.has(id)) return
      this.broadcastLocalFilter()
    }
    univerAPI.addEvent(univerAPI.Event.CommandExecuted, this.commandHandler)
  }

  /**
   * 启用或禁用筛选同步
   *
   * 禁用时清除 Awareness 中的筛选字段；启用时立即广播一次本地筛选。
   *
   * @param enabled 是否启用
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (!enabled) {
      this.awareness?.setLocalStateField('filter', null)
    } else {
      this.broadcastLocalFilter()
    }
  }

  /**
   * 广播本地当前筛选状态到 Awareness
   *
   * 读取当前工作表的筛选范围与各列条件，写入 Awareness 的 filter 字段。
   */
  private broadcastLocalFilter(): void {
    if (!this.awareness || !this.univerAPI) return
    const workbook = this.univerAPI.getActiveWorkbook()
    if (!workbook) return
    const sheet = workbook.getActiveSheet()
    if (!sheet) return

    const filter = sheet.getFilter?.()
    if (!filter) {
      this.awareness.setLocalStateField('filter', { sheetId: sheet.getSheetId(), autoFilter: null })
      return
    }

    const range = filter.getRange?.()?.getRange?.()
    const filterColumns: any[] = []
    if (range) {
      for (let col = range.startColumn; col <= range.endColumn; col++) {
        const criteria = filter.getColumnFilterCriteria?.(col)
        if (criteria) {
          filterColumns.push(criteria)
        }
      }
    }

    this.awareness.setLocalStateField('filter', {
      sheetId: sheet.getSheetId(),
      autoFilter: { ref: range, filterColumns },
    })
  }

  /**
   * 应用远端筛选状态到本地 Univer
   *
   * @param filterData 远端筛选数据
   */
  private applyRemoteFilter(filterData: RemoteFilterData): void {
    if (!this.univerAPI) return
    this.isApplyingRemote = true
    try {
      const workbook = this.univerAPI.getActiveWorkbook()
      if (!workbook) return
      const sheet = workbook.getSheetBySheetId?.(filterData.sheetId)
      if (!sheet) return

      const autoFilter = filterData.autoFilter
      if (!autoFilter) {
        const existingFilter = sheet.getFilter?.()
        if (existingFilter) {
          existingFilter.remove?.()
        }
        return
      }

      const ref = autoFilter.ref
      if (!ref) return
      const range = sheet.getRange?.(ref.startRow, ref.startColumn, ref.endRow, ref.endColumn)
      if (!range) return

      let filter = sheet.getFilter?.()
      if (!filter) {
        filter = range.createFilter?.()
      }
      if (!filter) return

      filter.removeFilterCriteria?.()
      if (autoFilter.filterColumns) {
        for (const col of autoFilter.filterColumns) {
          filter.setColumnFilterCriteria?.(col.colId, col)
        }
      }
    } finally {
      this.isApplyingRemote = false
    }
  }

  /**
   * 销毁管理器，解除 Awareness 与命令事件监听
   */
  destroy(): void {
    if (this.awarenessHandler && this.awareness) {
      this.awareness.off('change', this.awarenessHandler)
      this.awarenessHandler = null
    }
    this.commandHandler = null
    this.awareness = null
    this.univerAPI = null
  }
}