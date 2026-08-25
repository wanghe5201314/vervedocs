import dotenv from 'dotenv'
import path from 'node:path'
import fs from 'node:fs'

dotenv.config()

const projectRoot = process.cwd()

/**
 * 解析 jar 路径：绝对路径原样返回，相对路径基于项目根解析。
 *
 * @param raw 原始路径
 * @returns 绝对路径
 */
function resolveJarPath(raw: string): string {
  if (path.isAbsolute(raw)) return raw
  return path.resolve(projectRoot, raw)
}

const jarPathRaw = process.env.JAR_PATH || './jars/vervedocs-for-java.jar'
const jarPath = resolveJarPath(jarPathRaw)

if (!fs.existsSync(jarPath)) {
  console.warn(
    `[config] 警告: jar 包不存在于 ${jarPath}，请先构建 vervedocs-for-java 或通过 JAR_PATH 指定路径`,
  )
}

export const config = {
  port: parseInt(process.env.PORT || '1320', 10),

  javaBin: process.env.JAVA_BIN || 'java',
  jarPath,
  javaOpts: (process.env.JAVA_OPTS || '-Xmx512m')
    .split(/\s+/)
    .filter(Boolean),

  tempDir: process.env.TEMP_DIR || undefined,
  tempTtl: parseInt(process.env.TEMP_TTL || '300000', 10),

  logLevel: process.env.LOG_LEVEL || 'info',
  logFile: process.env.LOG_FILE || undefined,
  logPretty: process.env.LOG_PRETTY !== 'false',

  projectRoot,
} as const

export type Config = typeof config