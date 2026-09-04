# @vervedoc/docx-parser

本地 JS 实现的 `.docx` 导入 / 导出。独立发布，不依赖 `@vervedoc/docx` / `@vervedoc/docx-lite`。

本包是契约的一种实现；服务端或其他自定义引擎只要满足同一接口即可替换。

## 安装

```bash
npm install @vervedoc/docx-parser
```

## 契约

| 方向 | 回调类型 | 形状 |
|------|----------|------|
| 导入 | `DocxImportCallback` | `(ArrayBuffer \| File, options?: IDocxParseOptions) => Promise<IDocxParseResult>` |
| 导出 | `DocxExportCallback` | `(IEditorData \| IElement[], options?: IDocxExportOptions) => Promise<IDocxExportResult>` |

返回值：

- 导入：`{ success, elements, comments?, html?, error? }`
- 导出：`{ success, data?: ArrayBuffer, error? }`

## 用法

单独转换：

```ts
import { parseDocx, writeDocx } from '@vervedoc/docx-parser'

const imported = await parseDocx(file)
if (!imported.success) throw new Error(imported.error)

const exported = await writeDocx(imported.elements)
if (!exported.success) throw new Error(exported.error)
```

注入编辑器（需同时安装 `@vervedoc/docx` 或 `@vervedoc/docx-lite`）。工厂函数可传入默认 options，调用时再传入的 options 会覆盖默认值：

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
