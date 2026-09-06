/**
 * 图表数据提取和处理工具
 */
import type { IChartTableData, IChartConfig as IChartConfigBase, IChartDataRange } from '@vervedoc/docx-editor-schema'
import echartsLib from './echarts'

/** 图表配置接口，扩展基础图表配置，包含标题、动画、坐标轴等显示选项 */
export interface IChartConfig extends IChartConfigBase {
  /** 标题位置 */
  titlePosition?: string
  /** 标题字号 */
  titleFontSize?: number
  /** 是否开启动画 */
  animation?: boolean
  /** 数据标签位置 */
  dataLabelPosition?: string
  /** X 轴标签旋转角度 */
  xAxisLabelRotate?: number
  /** 是否显示 X 轴轴线 */
  showXAxisLine?: boolean
  /** 是否显示 Y 轴轴线 */
  showYAxisLine?: boolean
  /** 是否显示 X 轴网格线 */
  showXAxisSplitLine?: boolean
  /** 是否显示 Y 轴网格线 */
  showYAxisSplitLine?: boolean
}

/**
 * 图表类型
 */
export type ChartType =
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

  // 提取表头(第一行)
  const headerRow = trList[startTr]?.tdList || []
  const headers = headerRow
    .slice(startTd, endTd + 1)
    .map((td: any) => extractTextFromElements(td.value))

  // 提取数据行
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

/**
 * 从元素列表提取纯文本
 * @param elements 元素列表
 * @returns 拼接后的纯文本
 */
function extractTextFromElements(elements: any[]): string {
  if (!elements || !Array.isArray(elements)) return ''
  return elements
    .map(el => el.value || '')
    .join('')
    .trim()
}

/**
 * 根据表格数据生成 ECharts 配置
 * @param chartType 图表类型
 * @param tableData 表格数据
 * @param config 图表配置
 * @param subtype 图表子类型
 * @returns ECharts 配置对象
 */
