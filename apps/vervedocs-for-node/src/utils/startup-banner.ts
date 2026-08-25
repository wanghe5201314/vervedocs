import { config } from '../config.js'
import { renderTable } from './banner-table.js'

/**
 * 启动 banner：服务信息 + 端点聚合表格（方法/URL/说明/参数）。
 */
export function printStartupBanner(port: number): void {
  const base = `http://127.0.0.1:${port}`
  const rule = '─'.repeat(72)
  console.log('')
  console.log(rule)
  console.log('  vervedocs-for-node · 文件处理服务已启动')
  console.log(rule)
  console.log(`  端口      ${port}`)
  console.log(`  java      ${config.javaBin}`)
  console.log(`  jar       ${config.jarPath}`)
  console.log(`  日志级别  ${config.logLevel}`)
  console.log('  可用请求端点：')
  console.log(
    renderTable(
      ['方法', 'URL', '说明', '参数'],
      [
        ['GET', `${base}/health`, '健康检查', '-'],
        [
          'POST',
          `${base}/documents/translate/word`,
          '解析 Word 文档为 JSON',
          'file: Word 文档（必填）',
        ],
        [
          'POST',
          `${base}/documents/render`,
          '将 JSON 导出为 Word/PDF 文档',
          'body: 文档 JSON（application/json）或 file: .json 文件（multipart/form-data）\nformat: 输出格式 docx|pdf（默认 docx）',
        ],
      ],
    ),
  )
  console.log('')
}
