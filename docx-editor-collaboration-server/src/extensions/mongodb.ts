/**
 * MongoDB 持久化扩展
 *
 * 职责：
 * 1. onLoadDocument  — 从 MongoDB 加载文档，支持旧文档自动迁移
 * 2. onStoreDocument — 将 Yjs 状态 + IElement[] 快照双写回 MongoDB
 * 3. 敏感词过滤     — 保存前调用 Java 后端 API 检测并替换敏感词
 *
 * 集合 schema（df_document_content）:
 *   _id          ObjectId
 *   documentId   Long       (唯一索引，对应 MySQL Document.id)
 *   content      Object     (IElement[] 的 BSON 表示，后向兼容)
 *   yjsState     Binary     (Y.encodeStateAsUpdate 的 Uint8Array)
 *   createdAt    Date
 *   updatedAt    Date
 */
import {
  Extension,
  onLoadDocumentPayload,
  onStoreDocumentPayload,
} from '@hocuspocus/server'
import { MongoClient, Db, Collection, Binary } from 'mongodb'
import * as Y from 'yjs'
import { config } from '../config.js'
import { elementArrayToYDoc } from '../utils/elementToYDoc.js'
import { yDocToElementArray } from '../utils/yDocToElement.js'

/** Java 后端内部 API 地址 */
const BACKEND_BASE_URL = process.env.BACKEND_URL || 'http://localhost:8090'

export class MongoDBExtension implements Extension {
  private client: MongoClient | null = null
  private db: Db | null = null
  private collection: Collection | null = null

  /** 存储防抖定时器 */
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()

  /** 防抖间隔（毫秒） */
  private debounceMs = 2000

  /** 防止过滤触发的二次保存进入死循环 */
  private filteringDocs = new Set<number>()

  async onConfigure() {
    this.client = new MongoClient(config.mongoUri)
    await this.client.connect()
    this.db = this.client.db()
    this.collection = this.db.collection(config.mongoCollection)
    console.log(`[MongoDB] Connected, collection: ${config.mongoCollection}`)
  }

