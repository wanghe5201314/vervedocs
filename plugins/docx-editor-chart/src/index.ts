/**
 * DocxEditor 图表插件
 * 基于 ECharts 实现图表渲染功能
 */
import type {
  IChartRenderer,
  IChartTableData,
  IChartDataRange,
  PluginFunction
} from '@vervedoc/docx-editor-schema'
import { renderChartToDataUrl } from './chartRenderer'
import { extractTableData, generateChartOption } from './chartDataExtractor'
import type { IChartConfig } from './chartDataExtractor'

// 确保 ECharts 图表类型注册（导入时立即执行）
import './chartRenderer'

/**
 * ECharts 图表渲染器实现
 */
export class EchartsChartRenderer implements IChartRenderer {
  private echarts: any

  constructor(echartsInstance?: any) {
    this.echarts = echartsInstance
  }

  /**
   * 将图表配置渲染为 DataURL 图片
   */
  renderToDataUrl(option: any, width: number, height: number, pixelRatio = 2): string {
    return renderChartToDataUrl(option, width, height, pixelRatio, this.echarts)
  }

  /**
   * 根据表格数据生成图表配置
   */
  generateOption(
    chartType: string,
    tableData: IChartTableData,
    config: IChartConfig,
    subtype?: string
  ): any {
    return generateChartOption(chartType, tableData, config, subtype)
  }

  /**
   * 从表格元素提取数据
   */
  extractTableData(tableElement: any, range?: IChartDataRange): IChartTableData {
    return extractTableData(tableElement, range)
  }
}

/**
 * 创建图表插件
 * @param options 插件选项
 * @returns 插件函数
 */
export function createChartPlugin(
  options?: { echarts?: any }
): PluginFunction<void> {
  return editor => {
    const renderer = new EchartsChartRenderer(options?.echarts)
    if (editor?.register?.registerChartRenderer) {
      editor.register.registerChartRenderer(renderer)
      return
    }

    // 兼容旧版插件接口，避免不同编辑器版本间直接崩溃
    if (editor?.capabilities?.chart?.register) {
      editor.capabilities.chart.register(renderer)
      return
    }

    console.warn('[docx-editor-chart] chart renderer register API not found on editor instance')
  }
}

// 导出类型
export type { IChartRenderer, IChartTableData, IChartConfig, IChartDataRange }
