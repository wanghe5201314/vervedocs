import { ref, onMounted, onBeforeUnmount } from 'vue'
import { getCollabColor } from '@/config/collab-colors'

export interface SimulatedCollabUser {
  userId: string
  userName: string
  color: string
}

export interface RemoteCursorPosition {
  index: number
  endIndex?: number
}

interface CollabMessage {
  type: 'heartbeat' | 'leave' | 'cursor' | 'content'
  user: SimulatedCollabUser
  cursor?: RemoteCursorPosition
  content?: any
  contentHash?: number
}

const NAMES = [
  '张三', '李四', '王五', '赵六', '孙七',
  '周八', '吴九', '郑十', '陈十一', '林十二',
  '黄十三', '何十四', '马十五', '罗十六', '梁十七',
  '宋十八', '谢十九', '唐二十', '韩二一', '冯二二'
]

const CHANNEL_NAME = 'docx-editor-collab-sim'
const HEARTBEAT_INTERVAL = 2000
const USER_TIMEOUT = 6000
const CURSOR_THROTTLE_MS = 100

const generateUserId = (): string => {
  return `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

let _cachedUser: SimulatedCollabUser | null = null

const getOrCreateSelfUser = (): SimulatedCollabUser => {
  if (_cachedUser) return _cachedUser
  const stored = sessionStorage.getItem('docx-editor-collab-sim-user')
  if (stored) {
    try {
      _cachedUser = JSON.parse(stored) as SimulatedCollabUser
      return _cachedUser!
    } catch { /* ignore */ }
  }
  const index = Math.floor(Math.random() * NAMES.length)
  const userId = generateUserId()
  const userName = NAMES[index]
  const color = getCollabColor(index)
  _cachedUser = { userId, userName, color }
  sessionStorage.setItem('docx-editor-collab-sim-user', JSON.stringify(_cachedUser))
  return _cachedUser
}

export const useCollabUsers = () => {
  const onlineUsers = ref<SimulatedCollabUser[]>([])
  const remoteCursors = ref<Map<string, { user: SimulatedCollabUser; position: RemoteCursorPosition }>>(new Map())

  let channel: BroadcastChannel | null = null
  let heartbeatTimer: number | null = null
  let cleanupTimer: number | null = null
  let cursorThrottleTimer: number | null = null
  const lastSeen = new Map<string, number>()
  let lastContentHash = 0
  let isApplyingRemote = false

  const selfUser = getOrCreateSelfUser()

  const sendMessage = (msg: CollabMessage) => {
    try {
      channel?.postMessage(msg)
    } catch { /* ignore */ }
  }

  const start = () => {
    try {
      channel = new BroadcastChannel(CHANNEL_NAME)
    } catch {
      return
    }

    channel.onmessage = (event) => {
      const data = event.data as CollabMessage
      if (data.user.userId === selfUser.userId) return

      switch (data.type) {
        case 'heartbeat': {
          lastSeen.set(data.user.userId, Date.now())
          const exists = onlineUsers.value.some(u => u.userId === data.user.userId)
          if (!exists) {
            onlineUsers.value = [...onlineUsers.value, data.user]
          }
          break
        }
        case 'leave': {
          lastSeen.delete(data.user.userId)
          onlineUsers.value = onlineUsers.value.filter(u => u.userId !== data.user.userId)
          remoteCursors.value.delete(data.user.userId)
          remoteCursors.value = new Map(remoteCursors.value)
          break
        }
        case 'cursor': {
          if (data.cursor) {
            remoteCursors.value.set(data.user.userId, {
              user: data.user,
              position: data.cursor
            })
            remoteCursors.value = new Map(remoteCursors.value)
          }
          break
        }
        case 'content': {
          if (data.content && !isApplyingRemote) {
            isApplyingRemote = true
            lastContentHash = data.contentHash ?? 0
            const callback = contentApplyCallback
            if (callback) {
              callback(data.content)
            }
            nextTick(() => { isApplyingRemote = false })
          }
          break
        }
      }
    }

    sendMessage({ type: 'heartbeat', user: selfUser })

    heartbeatTimer = window.setInterval(() => {
      sendMessage({ type: 'heartbeat', user: selfUser })
    }, HEARTBEAT_INTERVAL)

    cleanupTimer = window.setInterval(() => {
      const now = Date.now()
      const expired: string[] = []
      for (const [uid, lastTime] of lastSeen) {
        if (now - lastTime > USER_TIMEOUT) {
          expired.push(uid)
        }
      }
      if (expired.length > 0) {
        for (const uid of expired) lastSeen.delete(uid)
        const expiredSet = new Set(expired)
        onlineUsers.value = onlineUsers.value.filter(u => !expiredSet.has(u.userId))
        for (const uid of expired) {
          remoteCursors.value.delete(uid)
        }
        remoteCursors.value = new Map(remoteCursors.value)
      }
    }, HEARTBEAT_INTERVAL)
  }

  const stop = () => {
    sendMessage({ type: 'leave', user: selfUser })
    if (channel) {
      channel.close()
      channel = null
    }
    if (heartbeatTimer) {
      window.clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
    if (cleanupTimer) {
      window.clearInterval(cleanupTimer)
      cleanupTimer = null
    }
    if (cursorThrottleTimer) {
      window.clearTimeout(cursorThrottleTimer)
      cursorThrottleTimer = null
    }
    lastSeen.clear()
    onlineUsers.value = []
    remoteCursors.value = new Map()
  }

  const broadcastCursor = (position: RemoteCursorPosition) => {
    if (cursorThrottleTimer) return
    sendMessage({ type: 'cursor', user: selfUser, cursor: position })
    cursorThrottleTimer = window.setTimeout(() => {
      cursorThrottleTimer = null
    }, CURSOR_THROTTLE_MS)
  }

  const broadcastContent = (content: any) => {
    if (isApplyingRemote) return
    const hash = simpleHash(content)
    if (hash === lastContentHash) return
    lastContentHash = hash
    sendMessage({ type: 'content', user: selfUser, content, contentHash: hash })
  }

  let contentApplyCallback: ((content: any) => void) | null = null

  const onContentApply = (callback: (content: any) => void) => {
    contentApplyCallback = callback
  }

  const getIsApplyingRemote = () => isApplyingRemote

  onMounted(() => { start() })
  onBeforeUnmount(() => { stop() })

  return {
    selfUser,
    onlineUsers,
    remoteCursors,
    broadcastCursor,
    broadcastContent,
    onContentApply,
    getIsApplyingRemote,
    start,
    stop
  }
}

const simpleHash = (obj: any): number => {
  try {
    const str = JSON.stringify(obj)
    let h = 0
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0
    }
    return h
  } catch {
    return 0
  }
}

const nextTick = (fn: () => void) => {
  Promise.resolve().then(fn)
}
