// 定义

export type ChartType =
  | 'bar'
  | 'line'
  | 'pie'
  | 'scatter'
  | 'radar'
  | 'candlestick'
  | 'gauge'
  | 'mixed'

export interface ITableData {
  headers: string[]
  rows: string[][]
}

export interface IChartDataSource {
  type: 'table' | 'manual'
  tableId?: string
  range?: {
    startTr: number
    endTr: number
    startTd: number
    endTd: number
  }
  manualData?: ITableData
}

export interface IChartConfig {
  // 标题配置
  title?: string
  titlePosition?: 'left' | 'center' | 'right'
  titleFontSize?: number

  // 图例配置
  showLegend?: boolean
  legendPosition?: 'top' | 'bottom' | 'left' | 'right'
  legendOrient?: 'horizontal' | 'vertical'

  // 坐标轴配置
  xAxisLabel?: string
  yAxisLabel?: string
  showXAxisLine?: boolean
  showYAxisLine?: boolean
  showXAxisSplitLine?: boolean
  showYAxisSplitLine?: boolean
  xAxisLabelRotate?: number

  // 数据标签配置
  showDataLabel?: boolean
  dataLabelPosition?: 'top' | 'inside' | 'outside'

  // 颜色配置
  colors?: string[]
  colorScheme?: 'default' | 'warm' | 'cool' | 'nature' | 'custom'

  // 其他配置
  showTooltip?: boolean
  animation?: boolean
}

export interface ITableOption {
  id: string
  name: string
  rowCount: number
  colCount: number
}

export interface IChartImageExtension {
  kind: 'chart'
  chartType: ChartType
  subtype: string
  dataSource: IChartDataSource
  config: IChartConfig
}
