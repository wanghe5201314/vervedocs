import { ElementType } from '@vervedoc/docx-editor-schema'
import { ImageDisplay } from '@vervedoc/docx-editor-schema'
import { BlockType } from '@vervedoc/docx-editor-schema'
import type { IChartRenderer } from '@vervedoc/docx-editor-schema'
import { IDrawImagePayload } from '@vervedoc/docx-editor-schema'
import { IElement } from '@vervedoc/docx-editor-schema'
import { getUUID } from '@vervedoc/docx-editor-schema'
import { downloadFile } from '@vervedoc/docx-editor-schema'
import { BaseCommandAdapter, IAdapterContext, isSafeUrl } from './types'

export class MediaAdapter extends BaseCommandAdapter {
  constructor(context: IAdapterContext) {
    super(context)
  }

  public image(payload: IDrawImagePayload): string | null {
    if (this.isDisabled()) return null
    const { startIndex, endIndex } = this.range.getRange()
    if (startIndex < 0 || endIndex < 0) return null
    const imageId = payload.id || getUUID()
    if (payload.value && !isSafeUrl(payload.value)) {
      console.warn(`[MediaAdapter] Unsafe image URL rejected: ${payload.value}`)
    }
    const safeElement: IElement = {
      value: payload.value,
      id: imageId,
      type: ElementType.IMAGE,
      width: payload.width,
      height: payload.height,
      imgDisplay: payload.imgDisplay
    }
    this.draw.insertElementList([safeElement])
    return imageId
  }

  public replaceImageElement(payload: string): void {
    if (payload && !isSafeUrl(payload)) {
      console.warn(`[MediaAdapter] Unsafe image URL rejected`)
    }
    const { startIndex } = this.range.getRange()
    const elementList = this.draw.getElementList()
    const element = elementList[startIndex]
    if (!element || element.type !== ElementType.IMAGE) return
    element.value = payload
    this.draw.render({ isSetCursor: false })
  }

  public saveAsImageElement(): void {
    const { startIndex } = this.range.getRange()
    const elementList = this.draw.getElementList()
    const element = elementList[startIndex]
    if (!element || element.type !== ElementType.IMAGE) return
    downloadFile(element.value, `${element.id!}.png`)
  }

  public changeImageDisplay(element: IElement, display: ImageDisplay): void {
    if (element.imgDisplay === display) return
    element.imgDisplay = display
    const { startIndex, endIndex } = this.range.getRange()
    if (
      display === ImageDisplay.SURROUND ||
      display === ImageDisplay.FLOAT_TOP ||
      display === ImageDisplay.FLOAT_BOTTOM
    ) {
      const positionList = this.position.getPositionList()
      const pos = positionList[startIndex]
      if (pos) {
        const { pageNo, coordinate: { leftTop } } = pos
        element.imgFloatPosition = { pageNo, x: leftTop[0], y: leftTop[1] }
      }
    } else {
      delete element.imgFloatPosition
    }
    this.draw.getPreviewer().clearResizer()
    this.draw.render({ isSetCursor: true, curIndex: endIndex })
  }

  public insertAudio(src: string, options?: {
    name?: string
    width?: number
    height?: number
    poster?: string
  }): string | null {
    if (this.isDisabled()) return null
    const { startIndex, endIndex } = this.range.getRange()
    if (startIndex < 0 || endIndex < 0) return null
    if (!isSafeUrl(src)) {
      console.warn(`[MediaAdapter] Unsafe audio URL rejected: ${src}`)
      return null
    }

    const audioId = getUUID()
    const { scale } = this.options
    const audioElement: IElement = {
      value: '',
      id: audioId,
      type: ElementType.BLOCK,
      width: (options?.width || 400) / scale,
      height: (options?.height || 80) / scale,
      block: {
        type: BlockType.AUDIO,
        audioBlock: {
          src,
          name: options?.name || '音频文件',
          poster: options?.poster
        }
      }
    }
    this.draw.insertElementList([audioElement])
    return audioId
  }

