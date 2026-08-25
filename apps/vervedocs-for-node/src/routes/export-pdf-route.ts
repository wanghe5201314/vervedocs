import { Hono } from 'hono'
import { handleExport } from './export-route.js'

/**
 * POST /api/export-pdf
 *
 * json → pdf 导出路由
 *
 * 入参与 /api/export 完全一致，仅输出格式为 PDF。
 * 共享 export-route 中的 handleExport 处理逻辑。
 */
export const exportPdfRoute = new Hono()

exportPdfRoute.post('/', async (c) => handleExport(c, 'pdf'))