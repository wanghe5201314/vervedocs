// Draw 引擎
export { Draw } from './draw/Draw'
export type { Draw as DocumentRenderer } from './draw/Draw'

// 光标
export { Cursor } from './cursor/Cursor'
export type { Cursor as TextCursor } from './cursor/Cursor'
export { CursorAgent } from './cursor/CursorAgent'

// 位置计算
export { Position } from './position/Position'
export type { Position as PositionCalculator } from './position/Position'

// 事件处理
export { CanvasEvent } from './event/CanvasEvent'
export { GlobalEvent } from './event/GlobalEvent'
export { pasteByApi } from './event/handlers/paste'

// 观察者
export { ImageObserver } from './observer/ImageObserver'
export { MouseObserver } from './observer/MouseObserver'
export { ScrollObserver } from './observer/ScrollObserver'
export { SelectionObserver } from './observer/SelectionObserver'

// 核心粒子渲染器
export { TextParticle } from './particle/TextParticle'
export { ImageParticle } from './particle/ImageParticle'
export { HyperlinkParticle } from './particle/HyperlinkParticle'
export { SeparatorParticle } from './particle/SeparatorParticle'
export { PageBreakParticle } from './particle/PageBreakParticle'
export { ListParticle } from './particle/ListParticle'
export { SuperscriptParticle } from './particle/SuperscriptParticle'
export { SubscriptParticle } from './particle/SubscriptParticle'
export { LineBreakParticle } from './particle/LineBreakParticle'
export { CheckboxParticle } from './particle/CheckboxParticle'
export { RadioParticle } from './particle/RadioParticle'

// 表格粒子
export { TableParticle } from './particle/table/TableParticle'
export { TableOperate } from './particle/table/TableOperate'
export { TableTool } from './particle/table/TableTool'

// 预览器
export { Previewer } from './particle/previewer/Previewer'

// 页面框架
export { Background } from './frame/Background'
export { Badge } from './frame/Badge'
export { Footer } from './frame/Footer'
export { Header } from './frame/Header'
export { LineNumber } from './frame/LineNumber'
export { Margin } from './frame/Margin'
export { PageBorder } from './frame/PageBorder'
export { PageNumber } from './frame/PageNumber'
export { Placeholder } from './frame/Placeholder'
export { Watermark } from './frame/Watermark'

// 富文本装饰
export { AbstractRichText } from './richtext/AbstractRichText'
export { Highlight } from './richtext/Highlight'
export { ParagraphColor } from './richtext/ParagraphColor'
export { Strikeout } from './richtext/Strikeout'
export { Underline } from './richtext/Underline'

// 交互组件
export { Area } from './interactive/Area'
export { Group } from './interactive/Group'
export { Search } from './interactive/Search'
export type { INavigateInfo } from './interactive/Search'
export { FloatingBar } from './interactive/FloatingBar'

// 控件
export { Control } from './control/Control'
export { CheckboxControl } from './control/CheckboxControl'
export { RadioControl } from './control/radio/RadioControl'
export { TextControl } from './control/TextControl'
export { SelectControl } from './control/SelectControl'
export { DateControl } from './control/date/DateControl'
export { NumberControl } from './control/NumberControl'
export { ControlSearch } from './control/ControlSearch'
export { ControlBorder } from './control/Border'

// 区域
export { Zone } from './zone/Zone'
export { ZoneTip } from './zone/ZoneTip'

// 插件
export { Plugin } from './plugin/Plugin'
export type { Editor } from './plugin/Plugin'
export { Override } from './plugin/override/Override'
export { Register } from './plugin/register/Register'

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
