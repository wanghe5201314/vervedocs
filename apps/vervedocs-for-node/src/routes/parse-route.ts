import { Hono } from 'hono'
import path from 'node:path'
import { parseDocx, JarBridgeError } from '../services/jar-bridge.js'
import { withTempDir, writeTempFile } from '../utils/temp-files.js'
import type { ParseOptions, ParseApiResponse } from '../types/api-types.js'

/**
 * POST /api/parse
 *
 * docx → json 解析路由
 *
 * 入参：multipart/form-data
 *   - file: .docx 文件（必填）
 *   - defaultFont?: string
 *   - defaultSize?: number
 *   - tableWidthMode?: 'fit' | 'word'
 *   - forceLineHeight?: number
 *   - includeHeaderFooter?: 'true' | 'false'
 *   - includeFootnotes?: 'true' | 'false'
 *   - chartStrategy?: 'preview' | 'xml' | 'skip'
 *   - mathStrategy?: 'text' | 'placeholder' | 'skip'
 *
 * 出参：application/json，ParseApiResponse
 */
export const parseRoute = new Hono()

function toBoolean(v: unknown): boolean | undefined {
  if (v == null) return undefined
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') return v === 'true' || v === '1'
  return undefined
}

function toNumber(v: unknown): number | undefined {
  if (v == null || v === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

function extractParseOptions(
  formData: FormData,
  query: Record<string, string>,
): ParseOptions {
  const get = (key: string): string | null => {
    const v = formData.get(key)
    if (typeof v === 'string' && v !== '') return v
    const q = query[key]
    return q ?? null
  }

  const options: ParseOptions = {}
  const defaultFont = get('defaultFont')
  if (defaultFont != null) options.defaultFont = defaultFont
  const defaultSize = toNumber(get('defaultSize'))
  if (defaultSize != null) options.defaultSize = defaultSize
  const tableWidthMode = get('tableWidthMode')
  if (tableWidthMode != null) options.tableWidthMode = tableWidthMode as ParseOptions['tableWidthMode']
  const forceLineHeight = toNumber(get('forceLineHeight'))
  if (forceLineHeight != null) options.forceLineHeight = forceLineHeight
  const includeHeaderFooter = toBoolean(get('includeHeaderFooter'))
  if (includeHeaderFooter != null) options.includeHeaderFooter = includeHeaderFooter
  const includeFootnotes = toBoolean(get('includeFootnotes'))
  if (includeFootnotes != null) options.includeFootnotes = includeFootnotes
  const chartStrategy = get('chartStrategy')
  if (chartStrategy != null) options.chartStrategy = chartStrategy as ParseOptions['chartStrategy']
  const mathStrategy = get('mathStrategy')
  if (mathStrategy != null) options.mathStrategy = mathStrategy as ParseOptions['mathStrategy']
  return options
}

parseRoute.post('/', async (c) => {
  let formData: FormData
  try {
    formData = await c.req.formData()
  } catch {
    return c.json(
      { success: false, error: '请求必须是 multipart/form-data 且包含 file 字段' },
      400,
    )
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return c.json({ success: false, error: '缺少 file 字段（.docx 文件）' }, 400)
  }

  const fileName = file.name || 'input.docx'
  if (!fileName.toLowerCase().endsWith('.docx')) {
    return c.json({ success: false, error: 'file 必须是 .docx 文件' }, 400)
  }

  const query = c.req.query() as Record<string, string>
  const options = extractParseOptions(formData, query)

  try {
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    const result = await withTempDir(async (dir) => {
      const docxPath = await writeTempFile(dir, 'input.docx', fileBuffer)
      const jsonPath = path.join(dir, 'output.json')
      return parseDocx(docxPath, jsonPath, options)
    })

    const response: ParseApiResponse = { success: true, data: result }
    return c.json(response)
  } catch (err) {
    if (err instanceof JarBridgeError) {
      const body: ParseApiResponse = {
        success: false,
        error: err.message,
        exitCode: err.exitCode ?? undefined,
        stderr: err.stderr || undefined,
      }
      return c.json(body, 500)
    }
    const message = err instanceof Error ? err.message : String(err)
    return c.json({ success: false, error: `解析异常: ${message}` }, 500)
  }
})