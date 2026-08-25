import express from 'express'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs/promises'
import { parseDocx, exportFromJson, JarBridgeError } from '../services/jar-bridge.js'
import { withTempDir, writeTempFile } from '../utils/temp-files.js'
import { createLogger } from '../utils/logger.js'
import { t } from '../utils/i18n.js'
import type {
  ParseOptions,
  ParseApiResponse,
  ExportOptions,
  ExportFormat,
  ErrorResponse,
} from '../types/api-types.js'

/**
 * API 路由：解析与导出端点
 *
 * POST /documents/translate/word    docx → json
 * POST /documents/render            json → docx/pdf（format 参数）
 */

const log = createLogger('api')

/** 导出格式对应的 MIME 类型 */
const MIME_TYPES: Record<ExportFormat, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf',
}

/** multer 实例：内存存储，限制单文件 50MB，UTF-8 解码文件名 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  defParamCharset: 'utf8',
} as multer.Options)

/** JSON body 解析中间件（限制 50MB） */
const jsonBodyParser = express.json({ limit: '50mb' })

/**
 * 将未知值转为布尔。
 *
 * @param v 原始值（支持 'true'/'1' → true，'false'/'0' → false）
 * @returns 布尔值，无法转换时返回 undefined
 */
function toBoolean(v: unknown): boolean | undefined {
  if (v == null) return undefined
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') return v === 'true' || v === '1'
  return undefined
}

/**
 * 将未知值转为有限数字。
 *
 * @param v 原始值（字符串或数字）
 * @returns 有限数字，无法转换时返回 undefined
 */