  public insertVideo(src: string, options?: {
    width?: number
    height?: number
    poster?: string
  }): string | null {
    if (this.isDisabled()) return null
    const { startIndex, endIndex } = this.range.getRange()
    if (startIndex < 0 || endIndex < 0) return null
    if (!isSafeUrl(src)) {
      console.warn(`[MediaAdapter] Unsafe video URL rejected: ${src}`)
      return null
    }

    const videoId = getUUID()
    const { scale } = this.options
    const videoElement: IElement = {
      value: '',
      id: videoId,
      type: ElementType.BLOCK,
      width: (options?.width || 600) / scale,
      height: (options?.height || 400) / scale,
      block: {
        type: BlockType.VIDEO,
        videoBlock: { src, poster: options?.poster }
      }
    }
    this.draw.insertElementList([videoElement])
    return videoId
  }

  public insertChart(payload: {
    chartType:
      | 'bar' | 'line' | 'pie' | 'scatter' | 'radar' | 'candlestick'
      | 'gauge' | 'funnel' | 'heatmap' | 'tree' | 'treemap'
      | 'sunburst' | 'graph' | 'sankey' | 'parallel' | 'mixed'
    subtype?: string
    dataSource: { type: 'table' | 'manual'; tableId?: string; range?: any; manualData?: any }
    config: { title?: string; xAxisLabel?: string; yAxisLabel?: string; showLegend?: boolean; colors?: string[] }
    width?: number
    height?: number
  }): string | null {
    if (this.isDisabled()) return null
    const { startIndex, endIndex } = this.range.getRange()
    if (startIndex < 0 || endIndex < 0) return null

    const chartRenderer: IChartRenderer | null = this.draw.getRegister()?.getChartRenderer() || null
    if (!chartRenderer) {
      console.warn('Chart plugin not registered. Use editor.use(createChartPlugin()) to enable chart features.')
      return null
    }

    const chartId = getUUID()
    const { scale } = this.options
    const widthPx = payload.width || 600
    const heightPx = payload.height || 400
    const resolvedSubtype = payload.subtype || `${payload.chartType}-basic`

    let option: any
    if (payload.dataSource.type === 'manual' && payload.dataSource.manualData) {
      option = chartRenderer.generateOption(payload.chartType, payload.dataSource.manualData, payload.config, resolvedSubtype)
    } else if (payload.dataSource.type === 'table' && payload.dataSource.tableId) {
      const elementList = this.draw.getElementList()
      const tableElement = elementList.find(
        (el: any) => el.type === 'table' && el.id === payload.dataSource.tableId
      )
      if (tableElement) {
        const tableData = chartRenderer.extractTableData(tableElement, payload.dataSource.range)
        option = chartRenderer.generateOption(payload.chartType, tableData, payload.config, resolvedSubtype)
      } else {
        option = { title: { text: payload.config.title || '暂无数据', left: 'center' }, series: [] }
      }
    } else {
      option = { title: { text: payload.config.title || '暂无数据', left: 'center' }, series: [] }
    }

    const dataUrl = chartRenderer.renderToDataUrl(option, widthPx, heightPx, 2)
    const safeDataSource = JSON.parse(JSON.stringify(payload.dataSource))
    const safeConfig = JSON.parse(JSON.stringify(payload.config))

    const chartElement: IElement = {
      value: dataUrl,
      id: chartId,
      type: ElementType.IMAGE,
      width: widthPx / scale,
      height: heightPx / scale,
      imgDisplay: ImageDisplay.INLINE,
      extension: {
        kind: 'chart',
        chartType: payload.chartType,
        subtype: resolvedSubtype,
        dataSource: safeDataSource,
        config: safeConfig
      }
    }
    this.draw.insertElementList([chartElement])
    return chartId
  }

