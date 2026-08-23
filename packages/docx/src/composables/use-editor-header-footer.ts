/**
 * 编辑器实例接口
 */
interface EditorInstance {
  /** 编辑器命令对象 */
  command: any
}

/**
 * 页眉页脚 composable
 * @param options 配置项
 * @returns 页眉页脚切换、清除、页码设置方法
 */
export function useEditorHeaderFooter(options: {
  /** 获取编辑器实例 */
  getEditorInstance: () => EditorInstance | null
}) {
  const { getEditorInstance } = options

  /** 切换到页眉区域 */
  function header() {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeSetZone('header')
  }

  /** 切换到页脚区域 */
  function footer() {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeSetZone('footer')
  }

  /** 切换到正文主体区域 */
  function mainZone() {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeSetZone('main')
  }

  /** 清除页眉内容并回到正文主体区域 */
  function clearHeader() {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeSetZone('header')
    instance.command.executeSelectAll()
    instance.command.executeBackspace()
    instance.command.executeSetZone('main')
  }

  /** 清除页脚内容并回到正文主体区域 */
  function clearFooter() {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeSetZone('footer')
    instance.command.executeSelectAll()
    instance.command.executeBackspace()
    instance.command.executeSetZone('main')
  }

  /**
   * 设置页码配置项
   * @param payload 页码配置补丁对象，会与现有页码配置合并
   */
  function setPageNumber(payload: any) {
    const instance = getEditorInstance()
    if (!instance) return
    const currentOptions = instance.command.getOptions?.() || {}
    instance.command.executeUpdateOptions({
      ...currentOptions,
      pageNumber: {
        ...(currentOptions.pageNumber || {}),
        ...payload
      }
    })
  }

  return {
    header,
    footer,
    mainZone,
    clearHeader,
    clearFooter,
    setPageNumber
  }
}