# Excel Editor UI

## 快速开始（仅对象式接入）

```ts
import { ExcelEditor } from '@vervedoc/excel'
import {
  createExcelImportCallback,
  createExcelExportCallback
} from '@vervedoc/excel-parser'

const editor = new ExcelEditor({
  container: '#app',
  initialContent: null,
  readOnly: false,
  importCallback: createExcelImportCallback(),
  exportCallback: createExcelExportCallback(),
  onChange: (content) => {
    console.log('excel change', content)
  }
})
editor.setDocumentName('示例表格.xlsx')
```

`.xlsx` 导入/导出由宿主注入的 `importCallback` / `exportCallback` 完成。未注入时对应功能不可用。本地 JS 实现见 `@vervedoc/excel-parser`。

## 对外 API（仅对象式）

```ts
interface Options {
  container: string | HTMLElement
  initialContent?: any
  documentUrl?: string
  collaboration?: ExcelCollaborationConfig
  readOnly?: boolean
  locale?: ExcelLocale
  i18n?: Partial<ExcelI18nMessages>
  apiBaseUrl?: string
  authToken?: string
  authTokenGetter?: AuthTokenProvider
  sheetApi?: SheetDocumentApi
  requestConfig?: SheetRequestConfig
  /** xlsx → IWorkbook；未注入则导入不可用 */
  importCallback?: ExcelImportCallback
  /** IWorkbook → xlsx；未注入则导出不可用 */
  exportCallback?: ExcelExportCallback
  onReady?: (payload: any) => void
  onChange?: (payload: any) => void
  onNewDocument?: (payload: any) => void
  onCollabConnectionChange?: (payload: { state: string }) => void
  onCollabSyncStateChange?: (payload: { state: string }) => void
  onCollabUsersChange?: (payload: UserInfo[]) => void
  onCollabError?: (payload: { code: string; message: string }) => void
}

class ExcelEditor {
  constructor(options: Options)
  setInitialContent(content?: any): void
  setDocumentName(name?: string): void
  setCollaboration(collaboration?: ExcelCollaborationConfig): void
  setReadOnly(readOnly?: boolean): void
  setLocale(locale?: ExcelLocale): void
  setI18n(i18n?: Partial<ExcelI18nMessages>): void
  destroy(): void

  static setApi(api: SheetDocumentApi): void
  static setAuthProvider(provider: AuthTokenProvider | null): void
  static setRequestConfig(config: SheetRequestConfig | null): void
  static createHttpApi(baseUrl: string): SheetDocumentApi
  static getVersion(): string
}
```

## 说明

- 统一采用 `new ExcelEditor(...)` 接入。
- 宿主负责数据请求与持久化；编辑器仅负责渲染与变更回调。
- `@vervedoc/excel-parser` 是可选 peer，与编辑器独立发布。
