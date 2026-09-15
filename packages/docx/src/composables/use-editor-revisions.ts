import { ref, type Ref } from 'vue'
import type { RevisionPlugin } from '@vervedoc/docx-editor-comment'

/**
 * 编辑器实例接口
 */
interface EditorInstance {
  /** 编辑器命令对象 */
  command: any
  /** 获取已注册插件实例 */
  getPlugin?: <T>(name: string) => T | undefined
}

/**
 * 修订项数据结构
 */
export interface RevisionItem {
  /** 修订唯一标识 */
  id: string
  /** 修订类型：插入、删除或格式变更 */
  type: 'insert' | 'delete' | 'format'
  /** 修订作者 */
  author: string
  /** 修订时间 */
  date: string
  /** 修订内容描述 */
  content: string
}

/**
 * 修订管理 API 接口
 */
export interface IRevisionApi {
  /** 修订列表响应式引用 */
  revisionList: Ref<RevisionItem[]>
  /** 当前激活修订 ID 响应式引用 */
  activeRevisionId: Ref<string>
  /** 同步修订列表与编辑器实际状态 */
  sync(): void
  /** 定位到指定修订 */
  locate(id: string): void
  /** 定位到上一条修订 */
  locatePrevious(): void
  /** 定位到下一条修订 */
  locateNext(): void
  /** 接受指定修订 */
  accept(id: string): void
  /** 拒绝指定修订 */
  reject(id: string): void
  /** 接受当前激活的修订 */
  acceptCurrent(): void
  /** 拒绝当前激活的修订 */
  rejectCurrent(): void
  /** 接受文档中的所有修订 */
  acceptAll(): void
  /** 拒绝文档中的所有修订 */
  rejectAll(): void
}

/**
 * 修订管理 composable
 * @param options 配置项
 * @returns 修订接受/拒绝/定位方法
 */
export function useEditorRevisions(options: { getEditorInstance: () => EditorInstance | null }) {
  const { getEditorInstance } = options
  /** 修订列表 */
  const revisionList = ref<RevisionItem[]>([])
  /** 当前激活的修订 ID */
  const activeRevisionId = ref('')

  /**
   * 获取编辑器修订视图对象
   * @returns {any | null} 修订视图实例，不存在时返回 null
   */
  function getOverlay() {
    return getEditorInstance()?.getPlugin?.<RevisionPlugin>('revision') ?? null
  }

  /**
   * 同步修订列表与编辑器实际状态，并校正激活修订 ID
   */
  function sync() {
    const overlay = getOverlay()
    const revisions = overlay?.getAll?.()
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

  /**
   * 获取当前激活修订在列表中的索引
   * @returns {number} 索引值，未找到时为 -1
   */
  function getCurrentRevisionIndex() {
    return revisionList.value.findIndex(
      revision => revision.id === activeRevisionId.value
    )
  }

  /**
   * 获取指定修订被处理后应激活的下一个候选修订 ID
   * @param {string} id 当前修订唯一标识
   * @returns {string} 下一个候选修订 ID，无候选时返回空字符串
   */
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
    overlay?.acceptAll?.()
    sync()
    activeRevisionId.value = ''
  }

  /** 拒绝文档中的所有修订 */
  function rejectAll() {
    const overlay = getOverlay()
    overlay?.rejectAll?.()
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
    overlay.accept?.(id)
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
    overlay.reject?.(id)
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
    const found = instance.command.executeLocateRevision(id)
    if (found) {
      activeRevisionId.value = id
    }
  }

  /**
   * 定位到上一条修订，循环到列表末尾
   */
  function locatePrevious() {
    if (!revisionList.value.length) return
    const currentIndex = getCurrentRevisionIndex()
    const targetIndex =
      currentIndex <= 0 ? revisionList.value.length - 1 : currentIndex - 1
    locate(revisionList.value[targetIndex].id)
  }

  /**
   * 定位到下一条修订，循环到列表开头
   */
  function locateNext() {
    if (!revisionList.value.length) return
    const currentIndex = getCurrentRevisionIndex()
    const targetIndex =
      currentIndex < 0 || currentIndex >= revisionList.value.length - 1
        ? 0
        : currentIndex + 1
    locate(revisionList.value[targetIndex].id)
  }

  /**
   * 接受当前激活的修订，无激活时回退到第一条
   */
  function acceptCurrent() {
    if (!revisionList.value.length) return
    const currentIndex = getCurrentRevisionIndex()
    const fallbackIndex = currentIndex >= 0 ? currentIndex : 0
    const currentRevision = revisionList.value[fallbackIndex]
    if (!currentRevision) return
    accept(currentRevision.id)
  }

  /**
   * 拒绝当前激活的修订，无激活时回退到第一条
   */
  function rejectCurrent() {
    if (!revisionList.value.length) return
    const currentIndex = getCurrentRevisionIndex()
    const fallbackIndex = currentIndex >= 0 ? currentIndex : 0
    const currentRevision = revisionList.value[fallbackIndex]
    if (!currentRevision) return
    reject(currentRevision.id)
  }

  /** 修订管理 API 对象 */
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
