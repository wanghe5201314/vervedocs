<div align="center">

<h1>玉衡云文档 · Charts</h1>

<p><code>@vervedoc/docx-editor-chart</code></p>

<p>
  <a href="https://www.npmjs.com/package/@vervedoc/docx-editor-chart"><img src="https://img.shields.io/npm/v/%40vervedoc%2Fdocx-editor-chart?label=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@vervedoc/docx-editor-chart"><img src="https://img.shields.io/npm/l/%40vervedoc%2Fdocx-editor-chart" alt="license"></a>
  <a href="https://www.chartjs.org/"><img src="https://img.shields.io/badge/Chart.js-4-ff6384?logo=chartdotjs&logoColor=white" alt="Chart.js 4"></a>
</p>

<p>从表格生成图表 · 图表配置与文档嵌入</p>

</div>

---

使用 Chart.js 将图表绘制为图片并嵌入文档。插件提供图表插入/编辑对话框，可从编辑器表格读取数据并生成图表配置。

## 安装

```bash
pnpm add @vervedoc/core @vervedoc/docx-editor-chart chart.js
```

Chart.js 4 是本插件声明的 peer dependency。

## 使用

```ts
import DocxEditor from '@vervedoc/core'
import { createChartPlugin } from '@vervedoc/docx-editor-chart'

const editor = new DocxEditor(container, {
  success: true,
  elements: []
})

const chartPlugin = createChartPlugin()
editor.use(chartPlugin)

// 可通过插件对象打开图表对话框
chartPlugin.openDialog()
```

用户可在对话框中选择图表类型、配置显示选项并插入图表。插件也处理图表点击后的编辑流程。插件卸载和渲染器清理由 `editor.destroy()` 触发。

## 导出

- `createChartPlugin(options?)`：创建可注册到 Core 的 `EditorPlugin`。
- `ChartJsRenderer`：实现图表渲染、图表选项生成和表格数据提取。
- `ChartPlugin`：包含 `getRenderer()` 与 `openDialog()` 的插件类型。

`createChartPlugin` 的可选 `chart` 参数用于传入兼容的 Chart.js 构造器。默认使用包内已注册所需控制器与比例尺的 Chart.js 实例。

## 集成说明

- 图表数据以文档中的图表元素保存；实际绘制结果为 PNG Data URL。
- 表格数据提取和类型转换可通过 `ChartJsRenderer` 提供的方法完成。
- 图表插件依赖 Core 的 `PluginHost` 图表接口，不应单独实例化 `ChartJsRenderer` 来替代插件注册。

## 开发

```bash
pnpm --filter @vervedoc/docx-editor-chart type:check
pnpm --filter @vervedoc/docx-editor-chart build
```

## 许可

MIT
