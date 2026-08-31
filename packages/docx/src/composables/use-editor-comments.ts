import { ref, type Ref } from 'vue'
import type { IComment } from '@vervedoc/core'

export interface IEditorCommentState {
  list: IComment[]
  activeGroupId: string
}

export interface IEditorCommentApi {
  commentList: Ref<IComment[]>
  activeGroupId: Ref<string>
  sync(groupId?: string): IComment[]
  getState(): IEditorCommentState
  create(userName?: string): IComment | null
  remove(id: string): void
  removeCurrent(groupId?: string): void
  locate(id: string): void
  load(metas: any[]): void
  render(): void
}

export function useEditorComments(options: {
  getEditorInstance: () => {
    command?: {
      getGroupIds?: () => string[]
      executeDeleteGroup?: (groupId: string) => void
    }
  } | null
  getCommentComponent: () => {
    getComments?: () => IComment[]
    addComment?: (userName?: string) => IComment | null
    deleteComment?: (id: string) => void
    locateComment?: (id: string) => void
    buildCommentsFromMetas?: (metas: any[]) => void
    render?: () => void
  } | null
  getActiveGroupId?: () => string
}) {
  const { getEditorInstance, getCommentComponent, getActiveGroupId } = options
  const commentList = ref<IComment[]>([])
  const activeGroupId = ref('')

  function sync(groupId?: string): IComment[] {
    const commentComp = getCommentComponent()
    commentList.value = [...(commentComp?.getComments?.() ?? [])]
    activeGroupId.value =
      groupId
      || getActiveGroupId?.()
      || getEditorInstance()?.command?.getGroupIds?.()?.[0]
      || ''
    return commentList.value
  }

  function getState(): IEditorCommentState {
    sync()
    return {
      list: [...commentList.value],
      activeGroupId: activeGroupId.value
    }
  }

  function render(): void {
    getCommentComponent()?.render?.()
  }

  function create(userName: string = '当前用户'): IComment | null {
    const comment = getCommentComponent()?.addComment?.(userName) ?? null
    sync(comment?.groupId)
    render()
    return comment
  }

  function remove(id: string): void {
    if (!id) return
    getCommentComponent()?.deleteComment?.(id)
    sync()
    render()
  }

  function removeCurrent(groupId?: string): void {
    const targetGroupId =
      groupId
      || getActiveGroupId?.()
      || getEditorInstance()?.command?.getGroupIds?.()?.[0]
      || ''
    if (!targetGroupId) return
    const currentComment = getCommentComponent()
      ?.getComments?.()
      ?.find(item => item.groupId === targetGroupId)
    if (currentComment?.id) {
      remove(currentComment.id)
      return
    }
    getEditorInstance()?.command?.executeDeleteGroup?.(targetGroupId)
    sync()
    render()
  }

  function locate(id: string): void {
    if (!id) return
    getCommentComponent()?.locateComment?.(id)
  }

  function load(metas: any[]): void {
    getCommentComponent()?.buildCommentsFromMetas?.(metas ?? [])
    sync()
    render()
  }

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
