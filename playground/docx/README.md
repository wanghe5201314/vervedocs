# Docx Playground

Word 编辑器演示。`.docx` 导入/导出与文档保存**不内置**，由宿主注入符合契约的回调。

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

## 保存与自动保存

持久化**不内置**，由宿主通过两个回调接入。Save 存的是 **JSON snapshot**（`IEditorResult` + 可选 comments/revisions），不是 `.docx` Buffer。

### 手动保存（`onStatusChange`）

用户 Ctrl+S、工具栏「保存」或 `window.docxEditorUI.document.save()` 都会触发：

```ts
onStatusChange: async ({ command, args }) => {
  if (command !== 'save') return

  const { silent, snapshot } = args[0]
  // snapshot: { meta, content }
  // silent: true=自动保存，false=手动保存

  await documentApi.saveDocument({
    meta: snapshot.meta,
    content: snapshot.content
  })
}
```

也可监听全局 API：

```ts
window.docxEditorUI.on('statusChange', handler)
```

### 自动保存（`onChange` + 静默 save）

编辑器内部不会自动调 API，需在 `onChange` 里 debounce 后触发静默保存：

```ts
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null

new WordEditor({
  // ...
  onChange: () => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
    autoSaveTimer = setTimeout(() => {
      void window.docxEditorUI?.document?.save({ silent: true })
    }, 800)
  },
  onStatusChange: async ({ command, args }) => {
    if (command !== 'save') return
    const { silent, snapshot } = args[0]
    await createDefaultDocumentApi().saveDocument({
      meta: snapshot.meta,
      content: snapshot.content
    })
    console.log(silent ? '自动保存成功' : '手动保存成功')
  }
})
```

流程：`onChange`（内容变更）→ debounce → `document.save({ silent: true })` → `onStatusChange`（落库）。

### DocumentApi

playground 注入默认 HTTP 实现，请求体为 `JSON.stringify({ meta, content })`：

```ts
import { setDocumentApi, createDefaultDocumentApi } from '@vervedoc/docx'

setDocumentApi(createDefaultDocumentApi())
// PUT /api/documents/{id}/content
// meta.id === 'local' 时跳过网络请求
```

## 初始文档

编辑器按 `initialDocument` 加载内容（**不内置**默认文件）：

1. `content` → 直接渲染
2. `url` → 拉取 JSON
3. 皆无 → 空文档

playground 默认通过配置传入演示文件：


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
