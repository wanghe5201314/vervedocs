import type { IRowElement } from '@vervedoc/docx-editor-schema'
import { EventBus } from '@vervedoc/docx-editor-state'
import { EventBusMap } from '@vervedoc/docx-editor-schema'
import type { IChartRenderer } from '@vervedoc/docx-editor-schema'

export class ChartBlock {
  private element: IRowElement
  private chartContainer: HTMLDivElement | null = null
  private chartImg: HTMLImageElement | null = null
  private draw: any
  private resizeObserver: ResizeObserver | null = null
  private eventBus: EventBus<EventBusMap & { chartClick: (payload: { chartId?: string; chartType?: string; dataSource?: any; config?: any }) => void }>

  constructor(element: IRowElement, draw: any) {
    this.element = element
    this.draw = draw
    this.eventBus = draw.getEventBus()
  }

  /**
   * 获取图表渲染器
   */
  private getChartRenderer(): IChartRenderer | null {
    return this.draw.getRegister()?.getChartRenderer() || null
  }

  public render(blockItemContainer: HTMLDivElement) {
    const block = this.element.block
    if (!block?.chartBlock) return

    // 检查是否有图表渲染器
    const renderer = this.getChartRenderer()
    if (!renderer) {
      // 显示占位提示
      this.renderPlaceholder(blockItemContainer)
      return
    }

    // 创建图表容器
    this.chartContainer = document.createElement('div')
    this.chartContainer.setAttribute('data-id', this.element.id!)
    this.chartContainer.style.width = '100%'
    this.chartContainer.style.height = '100%'
    blockItemContainer.append(this.chartContainer)

    this.chartImg = document.createElement('img')
    this.chartImg.style.width = '100%'
    this.chartImg.style.height = '100%'
    this.chartImg.style.display = 'block'
    this.chartImg.draggable = false
    this.chartContainer.appendChild(this.chartImg)

    // 从数据源生成配置并渲染
    this.updateChart()

    // 监听容器尺寸变化
    this.resizeObserver = new ResizeObserver(() => {
      this.updateChart()
    })
    this.resizeObserver.observe(blockItemContainer)
    
    // 添加点击事件监听器，用于激活图表配置面板
    this.chartContainer.addEventListener('click', (e: Event) => {
      e.stopPropagation()
      this.eventBus.emit('chartClick', {
        chartId: this.element.id,
        chartType: this.element.block?.chartBlock?.chartType,
        dataSource: this.element.block?.chartBlock?.dataSource,
        config: this.element.block?.chartBlock?.config
      })
    })
  }

  /**
   * 渲染占位提示（未注册图表插件时显示）
   */
  private renderPlaceholder(container: HTMLDivElement) {
    const placeholder = document.createElement('div')
    placeholder.style.width = '100%'
    placeholder.style.height = '100%'
    placeholder.style.display = 'flex'
    placeholder.style.alignItems = 'center'
    placeholder.style.justifyContent = 'center'
    placeholder.style.backgroundColor = '#f5f5f5'
    placeholder.style.color = '#999'
    placeholder.style.fontSize = '14px'
    placeholder.style.border = '1px dashed #ddd'
    placeholder.textContent = '图表插件未加载'
    container.appendChild(placeholder)
  }

  /**
   * 更新图表(从数据源重新生成)
   */
  public updateChart() {
    if (!this.chartContainer || !this.chartImg) return

    const renderer = this.getChartRenderer()
    if (!renderer) return

    const chartBlock = this.element.block?.chartBlock
    if (!chartBlock) return

    const option = this.getChartOption(chartBlock, renderer)
    const rect = this.chartContainer.getBoundingClientRect()
    const width = Math.max(10, Math.round(rect.width))
    const height = Math.max(10, Math.round(rect.height))
    const dataUrl = renderer.renderToDataUrl(option, width, height, 2)
    this.chartImg.src = dataUrl
  }

  /**
   * 根据数据源生成图表配置
   */
  private getChartOption(chartBlock: any, renderer: IChartRenderer): any {
    const { dataSource, chartType, config, subtype } = chartBlock

    if (dataSource.type === 'manual' && dataSource.manualData) {
      // 手动数据直接使用
      return renderer.generateOption(chartType, dataSource.manualData, config, subtype)
    }

    if (dataSource.type === 'table' && dataSource.tableId) {
      // 从表格提取数据
      const elementList = this.draw.getElementList()
      const tableElement = elementList.find(
        (el: any) => el.type === 'table' && el.id === dataSource.tableId
      )

      if (tableElement) {
        const tableData = renderer.extractTableData(tableElement, dataSource.range)
        return renderer.generateOption(chartType, tableData, config, subtype)
      }
    }

    // 默认空配置
    return {
      title: { text: '暂无数据', left: 'center' },
      xAxis: { type: 'category', data: [] },
      yAxis: { type: 'value' },
      series: []
    }
  }

  public destroy() {
    if (this.resizeObserver && this.chartContainer) {
      this.resizeObserver.unobserve(this.chartContainer.parentElement!)
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }
    this.chartImg = null
  }
}
