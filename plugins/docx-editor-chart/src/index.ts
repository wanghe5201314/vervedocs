/**
 * DocxEditor 图表插件
 * 基于 Chart.js 实现图表渲染功能
 *
 * install 时将 Chart.js 渲染器注册到 schema 的模块级 registry（ChartBlock 直接取，零桥接）。
 * 注册 requestInsertChart 命令，触发时自渲染纯 DOM 对话框，确认后调 host.executeInsertChart。
 */
import type {
  IChartRenderer,
  IChartTableData,
  IChartDataRange,
  IChartConfig,
  EditorPlugin
} from '@vervedoc/docx-editor-schema'
import { registerChartRenderer } from '@vervedoc/docx-editor-schema'
import { renderChartToDataUrl } from './chart-renderer'
import { extractTableData, generateChartOption } from './chart-data-extractor'
import { ChartDialog } from './chart-dialog'

// 确保 Chart.js 控制器注册（导入时立即执行）
import './chart-lib'

/**
 * Chart.js 图表渲染器实现
 */
export class ChartJsRenderer implements IChartRenderer {
  private chart: any

  constructor(chartInstance?: any) {
    this.chart = chartInstance
  }

  renderToDataUrl(option: any, width: number, height: number, pixelRatio = 2): string {
    return renderChartToDataUrl(option, width, height, pixelRatio, this.chart)
  }

  generateOption(
    chartType: string,
    tableData: IChartTableData,
    config: IChartConfig,
    subtype?: string
  ): any {
    return generateChartOption(chartType, tableData, config, subtype)
  }

  extractTableData(tableElement: any, range?: IChartDataRange): IChartTableData {
    return extractTableData(tableElement, range)
  }
}

/**
 * 图表插件接口（扩展 EditorPlugin，供宿主层通过 getPlugin 拿到渲染器实例）
 */
export interface ChartPlugin extends EditorPlugin {
  getRenderer(): IChartRenderer | null
  openDialog(): void
}

/**
 * 创建图表插件
 * @param options 插件选项
 * @returns 满足 EditorPlugin 契约的图表插件实例
 */
export function createChartPlugin(
  options?: { chart?: any }
): ChartPlugin {
  let renderer: ChartJsRenderer | null = null
  const dialog = new ChartDialog()
  let unsubscribeChartClick: (() => void) | null = null
  return {
    name: 'chart',
    install: (h) => {
      dialog.setHost(h)
      renderer = new ChartJsRenderer(options?.chart)
      registerChartRenderer(renderer)
      unsubscribeChartClick = h.getEventBus().on('chartClick', (data: any) => {
        dialog.show({
          chartId: data.chartId,
          chartType: data.chartType,
          subtype: data.subtype,
          dataSource: data.dataSource,
          config: data.config
        })
      })
    },
    commands: {
      requestInsertChart: () => dialog.show()
    },
    destroy: () => {
      unsubscribeChartClick?.()
      registerChartRenderer(null)
      dialog.hide()
      renderer = null
    },
    getRenderer: () => renderer,
    openDialog: () => dialog.show()
  }
}

