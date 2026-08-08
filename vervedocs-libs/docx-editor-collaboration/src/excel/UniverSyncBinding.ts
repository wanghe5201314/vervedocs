import * as Y from 'yjs'

const EXCEL_DOC_PREFIX = 'excel:'

export class UniverSyncBinding {
  private doc: Y.Doc
  private univerAPI: any
  private yWorkbook: Y.Map<unknown>

  private isApplyingRemote = false
  private isApplyingLocal = false
  private skipPushUntil = 0

  private lastSnapshotJson = ''

  syncFilter = true
  syncSort = true

  private commandHandler: ((event: any) => void) | null = null
  private yObserver: ((events: Y.YEvent<Y.Map<unknown>>[], transaction: Y.Transaction) => void) | null = null

  private ignoreCommands = new Set([
    'univer.command.undo',
    'univer.command.redo',
    'sheet.command.select-all',
    'sheet.operation.set-selection',
    'sheet.command.set-active-worksheet',
    'sheet.operation.scroll-to-cell',
    'sheet.operation.set-scroll',
    'doc.mutation.rich-text-editing',
    'sheet.mutation.set-worksheet-active',
  ])

  constructor(doc: Y.Doc, univerAPI: any) {
    this.doc = doc
    this.univerAPI = univerAPI
    this.yWorkbook = doc.getMap('workbook')

    this.bindYjsToUniver()
    this.bindUniverToYjs()

    if (this.yWorkbook.size > 0) {
      this.pushYDocToUniver()
    }
  }

  destroy(): void {
    if (this.yObserver) {
      this.yWorkbook.unobserveDeep(this.yObserver)
      this.yObserver = null
    }
    this.commandHandler = null
  }

  private bindYjsToUniver(): void {
    this.yObserver = (_events, tx) => {
      if (this.isApplyingLocal) return
      if (tx.local) return
      this.pushYDocToUniver()
    }
    this.yWorkbook.observeDeep(this.yObserver)
  }

  private pushYDocToUniver(): void {
    this.isApplyingRemote = true
    this.skipPushUntil = Date.now() + 500
    try {
      const data = this.yWorkbook.toJSON() as Record<string, unknown>
      if (!data || Object.keys(data).length === 0) return

      const workbook = this.univerAPI.getActiveWorkbook()
      if (!workbook) {
        this.univerAPI.createWorkbook(JSON.parse(JSON.stringify(data)) as any)
        const newWorkbook = this.univerAPI.getActiveWorkbook?.()
        this.lastSnapshotJson = newWorkbook ? JSON.stringify(newWorkbook.save()) : JSON.stringify(data)
        return
      }

      const remoteJson = JSON.stringify(data)
      if (this.lastSnapshotJson === remoteJson) return

      const currentData = workbook.save() as any
      const unitId = currentData?.id ?? workbook.getId?.()
      const localData = (!this.syncFilter || !this.syncSort) ? currentData : null
      const dataClone = JSON.parse(JSON.stringify(data))
      if (!dataClone.id && unitId) {
        dataClone.id = unitId
      }

      if (localData?.sheets && dataClone.sheets) {
        for (const [sheetId, remoteSheet] of Object.entries(dataClone.sheets as Record<string, any>)) {
          const localSheet = localData.sheets?.[sheetId]
          if (!localSheet) continue

          if (!this.syncFilter) {
            remoteSheet.filter = localSheet.filter
            remoteSheet.autoFilter = localSheet.autoFilter
          }
          if (!this.syncSort) {
            remoteSheet.sortCondition = localSheet.sortCondition
          }
        }
      }

      if (unitId) {
        this.univerAPI.disposeUnit?.(unitId)
      } else {
        workbook.dispose?.()
      }

      this.univerAPI.createWorkbook(dataClone as any)

      const newWorkbook = this.univerAPI.getActiveWorkbook()
      if (newWorkbook) {
        this.lastSnapshotJson = JSON.stringify(newWorkbook.save())
      }
    } finally {
      this.isApplyingRemote = false
    }
  }

  flushCurrentWorkbook(force = false): void {
    this.pushUniverToYjs(force)
  }

  private bindUniverToYjs(): void {
    this.commandHandler = (event: any) => {
      if (this.isApplyingRemote) return

      const id = event?.id || event?.commandInfo?.id || event?.type || ''
      if (this.ignoreCommands.has(id)) return
      if (id.startsWith('sheet.operation.') || id.startsWith('sheet.mutation.')) return
      if (id.startsWith('sheet.command.select') || id.includes('scroll')) return

      this.pushUniverToYjs()
    }
    this.univerAPI.addEvent(this.univerAPI.Event.CommandExecuted, this.commandHandler)
  }

  private pushUniverToYjs(force = false): void {
    if (!force && Date.now() < this.skipPushUntil) return

    const workbook = this.univerAPI.getActiveWorkbook()
    if (!workbook) return

    const current = workbook.save() as Record<string, unknown>
    const currentJson = JSON.stringify(current)

    if (currentJson === this.lastSnapshotJson) return

    this.isApplyingLocal = true
    try {
      this.doc.transact(() => {
        this.yWorkbook.clear()
        for (const [key, value] of Object.entries(current)) {
          if (value !== undefined) {
            this.yWorkbook.set(key, value)
          }
        }
      }, this)

      if (!this.syncFilter || !this.syncSort) {
        const remoteData = this.yWorkbook.toJSON() as any
        if (remoteData?.sheets && current.sheets) {
          for (const [sheetId, localSheet] of Object.entries(current.sheets as Record<string, any>)) {
            const remoteSheet = remoteData.sheets?.[sheetId]
            if (!remoteSheet) continue

            if (!this.syncFilter) {
              if (remoteSheet.filter !== undefined) localSheet.filter = remoteSheet.filter
              if (remoteSheet.autoFilter !== undefined) localSheet.autoFilter = remoteSheet.autoFilter
            }
            if (!this.syncSort) {
              if (remoteSheet.sortCondition !== undefined) localSheet.sortCondition = remoteSheet.sortCondition
            }
          }
        }

        const mergedJson = JSON.stringify(current)
        if (mergedJson !== this.lastSnapshotJson) {
          this.doc.transact(() => {
            this.yWorkbook.clear()
            for (const [key, value] of Object.entries(current)) {
              if (value !== undefined) {
                this.yWorkbook.set(key, value)
              }
            }
          }, this)
        }
      }

      this.lastSnapshotJson = JSON.stringify(current)
    } finally {
      this.isApplyingLocal = false
    }
  }

  static getDocName(docId: string): string {
    return `${EXCEL_DOC_PREFIX}${docId}`
  }
}
