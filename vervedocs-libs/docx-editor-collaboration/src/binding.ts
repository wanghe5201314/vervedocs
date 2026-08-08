/**
 * Y.Doc ↔ 编辑器文档快照绑定
 *
 * 统一处理：
 * - 正文 main elements
 * - 批注 comments
 *
 * 正文和批注仍然来自不同的本地事件源，但最终都会收敛到同一个
 * 绑定器里完成 JSON diff、Yjs 写入和远端回填，避免维护两套同步链路。
 */
import * as Y from 'yjs'
import { compare, type Operation } from 'fast-json-patch'
import type {
  CollaborationComment,
  CommentComponentBridge,
  EditorInterface,
} from './types'
import { subscribeEventBus } from './event-bus'

export class YjsBinding {
  private doc: Y.Doc
  private editor: EditorInterface
  private yElements: Y.Array<Y.Map<unknown>>
  private yComments: Y.Array<Y.Map<unknown>>
  private commentBridge: CommentComponentBridge | null

  /** 是否正在把远程变更写入编辑器（防回环） */
  private isApplyingRemote = false
  /** 是否正在把本地编辑写入 Y.Doc（防回环） */
  private isApplyingLocal = false

  /** 上一次同步到编辑器的正文快照（用于 diff） */
  private lastContentSnapshot: Record<string, unknown>[] = []
  /** 上一次同步到桥接层的批注快照（用于 diff） */
  private lastCommentsSnapshot: CollaborationComment[] = []

  /** 编辑器事件回调引用 */
  private contentChangeHandler: (() => void) | null = null
  private contentChangeSubscription: { unsubscribe: () => void } | null = null
  /** Y.Array observe 回调引用 */
  private yContentObserver: ((event: Y.YArrayEvent<Y.Map<unknown>>, tx: Y.Transaction) => void) | null = null
  private yCommentsObserver: ((event: Y.YArrayEvent<Y.Map<unknown>>, tx: Y.Transaction) => void) | null = null

  constructor(doc: Y.Doc, editor: EditorInterface, commentBridge: CommentComponentBridge | null = null) {
    this.doc = doc
    this.editor = editor
    this.yElements = doc.getArray<Y.Map<unknown>>('elements')
    this.yComments = doc.getArray<Y.Map<unknown>>('comments')
    this.commentBridge = commentBridge

    this.bindYjsToEditor()
    this.bindEditorToYjs()

    // 如果 Y.Doc 已有内容（Hocuspocus 从服务端加载），先推送到编辑器
    if (this.yElements.length > 0) {
      this.pushContentFromYDocToEditor()
    }
    if (this.commentBridge) {
      if (this.yComments.length > 0) {
        this.pushCommentsFromYDocToBridge()
      } else {
        this.syncCommentsFromBridge()
      }
    }
  }

  destroy(): void {
    if (this.yContentObserver) {
      this.yElements.unobserveDeep(this.yContentObserver as any)
      this.yContentObserver = null
    }
    if (this.yCommentsObserver) {
      this.yComments.unobserveDeep(this.yCommentsObserver as any)
      this.yCommentsObserver = null
    }
    this.contentChangeSubscription?.unsubscribe()
    this.contentChangeSubscription = null
    this.contentChangeHandler = null
    this.commentBridge = null
  }

  // ---- Y.Doc → Editor ----

  private bindYjsToEditor(): void {
    this.yContentObserver = (_event, tx) => {
      // 忽略本地写入引起的变更
      if (this.isApplyingLocal) return
      // 忽略本地 origin 的事务（由 pushEditorToYDoc 发起）
      if (tx.local) return
      this.pushContentFromYDocToEditor()
    }
    this.yElements.observeDeep(this.yContentObserver as any)

    this.yCommentsObserver = (_event, tx) => {
      if (this.isApplyingLocal) return
      if (tx.local) return
      this.pushCommentsFromYDocToBridge()
    }
    this.yComments.observeDeep(this.yCommentsObserver as any)
  }

  /** 将 Y.Doc 当前正文推送到编辑器 */
  private pushContentFromYDocToEditor(): void {
    this.isApplyingRemote = true
    try {
      const elements = this.yElements.toJSON() as Record<string, unknown>[]
      this.editor.command.executeSetValue({ main: elements as any }, { isSetCursor: false })
      this.lastContentSnapshot = this.cloneSerializable(elements)
      if (this.commentBridge && this.lastCommentsSnapshot.length > 0) {
        this.commentBridge.render()
      }
    } finally {
      this.isApplyingRemote = false
    }
  }

