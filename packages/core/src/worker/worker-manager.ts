import { DOCX_EDITOR_DATA_VERSION, DOCX_EDITOR_SCHEMA_VERSION, getTextFromElementList } from '@vervedoc/docx-editor-schema'
import type { IEditorResult, IElement, IGetValueOption } from '@vervedoc/docx-editor-schema'
import { ElementType } from '@vervedoc/docx-editor-schema'
import RuntimeWorker from './runtime.worker?worker&inline'
import type { IWorkerRequest, IWorkerResponse, IWorkerTaskPayload, WorkerRequestType } from './worker-message'

type Draw = any

interface IPendingTask<T> {
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: unknown) => void
}

function collectGroupIds(elementList: IElement[], groupIdSet = new Set<string>(), result: string[] = []) {
  for (const element of elementList) {
    if (Array.isArray(element?.groupIds)) {
      for (const groupId of element.groupIds) {
        if (groupId && !groupIdSet.has(groupId)) {
          groupIdSet.add(groupId)
          result.push(groupId)
        }
      }
    }
    if (element?.type === ElementType.TABLE) {
      for (const tr of element.trList || []) {
        for (const td of tr.tdList || []) {
          collectGroupIds(td.value || [], groupIdSet, result)
        }
      }
      continue
    }
    if (Array.isArray(element?.valueList)) {
      collectGroupIds(element.valueList, groupIdSet, result)
    }
  }
  return result
}

export class WorkerManager {
  private readonly draw: Draw
  private worker: Worker | null = null
  private readonly pendingTaskMap = new Map<string, IPendingTask<any>>()
  private readonly warnedFallbackSet = new Set<string>()
  private requestSeed = 0

  constructor(draw: Draw) {
    this.draw = draw
    this._initWorker()
  }

  public getValue(options?: IGetValueOption): Promise<IEditorResult> {
    return this._runTask<IEditorResult>(
      'getValue',
      {
        dataVersion: DOCX_EDITOR_DATA_VERSION,
        schemaVersion: DOCX_EDITOR_SCHEMA_VERSION,
        editorOptions: this.draw.getOptions(),
        valueOptions: options,
        originData: this.draw.getOriginValue(options)
      },
      () => Promise.resolve(this.draw.getValue(options))
    )
  }

  public getGroupIds(): Promise<string[]> {
    return this._runTask<string[]>(
      'getGroupIds',
      {
        dataVersion: DOCX_EDITOR_DATA_VERSION,
        schemaVersion: DOCX_EDITOR_SCHEMA_VERSION,
        mainElementList: this.draw.getOriginalMainElementList()
      },
      () => Promise.resolve(collectGroupIds(this.draw.getOriginalMainElementList()))
    )
  }

  public getWordCount(): Promise<number> {
    return this._runTask<number>(
      'getWordCount',
      {
        dataVersion: DOCX_EDITOR_DATA_VERSION,
        schemaVersion: DOCX_EDITOR_SCHEMA_VERSION,
        mainElementList: this.draw.getOriginalMainElementList()
      },
      () => {
        const text = getTextFromElementList(this.draw.getOriginalMainElementList()).replace(/\u200B/g, '')
        return Promise.resolve(text.replace(/\s/g, '').length)
      }
    )
  }

  public terminate(): void {
    this.worker?.terminate()
    this.worker = null
    this._rejectPendingTasks(new Error('Worker terminated'))
  }

  private _initWorker() {
    if (typeof Worker === 'undefined') {
      this._warnFallback('worker-unavailable', '当前环境不支持 Worker，已降级为主线程执行。')
      return
    }
    try {
      this.worker = new RuntimeWorker()
      this.worker.onmessage = this._handleMessage
      this.worker.onerror = this._handleError
    } catch (error) {
      this.worker = null
      this._warnFallback(
        'worker-init-failed',
        `Worker 初始化失败，已降级为主线程执行。`,
        error
      )
    }
  }

  private _handleMessage = (event: MessageEvent<IWorkerResponse>) => {
    const { id, success, data, error } = event.data
    const pendingTask = this.pendingTaskMap.get(id)
    if (!pendingTask) return
    this.pendingTaskMap.delete(id)
    if (success) {
      pendingTask.resolve(data)
    } else {
      pendingTask.reject(new Error(error || 'Worker task failed'))
    }
  }

  private _handleError = () => {
    this._warnFallback('worker-runtime-error', 'Worker 运行时异常，后续任务将降级为主线程执行。')
    this.terminate()
  }

  private _runTask<T>(
    type: WorkerRequestType,
    payload: IWorkerTaskPayload,
    fallback: () => Promise<T>
  ): Promise<T> {
    if (!this.worker) {
      this._warnFallback(`fallback-${type}`, `${type} 未使用 Worker，已降级为主线程执行。`)
      return fallback()
    }
    const id = `${Date.now()}-${this.requestSeed++}`
    const request: IWorkerRequest = { id, type, payload }
    return new Promise<T>((resolve, reject) => {
      this.pendingTaskMap.set(id, { resolve, reject })
      try {
        this.worker!.postMessage(request)
      } catch (error) {
        this.pendingTaskMap.delete(id)
        reject(error)
      }
    }).catch((error) => {
      this._warnFallback(`fallback-${type}`, `${type} 的 Worker 执行失败，已降级为主线程执行。`, error)
      return fallback()
    })
  }

  private _rejectPendingTasks(error: Error) {
    for (const [, pendingTask] of this.pendingTaskMap) {
      pendingTask.reject(error)
    }
    this.pendingTaskMap.clear()
  }

  private _warnFallback(key: string, message: string, error?: unknown) {
    if (this.warnedFallbackSet.has(key)) return
    this.warnedFallbackSet.add(key)
    if (error) {
      console.warn(`[WorkerManager] ${message}`, error)
    } else {
      console.warn(`[WorkerManager] ${message}`)
    }
  }
}
