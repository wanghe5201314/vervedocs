/**
 * ECharts 核心模块，按需注册柱状图、折线图、饼图、散点图、雷达图及各类组件
 */
import * as echarts from 'echarts/core'
import {
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  RadarChart
} from 'echarts/charts'
import {
  TitleComponent,
  LegendComponent,
  GridComponent,
  TooltipComponent,
  PolarComponent,
  RadarComponent,
  GraphicComponent,
  DatasetComponent,
  TransformComponent,
  ToolboxComponent,
  DataZoomComponent,
  VisualMapComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  RadarChart,
  TitleComponent,
  LegendComponent,
  GridComponent,
  TooltipComponent,
  PolarComponent,
  RadarComponent,
  GraphicComponent,
  DatasetComponent,
  TransformComponent,
  ToolboxComponent,
  DataZoomComponent,
  VisualMapComponent,
  CanvasRenderer
])

/** 默认导出已注册所需图表与组件的 ECharts 实例 */
export default echarts
