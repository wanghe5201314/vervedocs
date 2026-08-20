import { MongoClient, Db, Collection } from 'mongodb'
import { config } from './config.js'

interface ConnectionInfo {
  userId: string
  userName: string
  documentName: string
  docType: string
  color: string
}

interface InstanceInfo {
  instanceId: string
  hostname: string
  pid: number
  port: number
  url: string
  startTime: string
  nodeVersion: string
  connections: number
  isMaster?: boolean
  lastHeartbeat: number
}

const DOC_LIST_LIMIT = 100
const HISTORY_MAX = 60
const HISTORY_INTERVAL = 10000
const INSTANCE_TTL = 30000

export class StatsCollector {
  private mongoClient: MongoClient | null = null
  private db: Db | null = null
  private collection: Collection | null = null
  private instances = new Map<string, InstanceInfo>()
  private connHistory: Array<{ t: number; c: number }> = []
  private historyTimer: ReturnType<typeof setInterval> | null = null

  async init() {
    try {
      this.mongoClient = new MongoClient(config.mongoUri)
      await this.mongoClient.connect()
      this.db = this.mongoClient.db()
      this.collection = this.db.collection(config.mongoCollection)
      console.log('[Monitor] MongoDB connected')
    } catch (err) {
      console.error('[Monitor] MongoDB connection failed:', err)
    }

    this.historyTimer = setInterval(() => this.sampleConnections(), HISTORY_INTERVAL)
  }

  async destroy() {
    if (this.historyTimer) {
      clearInterval(this.historyTimer)
      this.historyTimer = null
    }
    if (this.mongoClient) {
      await this.mongoClient.close()
      console.log('[Monitor] MongoDB disconnected')
    }
  }

  handleHeartbeat(body: any) {
    const instanceId = body.instanceId
    if (!instanceId) return
    this.instances.set(instanceId, {
      instanceId,
      hostname: body.hostname || '',
      pid: body.pid || 0,
      port: body.port || 0,
      url: body.url || '',
      startTime: body.startTime || new Date().toISOString(),
      nodeVersion: body.nodeVersion || '',
      connections: body.connections || 0,
      lastHeartbeat: Date.now(),
    })
  }

  async collectStats() {
    const [instancesData, mongoData, documentList] = await Promise.all([
      this.pollAllInstances(),
      this.getMongoStats(),
      this.getDocumentList(),
    ])

    const { connections, activeDocuments } = instancesData
    const liveInstances = this.getLiveInstances()
    const markedInstances = this.markMaster(liveInstances)
    const earliestStart = this.getEarliestStartTime(liveInstances)

    this.updateConnCount(connections.length)

    return {
      server: {
        uptime: earliestStart ? Date.now() - earliestStart.getTime() : 0,
        startTime: earliestStart ? earliestStart.toISOString() : new Date().toISOString(),
        nodeVersion: process.version,
      },
      connections: {
        total: connections.length,
        list: connections,
        activeDocuments,
      },
      documents: {
        active: activeDocuments,
      },
      mongo: mongoData,
      documentList,
      connHistory: this.connHistory,
      cluster: {
        instances: markedInstances,
      },
    }
  }

  private getLiveInstances(): InstanceInfo[] {
    const now = Date.now()
    const live: InstanceInfo[] = []
    for (const [, inst] of this.instances) {
      if (now - inst.lastHeartbeat < INSTANCE_TTL) {
        live.push(inst)
      }
    }
    return live
  }

  private async pollAllInstances(): Promise<{
    connections: ConnectionInfo[]
    activeDocuments: number
  }> {
    const live = this.getLiveInstances()

    if (live.length === 0) {
      return { connections: [], activeDocuments: 0 }
    }

    const allConnections: ConnectionInfo[] = []
    const activeDocNames = new Set<string>()

    const results = await Promise.allSettled(
      live.map(async (inst) => {
        const headers: Record<string, string> = {
          'X-Internal-Token': config.internalToken,
        }
        const [infoRes, connRes] = await Promise.all([
          fetch(`${inst.url}/_internal/info`, { headers }),
          fetch(`${inst.url}/_internal/connections`, { headers }),
        ])
        if (!infoRes.ok || !connRes.ok) {
          throw new Error(`Instance ${inst.url} returned error`)
        }
        const info: any = await infoRes.json()
        const conns: ConnectionInfo[] = await connRes.json()

        if (this.instances.has(inst.instanceId)) {
          const existing = this.instances.get(inst.instanceId)!
          existing.connections = info.connections || 0
        }
        return { conns }
      })
    )

    for (const result of results) {
      if (result.status === 'fulfilled') {
        for (const c of result.value.conns) {
          allConnections.push(c)
          activeDocNames.add(c.documentName)
        }
      }
    }

    return {
      connections: allConnections,
      activeDocuments: activeDocNames.size,
    }
  }

