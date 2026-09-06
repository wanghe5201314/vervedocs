import * as Y from 'yjs'

/** Excel 协同文档名前缀，用于在 Hocuspocus 端区分 docx 与 excel 文档 */
const EXCEL_DOC_PREFIX = 'excel:'

/**
 * Y.Doc ↔ Univer 工作簿双向绑定器
 *
 * 监听 Univer 命令执行事件将工作簿快照写入 Yjs，
 * 同时监听 Yjs 远端变更并重建工作簿，使用 isApplyingRemote/isApplyingLocal 防回环。
 */
export class UniverSyncBinding {
  /** Yjs 文档实例 */
  private doc: Y.Doc
  /** Univer API 实例 */
  private univerAPI: any
  /** 工作簿 Y.Map */
  private yWorkbook: Y.Map<unknown>

  /** 是否正在把远程变更写入 Univer（防回环） */
  private isApplyingRemote = false
  /** 是否正在把本地变更写入 Y.Doc（防回环） */
  private isApplyingLocal = false
  /** 远端写入后忽略本地推送的截止时间戳 */
  private skipPushUntil = 0

  /** 上一次同步的工作簿 JSON 快照字符串 */
  private lastSnapshotJson = ''


  /** 是否同步排序状态，false 时保留本地排序 */
  syncSort = true

  /** Univer 命令执行事件回调引用 */
  private commandHandler: ((event: any) => void) | null = null
  /** Y.Map observe 回调引用 */
  private yObserver: ((events: Y.YEvent<Y.Map<unknown>>[], transaction: Y.Transaction) => void) | null = null

  /** 不触发同步的命令 ID 集合（选中、滚动、撤销重做、筛选等） */
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
    'sheet.command.set-filter-range',
    'sheet.command.remove-sheet-filter',
    'sheet.command.smart-toggle-filter',
    'sheet.command.set-filter-criteria',
    'sheet.command.clear-filter-criteria',
    'sheet.command.re-calc-filter',
  ])

  /**
   * 构造绑定器并立即建立双向同步
   *
   * @param doc Yjs 文档实例
   * @param univerAPI Univer API 实例
   */
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

  /**
   * 销毁绑定器，解除 Yjs 监听与命令处理引用
   */
  destroy(): void {
    if (this.yObserver) {
      this.yWorkbook.unobserveDeep(this.yObserver)
      this.yObserver = null
    }
    this.commandHandler = null
  }

  /**
   * 绑定 Yjs 到 Univer 方向，监听 Y.Map 远端变更
   */
  private bindYjsToUniver(): void {
    this.yObserver = (_events, tx) => {
      if (this.isApplyingLocal) return
      if (tx.local) return
      this.pushYDocToUniver()
    }
    this.yWorkbook.observeDeep(this.yObserver)
  }

  /**
   * 将 Y.Doc 当前工作簿推送到 Univer
   *
   * 若当前无工作簿则创建，否则销毁原工作簿后重建以应用远端全量变更。
   */
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
      const localData = !this.syncSort ? currentData : null
      const dataClone = JSON.parse(JSON.stringify(data))
      if (!dataClone.id && unitId) {
        dataClone.id = unitId
      }

      this.stripFilterResources(dataClone)

      if (localData?.sheets && dataClone.sheets) {
        for (const [sheetId, remoteSheet] of Object.entries(dataClone.sheets as Record<string, any>)) {
          const localSheet = localData.sheets?.[sheetId]
          if (!localSheet) continue

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

  /**
   * 主动将当前 Univer 工作簿推送到 Y.Doc
   *
   * @param force 是否强制推送（忽略 skipPushUntil 静默期）
   */
  flushCurrentWorkbook(force = false): void {
    this.pushUniverToYjs(force)
  }

  /**
   * 绑定 Univer 到 Yjs 方向，监听命令执行事件
   */
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

  /**
   * 将 Univer 当前工作簿推送到 Y.Doc
   *
   * 在 syncSort 关闭时，保留远端排序状态不被本地覆盖。
   *
   * @param force 是否强制推送（忽略 skipPushUntil 静默期）
   */
  private pushUniverToYjs(force = false): void {
    if (!force && Date.now() < this.skipPushUntil) return

    const workbook = this.univerAPI.getActiveWorkbook()
    if (!workbook) return

    const current = workbook.save() as Record<string, unknown>
    const currentJson = JSON.stringify(current)

    if (currentJson === this.lastSnapshotJson) return

    this.isApplyingLocal = true
    try {
      this.stripFilterResources(current)

      this.doc.transact(() => {
        this.yWorkbook.clear()
        for (const [key, value] of Object.entries(current)) {
          if (value !== undefined) {
            this.yWorkbook.set(key, value)
          }
        }
      }, this)

      if (!this.syncSort) {
        const remoteData = this.yWorkbook.toJSON() as any
        if (remoteData?.sheets && current.sheets) {
          for (const [sheetId, localSheet] of Object.entries(current.sheets as Record<string, any>)) {
            const remoteSheet = remoteData.sheets?.[sheetId]
            if (!remoteSheet) continue

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

  /**
   * 根据文档 ID 生成 Hocuspocus 文档名
   *
   * @param docId 原始文档 ID
   * @returns 带 excel 前缀的文档名
   */
  static getDocName(docId: string): string {
    return `${EXCEL_DOC_PREFIX}${docId}`
  }

  /**
   * 移除工作簿数据中的筛选插件资源
   *
   * 筛选状态由 ExcelFilterSyncManager 单独同步，避免双向覆盖。
   *
   * @param data 工作簿数据对象
   */
  private stripFilterResources(data: any): void {
    if (!data?.resources) return
    data.resources = data.resources.filter((r: any) => r.name !== 'SHEET_FILTER_PLUGIN')
  }
}
