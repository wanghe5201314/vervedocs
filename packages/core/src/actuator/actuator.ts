export interface AutoSaveOptions {
  interval?: number
  enabled?: boolean
  isReadonly?: () => boolean
  onSave: (content: any) => void | Promise<void>
  getContent: () => any
}

export class Actuator {
  private _saveTimer: ReturnType<typeof setTimeout> | null = null
  private _saving = false
  private _pendingSave = false
  private _autoSaveOptions: AutoSaveOptions | null = null

  public install(): this {
    return this
  }

  public configureAutoSave(options: AutoSaveOptions): void {
    this._autoSaveOptions = {
      interval: 800,
      enabled: true,
      ...options
    }
  }

  public async saveNow(_options?: { silent?: boolean }): Promise<void> {
    if (this._saving) {
      this._pendingSave = true
      return
    }
    if (!this._autoSaveOptions) return
    if (this._autoSaveOptions.isReadonly?.()) return

    const content = this._autoSaveOptions.getContent()
    if (!content) return

    this._saving = true
    this._pendingSave = false
    try {
      await this._autoSaveOptions.onSave(content)
    } finally {
      this._saving = false
      if (this._pendingSave) this.scheduleSave()
    }
  }

  public scheduleSave(): void {
    if (!this._autoSaveOptions || !this._autoSaveOptions.enabled) return
    if (this._autoSaveOptions.isReadonly?.()) return
    if (this._saveTimer) clearTimeout(this._saveTimer)
    this._saveTimer = setTimeout(() => {
      void this.saveNow({ silent: true })
    }, this._autoSaveOptions.interval || 800)
  }

  public stopAutoSave(): void {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer)
      this._saveTimer = null
    }
  }

  public isSaving(): boolean {
    return this._saving
  }

  public destroy(): void {
    this.stopAutoSave()
    this._autoSaveOptions = null
  }
}
