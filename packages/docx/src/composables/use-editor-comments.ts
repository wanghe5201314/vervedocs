import { ref, type Ref } from 'vue'
import type { IComment } from '@vervedoc/core'

/**
 * 编辑器批注状态快照
 */
export interface IEditorCommentState {
  /** 批注列表 */
  list: IComment[]
  /** 当前激活的批注组 ID */
  activeGroupId: string
}

/**
 * 编辑器批注管理 API 接口
 */
export interface IEditorCommentApi {
  /** 批注列表响应式引用 */
  commentList: Ref<IComment[]>
  /** 当前激活批注组 ID 响应式引用 */
  activeGroupId: Ref<string>
  /** 同步批注列表与激活组 ID */
  sync(groupId?: string): IComment[]
  /** 获取批注状态快照 */
  getState(): IEditorCommentState
  /** 创建新批注 */
  create(userName?: string): IComment | null
  /** 删除指定批注 */
  remove(id: string): void
  /** 删除当前激活组对应的批注 */
  removeCurrent(groupId?: string): void
  /** 定位到指定批注 */
  locate(id: string): void
  /** 从批注元数据列表构建批注 */
  load(metas: any[]): void
  /** 触发批注渲染 */
  render(): void
}

/**
 * 编辑器批注管理 composable
 * @param options 配置项
 * @returns 批注管理 API
 */
export function useEditorComments(options: {
  /** 获取编辑器实例 */
  getEditorInstance: () => {
    command?: {
      getGroupIds?: () => string[]
      executeDeleteGroup?: (groupId: string) => void
    }
  } | null
  /** 获取批注组件实例 */
  getCommentComponent: () => {
    getAll?: () => IComment[]
    add?: (userName?: string) => IComment | null
    delete?: (id: string) => void
    locate?: (id: string) => void
    buildFromMetas?: (metas: any[]) => void
    render?: () => void
  } | null
  /** 获取当前激活批注组 ID */
  getActiveGroupId?: () => string
}) {
  const { getEditorInstance, getCommentComponent, getActiveGroupId } = options
  /** 批注列表 */
  const commentList = ref<IComment[]>([])
  /** 当前激活的批注组 ID */
  const activeGroupId = ref('')

  /**
   * 同步批注列表与激活组 ID
   * @param {string} [groupId] 可选的激活组 ID，未提供时按优先级自动推断
   * @returns {IComment[]} 当前批注列表
   */
  function sync(groupId?: string): IComment[] {
    const commentComp = getCommentComponent()
    commentList.value = [...(commentComp?.getAll?.() ?? [])]
    activeGroupId.value =
      groupId
      || getActiveGroupId?.()
      || getEditorInstance()?.command?.getGroupIds?.()?.[0]
      || ''
    return commentList.value
  }

  /**
   * 获取批注状态快照
   * @returns {IEditorCommentState} 批注状态
   */
  function getState(): IEditorCommentState {
    sync()
    return {
      list: [...commentList.value],
      activeGroupId: activeGroupId.value
    }
  }

  /**
   * 触发批注组件重新渲染
   */
  function render(): void {
    getCommentComponent()?.render?.()
  }

  /**
   * 创建新批注
   * @param {string} [userName='当前用户'] 批注作者名称
   * @returns {IComment | null} 创建的批注对象，失败时返回 null
   */
  function create(userName: string = '当前用户'): IComment | null {
    const comment = getCommentComponent()?.add?.(userName) ?? null
    sync(comment?.groupId)
    render()
    return comment
  }

  /**
   * 删除指定 ID 的批注
   * @param {string} id 批注唯一标识
   */
  function remove(id: string): void {
    if (!id) return
    getCommentComponent()?.delete?.(id)
    sync()
    render()
  }

  /**
   * 删除当前激活组对应的批注，若批注组件无对应批注则调用编辑器删除组命令
   * @param {string} [groupId] 可选的目标组 ID，未提供时按优先级自动推断
   */
  function removeCurrent(groupId?: string): void {
    const targetGroupId =
      groupId
      || getActiveGroupId?.()
      || getEditorInstance()?.command?.getGroupIds?.()?.[0]
      || ''
    if (!targetGroupId) return
    const currentComment = getCommentComponent()
      ?.getAll?.()
      ?.find(item => item.groupId === targetGroupId)
    if (currentComment?.id) {
      remove(currentComment.id)
      return
    }
    getEditorInstance()?.command?.executeDeleteGroup?.(targetGroupId)
    sync()
    render()
  }

  /**
   * 定位到指定 ID 的批注
   * @param {string} id 批注唯一标识
   */
  function locate(id: string): void {
    if (!id) return
    getCommentComponent()?.locate?.(id)
  }

  /**
   * 从批注元数据列表构建批注并同步渲染
   * @param {any[]} metas 批注元数据数组
   */
  function load(metas: any[]): void {
    getCommentComponent()?.buildFromMetas?.(metas ?? [])
    sync()
    render()
  }

  /** 批注管理 API 对象 */
  const commentAPI: IEditorCommentApi = {
    commentList,
    activeGroupId,
    sync,
    getState,
    create,
    remove,
    removeCurrent,
    locate,
    load,
    render
  }

  return {
    commentAPI
  }
}
