import type { CollaborationOptions, DocxEditorUiInitialDocument } from '@vervedoc/docx'

const COLLAB_COLORS = ['#958DF1', '#F98181', '#FBBC88', '#FAF594', '#70CFF8', '#94FADB', '#B9F18D', '#E8A0BF']

/**
 * 从 URL 查询参数构造初始文档
 */
export function buildInitialDocumentFromLocation(
  loc: Location = window.location
): DocxEditorUiInitialDocument {
  const sp = new URLSearchParams(loc.search)
  const docId = String(sp.get('docId') || '').trim() || 'local'
  const docName = String(sp.get('docName') || '').trim()
  const format = String(sp.get('docFormat') || '').trim().toLowerCase()
  const normalizedFormat =
    format === 'word' || format === 'canvas' ? (format as 'word' | 'canvas') : undefined

  return {
    meta: {
      id: docId,
      path: '',
      status: 'edit',
      name: docName || undefined
    },
    // playground 演示文档：由宿主配置 url，编辑器不内置默认路径
    url: './test-output.json',
    format: normalizedFormat
  }
}

/**
 * 从 URL 查询参数构造协作配置（`?user=xxx` 时启用本地协作）
 */
export function buildCollaborationFromLocation(
  loc: Location = window.location
): CollaborationOptions | undefined {
  const sp = new URLSearchParams(loc.search)
  const collabUser = sp.get('user')
  if (!collabUser) return undefined

  const userId = `local-${collabUser}-${Math.random().toString(36).slice(2, 8)}`
  const color = COLLAB_COLORS[Math.floor(Math.random() * COLLAB_COLORS.length)]

  return {
    serverUrl: 'ws://127.0.0.1:1234',
    docId: 'test-docx-collab',
    user: { userId, userName: collabUser, color }
  }
}
