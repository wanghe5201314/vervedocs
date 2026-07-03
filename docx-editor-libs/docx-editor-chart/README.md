# @wanghe1995/docx-editor-chart

DocxEditor 图表插件，基于 ECharts 实现图表渲染功能。

## 特性

- 基于 ECharts 的图表渲染
- 支持多种图表类型：柱状图、折线图、饼图、散点图、雷达图、混合图
- 从表格数据自动生成图表
- 支持丰富的图表配置（标题、图例、颜色等）
- 作为可选插件，按需加载

## 安装

```bash
# 安装图表插件
npm install @wanghe1995/docx-editor-chart

# 安装 ECharts 依赖
npm install echarts
```

## 使用方法

### 基础用法

```typescript
import DocxEditor from '@wanghe1995/docx-editor-core'
import { createChartPlugin } from '@docuflow/docx-editor-chart'
import * as echarts from 'echarts'

// 创建编辑器
const editor = new DocxEditor(container, data)

// 注册图表插件
editor.use(createChartPlugin({ echarts }))
```

### 插入图表

```typescript
// 先选中一个表格，然后执行插入图表命令
editor.command.executeInsertChart({
  chartType: 'bar',           // 图表类型
  subtype: 'bar-basic',       // 子类型
  width: 400,                 // 宽度
  height: 300,                // 高度
  config: {
    title: '销售数据',
    showLegend: true,
    legendPosition: 'bottom',
    xAxisLabel: '月份',
    yAxisLabel: '销量'
  }
})
```

### 更新图表

```typescript
// 选中图表后执行更新
editor.command.executeUpdateChart({
  chartType: 'line',
  config: {
    title: '新标题'
  }
})
```

## 图表类型

### 柱状图 (bar)

```typescript
// 基础柱状图
{ chartType: 'bar', subtype: 'bar-basic' }

// 堆叠柱状图
{ chartType: 'bar', subtype: 'bar-stacked' }

// 横向柱状图
{ chartType: 'bar', subtype: 'bar-horizontal' }

// 瀑布图
{ chartType: 'bar', subtype: 'bar-waterfall' }

// 正负对比图
{ chartType: 'bar', subtype: 'bar-negative' }
```

### 折线图 (line)

```typescript
// 基础折线图
{ chartType: 'line', subtype: 'line-basic' }

// 平滑折线图
{ chartType: 'line', subtype: 'line-smooth' }

// 面积图
{ chartType: 'line', subtype: 'line-area' }

// 堆叠面积图
{ chartType: 'line', subtype: 'line-stacked-area' }

// 阶梯图
{ chartType: 'line', subtype: 'line-step' }
```

### 饼图 (pie)

```typescript
// 基础饼图
{ chartType: 'pie', subtype: 'pie-basic' }

// 环形图
{ chartType: 'pie', subtype: 'pie-doughnut' }

// 玫瑰图
{ chartType: 'pie', subtype: 'pie-rose' }

// 嵌套饼图（需要3列数据）
{ chartType: 'pie', subtype: 'pie-nested' }
```

### 散点图 (scatter)

```typescript
// 基础散点图
{ chartType: 'scatter', subtype: 'scatter-basic' }

// 气泡图
{ chartType: 'scatter', subtype: 'scatter-bubble' }
```

### 雷达图 (radar)

```typescript
// 基础雷达图
{ chartType: 'radar', subtype: 'radar-basic' }

// 填充雷达图
{ chartType: 'radar', subtype: 'radar-filled' }
```

### 混合图 (mixed)

```typescript
// 柱线混合图
{ chartType: 'mixed', subtype: 'mixed-basic' }

// 双轴图
{ chartType: 'mixed', subtype: 'mixed-dual-axis' }
```

## 配置选项

### IChartConfig

```typescript
interface IChartConfig {
  // 标题
  title?: string              // 图表标题
  
  // 图例
  showLegend?: boolean        // 是否显示图例
  legendPosition?: 'top' | 'bottom' | 'left' | 'right'  // 图例位置
  legendOrient?: 'horizontal' | 'vertical'              // 图例方向
  
  // 数据标签
  showDataLabel?: boolean     // 是否显示数据标签
  
  // 颜色
  colors?: string[]           // 自定义颜色数组
  
  // 坐标轴
  xAxisLabel?: string         // X 轴标签
  yAxisLabel?: string         // Y 轴标签
}
```

## API 参考

### createChartPlugin

创建图表插件的工厂函数。

```typescript
function createChartPlugin(options?: {
  echarts?: any    // ECharts 实例（可选）
}): (editor: Editor) => void
```

