/**
 * VerveDocs History —— HistoryComponent
 *
 * 轻载器：创建 HistoryManager 实例，由 core 注入 CommandAdapt。
 */

import { HistoryManager } from './history-manager'

export class HistoryComponent {
  private _historyManager: HistoryManager | null = null

  public install(options?: { maxRecordCount?: number; coalesceMs?: number }): HistoryManager {
    this._historyManager = new HistoryManager(options)
    return this._historyManager
  }

  public getHistoryManager(): HistoryManager | null {
    return this._historyManager
  }

  public destroy(): void {
    this._historyManager?.destroy()
    this._historyManager = null
  }
}
