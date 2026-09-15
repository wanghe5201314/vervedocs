/**
 * 批注 / 修订组件宿主契约（Host Contract）
 *
 * 该契约由 core（DocxEditor）内部实现并注入到 CommentComponent / RevisionComponent。
 *
 * ⚠️ **禁止**：packages/docx、协作层、业务层等任何"外部消费者"直接构造或替换该宿主对象。
 * 外部若要影响批注 / 修订行为，只能通过 core 暴露的 `use(plugin)` 注册插件，
 * 或通过 `editor.getPlugin('comment')` / `editor.getPlugin('revision')` 拿到插件实例。
 *
 * 违反该约定会导致 `getContainer` / `getGroupContext` 等能力丢失，
 * 从而出现「气泡不显示」这类回归问题。
 */

import type { PluginHost, GroupAnchor, GroupContext } from '@vervedoc/docx-editor-schema'

export type { GroupAnchor, GroupContext }

/**
 * 批注 / 修订宿主契约，等价于 {@link PluginHost}。
 *
 * 保留为命名别名以兼容 CommentComponent / RevisionComponent 现有的 `install(command: CommentHost)` 签名，
 * 新代码请直接使用 `PluginHost`。
 */
export type CommentHost = PluginHost
