interface EditorInstance {
  command: any
}

export function useEditorRevisions(options: { getEditorInstance: () => EditorInstance | null }) {
  const { getEditorInstance } = options

  function acceptAllRevisions() {
    const instance = getEditorInstance()
    if (!instance) return
    const overlay = instance.command.getRevisionOverlay?.()
    if (overlay) overlay.acceptAllRevisions()
  }

  function rejectAllRevisions() {
    const instance = getEditorInstance()
    if (!instance) return
    const overlay = instance.command.getRevisionOverlay?.()
    if (overlay) overlay.rejectAllRevisions()
  }

  function acceptRevisionById(id: string) {
    const instance = getEditorInstance()
    if (!instance) return
    const overlay = instance.command.getRevisionOverlay?.()
    if (overlay) overlay.acceptRevision(id)
  }

  function rejectRevisionById(id: string) {
    const instance = getEditorInstance()
    if (!instance) return
    const overlay = instance.command.getRevisionOverlay?.()
    if (overlay) overlay.rejectRevision(id)
  }

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