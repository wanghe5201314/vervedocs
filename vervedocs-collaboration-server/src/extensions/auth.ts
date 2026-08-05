/**
 * 认证扩展
 *
 * 当前系统没有 JWT，采用简单的 userId + userName 验证。
 * 客户端通过 WebSocket 连接时在 token 中传递用户信息：
 *   token = JSON.stringify({ userId, userName, color? })
 *
 * 后续如果系统引入 JWT，只需修改此文件的 onAuthenticate 方法即可。
 */
import {
  Extension,
  onAuthenticatePayload,

} from '@hocuspocus/server'

export interface UserContext {
  userId: string
  userName: string
  color: string
}

/** 为用户生成随机协作颜色 */
const COLORS = [
  '#958DF1', '#F98181', '#FBBC88', '#FAF594',
  '#70CFF8', '#94FADB', '#B9F18D', '#E8A0BF',
]

function randomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)]
}

export class AuthExtension implements Extension {
  /**
   * 连接认证
   *
   * 客户端在创建 HocuspocusProvider 时传递：
   *   new HocuspocusProvider({
   *     token: JSON.stringify({ userId: '1', userName: 'Alice' }),
   *     ...
   *   })
   */
  async onAuthenticate(data: onAuthenticatePayload) {
    const { token } = data

    if (!token) {
      throw new Error('Authentication required: token is missing')
    }

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(token)
    } catch {
      throw new Error('Authentication failed: invalid token format')
    }

    const userId = String(parsed.userId ?? '').trim()
    const userName = String(parsed.userName ?? '').trim()

    if (!userId) {
      throw new Error('Authentication failed: userId is required')
    }

    const userContext: UserContext = {
      userId,
      userName: userName || `User-${userId}`,
      color: String(parsed.color ?? '') || randomColor(),
    }

    console.log(
      `[认证] 用户已认证: ${userContext.userName} (${userContext.userId})`,
    )

    return { user: userContext }
  }

  // ---- 空实现 ----
  async onConfigure() {}
  async onListen() {}
  async onConnect() {}
  async onLoadDocument() {}
  async afterLoadDocument() {}
  async onStoreDocument() {}
  async afterStoreDocument() {}
  async onChange() {}
  async onDisconnect() {}
  async afterUnloadDocument() {}
  async onDestroy() {}
  async onRequest() {}
  async onUpgrade() {}
  async onStateless() {}
  async onCreateDocument() {}
  async onTokenSync() {}
  async beforeHandleMessage() {}
  async afterHandleMessage() {}
  async beforeHandleAwareness() {}
  async beforeSync() {}
  async beforeBroadcastStateless() {}
  async onAwarenessUpdate() {}
  async beforeUnloadDocument() {}
}
