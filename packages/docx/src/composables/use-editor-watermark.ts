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
 * @returns 水印添加与删除方法
 */
export function useEditorWatermark(options: { getEditorInstance: () => EditorInstance | null }) {
  const { getEditorInstance } = options
  /**
   * 添加水印
   * @param payload 水印配置参数
   */
  function addWatermark(payload?: any) {
    const instance = getEditorInstance()
    if (!instance) return
    if (payload) {
      instance.command.executeAddWatermark({
        data: payload.data || payload.content || '',
        color: payload.color,
        opacity: payload.opacity,
        size: payload.size,
        font: payload.font,
        repeat: payload.repeat
      })
    }
  }

  /** 删除水印 */
  function deleteWatermark() {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeDeleteWatermark()
  }

  return { addWatermark, deleteWatermark }
}