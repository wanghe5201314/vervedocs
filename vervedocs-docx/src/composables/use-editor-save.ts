import { Ref } from 'vue'
import { emitExternalEvent } from '@/composables/use-external-api'
import { appConfig } from '@/config/app-config'
import type { DocumentMeta } from '@/types/document'

interface EditorInstance {
  command?: {
    getValue?: () => any
    getRevisions?: () => any[]
  }
}

interface CommentComponent {
  getComments: () => any[]
  serializeComments: () => any
}

export function useEditorSave(options: {
  getEditorInstance: () => EditorInstance | null
  getCommentComponent: () => CommentComponent | null
  documentMeta: DocumentMeta
  busyState: Ref<'idle' | 'loading' | 'saving'>
  emitMetaChange: () => void
}) {
  const { getEditorInstance, getCommentComponent, documentMeta, busyState, emitMetaChange } = options

  let saveTimer: number | null = null
  let saving = false
  let pendingSave = false

  const getSnapshot = () => {
    const instance = getEditorInstance()
    const content = instance?.command?.getValue?.() ?? null
    let contentWithExtras: any = content
    if (content) {
      const extras: Record<string, unknown> = {}
      const commentComp = getCommentComponent()
      if (commentComp && commentComp.getComments().length > 0) {
        extras.comments = commentComp.serializeComments()
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
      const msg = e instanceof Error ? e.message : '保存失败'
      emitExternalEvent('statusChange', { command: 'saveError', args: [msg] })
    } finally {
      saving = false
      busyState.value = 'idle'
      if (pendingSave) scheduleSave()
    }
  }

  const scheduleSave = () => {
    if (!appConfig['auto-save']) return
    if (documentMeta.status === 'view') return
    if (saveTimer) window.clearTimeout(saveTimer)
    saveTimer = window.setTimeout(() => {
      void saveNow({ silent: true })
    }, 800)
  }

  return { getSnapshot, saveNow, scheduleSave }
}