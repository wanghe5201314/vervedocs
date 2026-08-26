# DocxEditor UI

<div align="center">

**功能完整的在线协作文档编辑器 UI 组件库**

[![npm version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://www.npmjs.com/package/@wanghe1995/docx-editor-ui)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Vue](https://img.shields.io/badge/Vue-3.5.27-green.svg)](https://vuejs.org/)
[![Element Plus](https://img.shields.io/badge/Element%20Plus-2.13.1-blue.svg)](https://element-plus.org/)

</div>

---

## 📖 项目简介

DocxEditor UI 是一款基于 Vue 3 + Element Plus 构建的现代化文档编辑器 UI 组件库，提供类似 Microsoft Word 的完整编辑体验。它与 `@wanghe1995/docx-editor-core` 核心编辑器无缝集成，支持多人实时协作、AI 智能编辑、图表可视化等高级功能。

### ✨ 核心特性

- 🎨 **完整 UI 界面** - 提供工具栏、侧边栏、对话框、覆盖层等完整编辑器界面组件
- 👥 **实时协作** - 基于 Yjs CRDT + Hocuspocus 实现多人协同编辑
- 🤖 **AI 智能编辑** - 支持选中内容的智能修改、润色、翻译等功能
- 📊 **图表可视化** - 内置 ECharts 图表组件，支持多种图表类型插入与编辑
- 🔒 **文档保护** - 支持密码保护文档，防止未授权编辑
- 📱 **响应式设计** - 适配不同屏幕尺寸，支持移动端使用
- 🌙 **主题切换** - 支持亮色/暗色主题切换
- 🛠️ **丰富组件** - 提供代码块、视频播放、二维码生成等多种实用组件

## 🏗️ 技术架构

### 核心技术栈

- **框架**: Vue 3.5.27 + TypeScript 4.9.5
- **UI 组件库**: Element Plus 2.13.1
- **图标**: Element Plus Icons, Material Design Icons
- **构建工具**: Vite 5.4.10
- **样式方案**: vite-plugin-css-injected-by-js (CSS 内联注入)

### 依赖库

- **核心编辑器**: [@wanghe1995/docx-editor-core](../docx-editor-core) ^1.0.12
- **AI 插件**: [@wanghe1995/docx-editor-ai](../docx-editor-libs/docx-editor-ai) ^1.0.1
- **协同编辑**: [@wanghe1995/docx-editor-collaboration](../docx-editor-libs/docx-editor-collaboration) ^1.0.0
- **图表**: [@wanghe1995/docx-editor-chart](../docx-editor-libs/docx-editor-chart)
- **文档处理**: docx ^9.5.1
- **代码高亮**: PrismJS 1.30.0
- **视频播放**: Plyr ^3.7.8
- **二维码**: qrcode ^1.5.4
- **压缩工具**: JSZip ^3.10.1

## 📦 安装

### npm 安装

```bash
npm install @wanghe1995/docx-editor-ui element-plus @element-plus/icons-vue prismjs vue
```

### yarn 安装

```bash
yarn add @wanghe1995/docx-editor-ui element-plus @element-plus/icons-vue prismjs vue
```

### pnpm 安装

```bash
pnpm add @wanghe1995/docx-editor-ui element-plus @element-plus/icons-vue prismjs vue
```

## 🚀 快速开始（仅对象式接入）

```ts
import { WordEditor, type DocxEditorUiInitialDocument, type CollaborationOptions } from '@wanghe1995/docx-editor-ui'

const initialDocument: DocxEditorUiInitialDocument = {
  meta: {
    id: 'doc-123',
    path: '/demo/doc-123.docx',
    status: 'edit',
    name: '示例文档.docx'
  },
  format: 'canvas',
  content: { main: [] }
}

const collaboration: CollaborationOptions = {
  serverUrl: 'ws://127.0.0.1:1234',
  docId: 'doc-123',
  user: { userId: 'user-001', userName: '张三', color: '#4CAF50' }
}

const editor = new WordEditor({
  container: '#app',
  initialDocument,
  collaboration,
  onReady: () => console.log('ready'),
  onChange: (payload) => console.log('change', payload),
  onMetaChange: (payload) => console.log('meta', payload),
  onStatusChange: (payload) => console.log('status', payload)
})
```

## ⚙️ 对外 API（仅对象式）

### Options

```ts
interface Options {
  container: string | HTMLElement
  initialDocument?: DocxEditorUiInitialDocument
  collaboration?: CollaborationOptions
  onReady?: (payload: any) => void
  onChange?: (payload: { content: any; meta: any; raw: any }) => void
  onMetaChange?: (payload: any) => void
  onStatusChange?: (payload: any) => void
}
```

### WordEditor

```ts
class WordEditor {
  constructor(options: Options)
  setInitialDocument(initialDocument?: DocxEditorUiInitialDocument): void
  setCollaboration(collaboration?: CollaborationOptions): void
  executeCommand(command: string, ...args: any[]): any
  getApi(): any
  destroy(): void
}
```

## 🔧 开发命令

```bash
pnpm build
pnpm lint
```

## 📌 说明

- 文档内容请求与保存由宿主项目负责。
- 编辑器实例只负责渲染、命令执行与事件回传。
- 本包不再提供组件式公开接入说明，统一采用对象式接入。

### 由于作者业余搞开源，遇到问题或者有想要的功能需求，欢迎提 issue 或 PR。
### 当前版本属于免费可用版本，没有任何使用限制，但不排除有一些BUG(没有进行完整测试)，有问题及时反馈，作者看到后会第一时间回复。
