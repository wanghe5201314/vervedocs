/**
 * OOXML Chart XML 解析器
 * 从 word/charts/chartN.xml 中提取图表类型和数据，转换为 ECharts option
 */
import { NS } from '../../constants'
import { parseXml } from '../xml.helper'

interface ChartSeriesData {
  name: string
  values: number[]
}

interface OoxmlChartData {
  type: string // bar, line, pie, area, scatter, radar, doughnut
  title: string
  categories: string[]
  series: ChartSeriesData[]
}

// c:chartSpace 命名空间（与 c:chart 引用命名空间不同）
const NS_CHART = 'http://schemas.openxmlformats.org/drawingml/2006/chart'
const NS_A = NS.a

/**
 * 解析 OOXML chart XML，返回 ECharts option
 */
export function parseOoxmlChartToOption(chartXml: string): any | null {
  try {
    const data = extractChartData(chartXml)
    if (!data || data.series.length === 0) {
      return null
    }
    return buildEChartsOption(data)
  } catch (e) {
    console.error('[ooxmlChartParser] parse error:', e)
    return null
  }
}

/**
 * 从 chart XML 提取图表数据
 */
function extractChartData(chartXml: string): OoxmlChartData | null {
  const doc = parseXml(chartXml)
  const root = doc.documentElement // c:chartSpace

  // 查找 c:chart
  const chartEls = root.getElementsByTagNameNS(NS_CHART, 'chart')
  if (chartEls.length === 0) return null
  const chartEl = chartEls[0]

  // 提取标题
  const title = extractTitle(chartEl)

  // 查找 c:plotArea
  const plotAreaEls = chartEl.getElementsByTagNameNS(NS_CHART, 'plotArea')
  if (plotAreaEls.length === 0) return null
  const plotArea = plotAreaEls[0]

  // 检测图表类型并提取数据
  const chartTypeMap: Record<string, string> = {
    'barChart': 'bar',
    'bar3DChart': 'bar',
    'lineChart': 'line',
    'line3DChart': 'line',
    'pieChart': 'pie',
    'pie3DChart': 'pie',
    'areaChart': 'area',
    'area3DChart': 'area',
    'scatterChart': 'scatter',
    'radarChart': 'radar',
    'doughnutChart': 'doughnut',
    'ofPieChart': 'pie'
  }

  for (const [xmlTag, chartType] of Object.entries(chartTypeMap)) {
    const chartTypeEls = plotArea.getElementsByTagNameNS(NS_CHART, xmlTag)
    if (chartTypeEls.length > 0) {
      const seriesData = extractSeriesFromChartType(chartTypeEls[0])
      if (seriesData.series.length > 0) {
        return {
          type: chartType,
          title,
          categories: seriesData.categories,
          series: seriesData.series
        }
      }
    }
  }

  return null
}

/**
 * 提取图表标题
 */
function extractTitle(chartEl: Element): string {
  const titleEls = chartEl.getElementsByTagNameNS(NS_CHART, 'title')
  if (titleEls.length === 0) return ''

  // 尝试从 c:tx -> c:rich -> a:p -> a:r -> a:t 获取
  const tEls = titleEls[0].getElementsByTagNameNS(NS_A, 't')
  if (tEls.length > 0) {
    return Array.from(tEls).map(t => t.textContent || '').join('')
  }

  // 尝试从 c:tx -> c:strRef -> c:strCache -> c:pt -> c:v 获取
  const vEls = titleEls[0].getElementsByTagNameNS(NS_CHART, 'v')
  if (vEls.length > 0) {
    return vEls[0].textContent || ''
  }

  return ''
}

/**
 * 从图表类型元素（如 c:barChart）中提取系列数据
 */
function extractSeriesFromChartType(chartTypeEl: Element): { categories: string[], series: ChartSeriesData[] } {
  const serEls = chartTypeEl.getElementsByTagNameNS(NS_CHART, 'ser')
  const series: ChartSeriesData[] = []
  let categories: string[] = []

  for (let i = 0; i < serEls.length; i++) {
    const serEl = serEls[i]

    // 提取系列名称
    const name = extractSeriesName(serEl) || `系列${i + 1}`

    // 提取分类（只需从第一个系列取一次）
    if (categories.length === 0) {
      categories = extractCategories(serEl)
    }

    // 提取数值
    const values = extractValues(serEl)

    if (values.length > 0) {
      series.push({ name, values })
    }
  }

  // 如果没有明确的分类，生成默认分类
  if (categories.length === 0 && series.length > 0) {
    const maxLen = Math.max(...series.map(s => s.values.length))
    categories = Array.from({ length: maxLen }, (_, i) => `${i + 1}`)
  }

  return { categories, series }
}

/**
 * 提取系列名称 c:tx
 */
function extractSeriesName(serEl: Element): string {
  const txEls = getDirectChildren(serEl, NS_CHART, 'tx')
  if (txEls.length === 0) return ''

  // c:strRef -> c:strCache -> c:pt -> c:v
  const cacheVals = extractCacheValues(txEls[0], 'strCache')
  if (cacheVals.length > 0) return cacheVals[0]

  // 直接 c:v
  const vEls = txEls[0].getElementsByTagNameNS(NS_CHART, 'v')
  if (vEls.length > 0) return vEls[0].textContent || ''

  return ''
}

