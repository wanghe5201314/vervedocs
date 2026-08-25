import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import { config } from '../config.js'
import { createLogger } from '../utils/logger.js'
import type {
  ParseOptions,
  ExportOptions,
  DocxParseResult,
  ExportFormat,
} from '../types/api-types.js'

/**
 * vervedocs-for-java jar 调用桥接
 *
 * 通过 child_process.spawn 调用 `java -jar vervedocs-for-java.jar`，
 * 使用临时文件传递输入输出，避免 stdin/stdout 二进制流问题。
 *
 * 退出码契约（来自 VervedocsDocx4j.java）：
 *   0 成功 / 1 解析失败 / 2 参数错误 / 3 IO 错误
 */

const log = createLogger('jar-bridge')

/**
 * jar 调用失败错误。
 *
 * @param message 错误描述
 * @param exitCode java 进程退出码（启动失败时为 null）
 * @param stderr java 进程 stderr 输出
 */
export class JarBridgeError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number | null,
    public readonly stderr: string,
  ) {
    super(message)
    this.name = 'JarBridgeError'
  }
}

/** jar 调用通用结果 */
export interface JarRunResult {
  /** 是否成功（退出码为 0） */
  success: boolean
  /** java 进程退出码 */
  exitCode: number
  /** stderr 输出 */
  stderr: string
  /** stdout 输出 */
  stdout: string
}

/**
 * 将解析选项转为 jar CLI 参数。
 *
 * @param opts 解析选项
 * @returns CLI 参数数组（如 ['--default-font', 'SimSun']）
 */
function parseOptionsToArgs(opts: ParseOptions): string[] {
  const args: string[] = []
  if (opts.defaultFont != null) args.push('--default-font', String(opts.defaultFont))
  if (opts.defaultSize != null) args.push('--default-size', String(opts.defaultSize))
  if (opts.tableWidthMode != null) args.push('--table-width-mode', opts.tableWidthMode)
  if (opts.forceLineHeight != null) args.push('--force-line-height', String(opts.forceLineHeight))
  if (opts.includeHeaderFooter) args.push('--include-header-footer')
  if (opts.includeFootnotes) args.push('--include-footnotes')
  if (opts.chartStrategy != null) args.push('--chart-strategy', opts.chartStrategy)
  if (opts.mathStrategy != null) args.push('--math-strategy', opts.mathStrategy)
  return args
}

/**
 * 将导出选项转为 jar CLI 参数。
 *
 * @param opts 导出选项
 * @returns CLI 参数数组
 */
function exportOptionsToArgs(opts: ExportOptions): string[] {
  const args: string[] = []
  if (opts.defaultFont != null) args.push('--default-font', String(opts.defaultFont))
  if (opts.defaultSize != null) args.push('--default-size', String(opts.defaultSize))
  return args
}

/**
 * 执行 jar 命令并等待退出。
 *
 * @param args CLI 参数（不含 java/jar 本身）
 * @returns 退出码与输出
 */
function runJar(args: string[]): Promise<JarRunResult> {
  return new Promise((resolve, reject) => {
    const fullArgs = [...config.javaOpts, '-jar', config.jarPath, ...args]
    const begin = Date.now()
    log.debug({ cmd: config.javaBin, args: fullArgs }, '启动 java 进程')

    const child = spawn(config.javaBin, fullArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })

    const stdoutChunks: Buffer[] = []
    const stderrChunks: Buffer[] = []

    child.stdout?.on('data', (chunk: Buffer) => {
      stdoutChunks.push(chunk)
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      stderrChunks.push(chunk)
    })

    child.on('error', (err) => {
      const durationMs = Date.now() - begin
      log.error({ durationMs, err: err.message }, '启动 java 进程失败')
      reject(
        new JarBridgeError(
          `启动 java 进程失败: ${err.message}（请检查 JAVA_BIN=${config.javaBin} 是否可用）`,
          null,
          '',
        ),
      )
    })

    child.on('close', (code) => {
      const stdout = Buffer.concat(stdoutChunks).toString('utf8')
      const stderr = Buffer.concat(stderrChunks).toString('utf8')
      const durationMs = Date.now() - begin
      const exitCode = code ?? -1
      const success = code === 0
      log.debug(
        { exitCode, success, durationMs, stdoutBytes: stdout.length, stderrBytes: stderr.length },
        'java 进程退出',
      )
      if (!success && stderr) {
        log.warn({ stderr }, 'java 进程 stderr')
      }
      resolve({ success, exitCode, stderr, stdout })
    })
  })
}

