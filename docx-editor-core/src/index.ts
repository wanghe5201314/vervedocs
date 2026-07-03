import DocxEditor from './DocxEditor'

export default DocxEditor

// 核心四层模块 - schema 全量导出
export * from '@wanghe1995/docx-editor-schema'

// state 模块 - 只导出自身独有的，不重复导出 schema 已有的
export { Listener, RangeManager, EventBus } from '@wanghe1995/docx-editor-state'

// transform 模块 - 排除与 schema 重复的 IControlContext
export { Command, CommandAdapt } from '@wanghe1995/docx-editor-transform'
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
} from '@wanghe1995/docx-editor-transform'
export { BaseCommandAdapter, BaseAdapter, TextStyleAdapter, ParagraphAdapter, TableAdapter, PageAdapter } from '@wanghe1995/docx-editor-transform'
export type { IAdapterContext } from '@wanghe1995/docx-editor-transform'

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
} from '@wanghe1995/docx-editor-view'

export type {
  Plugin,
  IParticleRegistry,
  IHistoryProvider,
  ISearchProvider,
  IControlProvider
} from '@wanghe1995/docx-editor-view'

// history 模块 - 真实 HistoryManager 替代 view 中的 stub
export * from '@wanghe1995/docx-editor-history'

// keymap 模块 - 真实 Shortcut 替代 view 中的 stub
export { Shortcut, KeymapComponent } from '@wanghe1995/docx-editor-keymap'

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
} from '@wanghe1995/docx-editor-commands'

// core 独有模块 - 真实实现替代 view 中的 stub
export { WorkerManager } from './worker/WorkerManager'
export { WorkerComponent } from './worker/WorkerComponent'
export { I18n } from './i18n/I18n'
export { Actuator } from './actuator/Actuator'
export type { AutoSaveOptions } from './actuator/Actuator'
export { ExportComponent } from './export/ExportComponent'
export { CommentComponent, RevisionComponent } from '@wanghe1995/docx-editor-comment'
export type { DocxCommentMeta, RevisionCallbacks } from '@wanghe1995/docx-editor-comment'
export { getClipboardData, getIsClipboardContainFile, removeClipboardData } from './utils/clipboard'

// version
export { version } from '../package.json'

// DocxParser - DOCX 文件解析
export { DocxParser, createDocxParser, parseDocx } from './docxParser/index'
export type { IDocxParseResult, IDocxParseOptions, IChartRenderer } from './docxParser/types'

// DocxEditor 别名
export { default as Editor } from './DocxEditor'