  private sampleConnections() {
    const now = Date.now()
    const lastCount = this.connHistory.length > 0
      ? this.connHistory[this.connHistory.length - 1].c
      : 0
    this.connHistory.push({ t: now, c: lastCount })
    if (this.connHistory.length > HISTORY_MAX) {
      this.connHistory = this.connHistory.slice(-HISTORY_MAX)
    }
  }

  private updateConnCount(count: number) {
    if (this.connHistory.length > 0) {
      this.connHistory[this.connHistory.length - 1].c = count
    } else {
      this.connHistory.push({ t: Date.now(), c: count })
    }
  }

  private markMaster(instances: InstanceInfo[]): InstanceInfo[] {
    const sorted = [...instances].sort((a, b) => a.instanceId.localeCompare(b.instanceId))
    return sorted.map((inst, i) => ({ ...inst, isMaster: i === 0 }))
  }

  private getEarliestStartTime(instances: InstanceInfo[]): Date | null {
    let earliest: Date | null = null
    for (const inst of instances) {
      if (inst.startTime) {
        const d = new Date(inst.startTime)
        if (!earliest || d < earliest) earliest = d
      }
    }
    return earliest
  }

  private async getMongoStats() {
    if (!this.db || !this.mongoClient) {
      return { database: this.getDbName(), collection: config.mongoCollection }
    }

    try {
      const [dbStats, collStats, serverInfo] = await Promise.all([
        this.db.command({ dbStats: 1 }).catch(() => null),
        this.db.command({ collStats: config.mongoCollection }).catch(() => null),
        this.db.command({ buildInfo: 1 }).catch(() => null),
      ])

      return {
        version: (serverInfo as any)?.version ?? null,
        database: this.getDbName(),
        collection: config.mongoCollection,
        dbStats: dbStats
          ? {
              dataSize: (dbStats as any).dataSize ?? 0,
              storageSize: (dbStats as any).storageSize ?? 0,
              indexSize: (dbStats as any).indexSize ?? 0,
              collections: (dbStats as any).collections ?? 0,
              views: (dbStats as any).views ?? 0,
            }
          : null,
        collStats: collStats
          ? {
              count: (collStats as any).count ?? 0,
              size: (collStats as any).size ?? 0,
              avgObjSize: (collStats as any).avgObjSize ?? 0,
              storageSize: (collStats as any).storageSize ?? 0,
              nindexes: (collStats as any).nindexes ?? 0,
              totalIndexSize: (collStats as any).totalIndexSize ?? 0,
            }
          : null,
      }
    } catch (err) {
      console.error('[Monitor] Failed to get MongoDB stats:', err)
      return { database: this.getDbName(), collection: config.mongoCollection }
    }
  }

  private async getDocumentList() {
    if (!this.collection) return []

    try {
      const docs = await this.collection
        .aggregate([
          { $sort: { updatedAt: -1 } },
          { $limit: DOC_LIST_LIMIT },
          {
            $addFields: {
              docSize: { $bsonSize: '$$ROOT' },
            },
          },
          {
            $project: {
              documentId: 1,
              docType: 1,
              docSize: 1,
              updatedAt: 1,
              createdAt: 1,
            },
          },
        ])
        .toArray()

      return docs.map((doc) => ({
        documentId: doc.documentId,
        docType: doc.docType ?? 'word',
        docSize: doc.docSize ?? 0,
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
        createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
      }))
    } catch (err) {
      console.error('[Monitor] Failed to get document list (trying fallback):', err)
      return this.getDocumentListFallback()
    }
  }

  private async getDocumentListFallback() {
    if (!this.collection) return []
    try {
      const docs = await this.collection
        .find(
          {},
          {
            projection: {
              documentId: 1,
              docType: 1,
              updatedAt: 1,
              createdAt: 1,
            },
            limit: DOC_LIST_LIMIT,
            sort: { updatedAt: -1 },
          },
        )
        .toArray()

      return docs.map((doc) => ({
        documentId: doc.documentId,
        docType: (doc as any).docType ?? 'word',
        docSize: 0,
        updatedAt: (doc as any).updatedAt
          ? new Date((doc as any).updatedAt).toISOString()
          : null,
        createdAt: (doc as any).createdAt
          ? new Date((doc as any).createdAt).toISOString()
          : null,
      }))
    } catch (err2) {
      console.error('[Monitor] Fallback document list also failed:', err2)
      return []
    }
  }

  private getDbName(): string {
    try {
      const url = new URL(config.mongoUri)
      return url.pathname.slice(1) || 'docuflow'
    } catch {
      return 'docuflow'
    }
  }
}