/**
 * 根据退出码生成错误描述。
 *
 * @param exitCode java 进程退出码
 * @param stderr stderr 输出（取末尾 3 行）
 * @returns 人类可读的错误描述
 */
function describeFailure(exitCode: number, stderr: string): string {
  const tail = stderr.trim().split('\n').slice(-3).join('\n').trim()
  switch (exitCode) {
    case 1:
      return `解析/导出失败: ${tail || '未知错误'}`
    case 2:
      return `参数错误: ${tail || '请检查入参'}`
    case 3:
      return `IO 错误: ${tail || '读写文件失败'}`
    default:
      return `java 进程异常退出 (code=${exitCode}): ${tail || '无输出'}`
  }
}

/**
 * 解析 docx → json
 *
 * 对应 CLI: `java -jar vervedocs-for-java.jar -i input.docx -o output.json --pretty [解析选项]`
 *
 * @param docxPath 输入 .docx 文件绝对路径
 * @param jsonPath 输出 .json 文件绝对路径
 * @param options 解析选项
 * @returns 解析结果对象（DocxParseResult）
 */
export async function parseDocx(
  docxPath: string,
  jsonPath: string,
  options: ParseOptions = {},
): Promise<DocxParseResult> {
  log.debug({ docxPath, jsonPath, options }, '开始解析 docx → json')
  const args = [
    '-i', docxPath,
    '-o', jsonPath,
    '--pretty',
    ...parseOptionsToArgs(options),
  ]
  const result = await runJar(args)
  if (!result.success) {
    log.error({ exitCode: result.exitCode, stderr: result.stderr }, '解析 docx 失败')
    throw new JarBridgeError(
      describeFailure(result.exitCode, result.stderr),
      result.exitCode,
      result.stderr,
    )
  }

  const jsonText = await fs.readFile(jsonPath, 'utf8')
  const parsed = JSON.parse(jsonText) as DocxParseResult
  log.debug(
    {
      jsonBytes: jsonText.length,
      elementCount: parsed.elements?.length ?? 0,
      commentCount: parsed.comments?.length ?? 0,
    },
    '解析 docx 完成',
  )
  return parsed
}

/**
 * 导出 json → docx/pdf
 *
 * 对应 CLI:
 *   docx: `java -jar vervedocs-for-java.jar --export -i input.json -o output.docx [导出选项]`
 *   pdf:  `java -jar vervedocs-for-java.jar --pdf    -i input.json -o output.pdf  [导出选项]`
 *
 * @param jsonPath 输入 .json 文件绝对路径
 * @param outputPath 输出文件绝对路径
 * @param format 目标格式
 * @param options 导出选项
 */
export async function exportFromJson(
  jsonPath: string,
  outputPath: string,
  format: ExportFormat,
  options: ExportOptions = {},
): Promise<void> {
  log.debug({ jsonPath, outputPath, format, options }, `开始导出 json → ${format}`)
  const args = [
    format === 'pdf' ? '--pdf' : '--export',
    '-i', jsonPath,
    '-o', outputPath,
    ...exportOptionsToArgs(options),
  ]
  const result = await runJar(args)
  if (!result.success) {
    log.error({ format, exitCode: result.exitCode, stderr: result.stderr }, '导出失败')
    throw new JarBridgeError(
      describeFailure(result.exitCode, result.stderr),
      result.exitCode,
      result.stderr,
    )
  }
  const stat = await fs.stat(outputPath)
  log.debug({ format, outputBytes: stat.size }, '导出完成')
}

/** 健康检查：验证 jar 包与 java 可执行文件可用 */
export async function checkBridge(): Promise<{
  ok: boolean
  javaBin: string
  jarPath: string
  message: string
}> {

  const jarExists = fsSync.existsSync(config.jarPath)
  if (!jarExists) {
    log.warn({ jarPath: config.jarPath }, 'jar 包不存在')
    return {
      ok: false,
      javaBin: config.javaBin,
      jarPath: config.jarPath,
      message: `jar 包不存在: ${config.jarPath}`,
    }
  }
  log.debug({ javaBin: config.javaBin, jarPath: config.jarPath }, 'jar 桥接就绪')
  return {
    ok: true,
    javaBin: config.javaBin,
    jarPath: config.jarPath,
    message: 'jar 桥接就绪',
  }
}