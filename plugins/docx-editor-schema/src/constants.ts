/**
 * VerveDocs Schema —— 常量
 */

import type { IEditorOption } from './types'

export const SCHEMA_VERSION = '4.0.0-tree'

/** 默认编辑器选项 */
export const DEFAULT_EDITOR_OPTION: Required<Pick<IEditorOption,
  'defaultFont' | 'defaultSize' | 'defaultLineHeight' | 'defaultRowMargin' |
  'pageMode' | 'pageWidth' | 'pageHeight' | 'pageMargins' | 'scale' | 'devicePixelRatio' |
  'historyMaxRecordCount'
>> = {
  defaultFont: 'Microsoft YaHei',
  defaultSize: 16,
  defaultLineHeight: 1.5,
  defaultRowMargin: 5,
  pageMode: 'paging',
  pageWidth: 794,           // A4 @ 96dpi
  pageHeight: 1123,
  pageMargins: [100, 120, 100, 120],
  scale: 1,
  devicePixelRatio: typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1,
  historyMaxRecordCount: 100
}

/** 段落级属性字段名（用于从 run 上剥离/继承） */
export const PARAGRAPH_ATTR_KEYS = [
  'rowFlex',
  'paragraphStyleId',
  'paragraphFirstLineIndent',
  'paragraphIndentLeft',
  'paragraphSpacingBefore',
  'paragraphSpacingAfter',
  'lineHeight',
  'lineHeightRule',
  'groupIds'
] as const

/** 段落容器类型 */
export const PARAGRAPH_CONTAINER_TYPES = new Set(['title', 'list'])

/** 段落级块类型（占独立段） */
export const BLOCK_LEVEL_TYPES = new Set([
  'title', 'list', 'table', 'image', 'pageBreak'
])
