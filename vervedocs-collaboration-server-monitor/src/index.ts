import express from 'express'
import { config } from './config.js'
import { StatsCollector } from './stats.js'
import { authMiddleware, handleLogin, handleLogout, isAuthenticated } from './auth.js'
import { renderLogin, renderDashboard } from './views.js'

const app = express()
const statsCollector = new StatsCollector()

app.use(express.json())

app.get('/dashboard/login', (_req, res) => {
  res.type('html').send(renderLogin())
})

app.post('/dashboard/api/login', (req, res) => {
  handleLogin(req, res)
})

app.post('/dashboard/api/logout', (req, res) => {
  handleLogout(req, res)
})

app.get('/dashboard/api/stats', authMiddleware, async (_req, res) => {
  try {
    const stats = await statsCollector.collectStats()
    res.setHeader('Cache-Control', 'no-cache, no-store')
    res.json(stats)
  } catch (err) {
    console.error('[监控] 获取统计数据出错:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.post('/api/heartbeat', (req, res) => {
  const token = req.headers['x-internal-token'] || ''
  if (token !== config.internalToken) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  statsCollector.handleHeartbeat(req.body)
  res.json({ ok: true })
})

app.get('/dashboard', (req, res) => {
  if (!isAuthenticated(req)) {
    res.redirect('/dashboard/login')
    return
  }
  res.type('html').send(renderDashboard())
})

app.get('/dashboard/', (req, res) => {
  if (!isAuthenticated(req)) {
    res.redirect('/dashboard/login')
    return
  }
  res.type('html').send(renderDashboard())
})

async function start() {
  await statsCollector.init()

  app.listen(config.port, () => {
    console.log(`[监控] 服务已启动，端口: ${config.port}`)
    console.log(`[监控] 面板地址: http://localhost:${config.port}/dashboard`)
    console.log(`[监控] MongoDB: ${config.mongoUri}`)
  })
}

process.on('SIGINT', async () => {
  console.log('[监控] 正在关闭...')
  await statsCollector.destroy()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('[监控] 正在关闭...')
  await statsCollector.destroy()
  process.exit(0)
})

start().catch((err) => {
  console.error('[监控] 启动失败:', err)
  process.exit(1)
})
