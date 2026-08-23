import { TableBorder } from '@vervedoc/core'

/**
 * 编辑器实例接口
 */
interface EditorInstance {
  /** 编辑器命令对象 */
  command: any
}

/**
 * 表格 composable
 * @param options 配置项
 * @returns 表格插入与边框设置方法
 */
export function useEditorTable(options: { getEditorInstance: () => EditorInstance | null }) {
  const { getEditorInstance } = options

  /**
   * 插入指定行列数的表格
   * @param payload 表格尺寸信息，rows 为行数，cols 为列数
   */
  function insertTable(payload: { rows: number, cols: number }) {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeInsertTable(payload.rows, payload.cols)
  }

  /**
   * 设置表格边框类型，支持 none/outside/all 等别名归一化处理
   * @param borderType 边框类型，支持 none/empty/no、outside/external/box 等别名
   */
  function tableBorderType(borderType: any) {
    const instance = getEditorInstance()
    if (!instance) return
    const t = String(borderType || '').trim().toLowerCase()
    const resolved =
      t === 'none' || t === 'empty' || t === 'no'
        ? (TableBorder as any).NONE ?? borderType
        : t === 'outside' || t === 'external' || t === 'box'
          ? (TableBorder as any).OUTSIDE ?? borderType
          : (TableBorder as any).ALL ?? borderType
    instance.command.executeTableBorderType(resolved)
  }

  /**
   * 设置表格边框颜色
   * @param color 颜色值字符串
   */
  function tableBorderColor(color: string) {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeTableBorderColor(color)
  }

  /**
   * 设置表格边框宽度
   * @param width 边框宽度数值
   */
  function tableBorderWidth(width: number) {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeTableBorderWidth(width)
  }

  /**
   * 设置表格外边框宽度
   * @param width 外边框宽度数值
   */
  function tableBorderExternalWidth(width: number) {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeTableBorderExternalWidth(width)
  }

  return {
    insertTable,
    tableBorderType,
    tableBorderColor,
    tableBorderWidth,
    tableBorderExternalWidth
  }
}