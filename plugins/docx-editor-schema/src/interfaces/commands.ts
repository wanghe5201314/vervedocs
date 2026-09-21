/**
 * VerveDocs Schema —— Commands 层跨包共享接口
 *
 * 从 docx-editor-commands 包迁移的跨包共享类型。
 */

import type { Path } from '../types'

/** 元素位置信息 */
export interface IElementPosition {
  /** 页码 */
  pageNo: number
  /** 坐标 */
  coordinate: {
    /** 左上角 */
    leftTop: [number, number]
    /** 左下角 */
    leftBottom: [number, number]
    /** 右上角 */
    rightTop: [number, number]
    /** 右下角 */
    rightBottom: [number, number]
  }
  /** 行高 */
  lineHeight: number
}

/** 搜索匹配结果（基于树路径） */
export interface ISearchResult {
  /** 匹配所在元素的路径 */
  path: Path
  /** 元素 value 内的起始偏移 */
  offset: number
  /** 匹配关键词长度 */
  length: number
  /** 匹配组标识（同一关键词的一次匹配共享一个 groupId） */
  groupId: string
}

/** 替换选项 */
export interface IReplaceOption {
  /** 指定替换第几组匹配，不传则替换全部 */
  index?: number
}

/** 搜索导航信息 */
export interface INavigateInfo {
  /** 当前导航索引（1 基） */
  index: number
  /** 匹配总数 */
  count: number
}