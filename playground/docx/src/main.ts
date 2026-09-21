import {
  WordEditor,
  createDefaultDocumentApi,
  setDocumentApi,
  type DocxExportCallback,
  type DocxImportCallback
} from '@vervedoc/docx'
import {
  buildCollaborationFromLocation,
  buildInitialDocumentFromLocation
} from './resolve-from-location'



/**
 * 本地部署的 vervedocs-for-node 服务地址（固定）。
 * - POST /documents/translate/word → docx → json
 * - POST /documents/render         → json → docx（?format=docx|pdf）
 */
const DOCX_SERVER_BASE = '/docx-api'


const serverImport: DocxImportCallback = async data => {
  const form = new FormData()
  const blob =
    data instanceof File
      ? data
      : new Blob([data], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        })
  form.append('file', blob, data instanceof File ? data.name : 'import.docx')
  const resp = await fetch(`${DOCX_SERVER_BASE}/documents/translate/word`, {
    method: 'POST',
    body: form
  })
  const json = await resp.json()
  if (!json.success) {
    return { success: false, elements: [], error: json.error }
  }
  return json.data
}

/** 将编辑器 IEditorData / IElement[] 转为 JAR 可识别的 DocxParseResult（不含 header/footer） */
function toDocxParseResult(data: unknown): {
  success: true
  elements: unknown[]
  comments?: unknown[]
} {
  if (Array.isArray(data)) {
    return { success: true, elements: data }
  }
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    if (Array.isArray(obj.elements)) {
      return {
        ...obj,
        success: true,
        elements: obj.elements
      }
    }
    if (Array.isArray(obj.main)) {
      return {
        ...obj,
        success: true,
        elements: obj.main
      }
    }
  }
  return { success: true, elements: [] }
}

const serverExport: DocxExportCallback = async data => {
  const payload = toDocxParseResult(data)
  const resp = await fetch(`${DOCX_SERVER_BASE}/documents/render?format=docx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!resp.ok) {
    return { success: false, error: await resp.text() }
  }
  return { success: true, data: await resp.arrayBuffer() }
}

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null

window.onload = () => {

  setDocumentApi(createDefaultDocumentApi())

  const initialDocument = buildInitialDocumentFromLocation()

  /** 导入和导出统一使用服务端 Java 解析与写回。 */
  new WordEditor({
    container: '#app',
    initialDocument,
    collaboration: buildCollaborationFromLocation(),
    importCallback: serverImport,
    exportCallback: serverExport,
    onReady: () => {
      console.info('[playground] WordEditor ready')
    },
    onChange: () => {
      console.log('onChange');
      if (autoSaveTimer) clearTimeout(autoSaveTimer)
      autoSaveTimer = setTimeout(async() => {
        await (window as any).docxEditorUI?.document?.save({ silent: true })
      }, 800)
    },
    onStatusChange: async ({ command, args }) => {
      console.log('onStatusChange', command, args);
      if (command !== 'save') return
      const { silent, snapshot } = args[0]
      try {
        await createDefaultDocumentApi().saveDocument({
          meta: snapshot.meta,
          content: snapshot.content
        })
        console.log(silent ? '自动保存成功' : '手动保存成功')
      } catch (e) {
        console.error('保存失败', e)
      }
    }
  })
}
