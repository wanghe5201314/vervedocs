import { createApp, defineComponent, h, reactive, type App, type ComponentPublicInstance } from 'vue'
import 'ant-design-vue/dist/reset.css'

import { ConfigProvider } from 'ant-design-vue'
import '@/styles/index.css'
import '@vervedoc/design/styles.css'

import WordEditorComponent from '@/app/shell.vue'
import { initLocale, type DocxLocale } from '@/i18n'
import type {
  CollaborationOptions,
  DocxEditorUiInitialDocument,
  ExportDocxOptions,
  ExportDocxResult,
  ImportJsonFromUrlOptions,
  ImportJsonFromUrlResult
} from '@/editor/types'
import type { ExternalEditorApi } from '@/composables/use-external-events'
import type {
  DocxImportCallback,
  DocxExportCallback
} from '@vervedoc/core'

/**
 * Word 编辑器组件 ref 形状
 */
interface WordEditorComponentRef {
  /** 执行编辑器命令方法 */
  executeCommand?: (command: string, ...args: unknown[]) => unknown
  /** 编辑器对外暴露的 API */
  api?: ExternalEditorApi
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
   * 选文件 → importCallback(arrayBuffer) → 返回 { success, elements } → 渲染。
   * 未注入时导入不可用。实现示例：createDocxImportCallback()。
   */
  importCallback?: DocxImportCallback
  /**
   * 文档导出回调（IElement JSON → .docx）
   *
   * 取编辑器 JSON → exportCallback(json, { fileName }) → 返回 ArrayBuffer → 编辑器触发浏览器下载。
   * 回调第二个参数为可选参数，旧式只接收文档数据的回调仍可使用。
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
  /** 初始语言代码，默认 zhCN；用户手动切换后以 localStorage 持久化偏好为准 */
  locale?: DocxLocale
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
  /** Vue 应用实例 */
  private app: App | null = null
  /** 编辑器组件实例引用 */
  private editorRef: ComponentPublicInstance & WordEditorComponentRef | null = null
  /** 响应式状态：初始文档与协作配置 */
  private state: {
    initialDocument?: DocxEditorUiInitialDocument
    collaboration?: CollaborationOptions
  }

  /** 编辑器版本号 */
  static version: string = __APP_VERSION__

  /**
   * 构造函数，根据配置创建并挂载 Word 编辑器实例
   * @param options 编辑器配置项
   */
  constructor(private options: Options) {
    initLocale(options.locale)
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
    this.app.use(ConfigProvider, { componentSize: 'small', theme: { components: { Input: { borderRadius: 0 }, Button: { borderRadius: 0 } } } })
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
   * 执行兼容命令入口。
   * 文档导入、导出和打印建议使用下方具名方法，以获得明确的参数与结果类型。
   */
  executeCommand(
    command: 'importJsonFile',
    options: ImportJsonFromUrlOptions
  ): Promise<ImportJsonFromUrlResult> | undefined
  executeCommand(
    command: 'exportDocx',
    options?: ExportDocxOptions
  ): Promise<ExportDocxResult> | undefined
  executeCommand(command: 'print'): Promise<void> | undefined
  executeCommand(command: string, ...args: unknown[]): unknown
  executeCommand(command: string, ...args: unknown[]): unknown {
    return this.editorRef?.executeCommand?.(command, ...args)
  }

  /**
   * 从 URL 导入 JSON 文档。
   * @param options 文档 URL、请求配置与进度回调
   * @returns 明确的成功或失败结果；编辑器未就绪时返回 EDITOR_NOT_READY
   */
  importJsonFromUrl(options: ImportJsonFromUrlOptions): Promise<ImportJsonFromUrlResult> {
    return this.executeCommand('importJsonFile', options) ?? Promise.resolve({
      success: false,
      error: {
        code: 'EDITOR_NOT_READY',
        message: 'Editor is not ready'
      }
    })
  }

  /**
   * 使用宿主注入的导出回调生成并下载 DOCX。
   * @param options 导出选项，可指定回调和下载使用的文件名
   * @returns 下载结果；导出失败时返回带错误码的结果
   */
  exportDocx(options?: ExportDocxOptions): Promise<ExportDocxResult> {
    return this.executeCommand('exportDocx', options) ?? Promise.resolve({
      success: false,
      error: {
        code: 'EDITOR_NOT_READY',
        message: 'Editor is not ready'
      }
    })
  }

  /**
   * 重新排版并打开浏览器打印对话框。
   * @returns 打印准备完成后 resolve；编辑器未就绪或打印失败时 reject
   */
  print(): Promise<void> {
    const result = this.executeCommand('print')
    return result ?? Promise.reject(new Error('Editor is not ready'))
  }

  /**
   * 获取编辑器对外暴露的 API 对象
   * @returns 编辑器 API
   */
  getApi(): ExternalEditorApi | undefined {
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
