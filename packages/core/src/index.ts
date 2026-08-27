import DocxEditor from './docx-editor'
import type { IElement, IEditorData } from '@vervedoc/docx-editor-schema'
import type { DocxCommentMeta } from '@vervedoc/docx-editor-comment'

export default DocxEditor

// 核心四层模块 - schema 全量导出
export * from '@vervedoc/docx-editor-schema'

// state 模块 - 只导出自身独有的，不重复导出 schema 已有的
export { Listener, RangeManager, EventBus } from '@vervedoc/docx-editor-state'

// transform 模块 - 排除与 schema 重复的 IControlContext
export { Command, CommandAdapt } from '@vervedoc/docx-editor-transform'
export type {
  IDrawContext,
  ICursorContext,
  IBadgeContext,
  IZoneContext,
  IListParticleContext,
  IHyperlinkParticleContext,
  IGroupContext,
  IAreaContext,
  IRegisterContext,
  IPreviewerContext,
  ISearchContext,
  IEventBusContext,
  IWorkerManagerContext
} from '@vervedoc/docx-editor-transform'
export { BaseCommandAdapter, BaseAdapter, TextStyleAdapter, ParagraphAdapter, TableAdapter, PageAdapter } from '@vervedoc/docx-editor-transform'
export type { IAdapterContext } from '@vervedoc/docx-editor-transform'

// view 模块 - 排除 plugin-stubs 中的 stub 导出（由真实插件模块提供）
export {
  Draw,
  Cursor,
  CursorAgent,
  Position,
  CanvasEvent,
  GlobalEvent,
  ImageObserver,
  MouseObserver,
  ScrollObserver,
  SelectionObserver,
  TextParticle,
  ImageParticle,
  HyperlinkParticle,
  SeparatorParticle,
  PageBreakParticle,
  ListParticle,
  SuperscriptParticle,
  SubscriptParticle,
  LineBreakParticle,
  CheckboxParticle,
  RadioParticle,
  TableParticle,
  TableOperate,
  TableTool,
  Previewer,
  Background,
  Badge,
  Footer,
  Header,
  LineNumber,
  Margin,
  PageBorder,
  PageNumber,
  Placeholder,
  Watermark,
  AbstractRichText,
  Highlight,
  ParagraphColor,
  Strikeout,
  Underline,
  Area,
  Group,
  FloatingBar,
  Override,
  Register
} from '@vervedoc/docx-editor-view'

export type {
  Plugin,
  IParticleRegistry,
  IHistoryProvider,
  ISearchProvider,
  IControlProvider
} from '@vervedoc/docx-editor-view'

// history 模块 - 真实 HistoryManager 替代 view 中的 stub
export * from '@vervedoc/docx-editor-history'

// keymap 模块 - 真实 Shortcut 替代 view 中的 stub
export { Shortcut, KeymapComponent } from '@vervedoc/docx-editor-keymap'

// control 模块 - 真实实现替代 view 中的 stub
export {
  Control,
  CheckboxControl,
  RadioControl,
  TextControl,
  SelectControl,
  DateControl,
  NumberControl,
  ControlSearch,
  ControlBorder,
  DateParticle,
  DatePicker,
  LaTexParticle,
  Search,
  BlockParticle,
  ControlComponent,
  GadgetComponent
} from '@vervedoc/docx-editor-commands'

// core 独有模块 - 真实实现替代 view 中的 stub
export { WorkerManager } from './worker/worker-manager'
export { WorkerComponent } from './worker/worker-component'
export { I18n } from './i18n/i18n'
export { Actuator } from './actuator/actuator'
export type { AutoSaveOptions } from './actuator/actuator'
export { ExportComponent } from './export/export-component'
export { CommentComponent, RevisionComponent } from '@vervedoc/docx-editor-comment'
export type { DocxCommentMeta, RevisionCallbacks } from '@vervedoc/docx-editor-comment'
export { getClipboardData, getIsClipboardContainFile, removeClipboardData } from './utils/clipboard'

// version
export { version } from '../package.json'

/**
 * DOCX 导入/导出契约（实现由宿主注入）
 *
 * Word UI 只调用钩子，不感知具体实现（由宿主自行决定）。
 * 参考实现：`@vervedoc/docx-parser`（本地 JS）。
 */
export interface IDocxImportResult {
  success: boolean
  elements: IElement[]
  comments?: DocxCommentMeta[]
  html?: string
  error?: string
}

export interface IChartRenderer {
  renderToDataUrl(option: unknown, width: number, height: number, pixelRatio?: number): string
}

export interface IDocxImportOptions {
  preserveStyles?: boolean
  defaultFont?: string
  defaultSize?: number
  targetInnerWidth?: number
  tableWidthMode?: 'fit' | 'word'
  defaultTableRowHeight?: number
  defaultTableTdPadding?: [number, number, number, number]
  forceDefaultLineHeight?: number
  chartRenderer?: IChartRenderer
}

export type DocxImportCallback = (
  data: ArrayBuffer | File,
  options?: IDocxImportOptions
) => Promise<IDocxImportResult>

export interface IDocxExportResult {
  success: boolean
  data?: ArrayBuffer
  error?: string
}

export interface IDocxExportOptions {
  defaultFont?: string
  defaultSize?: number
}

export type DocxExportCallback = (
  data: IEditorData | IElement[],
  options?: IDocxExportOptions
) => Promise<IDocxExportResult>

// DocxEditor 别名
export { default as Editor } from './docx-editor'
