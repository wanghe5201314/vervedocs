/**
 * Hocuspocus 协同服务入口
 *
 * 架构：
 *   Spring Boot (:8090) ← REST API / 用户管理
 *   Hocuspocus  (:1235) ← 实时协同 WebSocket + 内部 API
 *   Monitor     (:9090) ← 独立监控面板（轮询实例 + MongoDB）
 *   Nginx 按路径分流：/dashboard → Monitor，/collab → Hocuspocus，其余 → Spring Boot
 */
import { Server } from '@hocuspocus/server'
import { Redis } from '@hocuspocus/extension-redis'
import { config } from './config.js'
import { MongoDBExtension } from './extensions/mongodb.js'
import { AuthExtension } from './extensions/auth.js'

const extensions: any[] = [
  new MongoDBExtension(),
  new AuthExtension(),
]

if (config.redisUri) {
  try {
    const redisUrl = new URL(config.redisUri)
    extensions.push(new Redis({
      host: redisUrl.hostname,
      port: parseInt(redisUrl.port, 10) || 6379,
    }))
    console.log(`[Hocuspocus] Redis 扩展已启用: ${config.redisUri}`)
  } catch {
    extensions.push(new Redis({ host: config.redisUri }))
    console.log(`[Hocuspocus] Redis 扩展已启用: ${config.redisUri}`)
  }
}

const server = new Server({
  port: config.port,

  extensions,

  async onConnect({ documentName, context }: any) {
    const user = (context as Record<string, unknown>).user as
      | { userId: string; userName: string }
      | undefined
    console.log(
      `[服务] 客户端连接 "${documentName}"` +
        (user ? ` — ${user.userName} (${user.userId})` : ''),
    )
  },

  async onDisconnect({ documentName, context }: any) {
    const user = (context as Record<string, unknown>).user as
      | { userId: string; userName: string }
      | undefined
    console.log(
      `[服务] 客户端断开 "${documentName}"` +
        (user ? ` — ${user.userName}` : ''),
    )
  },
})

server.listen().then(() => {
  console.log(`[Hocuspocus] 服务已启动，端口: ${config.port}`)
  console.log(`[Hocuspocus] MongoDB: ${config.mongoUri}`)
  if (config.redisUri) console.log(`[Hocuspocus] Redis: ${config.redisUri}`)
})
