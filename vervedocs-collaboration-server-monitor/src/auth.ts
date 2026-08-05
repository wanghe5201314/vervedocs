import { Request, Response, NextFunction } from 'express'
import { randomUUID } from 'crypto'
import { config } from './config.js'

interface Session {
  createdAt: Date
}

const SESSION_MAX_AGE = 24 * 60 * 60 * 1000
const sessions = new Map<string, Session>()

export function isAuthenticated(req: Request): boolean {
  const cookie = req.headers.cookie
  if (!cookie) return false
  const match = cookie.match(/dashboard_session=([^;]+)/)
  if (!match) return false
  const session = sessions.get(match[1])
  if (!session) return false
  if (Date.now() - session.createdAt.getTime() > SESSION_MAX_AGE) {
    sessions.delete(match[1])
    return false
  }
  return true
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (isAuthenticated(req)) {
    next()
  } else {
    res.writeHead(401, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: '未登录' }))
  }
}

export function handleLogin(req: Request, res: Response) {
  const { username, password } = req.body || {}
  if (username !== config.dashboardUsername || password !== config.dashboardPassword) {
    res.writeHead(401, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: '用户名或密码错误' }))
    return
  }
  const token = randomUUID()
  sessions.set(token, { createdAt: new Date() })
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Set-Cookie': `dashboard_session=${token}; HttpOnly; SameSite=Strict; Path=/dashboard; Max-Age=86400`,
  })
  res.end(JSON.stringify({ success: true }))
}

export function handleLogout(req: Request, res: Response) {
  const cookie = req.headers.cookie
  if (cookie) {
    const match = cookie.match(/dashboard_session=([^;]+)/)
    if (match) sessions.delete(match[1])
  }
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Set-Cookie': 'dashboard_session=; HttpOnly; SameSite=Strict; Path=/dashboard; Max-Age=0',
  })
  res.end(JSON.stringify({ success: true }))
}