**参数：**
- `options.echarts` - 可选的 ECharts 实例。如果不传，插件会使用内部导入的 echarts。

**返回：**
- 插件函数，用于 `editor.use()`

### EchartsChartRenderer

图表渲染器类，实现 `IChartRenderer` 接口。

```typescript
class EchartsChartRenderer implements IChartRenderer {
  constructor(echartsInstance?: any)
  
  // 将图表配置渲染为 DataURL 图片
  renderToDataUrl(
    option: any,          // ECharts 配置
    width: number,        // 宽度
    height: number,       // 高度
    pixelRatio?: number   // 像素比例，默认 2
  ): string
  
  // 根据表格数据生成图表配置
  generateOption(
    chartType: string,           // 图表类型
    tableData: IChartTableData,  // 表格数据
    config: IChartConfig,        // 配置选项
    subtype?: string             // 子类型
  ): any
  
  // 从表格元素提取数据
  extractTableData(
    tableElement: any,           // 表格元素
    range?: IChartDataRange      // 数据范围（可选）
  ): IChartTableData
}
```

### 类型定义

```typescript
// 表格数据结构
interface IChartTableData {
  headers: string[]      // 表头行
  rows: string[][]       // 数据行
}

// 数据范围
interface IChartDataRange {
  startTr: number        // 起始行
  endTr: number          // 结束行
  startTd: number        // 起始列
  endTd: number          // 结束列
}
```

## 数据格式

图表数据从表格中提取，表格需要按照以下格式组织：

### 柱状图/折线图

| 类别 | 系列1 | 系列2 | 系列3 |
|------|-------|-------|-------|
| 1月  | 100   | 200   | 150   |
| 2月  | 120   | 180   | 170   |
| 3月  | 140   | 220   | 190   |

- 第一列：类别/X轴数据
- 其他列：各系列的数值数据
- 第一行：表头（系列名称）

### 饼图

| 名称 | 数值 |
|------|------|
| 类别A | 100 |
| 类别B | 200 |
| 类别C | 150 |

- 第一列：饼图扇区名称
- 第二列：数值数据

### 散点图

| X值  | Y值  | 大小(可选) |
|------|------|------------|
| 10   | 20   | 5          |
| 15   | 25   | 8          |
| 20   | 30   | 10         |

- 第一列：X 坐标
- 第二列：Y 坐标
- 第三列（可选）：气泡大小（用于气泡图）

## 示例

### 完整示例

```typescript
import DocxEditor from '@docuflow/docx-editor-core'
import { createChartPlugin } from '@docuflow/docx-editor-chart'
import * as echarts from 'echarts'

// 初始化编辑器
const container = document.getElementById('editor') as HTMLDivElement
const editor = new DocxEditor(container, {
  main: [
    // 插入一个表格
    {
      type: 'table',
      trList: [
        {
          tdList: [
            { value: [{ value: '月份' }] },
            { value: [{ value: '销量' }] },
            { value: [{ value: '利润' }] }
          ]
        },
        {
          tdList: [
            { value: [{ value: '1月' }] },
            { value: [{ value: '100' }] },
            { value: [{ value: '50' }] }
          ]
        },
        {
          tdList: [
            { value: [{ value: '2月' }] },
            { value: [{ value: '150' }] },
            { value: [{ value: '80' }] }
          ]
        },
        {
          tdList: [
            { value: [{ value: '3月' }] },
            { value: [{ value: '200' }] },
            { value: [{ value: '120' }] }
          ]
        }
      ]
    }
  ]
})

// 注册图表插件
editor.use(createChartPlugin({ echarts }))

// 选中表格后，插入图表
// editor.command.executeInsertChart({...})
```

### 自定义颜色

```typescript
editor.command.executeInsertChart({
  chartType: 'bar',
  config: {
    title: '自定义颜色图表',
    colors: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de']
  }
})
```

### 配置图例

```typescript
editor.command.executeInsertChart({
  chartType: 'pie',
  config: {
    title: '销售占比',
    showLegend: true,
    legendPosition: 'right',
    legendOrient: 'vertical'
  }
})
```

## 注意事项

1. **ECharts 依赖**：此插件需要 ECharts 作为 peer dependency，请确保项目中已安装 echarts。

2. **表格选择**：插入图表前需要先选中一个表格，图表数据将从该表格中提取。

3. **图片格式**：图表会被渲染为 PNG 图片嵌入文档，确保在支持 Canvas 的浏览器中使用。

4. **性能**：大量数据的图表可能影响渲染性能，建议数据行数控制在合理范围内。

## 浏览器兼容性

- Chrome 80+
- Firefox 75+
- Safari 13.1+
- Edge 80+

## License

MIT
