import { Shortcut } from './shortcut'

/** Draw 编辑器实例类型（避免循环依赖，此处使用 any） */
type Draw = any
/** 命令对象类型（避免循环依赖，此处使用 any） */
type Command = any

/**
 * 快捷键插件组件
 *
 * 作为快捷键模块对外暴露的组件封装，负责创建并持有 Shortcut 实例，
 * 供编辑器通过 install/getShortcut 进行装配与获取。
 */
export class KeymapComponent {
  /** 内部持有的快捷键管理实例，install 后赋值，卸载时置空 */
  private _shortcut: Shortcut | null = null

  /**
   * 安装快捷键组件，创建 Shortcut 实例并完成事件绑定
   *
   * @param draw Draw 编辑器实例
   * @param command 命令对象
   * @returns 当前组件实例，便于链式调用
   */
  public install(draw: Draw, command: Command): this {
    this._shortcut = new Shortcut(draw, command)
    return this
  }

  /**
   * 获取已安装的快捷键管理实例
   *
   * @returns Shortcut 实例，未安装时返回 null
   */
  public getShortcut(): Shortcut | null {
    return this._shortcut
  }
}
