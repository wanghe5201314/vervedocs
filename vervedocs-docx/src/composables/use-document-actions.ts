import { ref, h } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { emitExternalEvent } from '@/composables/use-external-api'
import type { DocumentMeta } from '@/types/document'

export function useDocumentActions(options: {
  documentMeta: DocumentMeta
  emitMetaChange: () => void
  saveNow: (opts?: { silent?: boolean }) => Promise<void>
  executeCommand: (command: string, ...args: any[]) => void
  setSuppressSaveOnce: (value: boolean) => void
}) {
  const { documentMeta, emitMetaChange, saveNow, executeCommand, setSuppressSaveOnce } = options

  const openAccessPermission = () => {
    emitExternalEvent('statusChange', { command: 'accessPermission', args: [{ meta: { ...documentMeta } }] })
  }

  const openFeedback = () => {
    emitExternalEvent('statusChange', { command: 'feedback', args: [{ meta: { ...documentMeta } }] })
    message.info('请在系统内提交反馈')
  }

  const renameDoc = async () => {
    const renameValue = ref(String(documentMeta.name || '').trim() || '新建文档')
    Modal.confirm({
      title: '重命名',
      content: () => h('div', {}, [
        h('input', {
          value: renameValue.value,
          onInput: (e: Event) => { renameValue.value = (e.target as HTMLInputElement).value },
          style: 'width:100%;padding:4px 8px;border:1px solid #d9d9d9;border-radius:4px;',
          placeholder: '新建文档'
        })
      ]),
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        const next = String(renameValue.value || '').trim()
        if (!next) return
        documentMeta.name = next
        emitMetaChange()
        if (String(documentMeta.id || '').trim() !== 'local') {
          await saveNow({ silent: false })
        }
      }
    })
  }

  const newDoc = async () => {
    setSuppressSaveOnce(true)
    documentMeta.id = 'local'
    documentMeta.path = ''
    documentMeta.status = 'edit'
    documentMeta.name = '新建文档'
    documentMeta.createdAt = ''
    documentMeta.submittedAt = ''
    emitMetaChange()
    await executeCommand('setValue', { main: [] })
  }

  return { renameDoc, newDoc, openAccessPermission, openFeedback }
}