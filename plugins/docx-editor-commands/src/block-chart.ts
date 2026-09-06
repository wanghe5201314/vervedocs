import type { IElement } from '@vervedoc/docx-editor-schema'
import type { IBlockElement } from './constants'

/** 图表渲染器接口（verve schema 未导出，在此本地定义） */
export interface IChartRenderer {
  /**
   * 将图表配置渲染为 data URL
   * @param option 图表配置
   * @param width 宽度
   * @param height 高度
   * @param dpr 设备像素比
   * @returns 图片 data URL
   */
  renderToDataUrl(option: any, width: number, height: number, dpr: number): string
  /**
   * 根据图表类型与数据生成配置
   * @param chartType 图表类型
   * @param data 数据
   * @param config 配置
   * @param subtype 子类型
   * @returns 图表配置
   */
  generateOption(chartType: string, data: any, config: any, subtype?: string): any
  /**
   * 从表格元素提取数据
   * @param tableElement 表格元素
   * @param range 范围
   * @returns 提取的数据
   */
  extractTableData(tableElement: any, range: any): any
}

/** 图表块组件，调用图表渲染器将数据源渲染为图片 */
export class ChartBlock {
  /** 关联的块元素 */
  private element: IBlockElement
  /** 图表容器 */
  private chartContainer: HTMLDivElement | null = null
  /** 图表图片元素 */
  private chartImg: HTMLImageElement | null = null
  /** 编辑器绘制实例 */
  private draw: any
  /** 尺寸观察器 */
  private resizeObserver: ResizeObserver | null = null

  /**
   * 创建图表块实例
   * @param element 块元素
   * @param draw 编辑器绘制实例
   */
  constructor(element: IBlockElement, draw: any) {
    this.element = element
    this.draw = draw
  }

  /**
   * 获取图表渲染器
   * @returns 渲染器实例或 null
   */
  private getChartRenderer(): IChartRenderer | null {
    const register = (this.draw as any)?.getRegister?.()
    return register?.getChartRenderer?.() || null
  }

  /**
   * 渲染图表到指定容器
   * @param blockItemContainer 块项容器
   */
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
    this.chartContainer.setAttribute('data-id', this.element.id ?? '')
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
      const eventBus = (this.draw as any)?.getEventBus?.()
      eventBus?.emit?.('chartClick', {
        chartId: this.element.id,
        chartType: block?.chartBlock?.chartType,
        dataSource: block?.chartBlock?.dataSource,
        config: block?.chartBlock?.config
      })
    })
  }

  /**
   * 渲染占位提示（未注册图表插件时显示）
   * @param container 容器
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
   * @returns 无返回值
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
   * @param chartBlock 图表块数据
   * @param renderer 渲染器
   * @returns 图表配置
   */
  private getChartOption(chartBlock: any, renderer: IChartRenderer): any {
    const { dataSource, chartType, config, subtype } = chartBlock

    if (dataSource.type === 'manual' && dataSource.manualData) {
      // 手动数据直接使用
      return renderer.generateOption(chartType, dataSource.manualData, config, subtype)
    }

    if (dataSource.type === 'table' && dataSource.tableId) {
      // 从表格提取数据
      const elementList: IElement[] = this.draw.getElementList()
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

  /** 销毁图表块，停止尺寸观察并清理引用 */
  public destroy() {
    if (this.resizeObserver && this.chartContainer) {
      this.resizeObserver.unobserve(this.chartContainer.parentElement!)
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }
    this.chartImg = null
  }
}
