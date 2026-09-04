import { config } from '../config.js'
import { renderTable } from './banner-table.js'

/**
 * 启动 banner：服务信息 + 端点表格。
 */
export function printStartupBanner(port: number): void {
  const rule = '─'.repeat(72)
  console.log('')
  console.log(rule)
  console.log('  collaboration-server · 协同服务已启动')
  console.log(rule)
  console.log(`  端口      ${port}`)
  console.log(`  MongoDB   ${config.mongoUri}`)
  console.log(`  集合      ${config.mongoCollection}`)
  if (config.redisUri) console.log(`  Redis     ${config.redisUri}`)
  console.log(`  后端      ${config.backendUrl}`)
  console.log(`  日志级别  ${config.logLevel}`)
  console.log('')
  console.log('可用端点：')
  console.log('')
  console.log(
    renderTable(
      ['方法', '路径', '说明'],
      [
        ['WebSocket', `ws://127.0.0.1:${port}`, 'Hocuspocus 协同入口（客户端连接）'],
        ['HTTP', `http://127.0.0.1:${config.backendUrl.split(':').pop()}/api/internal/filter-content`, '敏感词过滤（Java 后端）'],
      ],
    ),
  )
  console.log('')
}