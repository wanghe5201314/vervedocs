import { WordEditor, type DocxImportCallback, type DocxExportCallback } from '@vervedoc/docx-lite'
import './demo.css'

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

const serverExport: DocxExportCallback = async data => {
  const resp = await fetch(`${DOCX_SERVER_BASE}/documents/render?format=docx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!resp.ok) {
    return { success: false, error: await resp.text() }
  }
  return { success: true, data: await resp.arrayBuffer() }
}

async function loadInitialData() {
  try {
    const resp = await fetch('./test.json')
    if (!resp.ok) return undefined
    return await resp.json()
  } catch {
    return undefined
  }
}

window.onload = async () => {
  const data = await loadInitialData()

  new WordEditor({
    container: '#app',
    title: '新建文档',
    data,
    importCallback: serverImport,
    exportCallback: serverExport,
    onReady: () => {
      console.info('[playground] WordEditor ready')
    }
  })
}
