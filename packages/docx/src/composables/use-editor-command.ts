import { Ref, nextTick } from 'vue'
import { emitExternalEvent } from '@/composables/use-external-events'
import type { IEditorTocNavApi } from '@/composables/use-editor-toc-nav'
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
  tocNavAPI: IEditorTocNavApi
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
    tocNavAPI,
    revisionAPI,
    refreshReviewOverlays,
    isSuppressSaveOnce,
    setSuppressSaveOnce,
    getCollabPlugin,
    saveNow,
  } = options

  /** 编辑器命令处理器映射表，键为命令名，值为参数数组处理函数 */
  const commandHandlers: Record<string, (args: any[]) => void | boolean> = {
    /** 同步目录变更，更新目录 API 数据 */
    tocChange: args => {
      void tocNavAPI.sync(args[0] ?? [])
    },
    /** 同步缩略图变更，更新目录 API 缩略图列表 */
    thumbnailsChange: args => {
      tocNavAPI.setThumbnails(args[0] ?? [])
    },
    /** 处理编辑器状态变更，更新页脚状态与文档统计信息 */
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
    /** 处理编辑器能力变更，转发为外部 abilityChange 事件 */
    editorAbilityChange: args => {
      emitExternalEvent('abilityChange', args[0] ?? null)
    },
    /** 处理内容变更：刷新覆盖层、同步评论与修订，并按需抑制保存 */
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
    /** 处理评论加载完成事件，批量载入评论元数据 */
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
