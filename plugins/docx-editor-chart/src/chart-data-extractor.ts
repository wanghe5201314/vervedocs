/**
 * 图表数据提取和处理工具
 */
import type { IChartTableData, IChartDataRange, IChartConfig } from '@vervedoc/docx-editor-schema'

/**
 * 图表类型
 */
type ChartType =
  | 'bar'
  | 'line'
  | 'pie'
  | 'scatter'
  | 'radar'
  | 'mixed'

/**
 * 从表格元素提取数据
 * @param tableElement 表格元素
 * @param range 数据范围
 * @returns 提取的表格数据，包含表头与数据行
 */
export function extractTableData(
  tableElement: any,
  range?: IChartDataRange
): IChartTableData {
  if (!tableElement.trList || tableElement.trList.length === 0) {
    return { headers: [], rows: [] }
  }

  const trList = tableElement.trList
  const startTr = range?.startTr ?? 0
  const endTr = range?.endTr ?? trList.length - 1
  const startTd = range?.startTd ?? 0
  const endTd = range?.endTd ?? (trList[0]?.tdList?.length ?? 0) - 1

  const headerRow = trList[startTr]?.tdList || []
  const headers = headerRow
    .slice(startTd, endTd + 1)
    .map((td: any) => extractTextFromElements(td.value))

  const rows: string[][] = []
  for (let i = startTr + 1; i <= endTr && i < trList.length; i++) {
    const tr = trList[i]
    if (!tr?.tdList) continue

    const row = tr.tdList
      .slice(startTd, endTd + 1)
      .map((td: any) => extractTextFromElements(td.value))
    rows.push(row)
  }

  return { headers, rows }
}

function extractTextFromElements(elements: any[]): string {
  if (!elements || !Array.isArray(elements)) return ''
  return elements
    .map(el => el.value || '')
    .join('')
    .trim()
}

/** Chart.js 图表配置类型 */
type ChartJsConfig = {
  type: string
  data: { labels: string[]; datasets: any[] }
  options: any
}

/**
 * 构建基础 options（标题、图例、tooltip、动画）
 */
function buildBaseOptions(config: IChartConfig): any {
  const options: any = {
    responsive: false,
    animation: config.animation !== false ? undefined : false,
    plugins: {}
  }

  if (config.title || config.showTitle) {
    options.plugins.title = {
      display: true,
      text: config.title || '',
      font: { size: config.titleFontSize || 16 }
    }
  }

  options.plugins.legend = {
    display: config.showLegend !== false,
    position: config.legendPosition || 'bottom'
  }

  options.plugins.tooltip = {
    enabled: config.showTooltip !== false
  }

  return options
}

/**
 * 构建坐标轴 scales 配置
 */
function buildScales(config: IChartConfig, horizontal = false): any {
  const scales: any = {}

  const categoryAxis = {
    title: config.xAxisLabel ? { display: true, text: config.xAxisLabel } : undefined,
    grid: { display: config.showXAxisSplitLine !== false },
    ticks: { maxRotation: config.xAxisLabelRotate || 0 }
  }
  const valueAxis = {
    title: config.yAxisLabel ? { display: true, text: config.yAxisLabel } : undefined,
    grid: { display: config.showYAxisSplitLine !== false }
  }

  if (horizontal) {
    scales.x = valueAxis
    scales.y = categoryAxis
  } else {
    scales.x = categoryAxis
    scales.y = valueAxis
  }

  return scales
}

/**
 * 根据表格数据生成 Chart.js 配置
 * @param chartType 图表类型
 * @param tableData 表格数据
 * @param config 图表配置
 * @param subtype 图表子类型
 * @returns Chart.js 配置对象
 */
