/**
 * 编辑器实例接口
 */
interface EditorInstance {
  /** 编辑器命令对象 */
  command: any
}

/**
 * 目录 composable
 * @param options 配置项
 * @returns 目录插入、删除、定位方法
 */
export function useEditorToc(options: { getEditorInstance: () => EditorInstance | null }) {
  const { getEditorInstance } = options

  /**
   * 插入目录
   * @param payload 目录插入参数
   */
  async function tocInsert(payload: any) {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeInsertToc(payload)
  }

  /** 删除目录 */
  function tocRemove() {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeRemoveToc()
  }

  /**
   * 定位到指定目录项
   * @param id 目录项标识
   */
  function locationToc(id: string) {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeLocationToc(id)
  }

  return { tocInsert, tocRemove, locationToc }
}