/**
 * 编辑器状态存储
 * 用于管理光标位置的样式状态，实现UI和编辑器核心之间的状态同步
 */
import { reactive, readonly } from 'vue'
import type { SeparatorType } from '@wanghe1995/docx-editor-core'

/**
 * 编辑器样式状态接口
 * 与编辑器核心的 IRangeStyle 保持一致
 */
export interface IEditorStyleState {
  // 元素类型
  type: string | null
  // 撤销/重做状态
  undo: boolean
  redo: boolean
  // 格式刷状态
  painter: boolean
  // 字体样式
  font: string
  size: number
  characterScale: number
  bold: boolean
  italic: boolean
  underline: boolean
  strikeout: boolean
  color: string | null
  highlight: string | null
  // 段落样式
  rowFlex: string | null
  rowMargin: number
  lineHeight: number
  paragraphFirstLineIndent: number
  // 列表
  listType: string | null
  listStyle: string | null
  // 标题级别
  level: string | null
  // 下划线装饰
  dashArray: number[]
  separatorType: SeparatorType | null
  separatorLineWidth: number | null
  // 分组
  groupIds: string[] | null
  // 文本装饰
  textDecoration: any | null
  // 扩展字段
  extension: unknown | null
  // 选中状态
  hasSelection: boolean
  inTable: boolean
  inCanvas: boolean
}

/**
 * 默认样式状态
 */
const defaultState: IEditorStyleState = {
  type: null,
  undo: false,
  redo: false,
  painter: false,
  font: 'SimSun, serif',
  size: 10.5,
  characterScale: 100,
  bold: false,
  italic: false,
  underline: false,
  strikeout: false,
  color: null,
  highlight: null,
  rowFlex: null,
  rowMargin: 1,
  lineHeight: 1.5,
  paragraphFirstLineIndent: 0,
  listType: null,
  listStyle: null,
  level: null,
  dashArray: [],
  separatorType: null,
  separatorLineWidth: null,
  groupIds: null,
  textDecoration: null,
  extension: null,
  hasSelection: false,
  inTable: false,
  inCanvas: false
}

/**
 * 创建编辑器状态存储
 */
function createEditorStateStore() {
  // 响应式状态
  const state = reactive<IEditorStyleState>({ ...defaultState })

  /**
   * 更新样式状态
   * @param newState 新的样式状态
   */
  function updateStyle(newState: Partial<IEditorStyleState>) {
    Object.assign(state, newState)
  }

  /**
   * 重置为默认状态
   */
  function reset() {
    Object.assign(state, defaultState)
  }

  /**
   * 从编辑器的 rangeStyleChange 事件更新状态
   * @param rangeStyle 编辑器返回的样式对象
   */
  function syncFromEditor(rangeStyle: any) {
    if (!rangeStyle) return

    // 判断是否在表格中
    const elementType = rangeStyle.type ?? null
    const inTable = elementType === 'table' || elementType === 'td' || elementType === 'tr'

    updateStyle({
      type: elementType,
      undo: rangeStyle.undo ?? false,
      redo: rangeStyle.redo ?? false,
      painter: rangeStyle.painter ?? false,
      font: rangeStyle.font ?? 'SimSun, serif',
      size: rangeStyle.size ?? 10.5,
      characterScale: rangeStyle.characterScale ?? 100,
      bold: rangeStyle.bold ?? false,
      italic: rangeStyle.italic ?? false,
      underline: rangeStyle.underline ?? false,
      strikeout: rangeStyle.strikeout ?? false,
      color: rangeStyle.color ?? null,
      highlight: rangeStyle.highlight ?? null,
      rowFlex: rangeStyle.rowFlex ?? null,
      rowMargin: rangeStyle.rowMargin ?? 1,
      lineHeight: rangeStyle.lineHeight ?? 1.5,
      paragraphFirstLineIndent: rangeStyle.paragraphFirstLineIndent ?? 0,
      listType: rangeStyle.listType ?? null,
      listStyle: rangeStyle.listStyle ?? null,
      level: rangeStyle.level ?? null,
      dashArray: rangeStyle.dashArray ?? [],
      separatorType: rangeStyle.separatorType ?? null,
      separatorLineWidth: rangeStyle.separatorLineWidth ?? null,
      groupIds: rangeStyle.groupIds ?? null,
      textDecoration: rangeStyle.textDecoration ?? null,
      extension: rangeStyle.extension ?? null,
      hasSelection: rangeStyle.hasSelection ?? false,
      inTable
      // inCanvas 由 Editor.vue 中的焦点事件单独管理，不在此处覆盖
    })
  }

  return {
    // 只读状态，防止外部直接修改
    state: readonly(state),
    // 方法
    updateStyle,
    reset,
    syncFromEditor
  }
}

// 创建单例实例
export const editorStateStore = createEditorStateStore()

// 导出类型
export type EditorStateStore = ReturnType<typeof createEditorStateStore>
