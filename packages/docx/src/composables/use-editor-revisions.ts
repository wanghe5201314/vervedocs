/**
 * 编辑器实例接口
 */
interface EditorInstance {
  /** 编辑器命令对象 */
  command: any
}

/**
 * 修订管理 composable
 * @param options 配置项
 * @returns 修订接受/拒绝/定位方法
 */
export function useEditorRevisions(options: { getEditorInstance: () => EditorInstance | null }) {
  const { getEditorInstance } = options

  /** 接受文档中的所有修订 */
  function acceptAllRevisions() {
    const instance = getEditorInstance()
    if (!instance) return
    const overlay = instance.command.getRevisionOverlay?.()
    if (overlay) overlay.acceptAllRevisions()
  }

  /** 拒绝文档中的所有修订 */
  function rejectAllRevisions() {
    const instance = getEditorInstance()
    if (!instance) return
    const overlay = instance.command.getRevisionOverlay?.()
    if (overlay) overlay.rejectAllRevisions()
  }

  /**
   * 根据修订 ID 接受指定修订
   * @param id 修订唯一标识
   */
  function acceptRevisionById(id: string) {
    const instance = getEditorInstance()
    if (!instance) return
    const overlay = instance.command.getRevisionOverlay?.()
    if (overlay) overlay.acceptRevision(id)
  }

  /**
   * 根据修订 ID 拒绝指定修订
   * @param id 修订唯一标识
   */
  function rejectRevisionById(id: string) {
    const instance = getEditorInstance()
    if (!instance) return
    const overlay = instance.command.getRevisionOverlay?.()
    if (overlay) overlay.rejectRevision(id)
  }

  /**
   * 定位到指定修订所在位置，将光标选区移动到该修订的第一个元素
   * @param id 修订唯一标识
   */
  function locateRevision(id: string) {
    const instance = getEditorInstance()
    if (!instance) return
    const overlay = instance.command.getRevisionOverlay?.()
    if (overlay) {
      const elementList = instance.command.getElementList?.() ?? []
      let firstIndex = -1
      for (let i = 0; i < elementList.length; i++) {
        if (elementList[i].revisionId === id) {
          firstIndex = i
          break
        }
      }
      if (firstIndex >= 0) {
        instance.command.executeSetRange({ startIndex: firstIndex, endIndex: firstIndex })
      }
    }
  }

  return {
    acceptAllRevisions,
    rejectAllRevisions,
    acceptRevisionById,
    rejectRevisionById,
    locateRevision
  }
}