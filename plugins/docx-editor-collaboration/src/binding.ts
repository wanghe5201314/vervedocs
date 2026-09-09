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


/**
 * Yjs 与编辑器双向绑定器
 *
 * 维护 Y.Doc 中正文与批注两个 Y.Array，监听编辑器内容变更并 diff 同步到 Yjs，
 * 同时监听 Yjs 远端变更并回填到编辑器，使用 isApplyingRemote/isApplyingLocal 防回环。
 */
export class YjsBinding {
  /** Yjs 文档实例 */
  private doc: Y.Doc
  /** 编辑器接口 */
  private editor: EditorInterface
  /** 正文元素 Y.Array */
  private yElements: Y.Array<Y.Map<unknown>>
  /** 批注 Y.Array */
  private yComments: Y.Array<Y.Map<unknown>>
  /** 批注组件桥接层（可选） */
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
  /** 编辑器事件订阅句柄 */
  private contentChangeSubscription: { unsubscribe: () => void } | null = null
  /** Y.Array observe 回调引用 */
  private yContentObserver: ((event: Y.YArrayEvent<Y.Map<unknown>>, tx: Y.Transaction) => void) | null = null
  /** 批注 Y.Array observe 回调引用 */
  private yCommentsObserver: ((event: Y.YArrayEvent<Y.Map<unknown>>, tx: Y.Transaction) => void) | null = null

  /**
   * 构造绑定器并立即建立双向同步
   *
   * @param doc Yjs 文档实例
   * @param editor 编辑器接口
   * @param commentBridge 批注组件桥接层（可选，不传则不同步批注）
   */
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

  /**
   * 销毁绑定器，解除所有监听与订阅
   */
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

  /**
   * 绑定 Yjs 到编辑器方向，监听 Y.Array 远端变更
   */
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

  /**
   * 将 Y.Doc 当前批注推送到桥接层
   *
   * 若未设置桥接层，仅刷新本地批注快照。
   */
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

  /**
   * 绑定编辑器到 Yjs 方向，监听编辑器内容变更事件
   */
  private bindEditorToYjs(): void {
    this.contentChangeHandler = () => {
      if (this.isApplyingRemote) return
      this.pushEditorToYDoc()
    }
    const unsub = this.editor.listener.content.contentListener(
      this.contentChangeHandler
    )
    this.contentChangeSubscription = { unsubscribe: unsub }
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

  /**
   * 重新绑定批注组件桥接层
   *
   * 若 Y.Doc 已有批注则推送到桥接层，否则从桥接层同步到 Y.Doc。
   *
   * @param commentBridge 新的批注组件桥接层（可为 null 表示解绑）
   */
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

  /**
   * 从桥接层同步批注到 Y.Doc
   *
   * 读取桥接层当前批注，与上次快照 diff 后写入 Y.Array。
   */
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

  /**
   * 将 fast-json-patch 操作序列应用到 Y.Array
   *
   * 区分顶层操作（增删替换整元素）与深层操作（标记为整元素替换）。
   *
   * @param yArray 目标 Y.Array
   * @param operations JSON Patch 操作序列
   * @param current 当前完整 JSON 数组
   */
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

  /**
   * 判断 JSON Patch 路径是否为顶层操作
   *
   * @param path JSON Patch 路径，例如 "/0" 或 "/0/key"
   * @returns 是否为顶层（路径分段数 ≤ 2）
   */
  private isTopLevelOperation(path: string): boolean {
    return path.split('/').length <= 2
  }

  /**
   * 应用顶层操作到 Y.Array
   *
   * @param yArray 目标 Y.Array
   * @param index 顶层索引
   * @param operation JSON Patch 操作
   * @param current 当前完整 JSON 数组
   */
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

  /**
   * 替换 Y.Array 指定索引处的元素
   *
   * @param yArray 目标 Y.Array
   * @param index 要替换的索引
   * @param yMap 新的 Y.Map 元素
   */
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

  /**
   * 从 JSON Patch 路径解析顶层索引
   *
   * @param path JSON Patch 路径，例如 "/3/key"
   * @returns 顶层索引数字，非数字时返回 null
   */
  private getTopLevelIndex(path: string): number | null {
    const pathSegment = path.split('/')[1]
    if (!pathSegment) return null
    const index = Number(pathSegment)
    return Number.isInteger(index) ? index : null
  }

  /**
   * 从 JSON Patch 操作中提取根元素值
   *
   * 优先使用操作自带的 value，其次回退到当前数组对应索引的值。
   *
   * @param operation JSON Patch 操作
   * @param current 当前完整 JSON 数组
   * @returns 根元素对象，无效时返回 null
   */
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


  /**
   * 深拷贝可序列化值
   *
   * 使用 JSON 序列化/反序列化实现，去除不可序列化字段。
   *
   * @param value 待拷贝的值
   * @returns 深拷贝后的值
   */
  private cloneSerializable<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T
  }

  /**
   * 判断值是否为普通对象（非数组、非 null）
   *
   * @param value 待判断的值
   * @returns 是否为普通对象
   */
  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return Object.prototype.toString.call(value) === '[object Object]'
  }

  /**
   * 将 JSON 值递归转换为 Yjs 兼容值
   *
   * 数组转换为 Y.Array，对象转换为 Y.Map，原值保留。
   *
   * @param value 待转换的 JSON 值
   * @returns Yjs 兼容值；undefined 保留为 undefined
   */
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

  /**
   * 从 Y.Doc 读取批注快照并清洗
   *
   * @returns 清洗后的批注数组
   */
  private readCommentsSnapshotFromYDoc(): CollaborationComment[] {
    const comments = this.yComments.toJSON() as CollaborationComment[]
    return this.sanitizeComments(comments)
  }

  /**
   * 批量清洗批注列表
   *
   * 过滤掉缺少 id 的批注，并逐条规范化字段。
   *
   * @param comments 原始批注列表
   * @returns 清洗后的批注列表
   */
  private sanitizeComments(comments: CollaborationComment[]): CollaborationComment[] {
    return comments
      .map(comment => this.sanitizeComment(comment))
      .filter(comment => Boolean(comment.id))
  }

  /**
   * 规范化单条批注字段
   *
   * 将所有字段转换为字符串/默认值，递归清洗回复列表。
   *
   * @param comment 原始批注
   * @returns 规范化后的批注
   */
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
