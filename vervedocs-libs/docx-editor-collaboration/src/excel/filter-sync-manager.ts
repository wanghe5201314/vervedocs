import type { Awareness } from 'y-protocols/awareness'

const FILTER_COMMANDS = new Set([
  'sheet.command.set-filter-range',
  'sheet.command.remove-sheet-filter',
  'sheet.command.smart-toggle-filter',
  'sheet.command.set-filter-criteria',
  'sheet.command.clear-filter-criteria',
  'sheet.command.re-calc-filter',
])

interface RemoteFilterData {
  sheetId: string
  autoFilter: {
    ref?: { startRow: number; startColumn: number; endRow: number; endColumn: number }
    filterColumns?: any[]
  } | null
}

export class ExcelFilterSyncManager {
  private awareness: Awareness | null = null
  private univerAPI: any = null
  private enabled = true
  private isApplyingRemote = false
  private commandHandler: ((event: any) => void) | null = null
  private awarenessHandler: ((change: { added: number[]; updated: number[]; removed: number[] }) => void) | null = null

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

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (!enabled) {
      this.awareness?.setLocalStateField('filter', null)
    } else {
      this.broadcastLocalFilter()
    }
  }

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