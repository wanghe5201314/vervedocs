import { nextTick } from 'vue'
import { PaperDirection } from '@vervedoc/core'

type EmitFn = (event: string, ...args: any[]) => void

interface EditorInstance {
  command: {
    getOptions?: () => any
    getValue: () => { data?: { main?: any[] } }
    executeSetValue: (value: { main: any[] }) => void
  }
}

export function useEditorImport(options: {
  emit: EmitFn
  getEditorInstance: () => EditorInstance | null
  refreshCatalog: () => Promise<void>
}) {
  const { emit, getEditorInstance, refreshCatalog } = options

  async function importJsonFile(payload?: any) {
    const url = payload?.url || '/test-output.json'
    const onProgress: ((progress: number, status: string) => void) | undefined = payload?.onProgress
    const onComplete: ((success: boolean, message?: string) => void) | undefined = payload?.onComplete
    try {
      onProgress?.(10, '正在请求文档...')
      const resp = await fetch(url, { cache: 'no-store' })
      if (!resp.ok) {
        onComplete?.(false, `请求失败: ${resp.status}`)
        return
      }
      onProgress?.(30, '正在解析数据...')
      const json = await resp.json()
      const main = Array.isArray(json) ? json
        : Array.isArray(json?.elements) ? json.elements
        : Array.isArray(json?.main) ? json.main
        : Array.isArray(json?.data?.main) ? json.data.main
        : null
      if (!Array.isArray(main) || main.length === 0) {
        onComplete?.(false, '数据为空或格式不正确')
        return
      }
      const comments = json?.comments || json?.data?.comments || []
      onProgress?.(60, '正在渲染内容...')
      const inst = getEditorInstance()
      if (!inst) {
        onComplete?.(false, '编辑器未就绪')
        return
      }
      const editorOptions = inst.command.getOptions?.()
      const margins = editorOptions?.margins || [96, 120, 96, 120]
      const paperDirection = editorOptions?.paperDirection
      const marginTop = paperDirection === PaperDirection.HORIZONTAL ? margins[1] : margins[0]
      const marginLeft = paperDirection === PaperDirection.HORIZONTAL ? margins[0] : margins[3]
      const defaultSize = editorOptions?.defaultSize || 14
      for (let li = 0; li < main.length; li++) {
        const el = main[li]
        if (el.imgDisplay && el.imgDisplay !== 'inline' && el.imgDisplay !== 'block' && el.imgFloatPosition) {
          let fontSize = defaultSize
          for (let ni = li + 1; ni < Math.min(li + 10, main.length); ni++) {
            if (main[ni].size && main[ni].value && main[ni].value.trim()) {
              fontSize = main[ni].size
              break
            }
          }
          const ascent = fontSize * 0.8
          el.imgFloatPosition.x += marginLeft
          el.imgFloatPosition.y += marginTop + ascent
        }
      }
      inst.command.executeSetValue({ main })
      onProgress?.(80, '正在加载批注...')
      if (comments.length) {
        emit('command', 'commentsLoaded', comments)
      }
      nextTick(() => {
        void refreshCatalog()
      })
      onProgress?.(100, '加载完成!')
      onComplete?.(true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '加载失败'
      onComplete?.(false, msg)
    }
  }

  return {
    importJsonFile,
  }
}
