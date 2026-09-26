import { ref, h } from 'vue'
import { message } from 'ant-design-vue'
import { useDialogConfirm } from '@vervedoc/ui'
import { emitExternalEvent } from '@/composables/use-external-events'
import type { DocumentMeta } from '@/types/document'
import type { ReplaceDocumentPayload } from '@/composables/use-replace-document'
import { t } from '@/i18n'

/**
 * 文档操作 composable（重命名、新建、权限、反馈）
 * @param options 配置项
 * @returns 文档操作方法集合
 */
export function useDocumentActions(options: {
  /** 文档元数据 */
  documentMeta: DocumentMeta
  /** 触发元数据变更事件 */
  emitMetaChange: () => void
  /** 立即保存 */
  saveNow: (opts?: { silent?: boolean }) => Promise<void>
  /** 执行编辑器命令 */
  executeCommand: (command: string, ...args: any[]) => void
  /** 设置是否抑制一次保存 */
  setSuppressSaveOnce: (value: boolean) => void
  /** 整文档替换（清空正文/页眉页脚/批注） */
  applyDocumentReplace: (payload: ReplaceDocumentPayload) => Promise<void>
  /** 获取编辑器实例（用于判断是否有未保存内容） */
  getEditorInstance: () => any
}) {
  const confirm = useDialogConfirm()
  const {
    documentMeta,
    emitMetaChange,
    saveNow,
    setSuppressSaveOnce,
    applyDocumentReplace,
    getEditorInstance
  } = options

  /**
   * 打开访问权限设置，触发权限变更事件
   */
  const openAccessPermission = () => {
    emitExternalEvent('statusChange', { command: 'accessPermission', args: [{ meta: { ...documentMeta } }] })
  }

  /**
   * 打开反馈入口，触发反馈事件并提示用户
   */
  const openFeedback = () => {
    emitExternalEvent('statusChange', { command: 'feedback', args: [{ meta: { ...documentMeta } }] })
    message.info(t('common.feedbackHint'))
  }

  /**
   * 重命名文档，弹出确认对话框并在确认后保存
   */
  const renameDoc = async () => {
    const renameValue = ref(String(documentMeta.name || '').trim() || t('common.newDocument'))
    await confirm({
      title: t('common.rename'),
      content: () => h('div', {}, [
        h('input', {
          autofocus: true,
          'aria-label': t('common.documentName'),
          value: renameValue.value,
          onInput: (e: Event) => { renameValue.value = (e.target as HTMLInputElement).value },
          style: 'width:100%;padding:4px 8px;border:1px solid #d9d9d9;border-radius:4px;',
          placeholder: t('common.newDocument')
        })
      ]),
      okText: t('common.ok'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        const next = String(renameValue.value || '').trim()
        if (!next) return false
        documentMeta.name = next
        emitMetaChange()
        if (String(documentMeta.id || '').trim() !== 'local') {
          await saveNow({ silent: false })
        }
      }
    })
  }

  /**
   * 判断编辑器当前是否有内容（正文/页眉/页脚任一非空）
   */
  const hasEditorContent = (): boolean => {
    const value = getEditorInstance()?.command?.getValue?.()
    if (!value) return false
    if (Array.isArray(value)) return value.length > 0
    const { main, header, footer } = value
    return (Array.isArray(main) && main.length > 0) ||
      (Array.isArray(header) && header.length > 0) ||
      (Array.isArray(footer) && footer.length > 0)
  }

  /**
   * 若编辑器有未保存内容则弹出确认框；无内容或用户确认返回 true，用户取消返回 false
   */
  const confirmDiscardUnsaved = async (title: string, content: string): Promise<boolean> => {
    if (!hasEditorContent()) return true
    return confirm({
      title,
      content,
      okText: t('common.ok'),
      cancelText: t('common.cancel')
    })
  }

  /**
   * 新建文档：若编辑器有未保存内容则先确认，重置元数据并通过整文档替换清空正文/页眉页脚/批注
   */
  const newDoc = async () => {
    if (!(await confirmDiscardUnsaved(t('common.newDocument'), t('common.newDocumentConfirmContent')))) return
    setSuppressSaveOnce(true)
    documentMeta.id = 'local'
    documentMeta.path = ''
    documentMeta.status = 'edit'
    documentMeta.name = t('common.newDocument')
    documentMeta.createdAt = ''
    documentMeta.submittedAt = ''
    emitMetaChange()
    await applyDocumentReplace({
      main: [],
      header: [],
      footer: [],
      comments: []
    })
  }

  return { renameDoc, newDoc, openAccessPermission, openFeedback, confirmDiscardUnsaved }
}
