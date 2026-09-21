/**
 * VerveDocs History —— HistoryComponent
 *
 * 轻载器：创建 HistoryManager 实例，由 core 注入 CommandAdapt。
 */

import { HistoryManager } from './history-manager'

export class HistoryComponent {
  /** 历史管理器实例 */
  private _historyManager: HistoryManager | null = null

  /**
   * 安装历史组件，创建 HistoryManager 实例
   * @param options 配置选项，包含最大记录数与合并时间窗
   * @returns 创建的 HistoryManager 实例
   */
  public install(options?: { maxRecordCount?: number; coalesceMs?: number }): HistoryManager {
    this._historyManager = new HistoryManager(options)
    return this._historyManager
  }

  /**
   * 获取历史管理器实例
   * @returns 当前的 HistoryManager 实例，未安装时返回 null
   */
  public getHistoryManager(): HistoryManager | null {
    return this._historyManager
  }

  /**
   * 销毁历史组件，释放资源
   * @returns 无返回值
   */
  public destroy(): void {
    this._historyManager?.destroy()
    this._historyManager = null
  }
}