  public updateChart(chartId: string, payload: {
    dataSource?: any
    config?: any
    chartType?: any
    subtype?: string
    imgDisplay?: ImageDisplay
    size?: { width: number; height: number }
  }): void {
    if (this.isDisabled()) return
    const chartRenderer: IChartRenderer | null = this.draw.getRegister()?.getChartRenderer() || null
    if (!chartRenderer) {
      console.warn('Chart plugin not registered.')
      return
    }

    const elementList = this.draw.getElementList()
    const chartElementIndex = elementList.findIndex(el => el.id === chartId)
    if (chartElementIndex === -1) return
    const chartElement = elementList[chartElementIndex]

    if (chartElement.type === ElementType.IMAGE) {
      const { scale } = this.options
      const currentExt: any = chartElement.extension
      if (!currentExt || currentExt.kind !== 'chart') return

      const nextChartType = payload.chartType || currentExt.chartType
      const nextSubtype = payload.subtype || currentExt.subtype || `${nextChartType}-basic`
      const nextDataSource = payload.dataSource || currentExt.dataSource
      const nextConfig = payload.config || currentExt.config
      const widthPx = payload.size?.width || Math.round((chartElement.width || 600) * scale)
      const heightPx = payload.size?.height || Math.round((chartElement.height || 400) * scale)

      let option: any
      if (nextDataSource.type === 'manual' && nextDataSource.manualData) {
        option = chartRenderer.generateOption(nextChartType, nextDataSource.manualData, nextConfig, nextSubtype)
      } else if (nextDataSource.type === 'table' && nextDataSource.tableId) {
        const tableElement = elementList.find(
          (el: any) => el.type === 'table' && el.id === nextDataSource.tableId
        )
        if (tableElement) {
          const tableData = chartRenderer.extractTableData(tableElement, nextDataSource.range)
          option = chartRenderer.generateOption(nextChartType, tableData, nextConfig, nextSubtype)
        } else {
          option = { title: { text: nextConfig.title || '暂无数据', left: 'center' }, series: [] }
        }
      } else {
        option = { title: { text: nextConfig.title || '暂无数据', left: 'center' }, series: [] }
      }

      chartElement.value = chartRenderer.renderToDataUrl(option, widthPx, heightPx, 2)
      chartElement.width = widthPx / scale
      chartElement.height = heightPx / scale
      const safeNextDataSource = JSON.parse(JSON.stringify(nextDataSource))
      const safeNextConfig = JSON.parse(JSON.stringify(nextConfig))
      chartElement.extension = {
        kind: 'chart',
        chartType: nextChartType,
        subtype: nextSubtype,
        dataSource: safeNextDataSource,
        config: safeNextConfig
      }

      if (payload.imgDisplay !== undefined) {
        chartElement.imgDisplay = payload.imgDisplay
        if (
          payload.imgDisplay === ImageDisplay.SURROUND ||
          payload.imgDisplay === ImageDisplay.FLOAT_TOP ||
          payload.imgDisplay === ImageDisplay.FLOAT_BOTTOM
        ) {
          const positionList = this.position.getPositionList()
          const info = positionList[chartElementIndex]
          if (info) {
            chartElement.imgFloatPosition = {
              pageNo: info.pageNo,
              x: info.coordinate.leftTop[0],
              y: info.coordinate.leftTop[1]
            }
          }
        } else {
          delete chartElement.imgFloatPosition
        }
      }

      this.draw.render({ curIndex: chartElementIndex, isSetCursor: false })
      return
    }

    if (chartElement.type !== ElementType.BLOCK || !chartElement.block || chartElement.block.type !== BlockType.CHART) return
    if (payload.chartType && chartElement.block?.chartBlock) {
      chartElement.block.chartBlock.chartType = payload.chartType
    }
    if (payload.subtype && chartElement.block?.chartBlock) {
      chartElement.block.chartBlock.subtype = payload.subtype
    }
    if (payload.dataSource && chartElement.block?.chartBlock) {
      chartElement.block.chartBlock.dataSource = payload.dataSource
    }
    if (payload.config && chartElement.block?.chartBlock) {
      chartElement.block.chartBlock.config = payload.config
    }
    if (payload.size) {
      const { scale } = this.options
      chartElement.width = payload.size.width / scale
      chartElement.height = payload.size.height / scale
    }
    this.draw.render({ curIndex: chartElementIndex, isSetCursor: false })
  }
}