/**
 * 提取分类数据 c:cat
 */
function extractCategories(serEl: Element): string[] {
  const catEls = getDirectChildren(serEl, NS_CHART, 'cat')
  if (catEls.length === 0) return []

  // 优先从 strCache 获取
  const strVals = extractCacheValues(catEls[0], 'strCache')
  if (strVals.length > 0) return strVals

  // 从 numCache 获取
  const numVals = extractCacheValues(catEls[0], 'numCache')
  if (numVals.length > 0) return numVals

  return []
}

/**
 * 提取数值数据 c:val
 */
function extractValues(serEl: Element): number[] {
  const valEls = getDirectChildren(serEl, NS_CHART, 'val')
  if (valEls.length === 0) return []

  const numVals = extractCacheValues(valEls[0], 'numCache')
  return numVals.map(v => parseFloat(v) || 0)
}

/**
 * 从 cache 元素中提取值列表
 * 路径：c:strRef/c:numRef -> c:strCache/c:numCache -> c:pt -> c:v
 */
function extractCacheValues(parentEl: Element, cacheTag: string): string[] {
  const cacheEls = parentEl.getElementsByTagNameNS(NS_CHART, cacheTag)
  if (cacheEls.length === 0) return []

  const cache = cacheEls[0]
  const ptEls = cache.getElementsByTagNameNS(NS_CHART, 'pt')
  if (ptEls.length === 0) return []

  // 按 idx 排序提取值
  const indexed: { idx: number; val: string }[] = []
  for (let i = 0; i < ptEls.length; i++) {
    const pt = ptEls[i]
    const idx = parseInt(pt.getAttribute('idx') || '0', 10)
    const vEls = pt.getElementsByTagNameNS(NS_CHART, 'v')
    const val = vEls.length > 0 ? (vEls[0].textContent || '') : ''
    indexed.push({ idx, val })
  }

  indexed.sort((a, b) => a.idx - b.idx)

  // 填充空位
  const result: string[] = []
  for (const item of indexed) {
    while (result.length < item.idx) result.push('')
    result.push(item.val)
  }

  return result
}

/**
 * 获取直接子元素（不递归）
 */
function getDirectChildren(parent: Element, ns: string, localName: string): Element[] {
  const result: Element[] = []
  for (let i = 0; i < parent.childNodes.length; i++) {
    const child = parent.childNodes[i]
    if (child.nodeType === 1 && (child as Element).localName === localName && (child as Element).namespaceURI === ns) {
      result.push(child as Element)
    }
  }
  return result
}

/**
 * 将解析出的图表数据转换为 ECharts option
 */
function buildEChartsOption(data: OoxmlChartData): any {
  const { type, title, categories, series } = data

  const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc']

  const baseOption: any = {
    animation: false,
    color: colors,
    grid: {
      left: '3%',
      right: '4%',
      bottom: '12%',
      top: title ? '15%' : '10%',
      containLabel: true
    }
  }

  if (title) {
    baseOption.title = { text: title, left: 'center', textStyle: { fontSize: 14 } }
  }

  if (series.length > 1) {
    baseOption.legend = {
      show: true,
      bottom: 0,
      data: series.map(s => s.name)
    }
  }

  // 饼图 / 环形图
  if (type === 'pie' || type === 'doughnut') {
    const pieData = categories.map((cat, i) => ({
      name: cat,
      value: series[0]?.values[i] || 0
    }))
    const radius = type === 'doughnut' ? ['40%', '70%'] : '55%'
    return {
      ...baseOption,
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      series: [{
        type: 'pie',
        radius,
        data: pieData,
        label: { formatter: '{b}: {d}%' }
      }]
    }
  }

  // 雷达图
  if (type === 'radar') {
    const maxVal = Math.max(...series.flatMap(s => s.values)) * 1.2 || 100
    const indicator = categories.map(cat => ({ name: cat, max: maxVal }))
    return {
      ...baseOption,
      tooltip: { trigger: 'item' },
      radar: { indicator, shape: 'circle' },
      series: [{
        type: 'radar',
        data: series.map(s => ({
          name: s.name,
          value: s.values
        }))
      }]
    }
  }

  // 散点图
  if (type === 'scatter') {
    return {
      ...baseOption,
      tooltip: { trigger: 'item' },
      xAxis: { type: 'value' },
      yAxis: { type: 'value' },
      series: series.map(s => ({
        name: s.name,
        type: 'scatter',
        data: s.values.map((v, i) => [categories[i] ? parseFloat(categories[i]) || i : i, v])
      }))
    }
  }

  // 柱状图 / 折线图 / 面积图（默认）
  const echartsType = type === 'area' ? 'line' : (type === 'bar' || type === 'line') ? type : 'bar'
  return {
    ...baseOption,
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: { rotate: categories.length > 8 ? 45 : 0 }
    },
    yAxis: { type: 'value' },
    series: series.map(s => ({
      name: s.name,
      type: echartsType,
      data: s.values,
      ...(type === 'area' ? { areaStyle: {} } : {})
    }))
  }
}
