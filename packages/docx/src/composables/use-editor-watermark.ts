/**
 * 编辑器实例接口
 */
interface EditorInstance {
  /** 编辑器命令对象 */
  command: any
}

/**
 * 水印 composable
 * @param options 配置项
 * @returns 包含水印添加与删除方法的对象
 */
export function useEditorWatermark(options: { getEditorInstance: () => EditorInstance | null }) {
  const { getEditorInstance } = options
  /**
   * 添加水印
   * @param payload 水印配置参数
   * @returns 无返回值
   */
  function addWatermark(payload?: any) {
    const instance = getEditorInstance()
    if (!instance) return
    if (payload) {
      instance.command.executeAddWatermark(payload)
    }
  }

  /**
   * 删除水印
   * @returns 无返回值
   */
  function deleteWatermark() {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeDeleteWatermark()
  }

  return { addWatermark, deleteWatermark }
}