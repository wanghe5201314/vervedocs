/**
 * VerveDocs Core —— UI 常量与枚举
 *
 * PaperDirection / TableBorder 已在 schema/constants.ts 定义，通过 export * 透传。
 * 字体字号从 schema 已有常量转换，不重复定义数据。
 */

import { FONT_FAMILY_MAP, FONT_SIZE, FONT_SIZE_LIST } from '@vervedoc/docx-editor-schema'

/** 编辑器字体选项（从 schema FONT_FAMILY_MAP 转换为 { label, value } 格式） */
export const EDITOR_FONT_OPTIONS: { label: string; value: string }[] =
  FONT_FAMILY_MAP.map(e => ({ label: e.label, value: e.value }))

/** 编辑器字号选项（从 schema FONT_SIZE / FONT_SIZE_LIST 转换为 { label, value } 格式） */
export const EDITOR_SIZE_OPTIONS: { label: string; value: number }[] =
  FONT_SIZE_LIST.map(name => {
    const value = FONT_SIZE[name]
    return { label: name, value: value != null ? value : Number(name) }
  })

/** 页码样式选项 */
export const PAGE_NUMBER_STYLES: { label: string; value: string; numberType: string }[] = [
  { label: '1, 2, 3', value: 'decimal', numberType: 'decimal' },
  { label: 'I, II, III', value: 'upperRoman', numberType: 'upperRoman' },
  { label: 'i, ii, iii', value: 'lowerRoman', numberType: 'lowerRoman' },
  { label: 'A, B, C', value: 'upperLetter', numberType: 'upperLetter' },
  { label: 'a, b, c', value: 'lowerLetter', numberType: 'lowerLetter' }
]
