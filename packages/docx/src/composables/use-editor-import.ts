import { nextTick } from 'vue'
import { adjustFloatImagePositions } from '@vervedoc/core'
import { replaceDocument } from '@/composables/use-replace-document'
import { t } from '@/i18n'
import type {
  ImportJsonFromUrlErrorCode,
  ImportJsonFromUrlOptions,
  ImportJsonFromUrlResult
} from '@/editor/types'

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

  /** 导入失败时统一返回可分支处理的错误结果。 */
  const failure = (
    code: ImportJsonFromUrlErrorCode,
    message: string,
    status?: number
  ): ImportJsonFromUrlResult => ({
    success: false,
    error: { code, message, ...(status === undefined ? {} : { status }) }
  })

  /**
   * 导入 JSON 文档并替换编辑器当前内容。
   * @param options JSON URL、请求选项与可选生命周期回调
   * @returns 导入结果；网络、数据与编辑器错误均通过结果返回
   */
  async function importJsonFile(
    options: ImportJsonFromUrlOptions
  ): Promise<ImportJsonFromUrlResult> {
    const url = String(options?.url || '').trim()
    const onProgress = options?.onProgress
    const onComplete = options?.onComplete
    const reportProgress = (progress: number, status: string) => {
      try {
        onProgress?.(progress, status)
      } catch (error) {
        console.error('[docx] import progress callback failed', error)
      }
    }
    const finish = (result: ImportJsonFromUrlResult) => {
      try {
        onComplete?.(result.success, result.success ? undefined : result.error.message)
      } catch (error) {
        console.error('[docx] import completion callback failed', error)
      }
      return result
    }

    if (!url) {
      return finish(failure('INVALID_URL', t('editor.missingUrl')))
    }

    try {
      reportProgress(10, t('editor.requesting'))

      let resp: Awaited<ReturnType<typeof fetch>>
      try {
        resp = await fetch(url, {
          cache: 'no-store',
          headers: options.headers,
          signal: options.signal
        })
      } catch (error) {
        if (options.signal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
          return finish(failure('ABORTED', t('editor.loadFailed')))
        }
        return finish(failure('REQUEST_FAILED', error instanceof Error ? error.message : t('editor.loadFailed')))
      }

      if (!resp.ok) {
        return finish(failure('HTTP_ERROR', `${t('editor.requestFailed')}: ${resp.status}`, resp.status))
      }

      reportProgress(30, t('editor.parsing'))
      let responseData: unknown
      try {
        responseData = await resp.json()
      } catch (error) {
        if (options.signal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
          return finish(failure('ABORTED', t('editor.loadFailed')))
        }
        const message = error instanceof Error ? error.message : t('editor.dataInvalid')
        return finish(failure('INVALID_JSON', `${t('editor.dataInvalid')}: ${message}`))
      }

      // 兼容直接文档、数组及常见的 { data: document } 服务端响应。
      const documentData =
        responseData && typeof responseData === 'object' && !Array.isArray(responseData) && 'data' in responseData
          ? (responseData as { data: unknown }).data
          : responseData
      const documentRecord =
        documentData && typeof documentData === 'object' && !Array.isArray(documentData)
          ? documentData as Record<string, unknown>
          : undefined
      const main = Array.isArray(documentData) ? documentData
        : Array.isArray(documentRecord?.elements) ? documentRecord.elements
        : Array.isArray(documentRecord?.main) ? documentRecord.main
        : null

      if (!Array.isArray(main) || main.length === 0) {
        return finish(failure('INVALID_DATA', t('editor.dataInvalid')))
      }

      const comments = Array.isArray(documentRecord?.comments) ? documentRecord.comments : []
      const header = Array.isArray(documentRecord?.header) ? documentRecord.header : []
      const footer = Array.isArray(documentRecord?.footer) ? documentRecord.footer : []

      reportProgress(60, t('editor.rendering'))
      const inst = getEditorInstance()
      if (!inst) {
        return finish(failure('EDITOR_NOT_READY', t('editor.editorNotReady')))
      }

      const editorOptions = inst.command.getOptions?.()
      adjustFloatImagePositions(main, editorOptions)

      // Java 已解析元素的有效样式；保留原始文档元数据，导出仍需其继承链和单位。
      await replaceDocument(
        { getEditorInstance },
        { ...(documentRecord ?? {}), main, header, footer, comments }
      )

      await nextTick()
      reportProgress(100, t('editor.loadComplete'))
      return finish({ success: true, elementCount: main.length })
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('editor.loadFailed')
      return finish(failure('IMPORT_FAILED', msg))
    }
  }

  return {
    importJsonFile,
  }
}
