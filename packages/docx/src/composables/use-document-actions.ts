import { ref, h } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { emitExternalEvent } from '@/composables/use-external-events'
import type { DocumentMeta } from '@/types/document'
import type { ReplaceDocumentPayload } from '@/composables/use-replace-document'

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
}) {
  const {
    documentMeta,
    emitMetaChange,
    saveNow,
    setSuppressSaveOnce,
    applyDocumentReplace
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
    message.info('请在系统内提交反馈')
  }

  /**
   * 重命名文档，弹出确认对话框并在确认后保存
   */
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

  /**
   * 新建文档：重置元数据，并通过整文档替换清空正文/页眉页脚/批注
   */
  const newDoc = async () => {
    setSuppressSaveOnce(true)
    documentMeta.id = 'local'
    documentMeta.path = ''
    documentMeta.status = 'edit'
    documentMeta.name = '新建文档'
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

  return { renameDoc, newDoc, openAccessPermission, openFeedback }
}
