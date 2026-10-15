<div align="center">

<h1>玉衡云文档</h1>

<p><sub>VerveDocs DOCX Editor</sub></p>

<p><strong>把完整的 Word 编辑体验嵌入你的 Vue 应用</strong></p>

<p>
  <a href="https://www.npmjs.com/package/@vervedoc/docx"><img src="https://img.shields.io/npm/v/%40vervedoc%2Fdocx?label=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@vervedoc/docx"><img src="https://img.shields.io/npm/l/%40vervedoc%2Fdocx" alt="license"></a>
  <a href="https://vuejs.org/"><img src="https://img.shields.io/badge/Vue-3-42b883?logo=vuedotjs&logoColor=white" alt="Vue 3"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-%3E%3D16.9.1-339933?logo=nodedotjs&logoColor=white" alt="Node.js version"></a>
</p>

<p>
  <a href="#功能概览">功能概览</a> ·
  <a href="#安装">安装</a> ·
  <a href="#快速开始">快速开始</a> ·
  <a href="#docx-转换">DOCX 转换</a> ·
  <a href="#文档保存">文档保存</a> ·
  <a href="#wordeditor-api">API</a>
</p>

</div>

---

`@vervedoc/docx` 是基于 Vue 3 的完整 Word 编辑器 UI。通过一个 `WordEditor` 实例，即可在 Web 页面中提供文档编辑、页面布局、表格、批注、修订、搜索等常用能力。

## 功能概览

| 编辑与排版 | 文档协作 | 宿主集成 |
| --- | --- | --- |
| Canvas 文档编辑与分页视图 | 批注与修订工作流 | JSON 内容、远程 URL 或空白文档启动 |
| 文本格式、段落、表格与页面布局 | 实时协作配置与在线状态 | DOCX 导入/导出回调 |
| 图片、公式、目录、书签与搜索 | AI 辅助编辑入口 | 文档保存 API 与生命周期回调 |
| 多语言界面与编辑器命令 | 可扩展的插件能力 | 可嵌入现有 Vue 应用 |

## 职责边界

```text
你的 Vue 应用
    └── @vervedoc/docx        完整编辑器 UI
          └── @vervedoc/core  文档模型、排版与 Canvas 编辑引擎
```

DOCX 文件转换和业务数据持久化由宿主应用决定。可接入本地解析器、服务端转换服务或自定义 API；编辑器本身不绑定特定后端。

## 安装

```bash
pnpm add @vervedoc/docx vue @vervedoc/design @vervedoc/ui
```

协作功能按需安装 `@vervedoc/docx-editor-collaboration`。请使用与当前 `@vervedoc/docx` 兼容的 peer dependency 版本。

## 快速开始

```ts
import { WordEditor } from '@vervedoc/docx'
import '@vervedoc/docx/style.css'

const editor = new WordEditor({
  container: '#editor',
  initialDocument: {
    meta: {
      id: 'demo',
      path: '/documents/demo',
      status: 'edit',
      name: '示例文档'
    },
    format: 'canvas',
    content: {
      main: [{ type: 'text', value: '开始编辑' }],
      header: [],
      footer: []
    }
  },
  onReady: () => console.log('编辑器已就绪'),
  onChange: ({ content }) => console.log('文档内容已更新', content)
})

// 离开页面时释放编辑器及其 Vue 应用
editor.destroy()
```

`container` 支持 CSS 选择器或 `HTMLElement`。`initialDocument.meta` 必须提供；内容加载顺序为 `content` → `url` → 空白文档。

> `initialDocument.content` 使用 `{ main, header?, footer? }` 数据形态，与 `@vervedoc/core` 构造函数使用的 `IDocxDocumentMeta` 不同。

## DOCX 转换

转换器通过回调注入。未提供回调时，编辑器不会执行 `.docx` 文件导入或导出。

```bash
pnpm add @vervedoc/docx-parser
```

```ts
import { WordEditor } from '@vervedoc/docx'
import {
  createDocxImportCallback,
  createDocxExportCallback
} from '@vervedoc/docx-parser'

const editor = new WordEditor({
  container: '#editor',
  initialDocument: {
    meta: { id: 'demo', path: '/documents/demo', status: 'edit' },
    content: { main: [], header: [], footer: [] }
  },
  importCallback: createDocxImportCallback(),
  exportCallback: createDocxExportCallback()
})
```

也可以实现自己的 `DocxImportCallback` / `DocxExportCallback`，将转换请求发送到服务端或其他文档引擎。编辑器对转换实现保持无关。

## 文档保存

内容变化和保存操作会通过回调交给宿主处理。默认 HTTP API 可用于约定的后端接口，也可以注入自定义 `DocumentApi`：

```ts
import {
  createDefaultDocumentApi,
  setDocumentApi
} from '@vervedoc/docx'

setDocumentApi(createDefaultDocumentApi())
```

默认内容保存端点为 `PUT /api/documents/{id}/content`，请求体为 `{ meta, content }`。基地址从 `VITE_DOCUMENT_API_BASE_URL` 或 `VITE_API_BASE_URL` 读取；自动保存策略和实际持久化时机由宿主应用控制。

## `WordEditor` API

| API | 说明 |
| --- | --- |
| `new WordEditor(options)` | 创建并挂载编辑器 |
| `setInitialDocument(document)` | 更新初始文档 |
| `setCollaboration(options)` | 更新协作配置 |
| `executeCommand(name, ...args)` | 执行编辑器命令 |
| `getApi()` | 获取编辑器对外 API |
| `destroy()` | 卸载编辑器并清理资源 |

`Options` 还支持 `importCallback`、`exportCallback`、`locale`，以及 `onReady`、`onChange`、`onMetaChange`、`onStatusChange` 回调。完整类型包括 `Options`、`DocxEditorUiInitialDocument` 和 `CollaborationOptions`。

## 国际化

默认界面语言为简体中文。可通过 `locale` 设置初始语言；包同时导出 `setLocale`、`getLocale`、`setOverrides` 和 `registerLangMap` 等国际化 API。

## 相关包

| 包 | 用途 |
| --- | --- |
| `@vervedoc/core` | Canvas 编辑器核心与文档模型 |
| `@vervedoc/docx-parser` | 本地 JavaScript DOCX 导入/导出适配器 |
| `@vervedoc/docx-editor-collaboration` | 可选实时协作能力 |

## 本地开发

```bash
pnpm --filter @vervedoc/docx build
pnpm --filter @vervedoc/docx-playground dev
```

## 许可证

MIT
