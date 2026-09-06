/**
 * 编辑器状态存储
 * 用于管理光标位置的样式状态，实现UI和编辑器核心之间的状态同步
 */
import { reactive, readonly } from 'vue'
import type { SeparatorLineType } from '@vervedoc/core'

/**
 * 编辑器样式状态接口
 * 与编辑器核心的 IRangeStyle 保持一致
 */
export interface IEditorStyleState {
  /** 元素类型 */
  type: string | null
  /** 撤销可用状态 */
  undo: boolean
  /** 重做可用状态 */
  redo: boolean
  /** 格式刷激活状态 */
  painter: boolean
  /** 字体名称 */
  font: string
  /** 字号数值 */
  size: number
  /** 字符缩放比例（百分比） */
  characterScale: number
  /** 是否加粗 */
  bold: boolean
  /** 是否斜体 */
  italic: boolean
  /** 是否下划线 */
  underline: boolean
  /** 是否删除线 */
  strikeout: boolean
  /** 字体颜色（HEX） */
  color: string | null
  /** 高亮颜色（HEX） */
  highlight: string | null
  /** 段落对齐方式 */
  rowFlex: string | null
  /** 段落间距倍数 */
  rowMargin: number
  /** 行高数值 */
  lineHeight: number
  /** 行高规则：auto=自动，exact=精确，atLeast=最小值 */
  lineHeightRule?: 'auto' | 'exact' | 'atLeast'
  /** 首行缩进字符数 */
  paragraphFirstLineIndent: number
  /** 列表类型 */
  listType: string | null
  /** 列表样式 */
  listStyle: string | null
  /** 标题级别 */
  level: string | null
  /** 下划线虚线模式 */
  dashArray: number[]
  /** 分隔线类型 */
  separatorType: SeparatorLineType | null
  /** 分隔线线宽 */
  separatorLineWidth: number | null
  /** 所属分组 ID 列表 */
  groupIds: string[] | null
  /** 文本装饰对象 */
  textDecoration: any | null
  /** 扩展字段 */
  extension: unknown | null
  /** 是否有选区 */
  hasSelection: boolean
  /** 光标是否位于表格内 */
  inTable: boolean
  /** 光标是否位于画布内 */
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
  lineHeightRule: 'auto',
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
 * @returns 编辑器状态存储实例，包含只读 state 及样式更新/重置/同步方法
 */
function createEditorStateStore() {
  // 响应式状态
  const state = reactive<IEditorStyleState>({ ...defaultState })

  /**
   * 更新样式状态
   * @param {Partial<IEditorStyleState>} newState 新的样式状态
   * @returns {void} 无返回值
   */
  function updateStyle(newState: Partial<IEditorStyleState>) {
    Object.assign(state, newState)
  }

  /**
   * 重置为默认状态
   * @returns {void} 无返回值
   */
  function reset() {
    Object.assign(state, defaultState)
  }

  /**
   * 从编辑器的 rangeStyleChange 事件更新状态
   * @param {any} rangeStyle 编辑器返回的样式对象
   * @returns {void} 无返回值
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
      lineHeightRule: rangeStyle.lineHeightRule ?? 'auto',
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
/**
 * 编辑器状态存储单例
 */
export const editorStateStore = createEditorStateStore()

// 导出类型
/**
 * 编辑器状态存储类型
 */
export type EditorStateStore = ReturnType<typeof createEditorStateStore>
