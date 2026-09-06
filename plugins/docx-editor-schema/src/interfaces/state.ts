/**
 * VerveDocs Schema —— State 层跨包共享接口
 *
 * 从 docx-editor-state 包迁移的跨包共享类型。
 */

import type { IRange, IPosition } from '../types'

/** 选区样式快照 —— 光标所在位置的文本/段落样式状态 */
export interface IRangeStyle {
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

/** 编辑器事件映射表，键为事件名（kebab-case），值为对应回调签名 */
export interface ListenerMap {
  /** 选区变更（光标移动/选区改变） */
  'range-change': (range: IRange | null) => void
  /** 光标位置变更 */
  'position-change': (pos: IPosition | null) => void
  /** 内容变更（文本增删/格式修改等） */
  'content-change': () => void
  /** 选区样式变更（bold/italic/underline 等回显状态） */
  'range-style-change': (style: IRangeStyle) => void
  /** 编辑器能力变更（readonly/disabled/canUndo/canRedo） */
  'ability-change': (ability: IEditorAbility) => void
  /** 缩放比例变更 */
  'page-scale-change': (scale: number) => void
  /** 页面尺寸变更（宽高） */
  'page-size-change': (size: { width: number; height: number }) => void
  /** 总页数变更 */
  'page-count-change': (count: number) => void
  /** 当前页码变更 */
  'current-page-no-change': (pageNo: number) => void
  /** 目录变更 */
  'toc-change': (toc: { id: string; level: number; name: string; number?: string }[]) => void
  /** 编辑区域切换（正文/页眉/页脚） */
  'zone-change': (zone: 'main' | 'header' | 'footer') => void
  /** 文档保存完成 */
  'saved': () => void
  /** 编辑器获得焦点 */
  'focus': () => void
  /** 编辑器失去焦点 */
  'blur': () => void
  /** 请求插入图片（右键菜单触发） */
  'request-insert-image': () => void
  /** 请求插入超链接（右键菜单触发） */
  'request-insert-hyperlink': () => void
  /** 请求插入公式（右键菜单触发） */
  'request-insert-formula': () => void
  /** 缩略图变更（页面缩略图数据更新） */
  'thumbnail-change': (images: string[]) => void
}

/** 事件处理器类型，接收一个指定类型的 payload 参数 */
export type EventHandler<T = unknown> = (payload: T) => void