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

// version
export const version = '4.0.0-tree'
