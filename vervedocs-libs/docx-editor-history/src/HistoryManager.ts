type Draw = any

type HistoryFunction = () => void

const DEFAULT_MAX_RECORD_COUNT = 100

export class HistoryManager {
  private undoStack: HistoryFunction[] = []
  private redoStack: HistoryFunction[] = []
  private maxRecordCount: number
  private _isExecuting: boolean = false

  constructor(draw: Draw) {
    const configMax = draw?.getOptions?.()?.historyMaxRecordCount
    this.maxRecordCount =
      typeof configMax === 'number' && isFinite(configMax) && configMax >= 0
        ? configMax + 1
        : DEFAULT_MAX_RECORD_COUNT + 1
  }

  public undo() {
    if (this._isExecuting) return
    if (this.undoStack.length > 1) {
      const pop = this.undoStack.pop()!
      this.redoStack.push(pop)
      if (this.undoStack.length) {
        this._executeSafely(this.undoStack[this.undoStack.length - 1])
      }
    }
  }

  public redo() {
    if (this._isExecuting) return
    if (this.redoStack.length) {
      const pop = this.redoStack.pop()!
      this.undoStack.push(pop)
      this._executeSafely(pop)
    }
  }

  public pushHistoryRecord(fn: HistoryFunction) {
    if (this._isExecuting) return
    this.undoStack.push(fn)
    if (this.redoStack.length) {
      this.redoStack = []
    }
    while (this.undoStack.length > this.maxRecordCount) {
      this.undoStack.shift()
    }
  }

  private _executeSafely(fn: HistoryFunction) {
    this._isExecuting = true
    try {
      fn()
    } finally {
      this._isExecuting = false
    }
  }

  public execute(fn: HistoryFunction) {
    this.pushHistoryRecord(fn)
  }

  public canUndo(): boolean {
    return this.undoStack.length > 1
  }

  public canRedo(): boolean {
    return !!this.redoStack.length
  }

  public isCanUndo(): boolean {
    return this.canUndo()
  }

  public isCanRedo(): boolean {
    return this.canRedo()
  }

  public isStackEmpty(): boolean {
    return !this.undoStack.length && !this.redoStack.length
  }

  public clearHistory() {
    this.undoStack = []
    this.redoStack = []
  }

  public clear() {
    this.clearHistory()
  }

  public resetHistory() {
    this.clearHistory()
  }

  public recovery() {
    this.clearHistory()
  }

  public popUndo(): HistoryFunction | undefined {
    return this.undoStack.pop()
  }

  public destroy() {
    this.clearHistory()
  }
}
