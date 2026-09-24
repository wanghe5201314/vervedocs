/**
 * 批注 / 修订插件工厂
 *
 * 将 CommentComponent / RevisionComponent 包装为 EditorPlugin，通过 `editor.use(plugin)` 注册。
 * core 不感知任何批注/修订特有方法，宿主层通过 `editor.getPlugin('comment')` / `editor.getPlugin('revision')`
 * 拿到具体插件实例后调用其方法。
 */

import type {
  EditorPlugin,
  IComment,
  DocxCommentMeta,
  CommentCallbacks,
  RevisionCallbacks,
  PluginHost
} from '@vervedoc/docx-editor-schema'
import { CommentComponent } from './comment/comment-component'
import { RevisionComponent } from './comment/revision-component'

export type { BalloonTranslate } from './comment/translation'

/** 批注插件：EditorPlugin + 批注操作方法（供宿主层调用） */
export interface CommentPlugin extends EditorPlugin {
  /** 新建批注，在高亮选区上创建编辑态气泡 */
  add(userName?: string): IComment | null
  /** 删除指定 ID 的批注并清除文档高亮 */
  delete(id: string): void
  /** 定位到指定批注的选区位置 */
  locate(id: string): void
  /** 获取全部批注列表 */
  getAll(): IComment[]
  /** 整体替换批注列表（远端变更回填 / 协同同步用） */
  setAll(comments: IComment[]): void
  /** 从 docx 解析出的批注元数据构建批注列表 */
  buildFromMetas(metas: DocxCommentMeta[]): void
  /** 从统一批注协议恢复列表 */
  restore(saved: DocxCommentMeta[]): void
  /** 获取与 Java 一致的文档批注数据 */
  serialize(): DocxCommentMeta[]
  /** 刷新批注气泡 DOM 渲染 */
  render(): void
  /** 设置批注生命周期回调（保存/删除/回复/解决/取消） */
  setCallbacks(callbacks: CommentCallbacks): void
}

/** 修订插件：EditorPlugin + 修订操作方法（供宿主层调用） */
export interface RevisionPlugin extends EditorPlugin {
  /** 获取全部修订列表 */
  getAll(): Array<{
    id: string; type: 'insert' | 'delete' | 'format'; author: string; date: string; content: string
  }>
  /** 刷新修订气泡 DOM 渲染 */
  update(): void
  /** 接受指定修订 */
  accept(id: string): void
  /** 拒绝指定修订 */
  reject(id: string): void
  /** 接受文档中的所有修订 */
  acceptAll(): void
  /** 拒绝文档中的所有修订 */
  rejectAll(): void
  /** 设置修订生命周期回调 */
  setCallbacks(callbacks: RevisionCallbacks): void
}

/**
 * 创建批注插件实例。
 *
 * install 时注入 PluginHost 并自动绑定 EventBus；
 * commands 注册 `requestInsertComment` 命令；
 * hooks.afterRender 自渲染气泡，hooks.onSetDocument 同步批注数据。
 */
export function createCommentPlugin(): CommentPlugin {
  let i18n: ReturnType<PluginHost['getI18n']> | undefined
  let unsubscribe: (() => void) | undefined
  const comment = new CommentComponent((key, params) => i18n?.t(key, params) ?? key)
  return {
    name: 'comment',
    install: (host) => {
      i18n = host.getI18n()
      comment.install(host)
      comment.setEventBus(host.getEventBus())
      unsubscribe?.()
      unsubscribe = i18n.subscribe(() => comment.render())
    },
    commands: {
      requestInsertComment: () => comment.add()
    },
    hooks: {
      afterRender: () => comment.render(),
      onSetDocument: (doc) => {
        comment.buildFromMetas(doc.comments ?? [], true)
      }
    },
    destroy: () => { unsubscribe?.(); comment.destroy() },
    add: (userName) => comment.add(userName),
    delete: (id) => comment.delete(id),
    locate: (id) => comment.locate(id),
    getAll: () => comment.getAll(),
    setAll: (list) => comment.setAll(list),
    buildFromMetas: (metas) => comment.buildFromMetas(metas),
    restore: (saved) => comment.restore(saved),
    serialize: () => comment.serialize(),
    render: () => comment.render(),
    setCallbacks: (callbacks) => comment.setCallbacks(callbacks)
  }
}

/**
 * 创建修订插件实例。
 *
 * install 时注入 PluginHost；hooks.afterRender 自渲染修订气泡。
 */
export function createRevisionPlugin(): RevisionPlugin {
  let i18n: ReturnType<PluginHost['getI18n']> | undefined
  let unsubscribe: (() => void) | undefined
  const revision = new RevisionComponent((key, params) => i18n?.t(key, params) ?? key)
  return {
    name: 'revision',
    install: (host) => {
      i18n = host.getI18n()
      revision.install(host)
      unsubscribe?.()
      unsubscribe = i18n.subscribe(() => revision.update())
    },
    hooks: {
      afterRender: () => revision.update()
    },
    destroy: () => { unsubscribe?.(); revision.destroy() },
    getAll: () => revision.getAll(),
    update: () => revision.update(),
    accept: (id) => revision.accept(id),
    reject: (id) => revision.reject(id),
    acceptAll: () => revision.acceptAll(),
    rejectAll: () => revision.rejectAll(),
    setCallbacks: (callbacks) => revision.setCallbacks(callbacks)
  }
}