function toNumber(v: unknown): number | undefined {
  if (v == null || v === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

/**
 * 从 body 与 query 提取解析选项。
 *
 * body 优先于 query，空值跳过。
 *
 * @param body multipart 表单文本字段
 * @param query URL query 参数
 * @returns 解析选项对象
 */
function extractParseOptions(
  body: Record<string, unknown>,
  query: Record<string, string>,
): ParseOptions {
  const get = (key: string): string | null => {
    const v = body[key]
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

/**
 * 从 body 与 query 提取导出选项。
 *
 * body 优先于 query，空值跳过。
 *
 * @param body multipart 表单文本字段（可为 null）
 * @param query URL query 参数
 * @returns 导出选项对象
 */
function extractExportOptions(
  body: Record<string, unknown> | null,
  query: Record<string, string>,
): ExportOptions {
  const get = (key: string): string | null => {
    if (body) {
      const v = body[key]
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

/**
 * 生成随机请求 ID（8 位 base36）。
 *
 * @returns 请求 ID 字符串
 */
function generateRequestId(): string {
  return Math.random().toString(36).slice(2, 10)
}

/**
 * 处理解析请求：docx → json。
 *
 * 从 multipart/form-data 读取 .docx 文件，调用 jar 桥接解析，
 * 返回 JSON 结果。
 */
async function handleParse(req: express.Request, res: express.Response): Promise<void> {
  const reqId = generateRequestId()
  const reqLog = log.child({ reqId })
  const begin = Date.now()

  const file = req.file
  if (!file) {
    reqLog.warn(t('parse.missingFile'))
    res.status(400).json({ success: false, code: 400, error: '缺少 file 字段（.docx 文件）' })
    return
  }

  const fileName = file.originalname || 'input.docx'
  if (!fileName.toLowerCase().endsWith('.docx')) {
    reqLog.warn(t('parse.wrongType', { file: fileName }))
    res.status(400).json({ success: false, code: 400, error: 'file 必须是 .docx 文件' })
    return
  }

  reqLog.info(t('parse.received', { url: req.originalUrl, file: fileName }))

  const query = req.query as Record<string, string>
  const body = (req.body ?? {}) as Record<string, unknown>
  const options = extractParseOptions(body, query)

  try {
    const fileBuffer = file.buffer
    reqLog.debug({ fileName, fileSize: fileBuffer.byteLength, options }, '开始解析 docx')

    const result = await withTempDir(async (dir) => {
      const docxPath = await writeTempFile(dir, 'input.docx', fileBuffer)
      const jsonPath = path.join(dir, 'output.json')
      return parseDocx(docxPath, jsonPath, options)
    })

    const response: ParseApiResponse = { success: true, code: 200, data: result }
    const durationMs = Date.now() - begin
    reqLog.info(
      t('parse.completed', { file: fileName, duration: durationMs, elements: result.elements?.length ?? 0, comments: result.comments?.length ?? 0 }),
    )
    res.json(response)
  } catch (err) {
    const durationMs = Date.now() - begin
    if (err instanceof JarBridgeError) {
      reqLog.error(
        { durationMs, exitCode: err.exitCode, stderr: err.stderr },
        t('parse.failedJar'),
      )
      const errorBody: ParseApiResponse = {
        success: false,
        code: 500,
        error: err.message,
        exitCode: err.exitCode ?? undefined,
        stderr: err.stderr || undefined,
      }
      res.status(500).json(errorBody)
      return
    }
    const message = err instanceof Error ? err.message : String(err)
    reqLog.error({ durationMs, err: message }, t('parse.failed', { message }))
    res.status(500).json({ success: false, code: 500, error: t('parse.failed', { message }) })
  }
}

/**
 * 处理导出请求：json → docx/pdf。
 *
 * 支持 application/json（body 为文档 JSON）和 multipart/form-data
 *（file 字段为 .json 文件）两种入参形式，返回二进制文件流。
 * 通过 query 参数 format 指定输出格式（docx 或 pdf，默认 docx）。
 */
async function handleExport(req: express.Request, res: express.Response): Promise<void> {
  const reqId = generateRequestId()
  const begin = Date.now()
  const contentType = req.header('content-type') || ''
  const query = req.query as Record<string, string>
  const format = (query.format as ExportFormat) || 'docx'
  if (format !== 'docx' && format !== 'pdf') {
    res.status(400).json({ success: false, code: 400, error: t('export.invalidFormat') })
    return
  }
  const reqLog = log.child({ reqId, format })

  let jsonBuffer: Buffer
  let options: ExportOptions

  if (contentType.includes('application/json')) {
    jsonBuffer = Buffer.from(JSON.stringify(req.body), 'utf8')
    options = extractExportOptions(null, query)
    reqLog.info(t('export.receivedJson', { url: req.originalUrl }))
  } else if (contentType.includes('multipart/form-data')) {
    const file = req.file
    if (!file) {
      reqLog.warn(t('export.missingFile'))
      res.status(400).json({ success: false, code: 400, error: '缺少 file 字段（.json 文件）' })
      return
    }
    jsonBuffer = file.buffer
    const body = (req.body ?? {}) as Record<string, unknown>
    options = extractExportOptions(body, query)
    reqLog.info(t('export.received', { url: req.originalUrl, file: file.originalname }))
  } else {
    reqLog.warn(t('export.unsupportedType', { contentType }))
    res.status(400).json({
      success: false,
      code: 400,
      error: t('export.mustBeJsonOrMultipart'),
    })
    return
  }

  try {
    reqLog.debug({ jsonBytes: jsonBuffer.byteLength, options }, '开始导出')
    const fileBuffer = await withTempDir(async (dir) => {
      const jsonPath = path.join(dir, 'input.json')
      await fs.writeFile(jsonPath, jsonBuffer)
      const outputPath = path.join(dir, `output.${format}`)
      await exportFromJson(jsonPath, outputPath, format, options)
      return fs.readFile(outputPath)
    })

    const durationMs = Date.now() - begin
    reqLog.info(t('export.completed', { duration: durationMs, bytes: fileBuffer.byteLength }))
    res.setHeader('Content-Type', MIME_TYPES[format])
    res.setHeader('Content-Disposition', `attachment; filename="output.${format}"`)
    res.send(fileBuffer)
  } catch (err) {
    const durationMs = Date.now() - begin
    if (err instanceof JarBridgeError) {
      reqLog.error(
        { durationMs, exitCode: err.exitCode, stderr: err.stderr },
        t('export.failedJar'),
      )
      const errorBody: ErrorResponse = {
        success: false,
        code: 500,
        error: err.message,
        exitCode: err.exitCode ?? undefined,
        stderr: err.stderr || undefined,
      }
      res.status(500).json(errorBody)
      return
    }
    const message = err instanceof Error ? err.message : String(err)
    reqLog.error({ durationMs, err: message }, t('export.failed', { message }))
    res.status(500).json({ success: false, code: 500, error: t('export.failed', { message }) })
  }
}

/** API 路由实例，挂载于 /documents */
export const apiRouter: express.Router = express.Router()

/**
 * multipart/form-data 解析中间件：
 * 校验 Content-Type 后用 multer 解析 file 字段。
 */
const parseFileMiddleware: express.RequestHandler = (req, res, next) => {
  const contentType = req.header('content-type') || ''
  if (!contentType.includes('multipart/form-data')) {
    res.status(400).json({
      success: false,
      code: 400,
      error: t('upload.mustBeMultipart', { contentType: contentType || '未设置' }),
    })
    return
  }
  upload.single('file')(req, res, (err) => {
    if (err) {
      res.status(400).json({
        success: false,
        code: 400,
        error: t('upload.parseFailed', { message: err.message }),
      })
      return
    }
    next()
  })
}

apiRouter.post('/translate/word', parseFileMiddleware, handleParse)

apiRouter.post(
  '/render',
  (req, res, next) => {
    const contentType = req.header('content-type') || ''
    if (contentType.includes('application/json')) {
      jsonBodyParser(req, res, next)
    } else if (contentType.includes('multipart/form-data')) {
      upload.single('file')(req, res, (err) => {
        if (err) {
          res.status(400).json({
            success: false,
            code: 400,
            error: t('upload.parseFailed', { message: err.message }),
          })
          return
        }
        next()
      })
    } else {
      res.status(400).json({
        success: false,
        code: 400,
        error: t('export.mustBeJsonOrMultipart'),
      })
    }
  },
  handleExport,
)
