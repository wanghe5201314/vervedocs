// Draw 引擎
export { Draw } from './renders/engine'
export type { Draw as DocumentRenderer } from './renders/engine'

// 光标
export { Cursor } from './renders/cursor'
export type { Cursor as TextCursor } from './renders/cursor'
export { CursorAgent } from './renders/cursor-handler'

// 位置计算
export { Position } from './position'
export type { Position as PositionCalculator } from './position'

// 事件处理
export { CanvasEvent } from './events/canvas-event'
export { GlobalEvent } from './events/global-event'
export { pasteByApi } from './events/handlers/paste'

// 观察者
export { ImageObserver } from './events/image-observer'
export { MouseObserver } from './events/mouse-observer'
export { ScrollObserver } from './events/scroll-observer'
export { SelectionObserver } from './events/selection-observer'

// 核心粒子渲染器
export { TextParticle } from './renderers/text'
export { ImageParticle } from './renderers/image'
export { HyperlinkParticle } from './renderers/hyperlink'
export { SeparatorParticle } from './renderers/separator'
export { PageBreakParticle } from './renderers/page-break'
export { ListParticle } from './renderers/list'
export { SuperscriptParticle } from './renderers/superscript'
export { SubscriptParticle } from './renderers/subscript'
export { LineBreakParticle } from './renderers/line-break'
export { CheckboxParticle } from './renderers/checkbox'
export { RadioParticle } from './renderers/radio'

// 表格粒子
export { TableParticle } from './renderers/table'
export { TableOperate } from './renderers/table-ops'
export { TableTool } from './renderers/table-tool'

// 预览器
export { Previewer } from './renderers/previewer'

// 页面框架
export { Background } from './layouts/background'
export { Badge } from './layouts/badge'
export { Footer } from './layouts/footer'
export { Header } from './layouts/header'
export { LineNumber } from './layouts/line-number'
export { Margin } from './layouts/margin'
export { PageBorder } from './layouts/page-border'
export { PageNumber } from './layouts/page-number'
export { Placeholder } from './layouts/placeholder'
export { Watermark } from './layouts/watermark'

// 富文本装饰
export { AbstractRichText } from './richtexts/abstract-rich-text'
export { Highlight } from './richtexts/highlight'
export { ParagraphColor } from './richtexts/paragraph-color'
export { Strikeout } from './richtexts/strikeout'
export { Underline } from './richtexts/underline'

// 交互组件
export { Area } from './layouts/area'
export { Group } from './layouts/group'
export { Search } from './layouts/search'
export type { INavigateInfo } from './layouts/search'
export { FloatingBar } from './layouts/floating-bar'

// 控件
export { Control } from './widgets/control'
export { CheckboxControl } from './widgets/checkbox'
export { RadioControl } from './widgets/radio'
export { TextControl } from './widgets/text'
export { SelectControl } from './widgets/select'
export { DateControl } from './widgets/date'
export { NumberControl } from './widgets/number'
export { ControlSearch } from './widgets/search'
export { ControlBorder } from './widgets/border'

// 区域
export { Zone } from './layouts/region'
export { ZoneTip } from './layouts/region-tooltip'

// 插件
export { Plugin } from './plugins/core'
export type { Editor } from './plugins/core'
export { Override } from './plugins/override'
export { Register } from './plugins/register'

// 快捷键 - 由 @vervedoc/docx-editor-keymap 模块提供

// Provider 接口
export type { IParticleRegistry, IHistoryProvider, ISearchProvider, IControlProvider } from './providers'

// Plugin stubs (will be replaced by actual plugin modules)
export {
  HistoryManager,
  WorkerManager,
  I18n,
  Actuator,
  LaTexParticle,
  DateParticle,
  BlockParticle,
  DatePicker,
  getClipboardData,
  getIsClipboardContainFile,
  removeClipboardData,
  version
} from './plugin-stubs'
