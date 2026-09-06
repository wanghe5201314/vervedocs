/**
 * VerveDocs Transform —— 安全命令包装
 *
 * 创建 Command 的代理对象，所有方法调用均被 try-catch 包裹，
 * 用于外部注册的快捷键回调，避免因命令不存在或参数错误导致崩溃。
 */

import type { Command } from './command'

/**
 * 创建 Command 的安全代理。
 * 代理对象拦截所有属性访问，若属性为函数则用 try-catch 包裹执行，
 * 异常时静默忽略并返回 undefined。
 * @param command 原始命令对象
 * @returns 安全命令代理（与 Command 同类型）
 */
export function createSafeCommand(command: Command): Command {
  return new Proxy(command, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)
      if (typeof value === 'function') {
        return (...args: any[]) => {
          try {
            return value.apply(target, args)
          } catch {
            return undefined
          }
        }
      }
      return value
    }
  })
}