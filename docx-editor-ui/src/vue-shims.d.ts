declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '@wanghe1995/docx-editor-chart' {
  export class EchartsChartRenderer {
    constructor(echartsInstance?: any)
    renderToDataUrl(option: any, width: number, height: number, pixelRatio?: number): string
    generateOption(chartType: string, tableData: any, config: any, subtype?: string): any
    extractTableData(tableElement: any, range?: any): any
  }
  export function createChartPlugin(options?: { echarts?: any }): (editor: any) => void
}