import { createApp, defineAsyncComponent, defineComponent, h, reactive, type App, type ComponentPublicInstance } from 'vue'
import 'ant-design-vue/dist/reset.css'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import { ConfigProvider } from 'ant-design-vue'
import '@/assets/iconfont/iconfont.css'
import '@/assets/iconfont/iconfont.js'
import type { ExcelLocale, ExcelI18nMessages } from '@/i18n'
import type { SheetDocumentApi, AuthTokenProvider, SheetRequestConfig } from '@/api/sheet.api'
import type { ExcelCollaborationConfig, UserInfo } from '@vervedoc/docx-editor-collaboration'
import type { ExcelExportCallback, ExcelImportCallback } from '@vervedoc/excel-parser'
import {
  createExcelExportCallback,
  createExcelImportCallback,
} from '@vervedoc/excel-parser'
import {
  setSheetDocumentApi,
  setAuthProvider as setSheetAuthProvider,
  setSheetRequestConfig,
  createHttpSheetDocumentApi,
} from '@/api/sheet.api'
import { version as PKG_VERSION } from '../../package.json'

const SheetEditorComponent = defineAsyncComponent(() => import('@/components/SheetEditor.vue'))

export interface Options {
  container: string | HTMLElement
  initialContent?: any
  documentUrl?: string
  documentName?: string
  collaboration?: ExcelCollaborationConfig
  readOnly?: boolean
  locale?: ExcelLocale
  i18n?: Partial<ExcelI18nMessages>
  apiBaseUrl?: string
  authToken?: string
  authTokenGetter?: AuthTokenProvider
  sheetApi?: SheetDocumentApi
  requestConfig?: SheetRequestConfig
  /** xlsx → IWorkbook，默认使用 @vervedoc/excel-parser */
  importCallback?: ExcelImportCallback
  /** IWorkbook → xlsx，默认使用 @vervedoc/excel-parser */
  exportCallback?: ExcelExportCallback
  onReady?: (payload: any) => void
  onChange?: (payload: any) => void
  onNewDocument?: (payload: { dbPayload: any; excelPayload: { fileName: string; mimeType: string; buffer: ArrayBuffer } }) => void
  onCollabConnectionChange?: (payload: { state: string }) => void
  onCollabSyncStateChange?: (payload: { state: string }) => void
  onCollabUsersChange?: (payload: UserInfo[]) => void
  onCollabError?: (payload: { code: string; message: string }) => void
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

const normalizeCollaborationOptions = (
  input?: ExcelCollaborationConfig,
  fallbackDocId?: string,
): ExcelCollaborationConfig | undefined => {
  if (!input) return undefined

  const source = input as Partial<ExcelCollaborationConfig>
  const serverUrl = String(source.serverUrl || '').trim() || 'ws://127.0.0.1:1234'
  const docId = String(source.docId || '').trim() || String(fallbackDocId || '').trim() || 'local'
  const user = (source.user || {}) as Partial<UserInfo>
  const userId = String(user.userId || '').trim() || `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const userName = String(user.userName || '').trim() || '当前用户'
  const color = String(user.color || '').trim() || `hsl(${Math.floor(Math.random() * 360)}, 70%, 55%)`

  return {
    ...source,
    serverUrl,
    docId,
    user: {
      userId,
      userName,
      color,
    },
  } as ExcelCollaborationConfig
}

export class ExcelEditor {
  private app: App<Element> | null = null
  private editorRef: ComponentPublicInstance | null = null
  private state: {
    initialContent?: any
    documentUrl?: string
    documentName?: string
    collaboration?: ExcelCollaborationConfig
    readOnly?: boolean
    locale?: ExcelLocale
    i18n?: Partial<ExcelI18nMessages>
    importCallback: ExcelImportCallback
    exportCallback: ExcelExportCallback
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
      collaboration: normalizeCollaborationOptions(options.collaboration, options.documentName),
      readOnly: options.readOnly,
      locale: options.locale,
      i18n: options.i18n,
      importCallback: options.importCallback ?? createExcelImportCallback(),
      exportCallback: options.exportCallback ?? createExcelExportCallback(),
    })
    const root = defineComponent(() => () => h(SheetEditorComponent as any, {
      ref: (el: any) => {
        this.editorRef = el
      },
      initialContent: this.state.initialContent,
      documentUrl: this.state.documentUrl,
      documentName: this.state.documentName,
      collaboration: this.state.collaboration,
      readOnly: this.state.readOnly,
      locale: this.state.locale,
      i18n: this.state.i18n,
      importCallback: this.state.importCallback,
      exportCallback: this.state.exportCallback,
      onReady: (payload: any) => this.options.onReady?.(payload),
      onChange: (payload: any) => this.options.onChange?.(payload),
      onNewDocument: (payload: any) => this.options.onNewDocument?.(payload),
      onCollabConnectionChange: (payload: any) => this.options.onCollabConnectionChange?.(payload),
      onCollabSyncStateChange: (payload: any) => this.options.onCollabSyncStateChange?.(payload),
      onCollabUsersChange: (payload: any) => this.options.onCollabUsersChange?.(payload),
      onCollabError: (payload: any) => this.options.onCollabError?.(payload)
    }))
    this.app = createApp(root)
    this.app.use(ConfigProvider, { locale: zhCN })
    this.app.mount(host)
  }

  setInitialContent(initialContent?: any) {
    this.state.initialContent = initialContent
  }

  setDocumentName(documentName?: string) {
    this.state.documentName = documentName
  }

  setCollaboration(collaboration?: ExcelCollaborationConfig) {
    this.state.collaboration = normalizeCollaborationOptions(collaboration, this.state.documentName)
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
