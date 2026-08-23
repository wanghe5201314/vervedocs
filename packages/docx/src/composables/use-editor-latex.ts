/**
 * 编辑器实例接口
 */
interface EditorInstance {
  /** 编辑器命令对象 */
  command: any
}

/**
 * LaTeX 公式 composable
 * @param options 配置项
 * @returns LaTeX 公式插入方法
 */
export function useEditorLatex(options: {
  /** 获取编辑器实例 */
  getEditorInstance: () => EditorInstance | null
}) {
  const { getEditorInstance } = options

  /**
   * 插入 LaTeX 公式
   * @param latex LaTeX 公式字符串
   */
  function insertLatex(latex: string) {
    const instance = getEditorInstance()
    if (!instance) return
    if (latex) {
      instance.command.executeInsertElementList([{
        type: 'latex',
        value: latex
      }])
    }
  }

  return { insertLatex }
}