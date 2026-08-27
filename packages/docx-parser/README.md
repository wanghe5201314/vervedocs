# @vervedoc/docx-parser

本地 JS 实现的 `.docx` 导入 / 导出，符合 `@vervedoc/core` 的钩子契约。

## 契约

| 方向 | 回调类型 | 形状 |
|------|----------|------|
| 导入 | `DocxImportCallback` | `(ArrayBuffer \| File) => Promise<IDocxImportResult>` |
| 导出 | `DocxExportCallback` | `(IEditorData \| IElement[]) => Promise<IDocxExportResult>` |

本包是契约的一种实现；服务端或其他自定义引擎只要满足同一接口即可替换。

## 用法

```ts
import { WordEditor } from '@vervedoc/docx'
import {
  createDocxImportCallback,
  createDocxExportCallback
} from '@vervedoc/docx-parser'

new WordEditor({
  container: '#app',
  importCallback: createDocxImportCallback(),
  exportCallback: createDocxExportCallback()
})
```

也可直接使用底层 API：

```ts
import { parseDocx, writeDocx } from '@vervedoc/docx-parser'

const imported = await parseDocx(file)
const exported = await writeDocx(editorData)
```
