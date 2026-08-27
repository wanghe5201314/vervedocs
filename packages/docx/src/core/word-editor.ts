import { createApp, defineComponent, h, reactive, type App, type ComponentPublicInstance } from 'vue'
import 'ant-design-vue/dist/reset.css'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import { ConfigProvider } from 'ant-design-vue'
import '@/ui'
import WordEditorComponent from '@/app/WordEditorApp.vue'
import type { CollaborationOptions, DocxEditorUiInitialDocument } from '@/ui'
import type {
  DocxImportCallback,
  DocxExportCallback
} from '@vervedoc/core'

interface WordEditorComponentRef {
  executeCommand?: (command: string, ...args: unknown[]) => unknown
  api?: unknown
}

/**
 * Word 编辑器（完整版）对象式接入配置
 *
 * 用于 `new WordEditor(options)` 创建编辑器实例，包含：
 * - 挂载容器与初始文档
 * - 协作配置（多人协同编辑）
 * - 导入/导出钩子（实现方式由宿主决定）
 * - 生命周期与状态变更回调
 */
export interface Options {
  /** 编辑器挂载容器，支持选择器字符串或 DOM 元素 */
  container: string | HTMLElement
  /** 初始文档数据（含 elements / meta 等），由 UI 层消费 */
  initialDocument?: DocxEditorUiInitialDocument
  /** 多人协作配置（WebSocket 地址、用户信息、权限等） */
  collaboration?: CollaborationOptions
  /**
   * 文档导入回调（.docx → IElement JSON）
   *
   * 选文件 → importCallback(arrayBuffer) → 返回 IDocxImportResult → 渲染。
   * 未注入时导入不可用。实现示例：createDocxImportCallback()。
   */
  importCallback?: DocxImportCallback
  /**
   * 文档导出回调（IElement JSON → .docx）
   *
   * 取编辑器 JSON → exportCallback(json) → 返回 ArrayBuffer → 编辑器触发浏览器下载。
   * 未注入时导出不可用。实现示例：createDocxExportCallback()。
   */
  exportCallback?: DocxExportCallback
  /** 编辑器实例就绪后触发，回调参数为就绪 payload */
  onReady?: (payload: any) => void
  /** 文档内容变更时触发，回调参数含 content / meta / raw */
  onChange?: (payload: { content: any; meta: any; raw: any }) => void
  /** 文档元数据变更时触发 */
  onMetaChange?: (payload: any) => void
  /** 编辑器状态变更时触发（如保存中、协同状态等） */
  onStatusChange?: (payload: any) => void
}

/**
 * 解析挂载目标元素，支持选择器字符串或 DOM 元素
 * @param target 挂载目标，可为选择器字符串或 HTMLElement
 * @returns 解析后的 DOM 元素
 */
const resolveTarget = (target: string | HTMLElement): HTMLElement => {
  if (typeof target === 'string') {
    const el = document.querySelector<HTMLElement>(target)
    if (!el) throw new Error(`Mount target not found: ${target}`)
    return el
  }
  if (!target) throw new Error('Mount target is required')
  return target
}

export class WordEditor {
  private app: App | null = null
  private editorRef: ComponentPublicInstance & WordEditorComponentRef | null = null
  private state: {
    initialDocument?: DocxEditorUiInitialDocument
    collaboration?: CollaborationOptions
  }

  static version: string = __APP_VERSION__

  /**
   * 构造函数，根据配置创建并挂载 Word 编辑器实例
   * @param options 编辑器配置项
   */
  constructor(private options: Options) {
    const host = resolveTarget(options.container)
    this.state = reactive({
      initialDocument: options.initialDocument,
      collaboration: options.collaboration
    })
    const root = defineComponent(() => () => h(WordEditorComponent as any, {
      ref: (el: any) => {
        this.editorRef = el
      },
      initialDocument: this.state.initialDocument,
      collaboration: this.state.collaboration,
      importCallback: this.options.importCallback,
      exportCallback: this.options.exportCallback,
      onReady: (payload: any) => this.options.onReady?.(payload),
      onChange: (payload: any) => this.options.onChange?.(payload),
      onMetaChange: (payload: any) => this.options.onMetaChange?.(payload),
      onStatusChange: (payload: any) => this.options.onStatusChange?.(payload)
    }))
    this.app = createApp(root)
    this.app.use(ConfigProvider, { locale: zhCN })
    this.app.mount(host)
  }

  /**
   * 设置初始文档数据
   * @param initialDocument 初始文档数据
   */
  setInitialDocument(initialDocument?: DocxEditorUiInitialDocument) {
    this.state.initialDocument = initialDocument
  }

  /**
   * 设置多人协作配置
   * @param collaboration 协作配置项
   */
  setCollaboration(collaboration?: CollaborationOptions) {
    this.state.collaboration = collaboration
  }

  /**
   * 执行编辑器命令
   * @param command 命令名称
   * @param args 命令参数
   * @returns 命令执行结果
   */
  executeCommand(command: string, ...args: any[]) {
    return this.editorRef?.executeCommand?.(command, ...args)
  }

  /**
   * 获取编辑器对外暴露的 API 对象
   * @returns 编辑器 API
   */
  getApi() {
    return this.editorRef?.api
  }

  /**
   * 获取编辑器版本号
   * @returns 版本号字符串
   */
  static getVersion() {
    return WordEditor.version
  }

  /**
   * 销毁编辑器实例，卸载应用并清理引用
   */
  destroy() {
    if (!this.app) return
    this.app.unmount()
    this.app = null
    this.editorRef = null
  }
}
