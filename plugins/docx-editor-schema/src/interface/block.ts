import { BlockType } from '../enum/block'

export interface IIFrameBlock {
  src?: string
  srcdoc?: string
}

export interface IVideoBlock {
  src: string
  poster?: string  // 封面图
}

export interface IAudioBlock {
  src: string
  name?: string
  poster?: string  // 封面图/图标
}

export interface IChartBlock {
  chartType: 'bar' | 'line' | 'pie' | 'scatter' | 'radar'
  subtype?: string
  dataSource: {
    type: 'table' | 'manual'
    tableId?: string
    range?: {
      startTr: number
      endTr: number
      startTd: number
      endTd: number
    }
    manualData?: any
  }
  config: {
    title?: string
    xAxisLabel?: string
    yAxisLabel?: string
    showLegend?: boolean
    colors?: string[]
  }
}

export interface IBlock {
  type: BlockType
  iframeBlock?: IIFrameBlock
  videoBlock?: IVideoBlock
  audioBlock?: IAudioBlock
  chartBlock?: IChartBlock
}
