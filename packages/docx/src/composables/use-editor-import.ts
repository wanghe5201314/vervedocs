import { nextTick } from 'vue'
import { adjustFloatImagePositions } from '@vervedoc/core'
import { replaceDocument } from '@/composables/use-replace-document'
import { t } from '@/i18n'

/**
 * 编辑器实例接口（导入所需的最小能力）
 */
interface EditorInstance {
  command: {
    /** 获取编辑器选项 */
    getOptions?: () => any
    /** 获取当前文档值 */
    getValue: () => { data?: { main?: any[] } }
    /** 设置文档值 */
    executeSetValue: (value: { main: any[]; header?: any[]; footer?: any[]; comments?: unknown[]; styles?: unknown; numbering?: unknown; theme?: unknown }) => void
  }
  comment?: any
  revision?: any
}

/**
 * 文档导入 composable
 * @param options 配置项
 * @returns 包含 JSON 文件导入方法的对象
 */
export function useEditorImport(options: {
  /** 获取编辑器实例 */
  getEditorInstance: () => EditorInstance | null
}) {
  const { getEditorInstance } = options

  /**
   * 导入 JSON 文件并整文档替换到编辑器
   * @param payload 导入参数，可包含 url、onProgress、onComplete
   * @returns 无返回值
   */
  async function importJsonFile(payload?: any) {
    const url = String(payload?.url || '').trim()
    const onProgress: ((progress: number, status: string) => void) | undefined = payload?.onProgress
    const onComplete: ((success: boolean, message?: string) => void) | undefined = payload?.onComplete
    if (!url) {
      onComplete?.(false, t('editor.missingUrl'))
      return
    }
    try {
      onProgress?.(10, t('editor.requesting'))
      const resp = await fetch(url, { cache: 'no-store' })
      if (!resp.ok) {
        onComplete?.(false, `${t('editor.requestFailed')}: ${resp.status}`)
        return
      }
      onProgress?.(30, t('editor.parsing'))
      const json = await resp.json()
      // 只认扁平文档 JSON（根数组 / elements / main），HTTP { data } 信封由 importCallback 拆包
      const main = Array.isArray(json) ? json
        : Array.isArray(json?.elements) ? json.elements
        : Array.isArray(json?.main) ? json.main
        : null
      if (!Array.isArray(main) || main.length === 0) {
        onComplete?.(false, t('editor.dataInvalid'))
        return
      }
      const comments = Array.isArray(json?.comments) ? json.comments : []
      const header = Array.isArray(json?.header) ? json.header : []
      const footer = Array.isArray(json?.footer) ? json.footer : []

      onProgress?.(60, t('editor.rendering'))
      const inst = getEditorInstance()
      if (!inst) {
        onComplete?.(false, t('editor.editorNotReady'))
        return
      }
      const editorOptions = inst.command.getOptions?.()
      adjustFloatImagePositions(main, editorOptions)

      // Java 已解析元素的有效样式；保留原始文档元数据，导出仍需其继承链和单位。
      await replaceDocument(
        { getEditorInstance },
        { ...(Array.isArray(json) ? {} : json), main, header, footer, comments }
      )

      onProgress?.(100, t('editor.loadComplete'))
      onComplete?.(true)
      await nextTick()
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('editor.loadFailed')
      onComplete?.(false, msg)
    }
  }

  return {
    importJsonFile,
  }
}
