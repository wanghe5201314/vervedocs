# Excel Editor UI

## 快速开始（仅对象式接入）

```ts
import { ExcelEditor } from '@wanghe1995/excel-editor-ui'

const editor = new ExcelEditor({
  container: '#app',
  initialContent: null,
  documentName: '示例表格.xlsx',
  readOnly: false,
  onChange: (content) => {
    console.log('excel change', content)
  }
})
```

## 对外 API（仅对象式）

```ts
interface Options {
  container: string | HTMLElement
  initialContent?: any
  documentName?: string
  readOnly?: boolean
  locale?: ExcelLocale
  i18n?: Partial<ExcelI18nMessages>
  /** xlsx → IWorkbook，默认 @vervedoc/excel-parser */
  importCallback?: ExcelImportCallback
  /** IWorkbook → xlsx，默认 @vervedoc/excel-parser */
  exportCallback?: ExcelExportCallback
  onChange?: (content: any) => void
}

class ExcelEditor {
  constructor(options: Options)
  setContent(content: any): void
  setDocumentName(name: string): void
  setReadOnly(readOnly: boolean): void
  destroy(): void
}
```

## 说明

- 统一采用 `new ExcelEditor(...)` 接入。
- 宿主负责数据请求与持久化；编辑器仅负责渲染与变更回调。
- `.xlsx` 导入/导出由 `@vervedoc/excel-parser` 提供（可通过 `importCallback` / `exportCallback` 替换）。