export function generateChartOption(
  chartType: ChartType | string,
  tableData: IChartTableData,
  config: IChartConfig,
  subtype?: string
): ChartJsConfig {
  const { headers, rows } = tableData
  const resolvedSubtype = subtype || `${chartType}-basic`
  const sub = resolvedSubtype.trim().toLowerCase()
  const type = String(chartType || '').trim().toLowerCase()

  const colors = config.colors || ['#4472c4', '#ed7d31', '#a5a5a5', '#ffc000', '#5b9bd5', '#70ad47']

  if (!rows || rows.length === 0) {
    return {
      type: 'bar',
      data: { labels: [], datasets: [] },
      options: { ...buildBaseOptions(config), plugins: { ...buildBaseOptions(config).plugins, title: { display: true, text: config.title || '暂无数据' } } }
    }
  }

  const labels = rows.map((row: string[]) => row[0] || '')
  const numericHeaders = headers.slice(1)

  const buildDatasets = (datasetType: string): any[] => {
    return numericHeaders.map((header: string, index: number) => ({
      label: header,
      data: rows.map((row: string[]) => parseFloat(row[index + 1]) || 0),
      type: datasetType,
      backgroundColor: colors[index % colors.length],
      borderColor: colors[index % colors.length]
    }))
  }

  // 柱状图
  if (type === 'bar' || sub.startsWith('bar')) {
    const isHorizontal = sub.includes('horizontal')
    const isStacked = sub.includes('stacked')
    const datasets = buildDatasets('bar')
    if (isStacked) datasets.forEach(d => { d.stack = 'total' })
    return {
      type: 'bar',
      data: { labels, datasets },
      options: {
        ...buildBaseOptions(config),
        indexAxis: isHorizontal ? 'y' : 'x',
        scales: buildScales(config, isHorizontal)
      }
    }
  }

  // 折线图
  if (type === 'line' || sub.startsWith('line')) {
    const datasets = buildDatasets('line')
    if (sub.includes('smooth')) datasets.forEach(d => { d.tension = 0.4 })
    if (sub.includes('step')) datasets.forEach(d => { d.stepped = true })
    if (sub.includes('area')) datasets.forEach(d => { d.fill = true })
    if (sub.includes('dashed')) datasets.forEach(d => { d.borderDash = [5, 5] })
    return {
      type: 'line',
      data: { labels, datasets },
      options: {
        ...buildBaseOptions(config),
        scales: buildScales(config)
      }
    }
  }

  // 饼图 / 环形图
  if (type === 'pie') {
    const isDoughnut = sub.includes('doughnut')
    const data = rows.map((row: string[]) => parseFloat(row[1]) || 0)
    return {
      type: isDoughnut ? 'doughnut' : 'pie',
      data: {
        labels,
        datasets: [{
          label: numericHeaders[0] || '数据',
          data,
          backgroundColor: labels.map((_, i) => colors[i % colors.length])
        }]
      },
      options: buildBaseOptions(config)
    }
  }

  // 雷达图
  if (type === 'radar') {
    const datasets = numericHeaders.map((header: string, index: number) => ({
      label: header,
      data: rows.map((row: string[]) => parseFloat(row[index + 1]) || 0),
      backgroundColor: colors[index % colors.length] + '33',
      borderColor: colors[index % colors.length],
      fill: sub.includes('filled')
    }))
    return {
      type: 'radar',
      data: { labels: numericHeaders, datasets },
      options: {
        ...buildBaseOptions(config),
        scales: {
          r: {
            beginAtZero: true,
            grid: { display: config.showXAxisSplitLine !== false }
          }
        }
      }
    }
  }

  // 散点图
  if (type === 'scatter') {
    const datasets = numericHeaders.map((header: string, index: number) => ({
      label: header,
      data: rows.map((row: string[]) => ({
        x: parseFloat(row[0]) || 0,
        y: parseFloat(row[index + 1]) || 0
      })),
      type: 'scatter',
      backgroundColor: colors[index % colors.length]
    }))
    return {
      type: 'scatter',
      data: { labels, datasets },
      options: {
        ...buildBaseOptions(config),
        scales: buildScales(config)
      }
    }
  }

  // 混合图（柱状 + 折线）
  if (type === 'mixed' || sub.startsWith('mixed')) {
    const datasets = numericHeaders.map((header: string, index: number) => {
      const isLast = index === numericHeaders.length - 1
      return {
        label: header,
        data: rows.map((row: string[]) => parseFloat(row[index + 1]) || 0),
        type: isLast ? 'line' : 'bar',
        backgroundColor: colors[index % colors.length],
        borderColor: colors[index % colors.length]
      }
    })
    return {
      type: 'bar',
      data: { labels, datasets },
      options: {
        ...buildBaseOptions(config),
        scales: buildScales(config)
      }
    }
  }

  // 默认柱状图
  return {
    type: 'bar',
    data: { labels, datasets: buildDatasets('bar') },
    options: {
      ...buildBaseOptions(config),
      scales: buildScales(config)
    }
  }
}
