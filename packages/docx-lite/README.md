# @wanghe1995/docx-editor-ui-lite

`docx-editor-ui-lite` 是 `DocxEditor` 的精简 UI 封装，提供一个开箱即用的对象式编辑器入口，既支持模块化引用，也支持构建后通过 `<script>` 单独引入。

## 适用场景

- 需要一个精简版文档编辑器 UI
- 宿主项目不是 Vue 工程，但希望像 ECharts 一样直接 `<script>` 引入使用
- 希望通过 `new WordEditor()` 或 `createEditor()` 方式挂载编辑器

## 安装

```bash
npm install @wanghe1995/docx-editor-ui-lite
```

本包依赖：

- `@wanghe1995/docx-editor-core`
- `vue`

## 构建产物

执行：

```bash
npm run build
```

会生成以下文件：

- `dist/docx-editor-lite.js`
  - ESM 模块版
- `dist/docx-editor-lite.umd.cjs`
  - UMD/CommonJS 版
- `dist/docx-editor-lite.browser.js`
  - 浏览器直出版，适合 `<script>` 单独引用

如果你问“单独引用的是哪个 js 文件”，答案就是：

```text
dist/docx-editor-lite.browser.js
```

## 模块化使用

```ts
import { WordEditor } from '@wanghe1995/docx-editor-ui-lite'

const editor = new WordEditor({
  container: '#app',
  title: '模块化示例',
  data: {
    main: [
      { value: '欢迎使用 DocxEditorLite', size: 24, bold: true },
      { value: '\n\n' },
      { value: '这是通过 npm / import 方式接入的示例。', size: 14 }
    ]
  },
  onReady(instance) {
    console.log('编辑器已就绪', instance)
  },
  onChange() {
    console.log('内容变化')
  },
  onSave(snapshot) {
    console.log('保存快照', snapshot)
  }
})

// 运行时命令调用
editor.executeCommand('executeUndo')
```

## 浏览器直接引用

### 1. 构建浏览器 bundle

```bash
npm run build
```

### 2. 页面中直接引用

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DocxEditorLite Demo</title>
  <style>
    html, body, #editor {
      width: 100%;
      height: 100%;
      margin: 0;
    }
  </style>
</head>
<body>
  <div id="editor"></div>

  <script src="./dist/docx-editor-lite.browser.js"></script>
  <script>
    const editor = window.DocxEditorLite.createEditor({
      container: '#editor',
      title: '纯 JS 示例',
      data: {
        main: [
          { value: '欢迎使用 DocxEditorLite', size: 24, bold: true },
          { value: '\n\n' },
          { value: '这是通过 script 标签直接接入的示例。', size: 14 },
          { value: '\n' },
          { value: '当前全局对象：window.DocxEditorLite', size: 14, color: '#2563eb' }
        ]
      },
      onReady(editorInstance) {
        console.log('ready', editorInstance)
        console.log('version', window.DocxEditorLite.version)
      },
      onChange() {
        console.log('change')
      },
      onSave(snapshot) {
        console.log('save', snapshot)
      }
    })

    window.editor = editor
  </script>
</body>
</html>
```

## 纯静态目录示例

如果你想做成“只有 `index.html` + `js/` 目录”的纯静态交付，可以按下面方式组织：

```text
demo/
  index.html
  js/
    docx-editor-lite.browser.js
```

对应引用方式：

```html
<script src="./js/docx-editor-lite.browser.js"></script>
```

这种方式适合双击 HTML 或放到任意静态资源服务器中使用。

## 对外 API

浏览器直出版会挂载全局对象：

```js
window.DocxEditorLite
```

包含：

- `DocxEditorLite.version`
- `DocxEditorLite.WordEditor`
- `DocxEditorLite.createEditor(options)`

## `WordEditorOptions`

```ts
interface WordEditorOptions {
  container: string | HTMLElement
  title?: string
  data?: IEditorData | IElement[]
  options?: IEditorOption
  onReady?: (editor: any) => void
  onChange?: () => void
  onPageChange?: (pageNo: number) => void
  onScaleChange?: (scale: number) => void
  onSave?: (snapshot: SaveSnapshot) => void
}
```

## `SaveSnapshot`

```ts
interface SaveSnapshot {
  meta: {
    id: string
    name: string
    createdAt: string
    submittedAt: string
  }
  content: any
}
```

## 常见使用方式

### 创建实例

```ts
const editor = new WordEditor({
  container: '#app',
  title: '新建文档',
  data: { main: [{ value: 'Hello DocxEditorLite' }] }
})
```

### 修改标题

```ts
editor.setTitle('新的标题')
```

### 执行命令

```ts
editor.executeCommand('executeUndo')
editor.executeCommand('executeRedo')
```

### 获取底层能力

```ts
const instance = editor.instance
const command = editor.command
const listener = editor.listener
```

### 销毁实例

```ts
editor.destroy()
```

## 注意事项

### 1. 浏览器直出版文件

请确认引用的是：

```text
dist/docx-editor-lite.browser.js
```

不要误用：

- `dist/docx-editor-lite.js`
- `dist/docx-editor-lite.umd.cjs`

因为这两个主要是给模块系统使用的，不是纯 `<script>` 直出场景。

### 2. 关于双击 HTML

如果你直接双击打开 HTML，请尽量使用“纯静态目录”方式：

- `index.html`
- `js/docx-editor-lite.browser.js`

不要直接双击 Vite 工程的 `index.html`，否则会遇到：

- `file:///.../src/main.ts` 加载失败
- `CORS policy` 错误
- `/favicon.ico` 404

### 3. 关于旧目录名

当前你的本地环境里同时存在：

- `docx-editor-ui-lite`
- `docx-editor-ui-Lite`

本 README 对应的是：

```text
c:\Users\12803\IdeaProjects\docx-editor-ui-lite
```

也就是已经补过浏览器 bundle 能力的这个项目。

## 开发命令

```bash
npm run dev
npm run build
npm run lint
npm run type:check
```

## License

MIT
