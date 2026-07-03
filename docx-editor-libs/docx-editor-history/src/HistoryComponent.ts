import { HistoryManager } from './HistoryManager'

type Draw = any

export class HistoryComponent {
  private _historyManager: HistoryManager | null = null

  public install(draw: Draw): this {
    this._historyManager = new HistoryManager(draw)
    draw.setHistoryManager(this._historyManager)
    return this
  }

  public getHistoryManager(): HistoryManager | null {
    return this._historyManager
  }
}
