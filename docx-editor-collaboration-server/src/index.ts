/**
 * Hocuspocus 协同服务入口
 *
 * 架构：
 *   Spring Boot (:8090) ← REST API / 用户管理
 *   Hocuspocus  (:1234) ← 实时协同 WebSocket
 *   Nginx 按路径分流：/collab → Hocuspocus，其余 → Spring Boot
 */
import { Server } from '@hocuspocus/server'
import { config } from './config.js'
import { MongoDBExtension } from './extensions/mongodb.js'
import { AuthExtension } from './extensions/auth.js'

const server = Server.configure({
  port: config.port,

  extensions: [
    new MongoDBExtension(),
    new AuthExtension(),
  ],

  // 连接事件日志
  async onConnect({ documentName, context }) {
    const user = (context as Record<string, unknown>).user as
      | { userId: string; userName: string }
      | undefined
    console.log(
      `[Server] Client connected to "${documentName}"` +
        (user ? ` — ${user.userName} (${user.userId})` : ''),
    )
  },

  async onDisconnect({ documentName, context }) {
    const user = (context as Record<string, unknown>).user as
      | { userId: string; userName: string }
      | undefined
    console.log(
      `[Server] Client disconnected from "${documentName}"` +
        (user ? ` — ${user.userName}` : ''),
    )
  },
})

server.listen().then(() => {
  console.log(`[Hocuspocus] Server running on port ${config.port}`)
  console.log(`[Hocuspocus] MongoDB: ${config.mongoUri}`)
})
