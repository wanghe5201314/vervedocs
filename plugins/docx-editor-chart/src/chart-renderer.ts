/**
 * 图表渲染工具
 * 使用 ECharts 将图表配置渲染为 DataURL 图片
 */
import echartsLib from './echarts'

/**
 * 将图表配置渲染为 DataURL 图片
 * @param option ECharts 配置
 * @param width 宽度
 * @param height 高度
 * @param pixelRatio 像素比例
 * @param echartsInstance 可选的 echarts 实例（用于自定义版本）
 */
export const renderChartToDataUrl = (
  option: any,
  width: number,
  height: number,
  pixelRatio = 2,
  echartsInstance?: any
): string => {
  const echarts = echartsInstance || echartsLib

  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-10000px'
  container.style.top = '-10000px'
  container.style.width = `${width}px`
  container.style.height = `${height}px`
  container.style.pointerEvents = 'none'
  document.body.appendChild(container)

  const chart = echarts.init(container, undefined, {
    renderer: 'canvas',
    width,
    height
  })

  chart.setOption({ ...(option || {}), animation: false }, true)

  const dataUrl = chart.getDataURL({
    type: 'png',
    pixelRatio,
    backgroundColor: '#ffffff'
  })

  chart.dispose()
  container.remove()
  return dataUrl
}
