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

/** 水印字号选项（对齐 Word 标准水印字号） */
export const WATERMARK_SIZE_OPTIONS: { label: string; value: number }[] = [
  { label: '自动', value: 120 },
  { label: '40', value: 40 },
  { label: '50', value: 50 },
  { label: '60', value: 60 },
  { label: '70', value: 70 },
  { label: '80', value: 80 },
  { label: '90', value: 90 },
  { label: '100', value: 100 },
  { label: '120', value: 120 },
  { label: '140', value: 140 },
  { label: '160', value: 160 },
  { label: '180', value: 180 },
  { label: '200', value: 200 },
]

