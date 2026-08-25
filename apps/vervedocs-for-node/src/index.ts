import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { config } from './config.js'
import { parseRoute } from './routes/parse-route.js'
import { exportRoute } from './routes/export-route.js'
import { exportPdfRoute } from './routes/export-pdf-route.js'
import { checkBridge } from './services/jar-bridge.js'

/**
 * vervedocs-for-node 服务入口
 *
 * 架构：
 *   Hono (:1320) ← HTTP API
 *     ├ /health              健康检查
 *     ├ /api/parse           docx → json
 *     ├ /api/export          json → docx
 *     └ /api/export-pdf      json → pdf
 *
 *   底层通过 child_process.spawn 调用 vervedocs-for-java.jar
 */
const app = new Hono()

app.get('/health', async (c) => {
  const bridge = await checkBridge()
  return c.json({
    status: bridge.ok ? 'ok' : 'degraded',
    service: 'vervedocs-for-node',
    port: config.port,
    bridge,
  })
})

app.route('/api/parse', parseRoute)
app.route('/api/export', exportRoute)
app.route('/api/export-pdf', exportPdfRoute)

app.notFound((c) =>
  c.json({ success: false, error: `路由不存在: ${c.req.method} ${c.req.path}` }, 404),
)

app.onError((err, c) => {
  console.error('[server] 未捕获错误:', err)
  return c.json({ success: false, error: '内部服务器错误' }, 500)
})

serve(
  { fetch: app.fetch, port: config.port },
  (info) => {
    console.log(`[vervedocs-for-node] 服务已启动，端口: ${info.port}`)
    console.log(`[vervedocs-for-node] jar 路径: ${config.jarPath}`)
    console.log(`[vervedocs-for-node] java 命令: ${config.javaBin}`)
    console.log(`[vervedocs-for-node] 可用端点:`)
    console.log(`  GET  /health`)
    console.log(`  POST /api/parse        (docx → json)`)
    console.log(`  POST /api/export       (json → docx)`)
    console.log(`  POST /api/export-pdf   (json → pdf)`)
  },
)