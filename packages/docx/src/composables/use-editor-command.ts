import { Ref, nextTick } from 'vue'
import { emitExternalEvent } from '@/composables/use-external-events'
import type { IEditorCatalogApi } from '@/composables/use-editor-catalog'
import type { IEditorCommentApi } from '@/composables/use-editor-comments'
import type { IRevisionApi } from '@/composables/use-editor-revisions'
import type { DocumentStats } from '@/types/document'

/**
 * 编辑器命令分发 composable
 * @param options 配置项
 * @returns 编辑器命令处理函数
 */
export function useEditorCommand(options: {
  /** 页脚组件引用 */
  footerRef: Ref<any>
  /** 文档统计信息 */
  documentStats: DocumentStats
  /** 评论 API */
  commentAPI: IEditorCommentApi
  /** 目录 API */
  catalogAPI: IEditorCatalogApi
  /** 修订 API */
  revisionAPI: IRevisionApi
  /** 刷新批注/修订覆盖层 */
  refreshReviewOverlays: () => void
  /** 判断本次是否需要抑制一次保存 */
  isSuppressSaveOnce: () => boolean
  /** 设置是否抑制一次保存 */
  setSuppressSaveOnce: (value: boolean) => void
  /** 获取协作插件实例 */
  getCollabPlugin: () => any
  /** 立即保存 */
  saveNow: (opts?: { silent?: boolean }) => Promise<void>
}) {
  const {
    footerRef,
    documentStats,
    commentAPI,
    catalogAPI,
    revisionAPI,
    refreshReviewOverlays,
    isSuppressSaveOnce,
    setSuppressSaveOnce,
    getCollabPlugin,
    saveNow,
  } = options

  const commandHandlers: Record<string, (args: any[]) => void | boolean> = {
    catalogChange: args => {
      void catalogAPI.sync(args[0] ?? [])
    },
    thumbnailsChange: args => {
      catalogAPI.setThumbnails(args[0] ?? [])
    },
    editorStatus: args => {
      const payload = (args[0] ?? {}) as Record<string, any>
      footerRef.value?.updateEditorStatus?.(payload)
      const numFields: Array<keyof DocumentStats> = [
        'totalPages',
        'wordCount',
        'paragraphCount',
        'charCount',
        'charCountWithSpaces'
      ]
      for (const field of numFields) {
        if (payload[field] !== undefined) {
          documentStats[field] = Number(payload[field]) || 0
        }
      }
    },
    editorAbilityChange: args => {
      emitExternalEvent('abilityChange', args[0] ?? null)
    },
    contentChange: args => {
      emitExternalEvent('contentChange', args[0] ?? null)
      nextTick(() => refreshReviewOverlays())
      const collab = getCollabPlugin()
      collab?.syncComments()
      revisionAPI.sync()
      if (isSuppressSaveOnce()) {
        setSuppressSaveOnce(false)
        return true
      }
      collab?.markPositionListDirty()
      collab?.refreshCursors()
    },
    commentsLoaded: args => {
      const metas: any[] = args[0] || []
      commentAPI.load(metas)
    },
  }

  /**
   * 处理编辑器命令，分发到对应处理器或转发为外部事件
   * @param command 命令名称
   * @param args 命令参数
   */
  const handleEditorCommand = (command: string, ...args: any[]) => {
    const handler = commandHandlers[command]
    if (handler) {
      handler(args)
      return
    }
    emitExternalEvent('statusChange', { command, args })
  }

  /**
   * 处理编辑器保存事件，触发立即保存
   * @param _payload 保存事件载荷（未使用）
   */
  const handleEditorSaved = (_payload?: any) => {
    void saveNow({ silent: false })
  }

  return { handleEditorCommand, handleEditorSaved }
}
