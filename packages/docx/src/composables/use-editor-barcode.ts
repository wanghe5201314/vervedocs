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
   * @param content 条形码内容
   */
  function barcode(content: string) {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.execute('barcode', content)
  }

  /**
   * 插入二维码
   * @param content 二维码内容
   */
  async function qrcode(content: string) {
    const instance = getEditorInstance()
    if (!instance) return
    await instance.command.execute('qrcode', content)
  }

  return { barcode, qrcode }
}