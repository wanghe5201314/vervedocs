import { DEFAULT_FONT_FAMILY, resolveToolbarFontFamily, type FontOption } from '../utils/font-family'

export const FONT_OPTIONS: FontOption[] = [
  { label: '宋体', value: 'SimSun', cssFamily: 'SimSun, serif' },
  { label: '楷体', value: 'KaiTi', cssFamily: 'KaiTi, serif' },
  { label: '仿宋', value: 'FangSong', cssFamily: 'FangSong, serif' },
  { label: '黑体', value: 'SimHei', cssFamily: 'SimHei, sans-serif' },
  { label: '微软雅黑', value: 'Microsoft YaHei', cssFamily: 'Microsoft YaHei, sans-serif' },
  { label: '微软正黑体', value: 'Microsoft JhengHei', cssFamily: 'Microsoft JhengHei, sans-serif' },
  { label: '华文新魏', value: 'STXinwei', cssFamily: 'STXinwei, serif' },
  { label: '思源黑体', value: 'Source Han Sans CN', cssFamily: 'Source Han Sans CN, sans-serif' },
  { label: '思源宋体', value: 'Source Han Serif CN', cssFamily: 'Source Han Serif CN, serif' },
  { label: 'Arial', value: 'Arial', cssFamily: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: 'Times New Roman', cssFamily: 'Times New Roman, serif' },
  { label: 'Segoe UI', value: 'Segoe UI', cssFamily: 'Segoe UI, sans-serif' },
  { label: 'Courier New', value: 'Courier New', cssFamily: 'Courier New, monospace' },
]

export function resolveToolbarFont(fontFamily?: string): string {
  return resolveToolbarFontFamily(fontFamily, FONT_OPTIONS, DEFAULT_FONT_FAMILY)
}

export const SIZE_OPTIONS: ReadonlyArray<{ label: string; value: number }> = [
  { label: '八号', value: 5 },
  { label: '七号', value: 5.5 },
  { label: '6', value: 6 },
  { label: '小六', value: 6.5 },
  { label: '7', value: 7 },
  { label: '六号', value: 7.5 },
  { label: '8', value: 8 },
  { label: '小五', value: 9 },
  { label: '10', value: 10 },
  { label: '五号', value: 10.5 },
  { label: '11', value: 11 },
  { label: '小四', value: 12 },
  { label: '四号', value: 14 },
  { label: '小三', value: 15 },
  { label: '三号', value: 16 },
  { label: '小二', value: 18 },
  { label: '20', value: 20 },
  { label: '二号', value: 22 },
  { label: '小一', value: 24 },
  { label: '一号', value: 26 },
  { label: '28', value: 28 },
  { label: '小初', value: 36 },
  { label: '初号', value: 42 },
  { label: '48', value: 48 },
  { label: '72', value: 72 },
]

export const COLOR_PALETTE: string[] = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
  '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
  '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd',
  '#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0',
  '#a61c00', '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3c78d8', '#3d85c6', '#674ea7', '#a64d79',
]

export const MENU_TABS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'file', label: '文件' },
  { key: 'home', label: '开始' },
  { key: 'edit', label: '编辑' },
  { key: 'view', label: '视图' },
  { key: 'insert', label: '插入' },
  { key: 'format', label: '格式' },
  { key: 'data', label: '数据' },
  { key: 'collab', label: '协同' },
  { key: 'help', label: '帮助' },
]

export const SHORTCUT_ENTRIES: ReadonlyArray<{ label: string; keys: string }> = [
  { label: '撤销', keys: 'Ctrl+Z' },
  { label: '重做', keys: 'Ctrl+Y' },
  { label: '粗体', keys: 'Ctrl+B' },
  { label: '斜体', keys: 'Ctrl+I' },
  { label: '下划线', keys: 'Ctrl+U' },
  { label: '复制', keys: 'Ctrl+C' },
  { label: '剪切', keys: 'Ctrl+X' },
  { label: '粘贴', keys: 'Ctrl+V' },
  { label: '全选', keys: 'Ctrl+A' },
  { label: '查找/替换', keys: 'Ctrl+F / Ctrl+H' },
  { label: '打印', keys: 'Ctrl+P' },
  { label: '编辑单元格', keys: 'F2' },
  { label: '删除内容', keys: 'Delete / Backspace' },
  { label: '移动选区', keys: '方向键' },
  { label: '切换单元格', keys: 'Tab / Shift+Tab' },
  { label: '确认并下移', keys: 'Enter' },
  { label: '行首/行尾', keys: 'Home / End' },
]
