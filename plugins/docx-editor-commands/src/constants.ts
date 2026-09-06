/**
 * docx-editor-commands 内部共享常量
 *
 * verve schema 未导出这些符号，在此定义以保持 commands 模块自洽。
 */

import type { IElementBase } from '@vervedoc/docx-editor-schema'

// 重新导出迁移至 schema 的跨包共享类型，保持 commands 包 API 兼容
export type { IElementPosition } from '@vervedoc/docx-editor-schema'

/** CSS 类名前缀，与 verve view 的 container 前缀保持一致 */
export const EDITOR_PREFIX = 'vervedocs'

/** 嵌入块类型 */
export enum BlockType {
  IFRAME = 'iframe',
  VIDEO = 'video',
  AUDIO = 'audio',
  CHART = 'chart'
}

/** 文本类元素类型集合（用于 Search 匹配） */
export const TEXTLIKE_ELEMENT_TYPE = new Set(['text', 'hyperlink', 'date', 'control'])

/** 零值常量 */
export const ZERO = 0

/** 组件 data 属性名 */
export const EDITOR_COMPONENT = 'data-vervedoc-component'

/** 组件类型枚举 */
export enum EditorComponent {
  POPUP = 'popup',
  CONTROL = 'control',
  DATE = 'date'
}

/* ========== 嵌入块元素类型 ========== */

/** 视频块数据 */
export interface IVideoBlockData {
  src: string
  poster?: string
}

/** 音频块数据 */
export interface IAudioBlockData {
  src: string
  name?: string
  poster?: string
}

/** iframe 块数据 */
export interface IIFrameBlockData {
  src?: string
  srcdoc?: string
}

/** 图表块数据 */
export interface IChartBlockData {
  chartType: string
  dataSource: any
  config?: any
  subtype?: string
}

/** 块内嵌结构 */
export interface IBlockContent {
  type: BlockType
  videoBlock?: IVideoBlockData
  audioBlock?: IAudioBlockData
  iframeBlock?: IIFrameBlockData
  chartBlock?: IChartBlockData
}

/** 块元素度量 */
export interface IBlockMetrics {
  width: number
  height: number
}

/** block 类型元素（type === 'block'） */
export interface IBlockElement extends IElementBase {
  type: 'block'
  id?: string
  block?: IBlockContent
  metrics?: IBlockMetrics
}

/* ========== LaTeX 元素类型 ========== */

/** latex 类型元素（type === 'latex'） */
export interface ILatexElement extends IElementBase {
  type: 'latex'
  laTexSVG: string
  width: number
  height: number
}

/* ========== 日期元素类型 ========== */

/** 日期值项 */
export interface IDateValueItem {
  value: string
}

/** date 类型元素（type === 'date'） */
export interface IDateElement extends IElementBase {
  type: 'date'
  dateId?: string
  dateFormat?: string
  valueList?: IDateValueItem[]
}