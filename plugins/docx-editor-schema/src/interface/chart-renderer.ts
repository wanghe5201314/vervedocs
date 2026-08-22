/**
 * 图表渲染器接口
 * 核心库通过此接口定义图表渲染能力，具体实现由插件提供
 */
export interface IChartRenderer {
  /**
   * 将图表配置渲染为 DataURL 图片
   * @param option 图表配置（ECharts 格式）
   * @param width 宽度（像素）
   * @param height 高度（像素）
   * @param pixelRatio 像素比例，默认为 2
   * @returns Base64 DataURL 字符串
   */
  renderToDataUrl(
    option: any,
    width: number,
    height: number,
    pixelRatio?: number
  ): string

  /**
   * 根据表格数据生成图表配置
   * @param chartType 图表类型
   * @param tableData 表格数据
   * @param config 图表配置
   * @param subtype 图表子类型
   * @returns 图表配置对象
   */
  generateOption(
    chartType: string,
    tableData: IChartTableData,
    config: IChartConfig,
    subtype?: string
  ): any

  /**
   * 从表格元素提取数据
   * @param tableElement 表格元素
   * @param range 数据范围
   * @returns 表格数据
   */
  extractTableData(
    tableElement: any,
    range?: IChartDataRange
  ): IChartTableData
}

/**
 * 图表表格数据结构
 */
export interface IChartTableData {
  headers: string[]
  rows: string[][]
}

/**
 * 图表数据范围
 */
export interface IChartDataRange {
  startTr: number
  endTr: number
  startTd: number
  endTd: number
}

/**
 * 图表配置
 */
export interface IChartConfig {
  title?: string
  xAxisLabel?: string
  yAxisLabel?: string
  showLegend?: boolean
  showDataLabel?: boolean
  legendPosition?: 'top' | 'bottom' | 'left' | 'right'
  legendOrient?: 'horizontal' | 'vertical'
  colors?: string[]
}
