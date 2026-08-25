import { Hono, type Context } from 'hono'
import path from 'node:path'
import fs from 'node:fs/promises'
import { exportFromJson, JarBridgeError } from '../services/jar-bridge.js'
import { withTempDir } from '../utils/temp-files.js'
import type { ExportOptions, ExportFormat, ErrorResponse } from '../types/api-types.js'

/**
 * POST /api/export        (json → docx)
 * POST /api/export-pdf    (json → pdf)
 *
 * 导出路由
 *
 * 入参支持两种形式：
 *   1. application/json        — 直接 POST 文档 JSON body，导出选项通过 query 传递
 *   2. multipart/form-data     — file 字段为 .json 文件，导出选项通过 form fields 传递
 *
 * 出参：成功返回二进制文件流（docx/pdf），失败返回 ErrorResponse JSON
 */

const MIME_TYPES: Record<ExportFormat, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf',
}

function toNumber(v: unknown): number | undefined {
  if (v == null || v === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

function extractExportOptions(
  formData: FormData | null,
  query: Record<string, string>,
): ExportOptions {
  const get = (key: string): string | null => {
    if (formData) {
      const v = formData.get(key)
      if (typeof v === 'string' && v !== '') return v
    }
    return query[key] ?? null
  }

  const options: ExportOptions = {}
  const defaultFont = get('defaultFont')
  if (defaultFont != null) options.defaultFont = defaultFont
  const defaultSize = toNumber(get('defaultSize'))
  if (defaultSize != null) options.defaultSize = defaultSize
  return options
}

function errorResponse(err: unknown): Response {
  if (err instanceof JarBridgeError) {
    const body: ErrorResponse = {
      success: false,
      error: err.message,
      exitCode: err.exitCode ?? undefined,
      stderr: err.stderr || undefined,
    }
    return Response.json(body, { status: 500 })
  }
  const message = err instanceof Error ? err.message : String(err)
  return Response.json(
    { success: false, error: `导出异常: ${message}` },
    { status: 500 },
  )
}

/**
 * 共享导出处理函数。
 *
 * 由 export-route 与 export-pdf-route 复用，仅 format 不同。
 */
export async function handleExport(c: Context, format: ExportFormat): Promise<Response> {
  const contentType = c.req.header('content-type') || ''
  const query = c.req.query() as Record<string, string>

  let jsonBuffer: Buffer
  let options: ExportOptions

  if (contentType.includes('application/json')) {
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return Response.json(
        { success: false, error: 'JSON body 解析失败' },
        { status: 400 },
      )
    }
    jsonBuffer = Buffer.from(JSON.stringify(body), 'utf8')
    options = extractExportOptions(null, query)
  } else if (contentType.includes('multipart/form-data')) {
    let formData: FormData
    try {
      formData = await c.req.formData()
    } catch {
      return Response.json(
        { success: false, error: 'multipart/form-data 解析失败' },
        { status: 400 },
      )
    }
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return Response.json(
        { success: false, error: '缺少 file 字段（.json 文件）' },
        { status: 400 },
      )
    }
    jsonBuffer = Buffer.from(await file.arrayBuffer())
    options = extractExportOptions(formData, query)
  } else {
    return Response.json(
      {
        success: false,
        error: 'Content-Type 必须是 application/json 或 multipart/form-data',
      },
      { status: 400 },
    )
  }

  try {
    const ext = format
    const fileBuffer = await withTempDir(async (dir) => {
      const jsonPath = path.join(dir, 'input.json')
      await fs.writeFile(jsonPath, jsonBuffer)
      const outputPath = path.join(dir, `output.${ext}`)
      await exportFromJson(jsonPath, outputPath, format, options)
      return fs.readFile(outputPath)
    })

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': MIME_TYPES[format],
        'Content-Disposition': `attachment; filename="output.${ext}"`,
      },
    })
  } catch (err) {
    return errorResponse(err)
  }
}

/** json → docx 路由 */
export const exportRoute = new Hono()

exportRoute.post('/', async (c) => handleExport(c, 'docx'))