/**
 * VerveDocs Core —— 公共入口
 */

import DocxEditor from './docx-editor'

export default DocxEditor
export { DocxEditor }
export { DocxEditor as Editor }

// 树模型 / 工具（全量透传 schema）
export * from '@vervedoc/docx-editor-schema'

// 状态层
export { EventBus, Listener, RangeManager } from '@vervedoc/docx-editor-state'
export type { ListenerMap, EventHandler } from '@vervedoc/docx-editor-state'

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
export type { IHistoryManager, HistorySnapshot } from '@vervedoc/docx-editor-transform'

// 历史管理
export { HistoryManager, HistoryComponent, createSnapshot } from '@vervedoc/docx-editor-history'
export type { HistorySnapshot as HistorySnapshotType } from '@vervedoc/docx-editor-history'

// 批注 / 修订
export { CommentComponent, RevisionComponent } from '@vervedoc/docx-editor-comment'
export type { DocxCommentMeta, RevisionCallbacks, CommentCallbacks } from '@vervedoc/docx-editor-comment'

// commands 扩展（搜索 / 块级媒体 / 日期 / LaTeX / 小工具）
export {
  Search,
  BlockParticle,
  DateParticle,
  LaTexParticle,
  GadgetComponent,
  ControlComponent
} from '@vervedoc/docx-editor-commands'
export type {
  ISearchResult,
  IReplaceOption,
  INavigateInfo
} from '@vervedoc/docx-editor-commands'

// version
export const version = '4.0.0-tree'
