/**
 * 编辑器实例接口
 */
interface EditorInstance {
  /** 编辑器命令对象 */
  command: any
}

/**
 * 条形码/二维码 composable
 * @param options 配置项
 * @returns 条形码与二维码插入方法
 */
export function useEditorBarcode(options: {
  /** 获取编辑器实例 */
  getEditorInstance: () => EditorInstance | null
}) {
  const { getEditorInstance } = options

  /**
   * 插入条形码
   * @param payload 条形码图片数据
   */
  function barcode(payload: { value: string; width: number; height: number }) {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeInsertBarcode(payload)
  }

  /**
   * 插入二维码
   * @param payload 二维码图片数据
   */
  function qrcode(payload: { value: string; width: number; height: number }) {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeInsertQrcode(payload)
  }

  return { barcode, qrcode }
}
