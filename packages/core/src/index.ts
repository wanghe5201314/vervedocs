/**
 * VerveDocs Core —— 公共入口
 */

import DocxEditor from './docx-editor'

export default DocxEditor
export { DocxEditor }
export { DocxEditor as Editor }

// 树模型 / 工具（全量透传 schema）
export * from '@vervedoc/docx-editor-schema'
export type { TitleLevel } from '@vervedoc/docx-editor-schema'

// UI 常量与枚举
export * from './constants'

// Worker 管理器
export { WorkerManager } from './workers/worker-manager'
export type { TocResult, SearchResult } from './workers/worker-manager'

// 状态层
export { EventBus, Listener, RangeManager } from '@vervedoc/docx-editor-state'
export type { IRangeStyle, IEditorAbility, ListenerMap, EventHandler } from '@vervedoc/docx-editor-schema'

// 视图层
export {
  Draw,
  LayoutEngine,
  CanvasRenderer,
  TextMeasure,
  getSharedMeasure,
  hitTest
} from '@vervedoc/docx-editor-view'
export type {
  DocumentLayout, PageLayout, BlockNode, ParagraphBlock,
  ImageBlock, PageBreakBlock, TableBlock, TableRowLayout, TableCellLayout,
  LineBox, InlineBox, Rect
} from '@vervedoc/docx-editor-view'

// 变换层
export { Command, CommandAdapt } from '@vervedoc/docx-editor-transform'
export type { IHistoryManager, HistorySnapshot } from '@vervedoc/docx-editor-schema'

// 历史管理
export { HistoryManager, HistoryComponent, createSnapshot } from '@vervedoc/docx-editor-history'
export type { HistorySnapshot as HistorySnapshotType } from '@vervedoc/docx-editor-history'

// 批注 / 修订
export { CommentComponent, RevisionComponent } from '@vervedoc/docx-editor-comment'
export type { DocxCommentMeta, RevisionCallbacks, CommentCallbacks } from '@vervedoc/docx-editor-schema'

// commands 扩展（搜索 / 块级媒体 / 日期 / LaTeX / 小工具）
export {
  Search,
  BlockParticle,
  DateParticle,
  LaTexParticle,

  ControlComponent
} from '@vervedoc/docx-editor-commands'
export type {
  ISearchResult,
  IReplaceOption,
  INavigateInfo,
  IElementPosition
} from '@vervedoc/docx-editor-schema'

/** VerveDocs Core 版本号 */
export const version = '4.0.0-tree'
