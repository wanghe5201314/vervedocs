import type { IDocxDocumentMeta, IEditorOption, IElement, DocxImportCallback, DocxExportCallback } from '@vervedoc/core'

export type ImportMode = 'overwrite' | 'append' | 'cancel'

export interface SaveSnapshot {
  meta: {
    id: string
    name: string
    createdAt: string
    submittedAt: string
  }
  content: any
}

/**
 * Word 编辑器外壳层配置
 *
 * 用于创建 / 挂载 Word 编辑器实例，包含：
 * - 挂载容器与初始数据
 * - 编辑器内部选项（页眉页脚 / 缩放 / 只读等）
 * - 文档导入 / 导出回调（实现由外部宿主注入）
 * - 生命周期与交互事件回调
 */
export interface WordEditorOptions {
  /** 编辑器挂载容器，支持选择器字符串或 DOM 元素 */
  container: string | HTMLElement
  /** 文档标题，显示在外壳标题栏 */
  title?: string
  /** 初始化渲染数据，纯 JSON 结构（IDocxDocumentMeta 含 elements/sections，或仅 elements 元素数组） */
  data?: IDocxDocumentMeta | IElement[]
  /** 编辑器内部选项（页眉页脚、缩放、只读、分页等），与 IEditorOption 对齐 */
  options?: IEditorOption
  /**
   * 文档导入回调（.docx → IElement JSON）
   *
   * 宿主注入任意实现（本地 JS / 服务端 / 自定义引擎均可）。
   * 未注入时导入不可用。
   */
  importCallback?: DocxImportCallback
  /**
   * 文档导出回调（IElement JSON → .docx）
   *
   * 宿主注入任意实现；未注入时导出不可用；成功后由外壳触发下载。
   */
  exportCallback?: DocxExportCallback
  /** 编辑器实例就绪后触发，回调参数为编辑器实例 */
  onReady?: (editor: any) => void
  /** 文档内容变更时触发 */
  onChange?: () => void
  /** 翻页时触发，回调参数为当前页码（从 1 开始） */
  onPageChange?: (pageNo: number) => void
  /** 缩放比例变更时触发，回调参数为当前缩放值（1 = 100%） */
  onScaleChange?: (scale: number) => void
  /** 保存触发时回调，参数为文档快照（含元数据与当前内容） */
  onSave?: (snapshot: SaveSnapshot) => void
}

export interface LiteEditorShellExposed {
  getInstance: () => any
  getCommand: () => any
  getListener: () => any
  executeCommand: (command: string, ...args: any[]) => any
  setTitle: (title: string) => void
  destroyShell: () => void
}
