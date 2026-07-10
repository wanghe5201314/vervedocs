import { createApp, defineComponent, h, reactive } from 'vue'
import 'ant-design-vue/dist/reset.css'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import { ConfigProvider } from 'ant-design-vue'
import '@/ui'
import WordEditorComponent from '@/ui/WordEditor.vue'
import type { CollaborationOptions, DocxEditorUiInitialDocument } from '@/ui'

export interface Options {
  container: string | HTMLElement
  initialDocument?: DocxEditorUiInitialDocument
  collaboration?: CollaborationOptions
  onReady?: (payload: any) => void
  onChange?: (payload: { content: any; meta: any; raw: any }) => void
  onMetaChange?: (payload: any) => void
  onStatusChange?: (payload: any) => void
}

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
  private app: any
  private editorRef: any = null
  private state: {
    initialDocument?: DocxEditorUiInitialDocument
    collaboration?: CollaborationOptions
  }

  static version: string = __APP_VERSION__

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
      onReady: (payload: any) => this.options.onReady?.(payload),
      onChange: (payload: any) => this.options.onChange?.(payload),
      onMetaChange: (payload: any) => this.options.onMetaChange?.(payload),
      onStatusChange: (payload: any) => this.options.onStatusChange?.(payload)
    }))
    this.app = createApp(root)
    this.app.use(ConfigProvider, { locale: zhCN })
    this.app.mount(host)
  }

  setInitialDocument(initialDocument?: DocxEditorUiInitialDocument) {
    this.state.initialDocument = initialDocument
  }

  setCollaboration(collaboration?: CollaborationOptions) {
    this.state.collaboration = collaboration
  }

  executeCommand(command: string, ...args: any[]) {
    return this.editorRef?.executeCommand?.(command, ...args)
  }

  getApi() {
    return this.editorRef?.api
  }

  static getVersion() {
    return WordEditor.version
  }

  destroy() {
    if (!this.app) return
    this.app.unmount()
    this.app = null
    this.editorRef = null
  }
}
