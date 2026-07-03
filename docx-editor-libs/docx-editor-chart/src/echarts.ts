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

export default echarts
