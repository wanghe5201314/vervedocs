import { Ref } from 'vue'
import { emitExternalEvent } from '@/composables/use-external-events'

import type { DocumentMeta } from '@/types/document'
import { t } from '@/i18n'

/**
 * 编辑器实例接口（保存所需的最小能力）
 */
interface EditorInstance {
  command?: {
    /** 获取当前文档值 */
    getValue?: () => any
    /** 获取修订列表 */
    getRevisions?: () => any[]
  }
}

/**
 * 评论组件接口（保存所需的最小能力）
 */
interface CommentComponent {
  /** 获取所有评论 */
  getAll: () => any[]
  /** 序列化评论为可保存结构 */
  serialize: () => any
}

/**
 * 文档保存 composable
 * @param options 配置项
 * @returns 快照获取、立即保存、延迟保存方法
 */
export function useEditorSave(options: {
  /** 获取编辑器实例 */
  getEditorInstance: () => EditorInstance | null
  /** 获取评论组件 */
  getCommentComponent: () => CommentComponent | null
  /** 文档元数据 */
  documentMeta: DocumentMeta
  /** 忙碌状态（idle/loading/saving） */
  busyState: Ref<'idle' | 'loading' | 'saving'>
  /** 触发元数据变更事件 */
  emitMetaChange: () => void
}) {
  const { getEditorInstance, getCommentComponent, documentMeta, busyState, emitMetaChange } = options

  /** 延迟保存定时器句柄 */
  let saveTimer: number | null = null
  /** 当前是否正在保存 */
  let saving = false
  /** 保存期间是否有新的待保存请求 */
  let pendingSave = false

  /**
   * 获取当前文档快照，包含元数据、内容及评论和修订等附加信息
   * @returns 文档快照对象，包含 meta 和 content 字段
   */
  const getSnapshot = () => {
    const instance = getEditorInstance()
    const content = instance?.command?.getValue?.() ?? null
    let contentWithExtras: any = content
    if (content) {
      const extras: Record<string, unknown> = {}
      const commentComp = getCommentComponent()
      if (commentComp && commentComp.getAll().length > 0) {
        extras.comments = commentComp.serialize()
      }
      const revisions = instance?.command?.getRevisions?.()
      if (revisions && revisions.length > 0) {
        extras.revisions = revisions.map(({ id, type, author, date, content: revContent }: any) => ({
          id, type, author, date, content: revContent
        }))
      }
      if (Object.keys(extras).length > 0) {
        contentWithExtras = { ...content, ...extras }
      }
    }
    return { meta: { ...documentMeta }, content: contentWithExtras }
  }

  /**
   * 立即保存文档，若正在保存则标记待保存，完成后触发相应事件
   * @param saveOptions 保存选项（是否静默保存）
   * @returns 无返回值
   */
  const saveNow = async (saveOptions?: { silent?: boolean }) => {
    if (saving) {
      pendingSave = true
      return
    }
    if (documentMeta.status === 'lock' || documentMeta.status === 'view') return
    const snapshot = getSnapshot()
    if (!snapshot.content) return

    const saveSnapshot = snapshot

    saving = true
    busyState.value = 'saving'
    pendingSave = false
    try {
      documentMeta.submittedAt = new Date().toISOString()
      emitMetaChange()
      emitExternalEvent('statusChange', {
        command: 'save',
        args: [{ silent: !!saveOptions?.silent, snapshot: saveSnapshot }]
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('editor.saveFailed')
      emitExternalEvent('statusChange', { command: 'saveError', args: [msg] })
    } finally {
      saving = false
      busyState.value = 'idle'
      if (pendingSave) scheduleSave()
    }
  }

  /**
   * 延迟保存文档，在 800 毫秒后触发静默保存
   * @returns 无返回值
   */
  const scheduleSave = () => {

    if (documentMeta.status === 'view') return
    if (saveTimer) window.clearTimeout(saveTimer)
    saveTimer = window.setTimeout(() => {
      void saveNow({ silent: true })
    }, 800)
  }

  return { getSnapshot, saveNow, scheduleSave }
}