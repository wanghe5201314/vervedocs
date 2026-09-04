import pino from 'pino'
import pretty from 'pino-pretty'
import { execSync } from 'node:child_process'
import { config } from '../config.js'

/**
 * 结构化日志工具（基于 pino）
 *
 * - 默认 pino-pretty 彩色单行输出到 stdout（主线程同步，编码正确）
 * - 设置 LOG_FILE 后同时写入 stdout 与文件（文件为 JSON）
 * - 通过 createLogger(module) 创建带模块标签的子 logger
 */

// Windows 控制台默认 GBK 编码，切换为 UTF-8 以正确显示中文日志
if (process.platform === 'win32') {
  try {
    execSync('chcp 65001', { stdio: 'ignore' })
  } catch {
    // chcp 不可用时忽略，不影响日志功能
  }
}

const logLevel = config.logLevel as pino.Level

const baseOptions: pino.LoggerOptions = {
  level: logLevel,
  timestamp: pino.stdTimeFunctions.isoTime,
}

const prettyOptions = {
  colorize: true,
  singleLine: true,
  translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
}

/**
 * 构建日志实例。
 *
 * - LOG_FILE 设置时：stdout（pretty 或 JSON）+ 文件（JSON）双写
 * - LOG_PRETTY=true 时：stdout 用 pino-pretty 彩色单行输出
 * - 否则：stdout 用 JSON 输出
 *
 * @returns pino 日志实例
 */
function buildLogger(): pino.Logger {
  if (config.logFile) {
    const streams: pino.StreamEntry[] = []
    if (config.logPretty) {
      streams.push({ level: logLevel, stream: pretty(prettyOptions) })
    } else {
      streams.push({ level: logLevel, stream: pino.destination(1) })
    }
    streams.push({
      level: logLevel,
      stream: pino.destination({ dest: config.logFile, mkdir: true }),
    })
    return pino(baseOptions, pino.multistream(streams))
  }

  if (config.logPretty) {
    return pino(baseOptions, pretty(prettyOptions))
  }

  return pino(baseOptions)
}

export const logger = buildLogger()

/** 创建带模块标签的子 logger */
export function createLogger(module: string): pino.Logger {
  return logger.child({ module })
}