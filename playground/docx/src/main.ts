import {
  WordEditor,
  createDefaultDocumentApi,
  setDocumentApi,
  type DocxExportCallback,
  type DocxImportCallback
} from '@vervedoc/docx'
import {
  createDocxImportCallback,
  createDocxExportCallback
} from '@vervedoc/docx-parser'
import {
  buildCollaborationFromLocation,
  buildInitialDocumentFromLocation
} from './resolve-from-location'

import GUI from 'lil-gui'

/**
 * 本地部署的 vervedocs-for-node 服务地址（固定）。
 * - POST /documents/translate/word → docx → json
 * - POST /documents/render         → json → docx（?format=docx|pdf）
 */
const DOCX_SERVER_BASE = 'http://localhost:1320'

const localImport = createDocxImportCallback()
const localExport = createDocxExportCallback()

const serverImport: DocxImportCallback = async (data) => {
  const form = new FormData()
  const blob =
    data instanceof File ? data : new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
  form.append('file', blob, data instanceof File ? data.name : 'import.docx')
  const resp = await fetch(`${DOCX_SERVER_BASE}/documents/translate/word`, {
    method: 'POST',
    body: form
  })
  const json = await resp.json()
  if (!json.success) {
    return { success: false, elements: [], error: json.error }
  }
  return json.data;
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
        success: true,
        elements: obj.elements,
        ...(Array.isArray(obj.comments) ? { comments: obj.comments } : {})
      }
    }
    if (Array.isArray(obj.main)) {
      return {
        success: true,
        elements: obj.main,
        ...(Array.isArray(obj.comments) ? { comments: obj.comments } : {})
      }
    }
  }
  return { success: true, elements: [] }
}

const serverExport: DocxExportCallback = async (data) => {
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

window.onload = () => {
  const gui = new GUI()
  const options = {
    // 是否本地导出
    isLocalExport: true,
    // 是否本地导入
    isLocalImport: true
  }
  gui.add(options, 'isLocalExport').name('本地导出')
  gui.add(options, 'isLocalImport').name('本地导入')

  setDocumentApi(createDefaultDocumentApi())
  /**
   * 导入/导出策略由宿主显式注入，GUI 可运行时切换：
   * - 本地 JS：@vervedoc/docx-parser
   * - 服务端：本地部署的 vervedocs-for-node（DOCX_SERVER_BASE）
   */
  new WordEditor({
    container: '#app',
    initialDocument: buildInitialDocumentFromLocation(),
    collaboration: buildCollaborationFromLocation(),
    importCallback: (data, opts) =>
      options.isLocalImport ? localImport(data, opts) : serverImport(data, opts),
    exportCallback: (data, opts) =>
      options.isLocalExport ? localExport(data, opts) : serverExport(data, opts),
    onReady: () => {
      console.info('[playground] WordEditor ready')
    }
  })
}
