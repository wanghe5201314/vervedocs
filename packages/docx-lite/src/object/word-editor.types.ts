import type { IEditorData, IEditorOption, IElement, DocxImportCallback, DocxExportCallback } from '@vervedoc/core'

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
 * - 文档导入 / 导出回调（实现由外部宿主注入，支持后端 API 或 WASM）
 * - 生命周期与交互事件回调
 */
export interface WordEditorOptions {
  /** 编辑器挂载容器，支持选择器字符串或 DOM 元素 */
  container: string | HTMLElement
  /** 文档标题，显示在外壳标题栏 */
  title?: string
  /** 初始化渲染数据，纯 JSON 结构（IEditorData 含 header/main/footer，或仅 main 元素数组） */
  data?: IEditorData | IElement[]
  /** 编辑器内部选项（页眉页脚、缩放、只读、分页等），与 IEditorOption 对齐 */
  options?: IEditorOption
  /**
   * 文档导入回调（.docx → JSON）
   *
   * 宿主注入实现：浏览器端可加载 WASM 本地解析，或上传到后端 REST API 解析。
   * 未注入时，导入 .docx 功能不可用并给出提示。
   */
  importCallback?: DocxImportCallback
  /**
   * 文档导出回调（JSON → .docx）
   *
   * 宿主注入实现：调用后端 docx4j 服务生成 .docx，或在浏览器端 WASM 生成。
   * 未注入时，导出 .docx 功能不可用。
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
