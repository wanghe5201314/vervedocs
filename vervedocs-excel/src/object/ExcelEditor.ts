import { createApp, defineAsyncComponent, defineComponent, h, reactive } from 'vue'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import '@/assets/iconfont/iconfont.css'
import '@/assets/iconfont/iconfont.js'
import type { ExcelLocale, ExcelI18nMessages } from '@/i18n'
import type { SheetDocumentApi, AuthTokenProvider, SheetRequestConfig } from '@/api/sheet.api'
import {
  setSheetDocumentApi,
  setAuthProvider as setSheetAuthProvider,
  setSheetRequestConfig,
  createHttpSheetDocumentApi,
  getSheetApiBaseUrl,
} from '@/api/sheet.api'
import { version as PKG_VERSION } from '../../package.json'

const SheetEditorComponent = defineAsyncComponent(() => import('@/components/SheetEditor.vue'))

export interface Options {
  container: string | HTMLElement
  initialContent?: any
  documentUrl?: string
  documentName?: string
  readOnly?: boolean
  locale?: ExcelLocale
  i18n?: Partial<ExcelI18nMessages>
  apiBaseUrl?: string
  authToken?: string
  authTokenGetter?: AuthTokenProvider
  sheetApi?: SheetDocumentApi
  requestConfig?: SheetRequestConfig
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
    if (options.sheetApi) {
      setSheetDocumentApi(options.sheetApi)
    }
    if (options.authTokenGetter) {
      setSheetAuthProvider(options.authTokenGetter)
    } else if (options.authToken) {
      setSheetAuthProvider(() => options.authToken)
    }
    if (options.requestConfig) {
      setSheetRequestConfig(options.requestConfig)
    } else if (options.apiBaseUrl) {
      setSheetRequestConfig({ baseUrl: options.apiBaseUrl })
    }

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
    this.app.use(Antd, { locale: zhCN })
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

  static setApi(api: SheetDocumentApi) {
    setSheetDocumentApi(api)
  }

  static setAuthProvider(provider: AuthTokenProvider | null) {
    setSheetAuthProvider(provider)
  }

  static setRequestConfig(config: SheetRequestConfig | null) {
    setSheetRequestConfig(config)
  }

  static createHttpApi(baseUrl: string): SheetDocumentApi {
    return createHttpSheetDocumentApi(baseUrl)
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
