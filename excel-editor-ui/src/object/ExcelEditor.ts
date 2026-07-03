import { createApp, defineComponent, h, reactive } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import '@/assets/iconfont/iconfont.css'
import '@/assets/iconfont/iconfont.js'
import SheetEditorComponent from '@/components/SheetEditor.vue'
import type { ExcelLocale, ExcelI18nMessages } from '@/i18n'
import { version as PKG_VERSION } from '../../package.json'

export interface Options {
  container: string | HTMLElement
  initialContent?: any
  documentUrl?: string
  documentName?: string
  readOnly?: boolean
  locale?: ExcelLocale
  i18n?: Partial<ExcelI18nMessages>
  onReady?: (payload: any) => void
  onChange?: (payload: any) => void
  onNewDocument?: (payload: { dbPayload: any; excelPayload: { fileName: string; mimeType: string; buffer: ArrayBuffer } }) => void
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

export class ExcelEditor {
  private app: any
  private editorRef: any = null
  private state: {
    initialContent?: any
    documentUrl?: string
    documentName?: string
    readOnly?: boolean
    locale?: ExcelLocale
    i18n?: Partial<ExcelI18nMessages>
  }

  static version: string = PKG_VERSION

  constructor(private options: Options) {
    const host = resolveTarget(options.container)
    this.state = reactive({
      initialContent: options.initialContent,
      documentUrl: options.documentUrl,
      documentName: options.documentName,
      readOnly: options.readOnly,
      locale: options.locale,
      i18n: options.i18n
    })
    const root = defineComponent(() => () => h(SheetEditorComponent as any, {
      ref: (el: any) => {
        this.editorRef = el
      },
      initialContent: this.state.initialContent,
      documentUrl: this.state.documentUrl,
      documentName: this.state.documentName,
      readOnly: this.state.readOnly,
      locale: this.state.locale,
      i18n: this.state.i18n,
      onReady: (payload: any) => this.options.onReady?.(payload),
      onChange: (payload: any) => this.options.onChange?.(payload),
      onNewDocument: (payload: any) => this.options.onNewDocument?.(payload)
    }))
    this.app = createApp(root)
    for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
      this.app.component(key, component)
    }
    this.app.use(ElementPlus, { locale: zhCn })
    this.app.mount(host)
  }

  setInitialContent(initialContent?: any) {
    this.state.initialContent = initialContent
  }

  setDocumentName(documentName?: string) {
    this.state.documentName = documentName
  }

  setReadOnly(readOnly?: boolean) {
    this.state.readOnly = readOnly
  }

  setLocale(locale?: ExcelLocale) {
    this.state.locale = locale
  }

  setI18n(i18n?: Partial<ExcelI18nMessages>) {
    this.state.i18n = i18n
  }

  static getVersion() {
    return ExcelEditor.version
  }

  destroy() {
    if (!this.app) return
    this.app.unmount()
    this.app = null
    this.editorRef = null
  }
}
