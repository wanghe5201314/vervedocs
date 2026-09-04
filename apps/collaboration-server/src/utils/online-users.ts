import { renderTable } from './banner-table.js'

/**
 * 在线协同用户表
 *
 * 维护当前在线用户列表，每次变更时追加打印表格快照。
 * 替代 onConnect/onDisconnect 的两条独立日志，合并为统一的表格输出。
 */

interface OnlineUser {
  userId: string
  userName: string
  documentName: string
  connectTime: Date
}

const onlineUsers: OnlineUser[] = []

/**
 * 添加在线用户并打印当前表格。
 *
 * @param userId 用户 ID
 * @param userName 用户名
 * @param documentName 文档名
 */
export function addOnlineUser(
  userId: string,
  userName: string,
  documentName: string,
): void {
  onlineUsers.push({ userId, userName, documentName, connectTime: new Date() })
  printOnlineUsers()
}

/**
 * 移除在线用户并打印当前表格。
 *
 * @param userId 用户 ID
 * @param documentName 文档名
 */
export function removeOnlineUser(userId: string, documentName: string): void {
  const idx = onlineUsers.findIndex(
    (u) => u.userId === userId && u.documentName === documentName,
  )
  if (idx >= 0) {
    onlineUsers.splice(idx, 1)
    printOnlineUsers()
  }
}

/** 打印当前在线用户表格 */
function printOnlineUsers(): void {
  if (onlineUsers.length === 0) {
    console.log('\n  当前无在线用户\n')
    return
  }
  const rows = onlineUsers.map((u, i) => [
    String(i + 1),
    u.userId,
    u.userName,
    u.documentName,
    u.connectTime.toTimeString().slice(0, 8),
  ])
  console.log('')
  console.log(renderTable(['#', 'userId', '用户名', '文档', '时间'], rows))
  console.log('')
}