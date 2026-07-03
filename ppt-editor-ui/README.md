# PPT Editor UI

## 快速开始（仅对象式接入）

```ts
import { PptEditor } from '@wanghe1995/ppt-editor-ui'

const editor = new PptEditor({
  container: '#app',
  initialContent: null,
  documentName: '示例演示文稿.pptx',
  readOnly: false,
  onChange: (content) => {
    console.log('ppt change', content)
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
  locale?: PptLocale
  i18n?: Partial<PptI18nMessages>
  onChange?: (content: { format: string; data: any }) => void
}

class PptEditor {
  constructor(options: Options)
  setContent(content: any): void
  setDocumentName(name: string): void
  setReadOnly(readOnly: boolean): void
  destroy(): void
}
```

## 说明

- 统一采用 `new PptEditor(...)` 接入。
- 宿主负责数据请求与持久化；编辑器仅负责渲染与变更回调。
