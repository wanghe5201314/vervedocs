import type { IElement, PathSegment } from '@vervedoc/docx-editor-schema'
import { cloneTree } from '@vervedoc/docx-editor-schema'
import { computeToc, computeSearch } from './compute'

export interface TocResult {
  toc: { id: string; level: number; name: string; number?: string }[]
}
export interface SearchResult {
  results: { path: PathSegment[]; offset: number; length: number }[]
  count: number
}
type TocListener = (result: TocResult) => void
type SearchListener = (result: SearchResult) => void
type CloneListener = (data: unknown) => void
type ErrorListener = (message: string) => void

export class WorkerManager {
  private worker: Worker | null = null
  private failed = false
  private destroyed = false
  private pending = false
  private elements: IElement[] = []
  private tocListeners = new Set<TocListener>()
  private searchListeners = new Set<SearchListener>()
  private cloneListeners = new Set<CloneListener>()
  private errorListeners = new Set<ErrorListener>()

  init(): void {
    if (this.worker || this.failed || this.destroyed) return
    try {
      this.worker = new Worker(new URL('./editor-worker.ts', import.meta.url), { type: 'module' })
      this.worker.onmessage = (e: MessageEvent) => {
        const msg = e.data
        switch (msg.type) {
          case 'toc-result': this.tocListeners.forEach(fn => fn({ toc: msg.toc })); break
          case 'search-result': this.searchListeners.forEach(fn => fn({ results: msg.results, count: msg.count })); break
          case 'clone-result': this.cloneListeners.forEach(fn => fn(msg.data)); break
          case 'error': this.fallback(msg.message); break
        }
      }
      this.worker.onerror = e => this.fallback(e.message)
      this.worker.onmessageerror = () => this.fallback('Worker message could not be decoded')
    } catch (error) {
      this.failed = true
      this.errorListeners.forEach(fn => fn(String(error)))
    }
  }

  private fallback(message: string): void {
    this.worker?.terminate()
    this.worker = null
    this.failed = true
    this.errorListeners.forEach(fn => fn(message))
    const result = computeToc(this.elements)
    this.tocListeners.forEach(fn => fn(result))
  }

  updateElements(elements: IElement[]): void {
    if (this.destroyed) return
    this.elements = elements
    if (this.pending) return
    this.pending = true
    queueMicrotask(() => this.flush())
  }

  private flush(): void {
    if (!this.pending || this.destroyed) return
    this.pending = false
    this.init()
    if (this.worker) {
      try { this.worker.postMessage({ type: 'update', elements: this.elements }) }
      catch (error) { this.fallback(String(error)) }
    } else {
      const result = computeToc(this.elements)
      this.tocListeners.forEach(fn => fn(result))
    }
  }

  search(keyword: string): void {
    if (this.destroyed) return
    this.flush()
    this.init()
    if (this.worker) {
      try { this.worker.postMessage({ type: 'search', keyword }); return }
      catch (error) { this.fallback(String(error)) }
    }
    const result = computeSearch(this.elements, keyword)
    this.searchListeners.forEach(fn => fn(result))
  }

  clone(data: unknown): void {
    if (this.destroyed) return
    this.init()
    if (this.worker) {
      try { this.worker.postMessage({ type: 'clone', data }); return }
      catch (error) { this.fallback(String(error)) }
    }
    const result = cloneTree(data)
    this.cloneListeners.forEach(fn => fn(result))
  }

  onTocResult(listener: TocListener): () => void {
    this.tocListeners.add(listener)
    return () => this.tocListeners.delete(listener)
  }
  onSearchResult(listener: SearchListener): () => void {
    this.searchListeners.add(listener)
    return () => this.searchListeners.delete(listener)
  }
  onCloneResult(listener: CloneListener): () => void {
    this.cloneListeners.add(listener)
    return () => this.cloneListeners.delete(listener)
  }
  onError(listener: ErrorListener): () => void {
    this.errorListeners.add(listener)
    return () => this.errorListeners.delete(listener)
  }
  destroy(): void {
    this.destroyed = true
    this.worker?.terminate()
    this.worker = null
    this.elements = []
    this.tocListeners.clear()
    this.searchListeners.clear()
    this.cloneListeners.clear()
    this.errorListeners.clear()
  }
}
