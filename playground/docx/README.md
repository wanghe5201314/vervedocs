# Docx Playground

Word 编辑器演示。`.docx` 导入/导出**不内置**，由宿主注入符合契约的回调。

## 契约

来自 `@vervedoc/docx` / `@vervedoc/core`：

```ts
type DocxImportCallback = (
  data: ArrayBuffer | File,
  options?: IDocxImportOptions
) => Promise<IDocxImportResult> // elements: IElement[]

type DocxExportCallback = (
  data: IEditorData | IElement[],
  options?: IDocxExportOptions
) => Promise<IDocxExportResult> // data?: ArrayBuffer
```

本地 JS、服务端或其他自定义引擎只要满足上述接口即可注入，编辑器不关心实现细节。

## 初始文档

编辑器按 `initialDocument` 加载内容（**不内置**默认文件）：

1. `content` → 直接渲染
2. `url` → 拉取 JSON
3. 皆无 → 空文档

playground 默认通过配置传入演示文件：

```ts
// src/resolve-from-location.ts
{
  meta: { id: 'local', ... },
  url: './test-output.json' // 文件位于 public/test-output.json
}
```

## 方式一：本地端 `@vervedoc/docx-parser`

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

当前 `src/main.ts` 可通过 lil-gui 在本地 / 服务端之间切换。

## 方式二：服务端 `@vervedoc/for-node`

本地部署默认端口 `1320`：

- 解析：`POST /documents/translate/word`
- 导出：`POST /documents/render?format=docx`

```ts
const importCallback: DocxImportCallback = async (data) => {
  const form = new FormData()
  form.append('file', new Blob([data]), 'import.docx')
  const resp = await fetch('http://localhost:1320/documents/translate/word', {
    method: 'POST',
    body: form
  })
  const json = await resp.json()
  if (!json.success) return { success: false, elements: [], error: json.error }
  return {
    success: true,
    elements: json.data?.elements || [],
    comments: json.data?.comments
  }
}

const exportCallback: DocxExportCallback = async (data) => {
  const resp = await fetch('http://localhost:1320/documents/render?format=docx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!resp.ok) return { success: false, error: await resp.text() }
  return { success: true, data: await resp.arrayBuffer() }
}

new WordEditor({ container: '#app', importCallback, exportCallback })
```

## 方式三：自定义引擎

只要包装成同一回调接口即可，编辑器不感知引擎类型：

```ts
const importCallback: DocxImportCallback = async (data) => {
  const buf = data instanceof File ? await data.arrayBuffer() : data
  // 调用你自己的解析引擎
  const parsed = await myEngine.parse(buf)
  return {
    success: !!parsed.success,
    elements: parsed.elements || [],
    comments: parsed.comments,
    error: parsed.error
  }
}

const exportCallback: DocxExportCallback = async (data) => {
  try {
    const ab = await myEngine.write(data)
    return { success: true, data: ab }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
```

## 开发

```bash
pnpm --filter @vervedoc/docx-playground dev
```
