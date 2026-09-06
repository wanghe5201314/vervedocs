/**
 * VerveDocs Core —— Worker 管理器
 *
 * 管理 Worker 实例，提供事件订阅 API。
 * Worker 是核心计算引擎，主动推送计算结果。
 * 主线程通过 onTocResult / onSearchResult 订阅结果。
 */

import type { IElement, PathSegment } from '@vervedoc/docx-editor-schema'

/** 目录结果 */
export interface TocResult {
  /** 目录项列表 */
  toc: { id: string; level: number; name: string; number?: string }[]
}

/** 搜索结果 */
export interface SearchResult {
  /** 匹配结果列表 */
  results: { path: PathSegment[]; offset: number; length: number }[]
  /** 匹配总数 */
  count: number
}

/** 监听器回调类型 */
type TocListener = (result: TocResult) => void
type SearchListener = (result: SearchResult) => void
type CloneListener = (data: unknown) => void
type ErrorListener = (message: string) => void

/**
 * Worker 管理器
 *
 * 管理 Worker 生命周期和消息分发。
 * 主线程通过订阅方法监听 Worker 推送的计算结果。
 */
export class WorkerManager {
  /** Worker 实例 */
  private worker: Worker | null = null
  /** 目录结果监听器集合 */
  private tocListeners: Set<TocListener> = new Set()
  /** 搜索结果监听器集合 */
  private searchListeners: Set<SearchListener> = new Set()
  /** 深拷贝结果监听器集合 */
  private cloneListeners: Set<CloneListener> = new Set()
  /** 错误监听器集合 */
  private errorListeners: Set<ErrorListener> = new Set()

  /**
   * 初始化 Worker，绑定消息处理
   */
  init(): void {
    if (this.worker) return
    try {
      this.worker = new Worker(new URL('./editor-worker.ts', import.meta.url), { type: 'module' })
      this.worker.onmessage = (e: MessageEvent) => {
        const msg = e.data
        switch (msg.type) {
          case 'toc-result':
            this.tocListeners.forEach(fn => fn({ toc: msg.toc }))
            break
          case 'search-result':
            this.searchListeners.forEach(fn => fn({ results: msg.results, count: msg.count }))
            break
          case 'clone-result':
            this.cloneListeners.forEach(fn => fn(msg.data))
            break
          case 'error':
            this.errorListeners.forEach(fn => fn(msg.message))
            break
        }
      }
      this.worker.onerror = (e) => {
        this.errorListeners.forEach(fn => fn(e.message))
      }
    } catch {
      // Worker 创建失败时静默降级到主线程
    }
  }

  /**
   * 通知 Worker 文档数据更新，Worker 自动重新计算目录
   * @param elements 文档元素列表
   */
  updateElements(elements: IElement[]): void {
    this.init()
    this.worker?.postMessage({ type: 'update', elements })
  }

  /**
   * 通知 Worker 执行搜索
   * @param keyword 搜索关键词
   */
  search(keyword: string): void {
    this.init()
    this.worker?.postMessage({ type: 'search', keyword })
  }

  /**
   * 通知 Worker 执行深拷贝
   * @param data 需要深拷贝的数据
   */
  clone(data: unknown): void {
    this.init()
    this.worker?.postMessage({ type: 'clone', data })
  }

  /**
   * 订阅目录计算结果
   * @param listener 目录结果回调
   * @returns 取消订阅函数
   */
  onTocResult(listener: TocListener): () => void {
    this.tocListeners.add(listener)
    return () => this.tocListeners.delete(listener)
  }

  /**
   * 订阅搜索结果
   * @param listener 搜索结果回调
   * @returns 取消订阅函数
   */
  onSearchResult(listener: SearchListener): () => void {
    this.searchListeners.add(listener)
    return () => this.searchListeners.delete(listener)
  }

  /**
   * 订阅深拷贝结果
   * @param listener 深拷贝结果回调
   * @returns 取消订阅函数
   */
  onCloneResult(listener: CloneListener): () => void {
    this.cloneListeners.add(listener)
    return () => this.cloneListeners.delete(listener)
  }

  /**
   * 订阅错误
   * @param listener 错误回调
   * @returns 取消订阅函数
   */
  onError(listener: ErrorListener): () => void {
    this.errorListeners.add(listener)
    return () => this.errorListeners.delete(listener)
  }

  /**
   * 销毁 Worker，释放资源
   */
  destroy(): void {
    this.worker?.terminate()
    this.worker = null
    this.tocListeners.clear()
    this.searchListeners.clear()
    this.cloneListeners.clear()
    this.errorListeners.clear()
  }
}