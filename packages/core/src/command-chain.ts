/**
 * 命令分发责任链（Chain of Responsibility）
 *
 * 将命令分发从 if-else 硬编码改为可插拔的 handler 链。
 * 每个 handler 决定是否处理命令，或调 next() 传递给下一个 handler。
 * 支持运行时插入中间件（日志/权限/撤销重做等）而不侵入核心逻辑。
 */

/** 传递给下一个 handler 的函数，调 next() 表示"我不处理，交给下一个" */
export type CommandNext = () => any

/** 命令处理器：(command, args, next) → result | next() */
export type CommandHandler = (command: string, args: any[], next: CommandNext) => any

/**
 * 命令责任链。
 *
 * 用法：
 * ```ts
 * const chain = new CommandChain()
 *   .use((cmd, args, next) => {
 *     if (cmd === 'foo') return handleFoo(...args)
 *     return next() // 不归我管，交给下一个
 *   })
 *   .use((cmd, args, next) => {
 *     // 兜底 handler
 *     return defaultHandler(cmd, ...args)
 *   })
 * chain.dispatch('foo', 1, 2) // → handleFoo(1, 2)
 * ```
 */
export class CommandChain {
  /** 有序 handler 列表 */
  private readonly handlers: CommandHandler[] = []

  /** 注册 handler，返回 this 支持链式调用 */
  use(handler: CommandHandler): this {
    this.handlers.push(handler)
    return this
  }

  /**
   * 沿链分发命令。
   * 从第一个 handler 开始，依次调用；handler 返回 next() 时传递给下一个。
   * 所有 handler 都不处理时返回 undefined。
   */
  dispatch(command: string, ...args: any[]): any {
    let index = 0
    const next: CommandNext = () => {
      if (index >= this.handlers.length) return undefined
      const handler = this.handlers[index++]
      return handler(command, args, next)
    }
    return next()
  }
}