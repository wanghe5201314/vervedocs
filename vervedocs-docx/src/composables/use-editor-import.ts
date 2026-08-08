import { nextTick } from 'vue'
import { PaperDirection, parseDocx } from '@vervedoc/core'
import { getAuthToken } from '@/api/document.api'

type EmitFn = (event: string, ...args: any[]) => void

interface EditorInstance {
  command: {
    getOptions?: () => any
    getValue: () => { data?: { main?: any[] } }
    executeSetValue: (value: { main: any[] }) => void
  }
}

function resolveFetchInit(payload: any): RequestInit {
  const token = String(getAuthToken() || '').trim()
  const headers: Record<string, string> = {
    ...(payload?.headers || {})
  }
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`
  }
  return {
    ...(payload?.fetchInit || {}),
    headers
  }
}

export function useEditorImport(options: {
  emit: EmitFn
  getEditorInstance: () => EditorInstance | null
  refreshCatalog: () => Promise<void>
}) {
  const { emit, getEditorInstance, refreshCatalog } = options

  async function importWord(payload: any) {
    let file: File | ArrayBuffer
    let onProgress: ((progress: number, status: string) => void) | undefined
    let onComplete: ((success: boolean, message?: string) => void) | undefined

    if (payload instanceof File || payload instanceof ArrayBuffer) {
      file = payload
    } else if (payload && payload.file) {
      file = payload.file
      onProgress = payload.onProgress
      onComplete = payload.onComplete
    } else {
      console.error('[Editor] importWord: 无效的参数')
      payload?.onComplete?.(false, '无效的文件')
      return
    }

    try {
      onProgress?.(10, '正在读取文件...')

      let arrayBuffer: ArrayBuffer
      let fileName = ''
      let fileSize = ''
      if (file instanceof File) {
        arrayBuffer = await file.arrayBuffer()
        fileName = file.name
        const size = file.size
        if (size < 1024) {
          fileSize = size + ' B'
        } else if (size < 1024 * 1024) {
          fileSize = (size / 1024).toFixed(1) + ' KB'
        } else {
          fileSize = (size / (1024 * 1024)).toFixed(1) + ' MB'
        }
      } else {
        arrayBuffer = file
      }

      const action = await new Promise<string>((resolve) => {
        emit('command', 'importConfirm', {
          resolve,
          fileName,
          fileSize,
          parseProgress: 0
        })

        ;(async () => {
          try {
            emit('command', 'importParseProgress', 30)

            const instance = getEditorInstance()
            const editorOptions = instance?.command?.getOptions?.()
            const margins =
              editorOptions?.paperDirection === PaperDirection.HORIZONTAL
                ? [
                    editorOptions.margins[1],
                    editorOptions.margins[2],
                    editorOptions.margins[3],
                    editorOptions.margins[0]
                  ]
                : editorOptions?.margins
            const targetInnerWidth =
              editorOptions?.width && margins
                ? editorOptions.width - margins[1] - margins[3]
                : undefined

            emit('command', 'importParseProgress', 50)

            const { EchartsChartRenderer } = await import('@vervedoc/docx-editor-chart')
            const echartsMod = await import('echarts')
            const result = await parseDocx(arrayBuffer, {
              targetInnerWidth,
              tableWidthMode: 'word',
              defaultTableRowHeight: editorOptions?.table?.defaultTrHeight,
              defaultTableTdPadding: editorOptions?.table?.tdPadding,
              forceDefaultLineHeight: editorOptions?.defaultLineHeight,
              chartRenderer: new EchartsChartRenderer(echartsMod)
            })

            emit('command', 'importParseProgress', 90)

            if (!result.success || result.elements.length === 0) {
              console.error('[Editor] Word 文档解析失败:', result.error)
              emit('command', 'importParseComplete')
              onComplete?.(false, result.error || '解析失败')
              return
            }

            emit('command', 'importParseComplete')
            ;(window as any).__importWordResult = result

          } catch (err) {
            console.error('[Editor] Word 解析出错:', err)
            emit('command', 'importParseComplete')
            onComplete?.(false, '解析失败')
          }
        })()
      })

      if (action === 'cancel') {
        onComplete?.(false, '已取消导入')
        return
      }

      const result = (window as any).__importWordResult
      delete (window as any).__importWordResult

      if (!result) {
        onComplete?.(false, '解析结果丢失')
        return
      }

      onProgress?.(70, '正在渲染内容...')

      const instance = getEditorInstance()
      if (!instance) {
        onComplete?.(false, '编辑器未就绪')
        return
      }

      if (action === 'append') {
        const currentValue = instance.command.getValue()
        const currentElements = currentValue?.data?.main || []
        const combinedElements = [...currentElements, ...result.elements]
        instance.command.executeSetValue({
          main: combinedElements
        })
      } else {
        const docName = fileName.replace(/\.docx?$/i, '') || '新建文档'
        emit('command', 'importNewDoc', { fileName: docName })
        instance.command.executeSetValue({
          main: result.elements
        })
      }

      onProgress?.(80, '正在保存...')
      await new Promise<void>((resolve) => {
        emit('command', 'importFinished', {
          source: 'word',
          comments: result.comments,
          onSaveComplete: resolve
        })
      })

      nextTick(() => {
        void refreshCatalog()
      })

      onProgress?.(100, '导入完成!')
      onComplete?.(true)

    } catch (error) {
      console.error('[Editor] Word 导入出错:', error)
      const errorMessage = error instanceof Error ? error.message : '导入失败'
      onComplete?.(false, errorMessage)
    }
  }

  async function importWordFromUrl(payload: any) {
    const url = payload?.url
    const onProgress: ((progress: number, status: string) => void) | undefined = payload?.onProgress
    const onComplete: ((success: boolean, message?: string) => void) | undefined = payload?.onComplete
    if (!url || typeof url !== 'string') {
      onComplete?.(false, '无效的地址')
      return
    }
    try {
      onProgress?.(10, '正在请求文档...')
      const resp = await fetch(url, resolveFetchInit(payload))
      if (!resp.ok) {
        onComplete?.(false, `请求失败: ${resp.status}`)
        return
      }
      onProgress?.(25, '正在读取内容...')
      const arrayBuffer = await resp.arrayBuffer()
      onProgress?.(35, '正在解析文档结构...')

      const instance = getEditorInstance()
      const editorOptions = instance?.command?.getOptions?.()
      const margins =
        editorOptions?.paperDirection === PaperDirection.HORIZONTAL
          ? [
              editorOptions.margins[1],
              editorOptions.margins[2],
              editorOptions.margins[3],
              editorOptions.margins[0]
            ]
          : editorOptions?.margins
      const targetInnerWidth =
        editorOptions?.width && margins
          ? editorOptions.width - margins[1] - margins[3]
          : undefined

      const { EchartsChartRenderer } = await import('@vervedoc/docx-editor-chart')
      const echartsMod = await import('echarts')
      const result = await parseDocx(arrayBuffer, {
        targetInnerWidth,
        tableWidthMode: 'word',
        defaultTableRowHeight: editorOptions?.table?.defaultTrHeight,
        defaultTableTdPadding: editorOptions?.table?.tdPadding,
        forceDefaultLineHeight: editorOptions?.defaultLineHeight,
        chartRenderer: new EchartsChartRenderer(echartsMod)
      })

      if (!result.success || result.elements.length === 0) {
        onComplete?.(false, result.error || '解析失败')
        return
      }

      onProgress?.(75, '正在渲染内容...')
      const inst = getEditorInstance()
      if (!inst) return
      inst.command.executeSetValue({ main: result.elements })
      nextTick(() => {
        void refreshCatalog()
        if (result.comments?.length) {
          emit('command', 'commentsLoaded', result.comments)
        }
      })
      onProgress?.(100, '加载完成!')
      onComplete?.(true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '加载失败'
      onComplete?.(false, msg)
    }
  }

  async function importCanvasFromUrl(payload: any) {
    const url = payload?.url
    const onProgress: ((progress: number, status: string) => void) | undefined = payload?.onProgress
    const onComplete: ((success: boolean, message?: string) => void) | undefined = payload?.onComplete
    if (!url || typeof url !== 'string') {
      onComplete?.(false, '无效的地址')
      return
    }
    try {
      onProgress?.(10, '正在请求文档...')
      const fetchInit = resolveFetchInit(payload)
      const resp = await fetch(url, { ...fetchInit, cache: 'no-store' })
      if (!resp.ok) {
        onComplete?.(false, `请求失败: ${resp.status}`)
        return
      }
      onProgress?.(40, '正在解析数据...')
      const json = await resp.json()
      const main = Array.isArray(json) ? json : Array.isArray(json?.main) ? json.main : Array.isArray(json?.data?.main) ? json.data.main : null
      if (!Array.isArray(main) || main.length === 0) {
        onComplete?.(false, '数据为空或格式不正确')
        return
      }
      onProgress?.(80, '正在渲染内容...')
      const inst = getEditorInstance()
      if (!inst) return
      inst.command.executeSetValue({ main })
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
    importWord,
    importWordFromUrl,
    importCanvasFromUrl,
  }
}