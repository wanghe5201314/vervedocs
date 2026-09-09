import { nextTick } from 'vue'
import { adjustFloatImagePositions } from '@vervedoc/core'
import { replaceDocument } from '@/composables/use-replace-document'
import { adaptStyles, adaptNumbering, adaptTheme } from '@/utils/docx-meta-adapter'

/**
 * 事件发射函数类型
 */
type EmitFn = (event: string, ...args: any[]) => void

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
  /** 事件发射函数 */
  emit: EmitFn
  /** 获取编辑器实例 */
  getEditorInstance: () => EditorInstance | null
  /** 刷新目录 */
  refreshCatalog: () => Promise<void>
}) {
  const { getEditorInstance, refreshCatalog } = options

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
      onComplete?.(false, '缺少 url，无法加载 JSON 文档')
      return
    }
    try {
      onProgress?.(10, '正在请求文档...')
      const resp = await fetch(url, { cache: 'no-store' })
      if (!resp.ok) {
        onComplete?.(false, `请求失败: ${resp.status}`)
        return
      }
      onProgress?.(30, '正在解析数据...')
      const json = await resp.json()
      // 只认扁平文档 JSON（根数组 / elements / main），HTTP { data } 信封由 importCallback 拆包
      const main = Array.isArray(json) ? json
        : Array.isArray(json?.elements) ? json.elements
        : Array.isArray(json?.main) ? json.main
        : null
      if (!Array.isArray(main) || main.length === 0) {
        onComplete?.(false, '数据为空或格式不正确')
        return
      }
      const comments = Array.isArray(json?.comments) ? json.comments : []
      const header = Array.isArray(json?.header) ? json.header : []
      const footer = Array.isArray(json?.footer) ? json.footer : []
      const styles = adaptStyles(json?.styles)
      const numbering = adaptNumbering(json?.numbering)
      const theme = adaptTheme(json?.theme)

      onProgress?.(60, '正在渲染内容...')
      const inst = getEditorInstance()
      if (!inst) {
        onComplete?.(false, '编辑器未就绪')
        return
      }
      const editorOptions = inst.command.getOptions?.()
      adjustFloatImagePositions(main, editorOptions)

      await replaceDocument(
        { getEditorInstance, refreshCatalog },
        { main, header, footer, comments, styles, numbering, theme }
      )

      onProgress?.(100, '加载完成!')
      onComplete?.(true)
      await nextTick()
    } catch (e) {
      const msg = e instanceof Error ? e.message : '加载失败'
      onComplete?.(false, msg)
    }
  }

  return {
    importJsonFile,
  }
}
