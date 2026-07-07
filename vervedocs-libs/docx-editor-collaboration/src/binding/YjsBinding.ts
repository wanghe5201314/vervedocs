/**
 * Y.Doc ↔ EditorInterface 双向绑定
 *
 * 职责：
 *  - 监听 Y.Array<Y.Map>("elements") 变化 → 推送到编辑器
 *  - 监听编辑器 contentChange → 回写到 Y.Doc
 *
 *  设计说明：
 *  编辑器以 IElement[] 扁平数组为数据模型（字符级），Y.Doc 用
 *  Y.Array<Y.Map> 一一对应。增量同步采用 JSON Patch（RFC 6902）
 *  计算差异并映射到 Y.Array，尽可能减少全量重写。
 */
import * as Y from 'yjs'
import { compare, type Operation } from 'fast-json-patch'
import type { EditorInterface } from '../types'

/** 需要作为 Y.Array 嵌套的数组字段 */
const NESTED_ARRAY_KEYS = new Set([
  'valueList', 'trList', 'tdList', 'colgroup',
])

function subscribeEventBus(
  eventBus: EditorInterface['eventBus'],
  event: string,
  handler: (...args: unknown[]) => void
): { unsubscribe: () => void } {
  if (typeof (eventBus as any).select === 'function') {
    return (eventBus as any).select(event).subscribe(handler)
  }
  if (typeof (eventBus as any).on === 'function') {
    ;(eventBus as any).on(event, handler)
    return {
      unsubscribe: () => {
        if (typeof (eventBus as any).off === 'function') {
          ;(eventBus as any).off(event, handler)
        }
      }
    }
  }
  return { unsubscribe: () => {} }
}

export class YjsBinding {
  private doc: Y.Doc
  private editor: EditorInterface
  private yElements: Y.Array<Y.Map<unknown>>

  /** 是否正在把远程变更写入编辑器（防回环） */
  private isApplyingRemote = false
  /** 是否正在把本地编辑写入 Y.Doc（防回环） */
  private isApplyingLocal = false

  /** 上一次同步到编辑器的快照（用于 diff） */
  private lastSnapshot: Record<string, unknown>[] = []

  /** 编辑器事件回调引用 */
  private contentChangeHandler: (() => void) | null = null
  private contentChangeSubscription: { unsubscribe: () => void } | null = null
  /** Y.Array observe 回调引用 */
  private yObserver: ((event: Y.YArrayEvent<Y.Map<unknown>>, tx: Y.Transaction) => void) | null = null

  constructor(doc: Y.Doc, editor: EditorInterface) {
    this.doc = doc
    this.editor = editor
    this.yElements = doc.getArray<Y.Map<unknown>>('elements')

    this.bindYjsToEditor()
    this.bindEditorToYjs()

    // 如果 Y.Doc 已有内容（Hocuspocus 从服务端加载），先推送到编辑器
    if (this.yElements.length > 0) {
      this.pushYDocToEditor()
    }
  }

  destroy(): void {
    if (this.yObserver) {
      this.yElements.unobserve(this.yObserver)
      this.yObserver = null
    }
    this.contentChangeSubscription?.unsubscribe()
    this.contentChangeSubscription = null
    this.contentChangeHandler = null
  }

  // ---- Y.Doc → Editor ----

  private bindYjsToEditor(): void {
    this.yObserver = (_event, tx) => {
      // 忽略本地写入引起的变更
      if (this.isApplyingLocal) return
      // 忽略本地 origin 的事务（由 pushEditorToYDoc 发起）
      if (tx.local) return
      this.pushYDocToEditor()
    }
    this.yElements.observeDeep(this.yObserver as any)
  }

  /** 将 Y.Doc 当前内容推送到编辑器 */
  private pushYDocToEditor(): void {
    this.isApplyingRemote = true
    try {
      const elements = this.yElements.toJSON() as Record<string, unknown>[]
      this.editor.command.executeSetValue({ main: elements as any }, { isSetCursor: false })
      this.lastSnapshot = elements
    } finally {
      this.isApplyingRemote = false
    }
  }

  // ---- Editor → Y.Doc ----

  private bindEditorToYjs(): void {
    this.contentChangeHandler = () => {
      if (this.isApplyingRemote) return
      this.pushEditorToYDoc()
    }
    this.contentChangeSubscription = subscribeEventBus(
      this.editor.eventBus,
      'contentChange',
      this.contentChangeHandler as any
    )
  }

  /** 将编辑器当前内容全量同步到 Y.Doc */
  private pushEditorToYDoc(): void {
    const value = this.editor.command.getValue()
    const current = (value.data.main ?? []) as Record<string, unknown>[]

    const operations = compare(this.lastSnapshot, current)
    if (!operations.length) return

    this.isApplyingLocal = true
    try {
      this.doc.transact(() => {
        this.applyPatchToYArray(this.yElements, operations, current)
      }, this) // origin = this 表示本地事务
      this.lastSnapshot = this.cloneSnapshot(current)
    } finally {
      this.isApplyingLocal = false
    }
  }

  private applyPatchToYArray(
    yArray: Y.Array<Y.Map<unknown>>,
    operations: Operation[],
    current: Record<string, unknown>[]
  ): void {
    for (const operation of operations) {
      const index = this.getTopLevelIndex(operation.path)
      if (index === null) continue

      if (operation.op === 'remove') {
        if (index < yArray.length) {
          yArray.delete(index, 1)
        }
        continue
      }

      if (operation.op === 'add' || operation.op === 'replace') {
        const rootValue = this.getRootValueFromOperation(operation, current)
        if (!rootValue || Array.isArray(rootValue)) {
          continue
        }
        const yMap = this.jsonToYMap(rootValue)
        if (operation.op === 'add') {
          yArray.insert(index, [yMap])
        } else {
          if (index < yArray.length) {
            yArray.delete(index, 1)
          }
          yArray.insert(index, [yMap])
        }
      }
    }
  }

  private getTopLevelIndex(path: string): number | null {
    const pathSegment = path.split('/')[1]
    if (!pathSegment) return null
    const index = Number(pathSegment)
    return Number.isInteger(index) ? index : null
  }

  private getRootValueFromOperation(
    operation: Operation,
    current: Record<string, unknown>[]
  ): Record<string, unknown> | null {
    if (operation.path.split('/').length <= 2) {
      const value = (operation as { value?: unknown }).value
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>
      }
    }
    const topIndex = this.getTopLevelIndex(operation.path)
    if (topIndex !== null && current[topIndex] && typeof current[topIndex] === 'object') {
      return current[topIndex]
    }
    return null
  }

  private cloneSnapshot(arr: Record<string, unknown>[]): Record<string, unknown>[] {
    return JSON.parse(JSON.stringify(arr))
  }

  /** 将普通 JSON 对象转换为 Y.Map（递归处理嵌套数组） */
  private jsonToYMap(obj: Record<string, unknown>): Y.Map<unknown> {
    const yMap = new Y.Map<unknown>()
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined || value === null) continue
      if (NESTED_ARRAY_KEYS.has(key) && Array.isArray(value)) {
        const yArr = new Y.Array<Y.Map<unknown>>()
        const children = value.map((child: Record<string, unknown>) => this.jsonToYMap(child))
        yArr.insert(0, children)
        yMap.set(key, yArr)
      } else {
        yMap.set(key, value)
      }
    }
    return yMap
  }
}
