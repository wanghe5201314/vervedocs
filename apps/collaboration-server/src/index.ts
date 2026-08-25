/**
 * Hocuspocus 协同服务入口
 *
 * 架构：
 *   Spring Boot (:8090) ← REST API / 用户管理
 *   Hocuspocus  (:1235) ← 实时协同 WebSocket + 内部 API
 *   Monitor     (:9090) ← 独立监控面板（轮询实例 + MongoDB）
 *   Nginx 按路径分流：/dashboard → Monitor，/collab → Hocuspocus，其余 → Spring Boot
 */
import { Server, type Extension } from '@hocuspocus/server'
import { Redis } from '@hocuspocus/extension-redis'
import { config } from './config.js'
import { MongoDBExtension } from './extensions/mongodb.js'
import { AuthExtension } from './extensions/auth.js'
import { createLogger } from './utils/logger.js'
import { printStartupBanner } from './utils/startup-banner.js'
import { removeOnlineUser } from './utils/online-users.js'

const log = createLogger('server')

interface UserContext {
  userId: string
  userName: string
}

const extensions: Extension[] = [
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
  } catch {
    extensions.push(new Redis({ host: config.redisUri }))
  }
}

const server = new Server({
  port: config.port,

  extensions,


  async onDisconnect({ documentName, context }) {
    const user = (context as Record<string, unknown>).user as UserContext | undefined
    if (user) {
      removeOnlineUser(user.userId, documentName)
    }
  },
})

server.listen().then(() => {
  printStartupBanner(config.port)
  log.info({ port: config.port }, '协作服务已启动')
})
