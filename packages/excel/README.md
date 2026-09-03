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
  readOnly?: boolean
  locale?: ExcelLocale
  i18n?: Partial<ExcelI18nMessages>
  /** xlsx → IWorkbook；未注入则导入不可用 */
  importCallback?: ExcelImportCallback
  /** IWorkbook → xlsx；未注入则导出不可用 */
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
- `@vervedoc/excel-parser` 是可选 peer，与编辑器独立发布。
