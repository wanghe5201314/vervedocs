import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs/promises'
import { config } from '../config.js'
import { createLogger } from './logger.js'

/**
 * 临时文件管理工具
 *
 * 为每次 jar 调用创建独立的工作目录，调用结束后异步清理。
 * 命名前缀 `vervedocs-` 便于运维识别。
 */

const log = createLogger('temp-files')

let counter = 0

/**
 * 生成唯一 ID（时间戳 + PID + 自增计数器，base36 编码）。
 *
 * @returns 唯一 ID 字符串
 */
function uniqueId(): string {
  counter = (counter + 1) % 0xffff
  return `${Date.now().toString(36)}-${process.pid.toString(36)}-${counter.toString(36)}`
}

/** 创建一个独立临时工作目录 */
export async function createTempDir(prefix = 'vervedocs-'): Promise<string> {
  const base = config.tempDir || os.tmpdir()
  const dir = path.join(base, `${prefix}${uniqueId()}`)
  await fs.mkdir(dir, { recursive: true })
  log.debug({ dir, base }, '创建临时目录')
  return dir
}

/** 写入临时文件，返回绝对路径 */
export async function writeTempFile(
  dir: string,
  name: string,
  data: Uint8Array,
): Promise<string> {
  const filePath = path.join(dir, name)
  await fs.writeFile(filePath, data)
  log.debug({ filePath, bytes: data.byteLength }, '写入临时文件')
  return filePath
}

/** 递归删除目录（忽略错误） */
export async function removeTempDir(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true })
    log.debug({ dir }, '清理临时目录')
  } catch (err) {
    log.warn({ dir, err: err instanceof Error ? err.message : String(err) }, '清理临时目录失败')
  }
}

/**
 * 在临时目录中执行回调，执行后自动清理。
 *
 * 即使回调抛错也会清理，清理错误被吞掉。
 */
export async function withTempDir<T>(
  fn: (dir: string) => Promise<T>,
  prefix?: string,
): Promise<T> {
  const dir = await createTempDir(prefix)
  try {
    return await fn(dir)
  } finally {
    await removeTempDir(dir)
  }
}