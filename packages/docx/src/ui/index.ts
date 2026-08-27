import '../assets/fonts/material-icons/material-icons.css'
import '../assets/iconfont/iconfont.js'
import '../style.css'
import 'prismjs/themes/prism.css'
import type { DocumentMeta } from '@/api/document.api'

/**
 * 编辑器初始文档数据
 *
 * 加载优先级（由宿主显式提供，编辑器不内置默认文件）：
 * 1. `content` — 直接渲染
 * 2. `url` — 拉取 JSON 后渲染（如 `./test-output.json`）
 * 3. 二者皆无 — 空文档启动
 */
export interface DocxEditorUiInitialDocument {
  /** 文档元数据 */
  meta: DocumentMeta
  /** 文档 JSON 加载地址（仅当未提供 content 时生效） */
  url?: string
  /** 文档展示格式：word=文档视图，canvas=画布视图 */
  format?: 'word' | 'canvas'
  /** 文档内容（编辑器导出的数据结构）；优先于 url */
  content?: any
}

/**
 * 多人协作配置
 */
export interface CollaborationOptions {
  /** 协作 WebSocket 服务地址 */
  serverUrl: string
  /** 协作文档 ID */
  docId: string
  /** 当前用户信息（含 ID、名称、光标颜色） */
  user: { userId: string; userName: string; color: string }
  /** 认证令牌；不传则自动从 user 构造 JSON */
  token?: string
}

/**
 * 编辑器对外暴露的事件名称
 */
export type DocxEditorUiExternalEventName =
  | 'ready'
  | 'metaChange'
  | 'statusChange'
  | 'modeChange'
  | 'abilityChange'
  | 'contentChange'
  | 'collabConnectionChange'
  | 'collabSyncStateChange'
  | 'collabSharedSyncStateChange'
  | 'collabUsersChange'
  | 'collabError'
