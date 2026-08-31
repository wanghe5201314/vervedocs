import { ref, type Ref } from 'vue'

/**
 * 编辑器实例接口
 */
interface EditorInstance {
  /** 编辑器命令对象 */
  command: any
}

export interface RevisionItem {
  id: string
  type: 'insert' | 'delete' | 'format'
  author: string
  date: string
  content: string
}

export interface IRevisionApi {
  revisionList: Ref<RevisionItem[]>
  activeRevisionId: Ref<string>
  sync(): void
  locate(id: string): void
  locatePrevious(): void
  locateNext(): void
  accept(id: string): void
  reject(id: string): void
  acceptCurrent(): void
  rejectCurrent(): void
  acceptAll(): void
  rejectAll(): void
}

/**
 * 修订管理 composable
 * @param options 配置项
 * @returns 修订接受/拒绝/定位方法
 */
export function useEditorRevisions(options: { getEditorInstance: () => EditorInstance | null }) {
  const { getEditorInstance } = options
  const revisionList = ref<RevisionItem[]>([])
  const activeRevisionId = ref('')

  function getOverlay() {
    return getEditorInstance()?.command?.getRevisionOverlay?.() ?? null
  }

  function sync() {
    const overlay = getOverlay()
    const revisions = overlay?.getRevisions?.()
    revisionList.value = Array.isArray(revisions)
      ? revisions.map((item: any) => ({
          id: item.id,
          type: item.type,
          author: item.author,
          date: item.date,
          content: item.content
        }))
      : []
    if (
      activeRevisionId.value &&
      !revisionList.value.some(item => item.id === activeRevisionId.value)
    ) {
      activeRevisionId.value = ''
    }
  }

  function getCurrentRevisionIndex() {
    return revisionList.value.findIndex(
      revision => revision.id === activeRevisionId.value
    )
  }

  function getNextCandidateId(id: string) {
    const currentIndex = revisionList.value.findIndex(rev => rev.id === id)
    if (currentIndex < 0) return ''
    return (
      revisionList.value[currentIndex + 1]?.id
      || revisionList.value[currentIndex - 1]?.id
      || ''
    )
  }

  /** 接受文档中的所有修订 */
  function acceptAll() {
    const overlay = getOverlay()
    overlay?.acceptAllRevisions?.()
    sync()
    activeRevisionId.value = ''
  }

  /** 拒绝文档中的所有修订 */
  function rejectAll() {
    const overlay = getOverlay()
    overlay?.rejectAllRevisions?.()
    sync()
    activeRevisionId.value = ''
  }

  /**
   * 根据修订 ID 接受指定修订
   * @param id 修订唯一标识
   */
  function accept(id: string) {
    const overlay = getOverlay()
    if (!overlay || !id) return
    const nextActiveId = getNextCandidateId(id)
    overlay.acceptRevision?.(id)
    sync()
    activeRevisionId.value = revisionList.value.some(item => item.id === nextActiveId)
      ? nextActiveId
      : ''
  }

  /**
   * 根据修订 ID 拒绝指定修订
   * @param id 修订唯一标识
   */
  function reject(id: string) {
    const overlay = getOverlay()
    if (!overlay || !id) return
    const nextActiveId = getNextCandidateId(id)
    overlay.rejectRevision?.(id)
    sync()
    activeRevisionId.value = revisionList.value.some(item => item.id === nextActiveId)
      ? nextActiveId
      : ''
  }

  /**
   * 定位到指定修订所在位置，将光标选区移动到该修订的第一个元素
   * @param id 修订唯一标识
   */
  function locate(id: string) {
    const instance = getEditorInstance()
    if (!instance) return
    const elementList = instance.command.getElementList?.() ?? []
    let firstIndex = -1
    for (let i = 0; i < elementList.length; i++) {
      if (elementList[i].revisionId === id) {
        firstIndex = i
        break
      }
    }
    if (firstIndex >= 0) {
      activeRevisionId.value = id
      instance.command.executeSetRange(firstIndex, firstIndex)
    }
  }

  function locatePrevious() {
    if (!revisionList.value.length) return
    const currentIndex = getCurrentRevisionIndex()
    const targetIndex =
      currentIndex <= 0 ? revisionList.value.length - 1 : currentIndex - 1
    locate(revisionList.value[targetIndex].id)
  }

  function locateNext() {
    if (!revisionList.value.length) return
    const currentIndex = getCurrentRevisionIndex()
    const targetIndex =
      currentIndex < 0 || currentIndex >= revisionList.value.length - 1
        ? 0
        : currentIndex + 1
    locate(revisionList.value[targetIndex].id)
  }

  function acceptCurrent() {
    if (!revisionList.value.length) return
    const currentIndex = getCurrentRevisionIndex()
    const fallbackIndex = currentIndex >= 0 ? currentIndex : 0
    const currentRevision = revisionList.value[fallbackIndex]
    if (!currentRevision) return
    accept(currentRevision.id)
  }

  function rejectCurrent() {
    if (!revisionList.value.length) return
    const currentIndex = getCurrentRevisionIndex()
    const fallbackIndex = currentIndex >= 0 ? currentIndex : 0
    const currentRevision = revisionList.value[fallbackIndex]
    if (!currentRevision) return
    reject(currentRevision.id)
  }

  const revisionAPI: IRevisionApi = {
    revisionList,
    activeRevisionId,
    sync,
    locate,
    locatePrevious,
    locateNext,
    accept,
    reject,
    acceptCurrent,
    rejectCurrent,
    acceptAll,
    rejectAll
  }

  return {
    revisionAPI
  }
}