  async onDestroy() {
    // 清理所有防抖定时器
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer)
    }
    this.debounceTimers.clear()

    if (this.client) {
      await this.client.close()
      console.log('[MongoDB] Disconnected')
    }
  }

  /**
   * 文档加载
   *
   * Hocuspocus 在首次有客户端连接某个 documentName 时调用。
   * documentName 格式约定为纯数字的 documentId 字符串。
   */
  async onLoadDocument(data: onLoadDocumentPayload) {
    const docId = this.parseDocId(data.documentName)
    if (docId === null) {
      console.warn(`[MongoDB] Invalid documentName: ${data.documentName}`)
      return
    }

    const row = await this.collection!.findOne({ documentId: docId })
    if (!row) {
      console.log(`[MongoDB] No document found for id=${docId}, starting empty`)
      return
    }

    // 优先使用 yjsState（已迁移的文档）
    if (row.yjsState) {
      const state =
        row.yjsState instanceof Binary
          ? row.yjsState.buffer
          : row.yjsState
      Y.applyUpdate(data.document, new Uint8Array(state as ArrayBuffer))
      console.log(`[MongoDB] Loaded yjsState for docId=${docId}`)
      return
    }

    // 回退：旧文档只有 content 字段（IElement[] BSON）
    if (row.content) {
      const elements = row.content as Record<string, unknown>[]
      if (Array.isArray(elements) && elements.length > 0) {
        elementArrayToYDoc(elements, data.document)
        console.log(
          `[MongoDB] Migrated legacy content for docId=${docId}, ${elements.length} elements`,
        )
      }
    }
  }

  /**
   * 文档存储（防抖）
   *
   * 每次 Y.Doc 变更都会触发，通过防抖合并高频写入。
   * 双写策略：
   *   - yjsState:  Y.encodeStateAsUpdate()，下次加载可直接 applyUpdate
   *   - content:   yDocToElementArray()，保证 REST API 读取兼容
   */
  async onStoreDocument(data: onStoreDocumentPayload) {
    const docId = this.parseDocId(data.documentName)
    if (docId === null) return

    // 如果正在进行过滤回写，跳过此次触发
    if (this.filteringDocs.has(docId)) return

    // 清除之前的定时器
    const existing = this.debounceTimers.get(data.documentName)
    if (existing) clearTimeout(existing)

    // 设置新的定时器
    const timer = setTimeout(async () => {
      this.debounceTimers.delete(data.documentName)
      try {
        await this.persistDocument(docId, data.document)
      } catch (err) {
        console.error(`[MongoDB] Failed to persist docId=${docId}:`, err)
      }
    }, this.debounceMs)

    this.debounceTimers.set(data.documentName, timer)
  }

  /** 实际写入 MongoDB */
  private async persistDocument(docId: number, doc: Y.Doc) {
    const content = yDocToElementArray(doc)

    // 调用 Java 后端过滤敏感词
    let filteredContent = content
    try {
      const filterResult = await this.callFilterApi(content)
      if (filterResult && filterResult.filtered) {
        filteredContent = filterResult.content
        console.log(`[MongoDB] Sensitive words filtered for docId=${docId}: ${filterResult.hitWords.join(',')}`)

        // 将过滤后的内容回写到 Y.Doc（让所有连接的客户端同步看到替换后的内容）
        this.filteringDocs.add(docId)
        try {
          this.applyFilteredToYDoc(doc, content, filteredContent)
        } finally {
          // 延迟移除标记，确保回写触发的 onStoreDocument 被跳过
          setTimeout(() => this.filteringDocs.delete(docId), 500)
        }
      }
    } catch (err) {
      console.error(`[MongoDB] Filter API call failed for docId=${docId}, saving unfiltered:`, err)
    }

    // 过滤后重新编码 yjsState（因为 Y.Doc 可能已被修改）
    const yjsState = new Binary(Y.encodeStateAsUpdate(doc))
    const now = new Date()

    await this.collection!.updateOne(
      { documentId: docId },
      {
        $set: {
          content: filteredContent,
          yjsState,
          updatedAt: now,
        },
        $setOnInsert: {
          documentId: docId,
          createdAt: now,
        },
      },
      { upsert: true },
    )

    console.log(`[MongoDB] Persisted docId=${docId}, elements=${filteredContent.length}`)
  }

  /**
   * 调用 Java 后端的敏感词过滤 API
   */
  private async callFilterApi(content: Record<string, unknown>[]): Promise<{
    filtered: boolean
    content: Record<string, unknown>[]
    hitWords: string[]
  } | null> {
    const resp = await fetch(`${BACKEND_BASE_URL}/api/internal/filter-content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(content),
    })
    if (!resp.ok) {
      console.error(`[MongoDB] Filter API returned ${resp.status}`)
      return null
    }
    const body = await resp.json() as {
      success?: boolean
      data?: { filtered: boolean; content: Record<string, unknown>[]; hitWords: string[] }
    }
    return body.data ?? null
  }

  /**
   * 将过滤后的内容差异应用回 Y.Doc。
   * 递归比较原始和过滤后的元素，仅更新 value 发生变化的元素。
   */
  private applyFilteredToYDoc(
    doc: Y.Doc,
    original: Record<string, unknown>[],
    filtered: Record<string, unknown>[],
  ) {
    const yArray = doc.getArray<Y.Map<unknown>>('elements')
    doc.transact(() => {
      this.applyDiffToYArray(yArray, original, filtered)
    })
  }

  private applyDiffToYArray(
    yArray: Y.Array<Y.Map<unknown>>,
    original: Record<string, unknown>[],
    filtered: Record<string, unknown>[],
  ) {
    const len = Math.min(original.length, filtered.length, yArray.length)
    for (let i = 0; i < len; i++) {
      const origEl = original[i]
      const filtEl = filtered[i]
      const yMap = yArray.get(i)
      if (!yMap || typeof yMap.set !== 'function') continue

      // 比较 value 字段
      if (origEl.value !== filtEl.value && typeof filtEl.value === 'string') {
        yMap.set('value', filtEl.value)
      }

      // 递归处理 valueList
      if (Array.isArray(origEl.valueList) && Array.isArray(filtEl.valueList)) {
        const yValueList = yMap.get('valueList')
        if (yValueList && typeof (yValueList as any).get === 'function') {
          this.applyDiffToYArray(
            yValueList as Y.Array<Y.Map<unknown>>,
            origEl.valueList as Record<string, unknown>[],
            filtEl.valueList as Record<string, unknown>[],
          )
        }
      }

      // 递归处理 table: trList -> tdList -> value
      if (origEl.type === 'table' && Array.isArray(origEl.trList) && Array.isArray(filtEl.trList)) {
        const yTrList = yMap.get('trList')
        if (yTrList && typeof (yTrList as any).get === 'function') {
          const trArr = yTrList as Y.Array<Y.Map<unknown>>
          const trLen = Math.min(
            (origEl.trList as any[]).length,
            (filtEl.trList as any[]).length,
            trArr.length,
          )
          for (let t = 0; t < trLen; t++) {
            const origTr = (origEl.trList as any[])[t]
            const filtTr = (filtEl.trList as any[])[t]
            const yTr = trArr.get(t)
            if (!yTr || !Array.isArray(origTr?.tdList) || !Array.isArray(filtTr?.tdList)) continue

            const yTdList = yTr.get('tdList')
            if (!yTdList || typeof (yTdList as any).get !== 'function') continue
            const tdArr = yTdList as Y.Array<Y.Map<unknown>>
            const tdLen = Math.min(origTr.tdList.length, filtTr.tdList.length, tdArr.length)

            for (let d = 0; d < tdLen; d++) {
              const origTd = origTr.tdList[d]
              const filtTd = filtTr.tdList[d]
              const yTd = tdArr.get(d)
              if (!yTd || !Array.isArray(origTd?.value) || !Array.isArray(filtTd?.value)) continue

              const yTdValue = yTd.get('value')
              if (yTdValue && typeof (yTdValue as any).get === 'function') {
                this.applyDiffToYArray(
                  yTdValue as Y.Array<Y.Map<unknown>>,
                  origTd.value as Record<string, unknown>[],
                  filtTd.value as Record<string, unknown>[],
                )
              }
            }
          }
        }
      }
    }
  }

  /** 将 documentName 解析为数字 documentId */
  private parseDocId(name: string): number | null {
    const n = Number(name)
    return Number.isFinite(n) && n > 0 ? n : null
  }

  // ---- 空实现：Hocuspocus Extension 接口要求 ----
  async onConnect() {}
  async onAuthenticate() {}
  async onChange() {}
  async onDisconnect() {}
  async afterLoadDocument() {}
  async afterUnloadDocument() {}
  async onRequest() {}
  async onUpgrade() {}
  async onListen() {}
  async onStateless() {}
}
