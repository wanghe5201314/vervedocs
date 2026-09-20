/**
 * VerveDocs Schema —— State 层跨包共享接口
 *
 * 从 docx-editor-state 包迁移的跨包共享类型。
 */

import type { IRange, IPosition, IDocxDocumentMeta } from '../types'

/** 选区样式快照 —— 光标所在位置的文本/段落样式状态 */
export interface IRangeStyle {
  /** 是否存在非折叠选区 */
  hasSelection: boolean
  /** 元素类型 */
  type: string | null
  /** 加粗 */
  bold: boolean
  /** 斜体 */
  italic: boolean
  /** 下划线 */
  underline: boolean
  /** 删除线 */
  strikeout: boolean
  /** 双删除线 */
  doubleStrikeout: boolean
  /** 隐藏文字 */
  hidden: boolean
  /** 上标 */
  superscript: boolean
  /** 下标 */
  subscript: boolean
  /** 字体颜色 */
  color: string
  /** 高亮颜色 */
  highlight: string
  /** 字体名称 */
  font: string
  /** 字号 */
  size: number
  /** 标题级别 */
  level: string | null
  /** 行对齐方式 */
  rowFlex: string
  /** 行高 */
  lineHeight: number
  /** 行高规则：auto | exact | atLeast | multiple */
  lineHeightRule: string
  /** 首行缩进（像素） */
  paragraphFirstLineIndent: number
  /** 字符缩放比例 */
  characterScale: number
  /** 格式刷激活状态 */
  painter: boolean
  /** 是否可撤销 */
  undo: boolean
  /** 是否可重做 */
  redo: boolean
}

/** 编辑器能力状态快照 */
export interface IEditorAbility {
  /** 是否只读 */
  readonly: boolean
  /** 是否禁用 */
  disabled: boolean
  /** 是否可输入 */
  canInput: boolean
  /** 是否可撤销 */
  canUndo: boolean
  /** 是否可重做 */
  canRedo: boolean
}

/** 编辑器事件映射表，键为事件名（camelCase），值为对应回调签名 */
export interface ListenerMap {
  'layoutDiagnosticsChange': (diagnostics: import('../layout-types').LayoutDiagnostic[]) => void
  /** 选区变更（光标移动/选区改变） */
  'rangeChange': (range: IRange | null) => void
  /** 光标位置变更 */
  'positionChange': (pos: IPosition | null) => void
  /** 内容变更（文本增删/格式修改等） */
  'contentChange': () => void
  /** 格式变更（bold/italic/underline 等回显状态） */
  'formatChange': (style: IRangeStyle) => void
  /** 编辑器能力变更（readonly/disabled/canUndo/canRedo） */
  'abilityChange': (ability: IEditorAbility) => void
  /** 缩放比例变更 */
  'pageScaleChange': (scale: number) => void
  /** 页面尺寸变更（宽高） */
  'pageSizeChange': (size: { width: number; height: number }) => void
  /** 总页数变更 */
  'pageCountChange': (count: number) => void
  /** 当前页码变更 */
  'currentPageNoChange': (pageNo: number) => void
  /** 目录变更 */
  'tocChange': (toc: { id: string; level: number; name: string; number?: string }[]) => void
  /** 编辑区域切换（正文/页眉/页脚） */
  'zoneChange': (zone: 'main' | 'header' | 'footer') => void
  /** 文档保存完成 */
  'saved': () => void
  /** 编辑器获得焦点 */
  'focus': () => void
  /** 编辑器失去焦点 */
  'blur': () => void
  /** 渲染完成后触发（各组件订阅此事件执行联动） */
  'afterRender': () => void
  /** 文档被整体设置/替换后触发（setValue/replaceDocument 等），插件据此重建自身状态 */
  'documentSet': (doc: IDocxDocumentMeta) => void
  /** 请求插入图片（右键菜单触发） */
  'requestInsertImage': () => void
  /** 请求插入超链接（右键菜单触发） */
  'requestInsertHyperlink': () => void
  /** 请求插入公式（右键菜单触发） */
  'requestInsertFormula': () => void
  /** 请求打开当前表格属性 */
  'requestTableProperties': () => void

  /** 缩略图变更（页面缩略图数据更新） */
  'thumbnailChange': (images: string[]) => void
  /** Screen background changed without a document render. */
  'thumbnailAppearanceChange': () => void
}

/**
 * 交互事件映射表（EventBus），键为事件名（camelCase），值为对应 payload 类型。
 *
 * 与 ListenerMap 的区别：ListenerMap 描述编辑器**状态变更**事件，
 * EventBusMap 描述用户**交互行为**事件（点击/右键/鼠标等）。
 */
export interface EventBusMap {
  /** 图表点击 */
  'chartClick': { chartId: string; chartType: string; dataSource: unknown; config: unknown; subtype?: string }
  /** 超链接右键菜单点击 */
  'hyperlinkMenuClick': void
  /** 图片鼠标按下 */
  'imageMousedown': unknown
  /** 编辑器内鼠标按下 */
  'editorMousedown': MouseEvent
  /** 编辑器内鼠标抬起 */
  'editorMouseup': MouseEvent
  /** 批注创建 */
  'commentCreate': unknown
  /** 批注删除 */
  'commentDelete': unknown
}

/** 事件处理器类型，接收一个指定类型的 payload 参数 */
export type EventHandler<T = unknown> = (payload: T) => void
