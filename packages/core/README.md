<div align="center">

<h1>玉衡云文档 · Core</h1>

<p><code>@vervedoc/core</code></p>

<p>
  <a href="https://www.npmjs.com/package/@vervedoc/core"><img src="https://img.shields.io/npm/v/%40vervedoc%2Fcore?label=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@vervedoc/core"><img src="https://img.shields.io/npm/l/%40vervedoc%2Fcore" alt="license"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-%3E%3D16-339933?logo=nodedotjs&logoColor=white" alt="Node.js version"></a>
</p>

<p>Canvas 文档编辑引擎 · 文档模型、排版与交互</p>

</div>

---

`@vervedoc/core` 是玉衡云文档的编辑器核心，负责文档树管理、排版布局、Canvas 绘制、选区与命令分发、历史记录、快捷键、目录及搜索。它不包含完整工具栏 UI，也不负责 DOCX 文件转换或远端存储。

<p align="center">
  <a href="#快速开始">快速开始</a> ·
  <a href="#文档模型">文档模型</a> ·
  <a href="#命令与状态">命令与状态</a> ·
  <a href="#插件">插件</a> ·
  <a href="#选项">选项</a> ·
  <a href="#包结构">包结构</a>
</p>

如果需要带工具栏和对话框的完整 Vue 编辑器，请使用 [`@vervedoc/docx`](../docx/README.md)。直接使用本包适合需要自行构建界面或集成核心编辑能力的项目。

## 安装

```bash
pnpm add @vervedoc/core
```

## 快速开始

```ts
import DocxEditor from '@vervedoc/core'

const container = document.querySelector<HTMLDivElement>('#editor')
if (!container) throw new Error('找不到编辑器容器')

const editor = new DocxEditor(
  container,
  {
    success: true,
    elements: [
      {
        type: 'title',
        value: '',
        level: 'first',
        valueList: [{ type: 'text', value: '示例文档' }]
      },
      { type: 'text', value: '这是使用 VerveDocs Core 创建的文档。' }
    ]
  },
  {
    pageMode: 'paging',
    defaultFont: '宋体',
    defaultSize: 12
  }
)

editor.command.executeInsertText('继续输入内容')
editor.command.executeSetBold()

// 页面卸载时释放 Canvas、Worker、事件和插件资源
editor.destroy()
```

构造函数签名为 `new DocxEditor(container, document, options?)`。`container` 必须是 `HTMLDivElement`；文档必须是 `IDocxDocumentMeta`，至少提供 `elements` 数组。旧版的 `IElement[]` 或 `{ main: [...] }` 文档形态不再作为构造参数接受。

## 文档模型

`IDocxDocumentMeta` 表示完整文档元数据，正文放在 `elements` 中。模型还可包含页眉页脚、分节、样式表、编号、主题、批注和书签等数据。

```ts
import type { IDocxDocumentMeta, IElement } from '@vervedoc/core'

const paragraph: IElement = {
  type: 'text',
  value: '正文文本',
  bold: true,
  size: 12
}

const document: IDocxDocumentMeta = {
  success: true,
  elements: [paragraph],
  meta: { title: '设计说明', author: '作者' }
}
```

元素和样式的完整定义由 `@vervedoc/docx-editor-schema` 提供，并从 `@vervedoc/core` 透出。

## 命令与状态

常用操作通过 `editor.command` 执行：

```ts
editor.command.executeSetBold()
editor.command.executeSetFont('宋体')
editor.command.executeSetSize(14)
editor.command.executeInsertText('新增文本')
editor.command.executeUndo()
editor.command.executeRedo()

const documentState = editor.getDocument()
```

`command` 提供编辑、格式、表格、页面、书签等命令；`listener` 用于订阅内容、选区、页面、能力和生命周期变化；`eventBus` 用于编辑器交互事件；`range` 暴露选区管理能力。命令与事件的完整类型可从包入口和 schema 类型中查询。

## 插件

核心通过 `EditorPlugin` 契约接收可选插件。插件在 `editor.use()` 时安装，编辑器销毁时会调用插件的 `destroy()`。

```ts
import DocxEditor from '@vervedoc/core'
import { createCommentPlugin } from '@vervedoc/docx-editor-comment'

const editor = new DocxEditor(container, {
  success: true,
  elements: []
})

const comments = createCommentPlugin()
editor.use(comments)

// 批注插件提供的扩展 API
comments.add('当前用户')
console.log(comments.getAll())
```

`editor.getPlugin(name)` 可获取已注册插件。可选插件包括批注/修订和图表等；各插件包的安装方式及依赖请查看对应 README。AI 与协作扩展有各自的配置和生命周期 API，不应假定它们都使用相同的插件对象接口。

## 导入与导出

Core 只定义文档模型，不内置 DOCX 解析器或生成器。`DocxImportCallback`、`DocxExportCallback` 是供宿主层使用的类型；可以使用 `@vervedoc/docx-parser`、服务端转换服务或自定义实现。

## 选项

`IEditorOption` 常用字段包括：

- `readonly`、`disabled`：限制编辑能力。
- `pageMode`：`paging` 分页或 `continuity` 连续布局。
- `pageWidth`、`pageHeight`、`pageMargins`、`scale`：页面尺寸与显示设置。
- `defaultFont`、`defaultSize`、`defaultLineHeight`：默认排版设置。
- `trackChanges`、`revisionAuthor`：修订记录相关设置。
- `locale`：编辑器语言。

页面单位及其他详细选项以导出的 `IEditorOption` 类型为准。

## 包结构

独立子包用于拆分编辑器内部职责，也可以在高级集成中单独使用：

| 包 | 职责 |
| --- | --- |
| `@vervedoc/docx-editor-schema` | 文档树、类型、常量和纯数据工具 |
| `@vervedoc/docx-editor-state` | 事件总线、监听器和选区状态 |
| `@vervedoc/docx-editor-transform` | 命令门面与文档变换 |
| `@vervedoc/docx-editor-view` | 布局、Canvas 绘制和命中测试 |
| `@vervedoc/docx-editor-commands` | 搜索、控件、日期、公式和块级命令组件 |
| `@vervedoc/docx-editor-history` | 快照历史管理 |
| `@vervedoc/docx-editor-keymap` | 键盘快捷键处理 |

大多数应用应直接依赖 `@vervedoc/core`，避免自行组装底层模块造成版本或生命周期不一致。

## 开发

```bash
pnpm --filter @vervedoc/core type:check
pnpm --filter @vervedoc/core build
```

## 许可

MIT
