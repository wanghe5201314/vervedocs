/**
 * 图表类型枚举
 */
export type ChartType =
  | 'bar'
  | 'line'
  | 'pie'
  | 'scatter'
  | 'radar'
  | 'candlestick'
  | 'gauge'
  | 'mixed'

/**
 * 表格数据（用于图表数据源）
 */
export interface ITableData {
  /** 表头行 */
  headers: string[]
  /** 数据行 */
  rows: string[][]
}

/**
 * 图表数据源配置
 */
export interface IChartDataSource {
  /** 数据源类型：table=引用表格，manual=手动数据 */
  type: 'table' | 'manual'
  /** 引用的表格 ID（type=table 时有效） */
  tableId?: string
  /** 引用表格的单元格范围（type=table 时有效） */
  range?: {
    startTr: number
    endTr: number
    startTd: number
    endTd: number
  }
  /** 手动输入的数据（type=manual 时有效） */
  manualData?: ITableData
}

/**
 * 图表显示配置
 */
export interface IChartConfig {
  /** 是否显示标题 */
  showTitle?: boolean
  /** 标题文本 */
  title?: string
  /** 标题位置 */
  titlePosition?: 'left' | 'center' | 'right'
  /** 标题字号 */
  titleFontSize?: number

  /** 是否显示图例 */
  showLegend?: boolean
  /** 图例位置 */
  legendPosition?: 'top' | 'bottom' | 'left' | 'right'
  /** 图例朝向 */
  legendOrient?: 'horizontal' | 'vertical'

  /** X 轴标签文本 */
  xAxisLabel?: string
  /** Y 轴标签文本 */
  yAxisLabel?: string
  /** 是否显示 X 轴轴线 */
  showXAxisLine?: boolean
  /** 是否显示 Y 轴轴线 */
  showYAxisLine?: boolean
  /** 是否显示 X 轴分割线 */
  showXAxisSplitLine?: boolean
  /** 是否显示 Y 轴分割线 */
  showYAxisSplitLine?: boolean
  /** X 轴标签旋转角度 */
  xAxisLabelRotate?: number

  /** 是否显示数据标签 */
  showDataLabel?: boolean
  /** 数据标签位置 */
  dataLabelPosition?: 'top' | 'inside' | 'outside'

  /** 自定义颜色序列 */
  colors?: string[]
  /** 颜色方案 */
  colorScheme?: 'default' | 'warm' | 'cool' | 'nature' | 'custom'

  /** 是否显示 tooltip */
  showTooltip?: boolean
  /** 是否开启动画 */
  animation?: boolean
}

/**
 * 可引用的表格选项
 */
export interface ITableOption {
  /** 表格唯一标识 */
  id: string
  /** 表格名称 */
  name: string
  /** 行数 */
  rowCount: number
  /** 列数 */
  colCount: number
}

/**
 * 图表图片扩展信息（嵌入图片元素时的图表元数据）
 */
export interface IChartImageExtension {
  /** 扩展类型标识，固定为 'chart' */
  kind: 'chart'
  /** 图表类型 */
  chartType: ChartType
  /** 图表子类型 */
  subtype: string
  /** 数据源配置 */
  dataSource: IChartDataSource
  /** 显示配置 */
  config: IChartConfig
}
