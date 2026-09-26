/**
 * VerveDocs Schema —— Plugin 层跨包共享接口
 *
 * 插件注册框架的核心类型：PluginHost（宿主契约）与 EditorPlugin（插件契约）。
 * 可选功能（批注/修订等）通过 EditorPlugin 注册到 core，核心引擎（view/transform）保持内置。
 */

import type { IDocxDocumentMeta } from '../types'
import type { IChartRenderer } from './chart'


/** 分组锚点坐标（由布局引擎产出） */
export interface GroupAnchor {
  startX: number
  startY: number
  endX: number
  endY: number
  lineHeight: number
  /** Height of the last highlighted line, which may differ from the first. */
  endLineHeight?: number
  glyphHeight: number
  startGlyphTop: number
  endGlyphTop: number
}

/** 分组上下文，`_anchor` 由新架构直接返回，避免依赖 positionList */
export interface GroupContext {
  isTable: boolean
  index: number
  startIndex: number
  endIndex: number
  _anchor?: GroupAnchor
}

/**
 * 插件宿主契约：由 core 构造并注入给每个已注册插件。
 *
 * 插件通过该契约与 core 单向通信，避免直接依赖 Draw / Command 具体实现。
 * 该契约是 CommentHost 的泛化版本，批注/修订等插件共用。
 */
export interface PluginHost {
  getI18n(): import('@vervedoc/i18n').EditorI18n
  /** 获取气泡挂载容器（Draw 的 scroller） */
  getContainer(): HTMLDivElement | null
  /** 兼容旧架构的 positionList，新架构固定返回 null */
  getPositionList(): any[] | null
  /** 通过 revisionId 获取修订锚点；找不到返回 null */
  getRevisionAnchor(revisionId: string): GroupAnchor | null
  /** 页面宽度（px） */
  getDrawWidth(): number
  /** 页面高度（px） */
  getDrawHeight(): number
  /** 页间距（px） */
  getPageGap(): number
  /** 编辑器选项（只读引用） */
  getOptions(): Record<string, any>
  /** 主区文档元素列表 */
  getElementList(): any[]
  getDocument(): IDocxDocumentMeta
  commitTransaction(action: (doc: IDocxDocumentMeta) => boolean | void): void
  /** 通过 groupId 获取锚点上下文；找不到返回 null */
  getGroupContext(groupId: string): GroupContext | null
  /** 创建新分组（返回 groupId 或 null） */
  executeSetGroup(update?: (doc: IDocxDocumentMeta, groupId: string) => void): string | null
  /** 删除分组 */
  executeDeleteGroup(groupId: string): void
  /** 定位到分组 */
  executeLocationGroup(groupId: string): void
  /** 更新编辑器选项 */
  executeUpdateOptions(patch: Record<string, any>): void
  /** 设置激活分组（联动锚点竖线高亮） */
  setActiveGroup(groupId: string | null): void
  /** Transient revision hover; does not change document data or layout. */
  setActiveRevision?(revisionId: string | null, color?: string): void
  /** 获取事件总线（用于批注/修订的事件广播、chart 点击等用户交互） */
  getEventBus(): { emit(event: string, ...args: any[]): void; on(event: string, handler: (...args: any[]) => void): () => void }
  /** 插入图表元素（由 chart 插件 dialog 确认后调用） */
  executeInsertChart(payload: any): void
  setChartRenderer(renderer: IChartRenderer | null): void
  /** 更新图表元素属性（编辑模式，由 chart 插件 dialog 确认后调用） */
  executeUpdateChart(id: string, patch: Record<string, unknown>): void
}

/**
 * 编辑器插件契约。
 *
 * 可选功能包（批注/修订等）导出一个满足该契约的对象，通过 `editor.use(plugin)` 注册。
 * core 不感知任何插件特有方法，宿主层通过 `editor.getPlugin(name)` 拿到具体插件实例后调用其方法。
 */
export interface EditorPlugin {
  /** 插件唯一名称，用作注册键 */
  name: string
  /** 安装插件，core 在注册时自动调用并注入 PluginHost */
  install(host: PluginHost): void
  /** 命令注册表：key 为命令名，注册后可通过 onCommand 分发，替代 core 硬编码 if 链 */
  commands?: Record<string, (...args: any[]) => any>
  /** 生命周期钩子 */
  hooks?: {
    /** 渲染后钩子，core 在 afterRender 时遍历调用，插件在此自渲染 UI */
    afterRender?: () => void
    /** 文档设置后钩子，core 在 setDocument 完成后遍历调用，插件在此同步数据 */
    onSetDocument?: (doc: IDocxDocumentMeta) => void
  }
  /** 销毁插件，释放资源 */
  destroy?(): void
}