export function generateChartOption(
  chartType: ChartType | string,
  tableData: IChartTableData,
  config: IChartConfig,
  subtype?: string
): any {
  const { headers, rows } = tableData

  const resolvedSubtype = subtype || `${chartType}-basic`
  const resolvedSubtypeLower = String(resolvedSubtype || '').trim().toLowerCase()
  const chartTypeLower = String(chartType || '').trim().toLowerCase()
  const aliasTypeMap: Record<string, string> = {}
  const supportedTypes = new Set([
    'bar',
    'line',
    'pie',
    'scatter',
    'radar',
    'mixed'
  ])
  const inferredType = resolvedSubtypeLower.split('-')[0]
  const chartTypeNormalized = aliasTypeMap[chartTypeLower] || chartTypeLower
  const inferredTypeNormalized = aliasTypeMap[inferredType] || inferredType
  const normalizedType = supportedTypes.has(chartTypeNormalized) ? chartTypeNormalized : supportedTypes.has(inferredTypeNormalized) ? inferredTypeNormalized : ''
  chartType = normalizedType || 'bar'

  if (!rows || rows.length === 0) {
    return {
      title: { text: config.title || '暂无数据', left: 'center' },
      xAxis: { type: 'category', data: [] },
      yAxis: { type: 'value' },
      series: []
    }
  }

  const buildBaseOption = (partial: any) => {
    const showLegend = config.showLegend !== false
    const titleText = config.title || ''
    const titlePosition = config.titlePosition || 'center'
    const titleFontSize = config.titleFontSize || 16
    const legendPosition = config.legendPosition || 'bottom'
    const legendOrient = config.legendOrient
      ? config.legendOrient
      : legendPosition === 'left' || legendPosition === 'right'
        ? 'vertical'
        : 'horizontal'
    const legend: any = {
      show: showLegend,
      orient: legendOrient
    }
    if (legendPosition === 'top') legend.top = 10
    if (legendPosition === 'bottom') legend.bottom = 10
    if (legendPosition === 'left') {
      legend.left = 10
      legend.top = 'middle'
    }
    if (legendPosition === 'right') {
      legend.right = 10
      legend.top = 'middle'
    }

    const gridBottom = showLegend && legendPosition === 'bottom' ? '15%' : '10%'
    const gridTop = titleText ? '15%' : showLegend && legendPosition === 'top' ? '18%' : '10%'
    const gridLeft = showLegend && legendPosition === 'left' ? '18%' : '3%'
    const gridRight = showLegend && legendPosition === 'right' ? '18%' : '4%'

    // 动画配置
    const animation = config.animation !== false

    return {
      title: {
        text: titleText,
        left: titlePosition,
        textStyle: { fontSize: titleFontSize }
      },
      legend,
      grid: {
        left: gridLeft,
        right: gridRight,
        bottom: gridBottom,
        top: gridTop,
        containLabel: true
      },
      color: config.colors || ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399'],
      animation,
      ...partial
    }
  }

  const buildCategorySeries = (seriesType: string, overrides?: (s: any, seriesIndex: number) => any) => {
    return headers.slice(1).map((header: string, index: number) => {
      const dataLabel = config.showDataLabel
        ? {
            label: {
              show: true,
              position: config.dataLabelPosition || (seriesType === 'bar' ? 'top' : 'top')
            }
          }
        : {}
      const base = {
        name: header,
        type: seriesType,
        data: rows.map((row: string[]) => parseFloat(row[index + 1]) || 0),
        ...dataLabel
      }
      return overrides ? { ...base, ...overrides(base, index) } : base
    })
  }

  const categories = rows.map((row: string[]) => row[0] || '')

  // 构建坐标轴配置
  const buildAxisConfig = () => {
    const xAxisConfig: any = {
      type: 'category',
      data: categories,
      name: config.xAxisLabel,
      axisLabel: {
        rotate: config.xAxisLabelRotate || (categories.length > 8 ? 45 : 0)
      }
    }
    const yAxisConfig: any = {
      type: 'value',
      name: config.yAxisLabel
    }

    // 坐标轴线配置
    if (config.showXAxisLine !== undefined) {
      xAxisConfig.axisLine = { show: config.showXAxisLine }
    }
    if (config.showYAxisLine !== undefined) {
      yAxisConfig.axisLine = { show: config.showYAxisLine }
    }

    // 网格线配置
    if (config.showXAxisSplitLine !== undefined) {
      xAxisConfig.splitLine = { show: config.showXAxisSplitLine }
    }
    if (config.showYAxisSplitLine !== undefined) {
      yAxisConfig.splitLine = { show: config.showYAxisSplitLine }
    }

    return { xAxisConfig, yAxisConfig }
  }

  // 柱状图/折线图
  if (chartType === 'bar' || chartType === 'line' || resolvedSubtypeLower.startsWith('bar') || resolvedSubtypeLower.startsWith('line')) {
    const isLine = resolvedSubtypeLower.startsWith('line')
    const isBar = resolvedSubtypeLower.startsWith('bar')
    const baseType = isLine ? 'line' : isBar ? 'bar' : chartType

    const isStacked = resolvedSubtypeLower.includes('stacked') || resolvedSubtypeLower.includes('area')
    const isSmooth = resolvedSubtypeLower.includes('smooth') || resolvedSubtypeLower.includes('area')
    const isArea = resolvedSubtypeLower.includes('area')
    const isStep = resolvedSubtypeLower.includes('step')
    const isHorizontal = resolvedSubtypeLower.includes('horizontal')
    const isDashed = resolvedSubtypeLower.includes('dashed')
    const isMark = resolvedSubtypeLower.includes('mark')
    const is3D = resolvedSubtypeLower.includes('3d')
    const isGradient = resolvedSubtypeLower.includes('gradient')
    const isPolar = resolvedSubtypeLower.includes('polar')

    // 处理极坐标柱状图
    if (isPolar && isBar) {
      const data = rows.map((row: string[]) => ({
        name: row[0] || '',
        value: parseFloat(row[1]) || 0
      }))
      return buildBaseOption({
        polar: {},
        angleAxis: { type: 'category', data: categories },
        radiusAxis: { type: 'value' },
        series: [{
          type: 'bar',
          data: data.map(d => d.value),
          coordinateSystem: 'polar'
        }]
      })
    }

    const series = buildCategorySeries(baseType, (_s, seriesIndex) => {
      const extra: any = {}
      if (baseType === 'line') {
        if (isSmooth) extra.smooth = true
        if (isStep) extra.step = 'middle'
        if (isArea) extra.areaStyle = {}
        if (isDashed) extra.lineStyle = { type: 'dashed' }
        if (isMark) {
          extra.markPoint = {
            data: [
              { type: 'max', name: '最大值' },
              { type: 'min', name: '最小值' }
            ]
          }
          extra.markLine = {
            data: [
              { type: 'average', name: '平均值' }
            ]
          }
        }
      }
      if (isStacked) extra.stack = 'total'
      if (isBar) {
        if (is3D) {
          extra.itemStyle = {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
        if (isGradient) {
          extra.itemStyle = {
            color: new echartsLib.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#83bff6' },
              { offset: 0.5, color: '#188df0' },
              { offset: 1, color: '#188df0' }
            ])
          }
        }
      }
      if (isBar && resolvedSubtypeLower.includes('waterfall')) {
        extra.stack = 'total'
      }
      if (resolvedSubtypeLower.includes('negative') && seriesIndex === 1) {
        extra.data = rows.map((row: string[]) => -(parseFloat(row[seriesIndex + 1]) || 0))
      }
      return extra
    })

    if (resolvedSubtypeLower.includes('waterfall')) {
      const values = rows.map((row: string[]) => parseFloat(row[1]) || 0)
      const helpers = values.reduce((acc: number[], _v: number, i: number) => {
        acc.push((acc[i - 1] || 0) + (i === 0 ? 0 : values[i - 1]))
        return acc
      }, [])
      const { xAxisConfig, yAxisConfig } = buildAxisConfig()
      return buildBaseOption({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        xAxis: xAxisConfig,
        yAxis: yAxisConfig,
        series: [
          {
            name: '辅助',
            type: 'bar',
            stack: 'total',
            itemStyle: { borderColor: 'transparent', color: 'transparent' },
            emphasis: { itemStyle: { borderColor: 'transparent', color: 'transparent' } },
            data: helpers
          },
          {
            name: headers[1] || '值',
            type: 'bar',
            stack: 'total',
            data: values
          }
        ]
      })
    }

    if (isHorizontal) {
      const { xAxisConfig, yAxisConfig } = buildAxisConfig()
      return buildBaseOption({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        xAxis: { ...yAxisConfig, type: 'value' },
        yAxis: { ...xAxisConfig, type: 'category', data: categories },
        series
      })
    }

    const { xAxisConfig, yAxisConfig } = buildAxisConfig()
    return buildBaseOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: xAxisConfig,
      yAxis: yAxisConfig,
      series
    })
  }

  if (chartType === 'mixed' || resolvedSubtypeLower.startsWith('mixed')) {
    const numericSeries = headers.slice(1)
    const seriesCount = numericSeries.length
    const series = numericSeries.map((name: string, idx: number) => {
      const isLine = idx === seriesCount - 1
      const base: any = {
        name,
        type: isLine ? 'line' : 'bar',
        data: rows.map((row: string[]) => parseFloat(row[idx + 1]) || 0)
      }
      if (config.showDataLabel) {
        base.label = { show: true, position: config.dataLabelPosition || 'top' }
      }
      if (isLine) base.smooth = true
      if (resolvedSubtypeLower.includes('dual-axis')) base.yAxisIndex = idx === 0 ? 0 : 1
      return base
    })

    const { xAxisConfig, yAxisConfig } = buildAxisConfig()
    const yAxis = resolvedSubtypeLower.includes('dual-axis')
      ? [
          { ...yAxisConfig, type: 'value', name: config.yAxisLabel },
          { type: 'value', name: '' }
        ]
      : yAxisConfig

    return buildBaseOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: xAxisConfig,
      yAxis,
      series
    })
  }

  // 饼图
  if (chartType === 'pie') {
    const data = rows.map((row: string[]) => ({
      name: row[0] || '',
      value: parseFloat(row[1]) || 0
    }))
  
    const baseSeries: any = {
      name: headers[1] || '数据',
      type: 'pie',
      center: ['50%', '50%'],
      data,
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      },
      label: { formatter: '{b}: {d}%' }
    }
  
    const isNightingale = resolvedSubtypeLower.includes('nightingale')
    const isLabel = resolvedSubtypeLower.includes('label')
    const isCustom = resolvedSubtypeLower.includes('custom')
  
    if (resolvedSubtypeLower.includes('doughnut')) {
      baseSeries.radius = ['40%', '70%']
    } else if (isNightingale) {
      baseSeries.radius = [20, 100]
      baseSeries.roseType = 'area'
    } else if (resolvedSubtypeLower.includes('rose')) {
      baseSeries.radius = ['25%', '70%']
      baseSeries.roseType = 'radius'
    } else if (isLabel) {
      baseSeries.radius = ['40%', '70%']
      baseSeries.label = {
        show: true,
        position: 'outside',
        formatter: '{b}: {c}'
      }
      baseSeries.labelLine = {
        show: true,
        length: 20,
        length2: 100
      }
    } else if (isCustom) {
      baseSeries.radius = '60%'
      baseSeries.color = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de']
    } else {
      baseSeries.radius = '55%'
    }
  
    if (resolvedSubtypeLower.includes('nested') && headers.length >= 3) {
      const outerData = rows.map((row: string[]) => ({
        name: row[0] || '',
        value: parseFloat(row[2]) || 0
      }))
      return buildBaseOption({
        tooltip: { trigger: 'item', formatter: '{a} <br/>{b}: {c} ({d}%)' },
        legend: { show: config.showLegend !== false, bottom: 10, orient: 'horizontal' },
        series: [
          { ...baseSeries, radius: ['20%', '45%'], label: { position: 'inner', formatter: '{d}%' } },
          { ...baseSeries, name: headers[2] || '数据 2', radius: ['55%', '75%'], data: outerData }
        ]
      })
    }
  
    return buildBaseOption({
      tooltip: { trigger: 'item', formatter: '{a} <br/>{b}: {c} ({d}%)' },
      legend: { show: config.showLegend !== false, bottom: 10, orient: 'horizontal' },
      series: [baseSeries]
    })
  }

  // 雷达图
  if (chartType === 'radar') {
    const indicator = headers.slice(1).map((header: string) => ({
      name: header,
      max: Math.max(...rows.map((row: string[]) => parseFloat(row[1]) || 0)) * 1.2 || 100
    }))

    const series = rows.map((row: string[]) => ({
      name: row[0] || '',
      type: 'radar',
      data: [headers.slice(1).map((_: string, index: number) => parseFloat(row[index + 1]) || 0)]
    }))

    const filledSeries = resolvedSubtypeLower.includes('filled')
      ? series.map((s: any) => ({ ...s, areaStyle: {} }))
      : series

    return buildBaseOption({
      tooltip: { trigger: 'item' },
      radar: { indicator, shape: 'circle' },
      series: filledSeries
    })
  }

  // 默认返回柱状图配置
  const series = headers && headers.length > 1 ? headers.slice(1).map((header: string, index: number) => ({
    name: header,
    type: 'bar',
    data: rows.map((row: string[]) => parseFloat(row[index + 1]) || 0)
  })) : [{
    name: '默认数据',
    type: 'bar',
    data: []
  }]

  const { xAxisConfig, yAxisConfig } = buildAxisConfig()
  return buildBaseOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: xAxisConfig,
    yAxis: yAxisConfig,
    series
  })
}
