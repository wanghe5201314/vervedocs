/**
 * VerveDocs Schema —— Chart 插件跨包共享接口
 *
 * 图表渲染器契约与数据结构定义，供 chart 插件（提供渲染器）与 commands 包（消费渲染器）共享。
 */

/** 图表渲染器接口：由 chart 插件实现，ChartBlock 消费 */
export interface IChartRenderer {
  /**
   * 将图表配置渲染为 data URL 图片
   * @param option Chart.js 配置
   * @param width 宽度（px）
   * @param height 高度（px）
   * @param dpr 设备像素比
   * @returns 图片 data URL
   */
  renderToDataUrl(option: any, width: number, height: number, dpr: number): string
  /**
   * 根据图表类型与数据生成配置
   * @param chartType 图表类型
   * @param data 表格数据
   * @param config 显示配置
   * @param subtype 子类型
   * @returns 图表配置
   */
  generateOption(chartType: string, data: any, config: any, subtype?: string): any
  /**
   * 从表格元素提取数据
   * @param tableElement 表格元素
   * @param range 数据范围
   * @returns 提取的表格数据
   */
  extractTableData(tableElement: any, range: any): any
}

/** 表格数据（图表数据源） */
export interface IChartTableData {
  /** 表头行 */
  headers: string[]
  /** 数据行 */
  rows: string[][]
}

/** 图表数据范围（从表格中选取的行列区间） */
export interface IChartDataRange {
  startTr?: number
  endTr?: number
  startTd?: number
  endTd?: number
}

/** 图表显示配置 */
export interface IChartConfig {
  /** 是否显示标题 */
  showTitle?: boolean
  /** 标题文本 */
  title?: string
  /** 标题位置 */
  titlePosition?: string
  /** 标题字号 */
  titleFontSize?: number
  /** 是否显示图例 */
  showLegend?: boolean
  /** 图例位置 */
  legendPosition?: string
  /** 图例朝向 */
  legendOrient?: string
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
  dataLabelPosition?: string
  /** 自定义颜色序列 */
  colors?: string[]
  /** 颜色方案 */
  colorScheme?: string
  /** 是否显示 tooltip */
  showTooltip?: boolean
  /** 是否开启动画 */
  animation?: boolean
}

