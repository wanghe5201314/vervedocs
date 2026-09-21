/** Background composition is isolated from document search/TOC work. */
export class ThumbnailManager {
  private worker: Worker | null = null
  private epoch = 0
  private sources: string[] = []
  private color = ''
  private scheduled = false
  private sourcesDirty = false
  private disposed = false
  private failed = false
  private invalidated = false

  constructor(private publish: (images: string[]) => void) {}

  invalidate(): void {
    this.epoch++
    this.color = ''
    this.invalidated = true
  }

  update(sources: string[], color: string): void {
    if (this.disposed || this.failed) return
    this.invalidated = false
    const changed = sources.length !== this.sources.length || sources.some((value, i) => value !== this.sources[i])
    if (!changed && color === this.color) return
    this.sources = sources
    this.color = color
    this.sourcesDirty ||= changed
    this.epoch++
    if (this.scheduled) return
    this.scheduled = true
    queueMicrotask(() => this.flush())
  }

  private flush(): void {
    this.scheduled = false
    if (this.disposed || this.failed || this.invalidated) return
    try {
      if (!this.worker) {
        this.worker = new Worker(new URL('./thumbnail-worker.ts', import.meta.url), { type: 'module' })
        this.worker.onmessage = (event: MessageEvent<{ id: number; images?: string[]; error?: string }>) => {
          if (this.disposed || event.data.id !== this.epoch) return
          if (event.data.error) { this.fail(event.data.error); return }
          if (event.data.images) this.publish(event.data.images)
        }
        this.worker.onerror = event => this.fail(event.message)
        this.worker.onmessageerror = () => this.fail('Thumbnail worker message could not be decoded')
      }
      this.worker.postMessage({
        id: this.epoch, color: this.color,
        ...(this.sourcesDirty ? { sources: this.sources } : {})
      })
      this.sourcesDirty = false
    } catch (error) {
      this.fail(String(error))
    }
  }

  private fail(message: string): void {
    this.failed = true
    this.worker?.terminate()
    this.worker = null
    // Keep existing previews rather than falling back to blocking page rendering.
    console.warn('[VerveDocs] Background thumbnails unavailable:', message)
  }

  destroy(): void {
    this.disposed = true
    this.epoch++
    this.worker?.terminate()
    this.worker = null
    this.sources = []
  }
}