  private pushCommentsFromYDocToBridge(): void {
    if (!this.commentBridge) {
      this.lastCommentsSnapshot = this.readCommentsSnapshotFromYDoc()
      return
    }

    const comments = this.readCommentsSnapshotFromYDoc()
    this.isApplyingRemote = true
    try {
      this.commentBridge.setComments(this.cloneSerializable(comments))
      this.commentBridge.render()
      this.lastCommentsSnapshot = this.cloneSerializable(comments)
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

    const operations = compare(this.lastContentSnapshot, current)
    if (!operations.length) return

    this.isApplyingLocal = true
    try {
      this.doc.transact(() => {
        this.applyPatchToYArray(this.yElements, operations, current)
      }, this) // origin = this 表示本地事务
      this.lastContentSnapshot = this.cloneSerializable(current)
    } finally {
      this.isApplyingLocal = false
    }
  }

  bindCommentBridge(commentBridge: CommentComponentBridge | null): void {
    this.commentBridge = commentBridge
    if (!this.commentBridge) {
      return
    }

    if (this.yComments.length > 0) {
      this.pushCommentsFromYDocToBridge()
      return
    }

    this.syncCommentsFromBridge()
  }

  syncCommentsFromBridge(): void {
    if (!this.commentBridge || this.isApplyingRemote) return

    const current = this.sanitizeComments(this.commentBridge.getComments())
    const operations = compare(this.lastCommentsSnapshot, current)
    if (!operations.length) {
      this.lastCommentsSnapshot = this.cloneSerializable(current)
      return
    }

    this.isApplyingLocal = true
    try {
      this.doc.transact(() => {
        this.applyPatchToYArray(this.yComments, operations, current as unknown as Record<string, unknown>[])
      }, this)
      this.lastCommentsSnapshot = this.cloneSerializable(current)
    } finally {
      this.isApplyingLocal = false
    }
  }

  private applyPatchToYArray(
    yArray: Y.Array<Y.Map<unknown>>,
    operations: Operation[],
    current: Record<string, unknown>[]
  ): void {
    const rootReplaceIndexes = new Set<number>()

    for (const operation of operations) {
      const index = this.getTopLevelIndex(operation.path)
      if (index === null) continue

      if (!this.isTopLevelOperation(operation.path)) {
        rootReplaceIndexes.add(index)
        continue
      }

      this.applyTopLevelOperation(yArray, index, operation, current)
    }

    for (const index of Array.from(rootReplaceIndexes).sort((a, b) => a - b)) {
      const rootValue = current[index]
      if (!rootValue || Array.isArray(rootValue)) {
        continue
      }
      this.replaceElementAtIndex(yArray, index, this.jsonToYMap(rootValue))
    }
  }

  private isTopLevelOperation(path: string): boolean {
    return path.split('/').length <= 2
  }

  private applyTopLevelOperation(
    yArray: Y.Array<Y.Map<unknown>>,
    index: number,
    operation: Operation,
    current: Record<string, unknown>[]
  ): void {
      if (operation.op === 'remove') {
        if (index < yArray.length) {
          yArray.delete(index, 1)
        }
        return
      }

      if (operation.op === 'add' || operation.op === 'replace') {
        const rootValue = this.getRootValueFromOperation(operation, current)
        if (!rootValue || Array.isArray(rootValue)) {
          return
        }
        const yMap = this.jsonToYMap(rootValue)
        if (operation.op === 'add') {
          yArray.insert(index, [yMap])
        } else {
          this.replaceElementAtIndex(yArray, index, yMap)
        }
      }
  }

  private replaceElementAtIndex(
    yArray: Y.Array<Y.Map<unknown>>,
    index: number,
    yMap: Y.Map<unknown>
  ): void {
    if (index < yArray.length) {
      yArray.delete(index, 1)
    }
    yArray.insert(index, [yMap])
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


  private cloneSerializable<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return Object.prototype.toString.call(value) === '[object Object]'
  }

  private jsonToYValue(value: unknown): unknown {
    if (value === undefined) {
      return undefined
    }
    if (Array.isArray(value)) {
      const yArr = new Y.Array<unknown>()
      const items = value
        .map(item => this.jsonToYValue(item))
        .filter((item): item is Exclude<typeof item, undefined> => item !== undefined)
      if (items.length) {
        yArr.insert(0, items)
      }
      return yArr
    }
    if (this.isPlainObject(value)) {
      return this.jsonToYMap(value)
    }
    return value
  }

  /** 将普通 JSON 对象转换为 Y.Map（递归处理嵌套对象和数组） */
  private jsonToYMap(obj: Record<string, unknown>): Y.Map<unknown> {
    const yMap = new Y.Map<unknown>()
    for (const [key, value] of Object.entries(obj)) {
      const yValue = this.jsonToYValue(value)
      if (yValue === undefined) continue
      yMap.set(key, yValue)
    }
    return yMap
  }

  private readCommentsSnapshotFromYDoc(): CollaborationComment[] {
    const comments = this.yComments.toJSON() as CollaborationComment[]
    return this.sanitizeComments(comments)
  }

  private sanitizeComments(comments: CollaborationComment[]): CollaborationComment[] {
    return comments
      .map(comment => this.sanitizeComment(comment))
      .filter(comment => Boolean(comment.id))
  }

  private sanitizeComment(comment: CollaborationComment): CollaborationComment {
    const replies = Array.isArray(comment.replies)
      ? comment.replies
        .map(reply => this.sanitizeComment(reply))
        .filter(reply => Boolean(reply.id))
      : undefined

    return {
      id: String(comment.id || ''),
      groupId: String(comment.groupId || comment.id || ''),
      content: String(comment.content || ''),
      userName: String(comment.userName || '未知用户'),
      avatarColor: comment.avatarColor ? String(comment.avatarColor) : undefined,
      createdDate: String(comment.createdDate || ''),
      rangeText: String(comment.rangeText || ''),
      status: typeof comment.status === 'number' ? comment.status : undefined,
      replies: replies?.length ? replies : undefined,
    }
  }
}
