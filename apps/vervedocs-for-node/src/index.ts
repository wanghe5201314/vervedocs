import express from 'express'
import { config } from './config.js'
import { apiRouter } from './routes/index.js'
import { checkBridge } from './services/jar-bridge.js'
import { logger } from './utils/logger.js'
import { t } from './utils/i18n.js'
import { printStartupBanner } from './utils/startup-banner.js'

const log = logger.child({ module: 'server' })

/**
 * vervedocs-for-node 服务入口
 *
 * 架构：
 *   Express (:1320) ← HTTP API
 *     ├ /health              健康检查
 *     ├ /documents/translate/word    docx → json
 *     └ /documents/render            json → docx/pdf（format 参数）
 *
 *   底层通过 child_process.spawn 调用 vervedocs-for-java.jar
 */
const app = express()

app.get('/health', async (_req, res) => {
  const bridge = await checkBridge()
  res.json({
    status: bridge.ok ? 'ok' : 'degraded',
    service: 'vervedocs-for-node',
    port: config.port,
    bridge,
  })
})

app.use('/documents', apiRouter)

app.use((req, res) => {
  res.status(404).json({ success: false, code: 404, error: t('server.notFound', { method: req.method, path: req.path }) })
})

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  log.error(
    {
      err: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    },
    t('server.uncaught'),
  )
  res.status(500).json({ success: false, code: 500, error: t('server.error') })
})

app.listen(config.port, () => {
  printStartupBanner(config.port)
  log.info(t('server.started'))
})
