/**
 * Ribbon Tab 元数据配置
 * 参照 OnlyOffice + WPS 风格的 Tab 分组
 */
export interface RibbonTabMeta {
  key: string
  label: string
  icon: string
  visible?: boolean
}

/**
 * 顶部 Tab 标签栏配置（文件作为第一个 Tab，点击展开下拉菜单）
 */
export const ribbonTabs: RibbonTabMeta[] = [
  { key: 'file', label: '文件', icon: 'file-outline' },
  { key: 'home', label: '开始', icon: 'view-headline' },
  { key: 'insert', label: '插入', icon: 'plus-thick' },
  { key: 'layout', label: '页面', icon: 'page-layout-body' },
  { key: 'reference', label: '引用', icon: 'table-of-contents' },
  { key: 'review', label: '审阅', icon: 'comment-check-outline' },
  { key: 'view', label: '视图', icon: 'eye-outline' },
  { key: 'collaboration', label: '协同', icon: 'account-multiple-outline', visible: false },
  { key: 'tools', label: '工具', icon: 'toolbox-outline' },
  { key: 'help', label: '帮助', icon: 'help-circle-outline' }
]

/**
 * 编辑模式列表（视图 Tab 用）
 */
export const editorModeList = [
  { value: 'edit', label: '常规模式', icon: 'cursor-default', title: '常规编辑模式，可自由编辑文档内容' },
  { value: 'revision', label: '修订模式', icon: 'pencil-plus', title: '修订模式，所有编辑操作将记录为修订' },
  { value: 'readonly', label: '只读模式', icon: 'eye-outline', title: '只读模式，仅可查看文档不可编辑' },
  { value: 'clean', label: '清洁模式', icon: 'eye-off-outline', title: '清洁模式，隐藏所有标记和批注' },
  { value: 'form', label: '表单模式', icon: 'form-select', title: '表单模式，仅可编辑表单域' }
]

/**
 * 字符缩放选项
 */
export const characterScaleOptions = [200, 150, 100, 90, 80, 66, 50, 33]

/**
 * 首行缩进选项
 */
export const firstLineIndentOptions = [
  { label: '无缩进', value: 0 },
  { label: '2字符', value: 2 },
  { label: '3字符', value: 3 },
  { label: '4字符', value: 4 }
]

/**
 * 缩放级别
 */
export const zoomLevels = [50, 75, 100, 125, 150, 200]