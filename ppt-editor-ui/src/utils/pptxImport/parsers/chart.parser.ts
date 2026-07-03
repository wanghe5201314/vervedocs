import { nanoid } from 'nanoid'
import { NS_A, NS_C, NS_R, emuToCanvas } from '../constants'
import { getFirstChildByTag, getAttr, getAttrNS, findFirstDescendant } from '../xml.helper'
import { parseXml } from '../xml.helper'
import { resolveRelativePath } from '../rels.resolver'
import { parseTransform } from './text.parser'
import type { PptxSlideContext } from '../types'
import type { PPTChartElement, ChartData, ChartType } from '@/types/slides'

/**
 * Parse a p:graphicFrame containing a chart as a PPTChartElement.
 */
export function parseChartElement(
  graphicFrameEl: Element,
  context: PptxSlideContext,
): PPTChartElement | null {
  try {
    // Get position
    const xfrmEl = findFirstDescendant(graphicFrameEl, 'http://schemas.openxmlformats.org/presentationml/2006/main', 'xfrm')
      || findFirstDescendant(graphicFrameEl, NS_A, 'xfrm')

    let left = 0, top = 0, width = 400, height = 300

    if (xfrmEl) {
      const offEl = getFirstChildByTag(xfrmEl, NS_A, 'off')
      const extEl = getFirstChildByTag(xfrmEl, NS_A, 'ext')
      if (offEl && extEl) {
        left = emuToCanvas(Number(getAttr(offEl, 'x') || 0), context.slideWidthEmu)
        top = emuToCanvas(Number(getAttr(offEl, 'y') || 0), context.slideWidthEmu)
        width = emuToCanvas(Number(getAttr(extEl, 'cx') || 0), context.slideWidthEmu)
        height = emuToCanvas(Number(getAttr(extEl, 'cy') || 0), context.slideWidthEmu)
      }
    }

    // Find chart reference
    const graphicData = findFirstDescendant(graphicFrameEl, NS_A, 'graphicData')
    if (!graphicData) return null

    // Look for chart reference (c:chart element)
    const chartEl = findFirstDescendant(graphicData, NS_C, 'chart')
    if (!chartEl) return null

    const chartRId = getAttrNS(chartEl, NS_R, 'id')
    if (!chartRId) return null

    // Resolve chart XML path
    const relEntry = context.slideRels.get(chartRId)
    if (!relEntry) return null

    const chartPath = resolveRelativePath(context.slideBasePath, relEntry.target)

    // Get chart XML from pre-extracted map
    const chartXml = context.chartXmlMap?.get(chartPath)
    if (!chartXml) return null

    // Parse chart XML
    const chartDoc = parseXml(chartXml)
    const chartSpace = chartDoc.documentElement

    const chart = findFirstDescendant(chartSpace, NS_C, 'chart')
    if (!chart) return null

    const plotArea = findFirstDescendant(chart, NS_C, 'plotArea')
    if (!plotArea) return null

    // Detect chart type and parse data
    const result = parseChartData(plotArea)
    if (!result) return null

    const element: PPTChartElement = {
      id: nanoid(10),
      type: 'chart',
      left,
      top,
      width,
      height,
      rotate: 0,
      chartType: result.chartType,
      data: result.data,
      themeColor: [
        context.theme.colors.accent1,
        context.theme.colors.accent2,
        context.theme.colors.accent3,
        context.theme.colors.accent4,
        context.theme.colors.accent5,
        context.theme.colors.accent6,
      ],
    }

    return element
  } catch {
    return null
  }
}

function parseChartData(plotArea: Element): { chartType: ChartType; data: ChartData } | null {
  // Detect chart type
  const chartTypeMap: Record<string, ChartType> = {
    barChart: 'bar',
    bar3DChart: 'bar',
    lineChart: 'line',
    line3DChart: 'line',
    areaChart: 'line',
    area3DChart: 'line',
    pieChart: 'pie',
    pie3DChart: 'pie',
    doughnutChart: 'pie',
    scatterChart: 'line',
    radarChart: 'line',
  }

  let chartType: ChartType = 'bar'
  let chartGroupEl: Element | null = null

  for (const [tagName, type] of Object.entries(chartTypeMap)) {
    const el = findFirstDescendant(plotArea, NS_C, tagName)
    if (el) {
      chartType = type
      chartGroupEl = el
      break
    }
  }

  if (!chartGroupEl) return null

  // Parse series
  const serElements = getAllChildrenByTag(chartGroupEl, NS_C, 'ser')
  if (serElements.length === 0) return null

  const labels: string[] = []
  const legends: string[] = []
  const series: number[][] = []
  let labelsSet = false

  for (const ser of serElements) {
    // Series name (legend)
    const tx = findFirstDescendant(ser, NS_C, 'tx')
    let serName = `Series ${legends.length + 1}`
    if (tx) {
      const strRef = findFirstDescendant(tx, NS_C, 'strRef')
      if (strRef) {
        const strCache = findFirstDescendant(strRef, NS_C, 'strCache')
        if (strCache) {
          const pt = findFirstDescendant(strCache, NS_C, 'pt')
          if (pt) {
            const v = findFirstDescendant(pt, NS_C, 'v')
            if (v) serName = v.textContent || serName
          }
        }
      }
      // Also check for strVal
      const v = findFirstDescendant(tx, NS_C, 'v')
      if (v && v.textContent) serName = v.textContent
    }
    legends.push(serName)

    // Categories (labels) - only from first series
    if (!labelsSet) {
      const cat = findFirstDescendant(ser, NS_C, 'cat')
      if (cat) {
        const cache = findFirstDescendant(cat, NS_C, 'strCache') || findFirstDescendant(cat, NS_C, 'numCache')
        if (cache) {
          const pts = getAllChildrenByTag(cache, NS_C, 'pt')
          for (const pt of pts) {
            const v = findFirstDescendant(pt, NS_C, 'v')
            if (v) labels.push(v.textContent || '')
          }
          labelsSet = true
        }
      }
    }

    // Values
    const val = findFirstDescendant(ser, NS_C, 'val') || findFirstDescendant(ser, NS_C, 'yVal')
    const values: number[] = []
    if (val) {
      const numCache = findFirstDescendant(val, NS_C, 'numCache')
      if (numCache) {
        const pts = getAllChildrenByTag(numCache, NS_C, 'pt')
        for (const pt of pts) {
          const v = findFirstDescendant(pt, NS_C, 'v')
          values.push(v ? Number(v.textContent || 0) : 0)
        }
      }
    }
    series.push(values)
  }

  // Ensure labels match data length
  if (labels.length === 0 && series.length > 0 && series[0].length > 0) {
    for (let i = 0; i < series[0].length; i++) {
      labels.push(`Category ${i + 1}`)
    }
  }

  return {
    chartType,
    data: { labels, legends, series },
  }
}

function getAllChildrenByTag(parent: Element, ns: string, localName: string): Element[] {
  const result: Element[] = []
  for (let i = 0; i < parent.childNodes.length; i++) {
    const node = parent.childNodes[i]
    if (node.nodeType === 1) {
      const el = node as Element
      if (el.localName === localName && el.namespaceURI === ns) {
        result.push(el)
      }
    }
  }
  return result
}
