/**
 * 图表渲染工具
 * 使用 Chart.js 将图表配置渲染为 DataURL 图片
 */
import Chart from './chart-lib'

/**
 * 将图表配置渲染为 DataURL 图片
 * @param config Chart.js 配置（type + data + options）
 * @param width 宽度
 * @param height 高度
 * @param pixelRatio 像素比例
 * @returns 渲染后的 PNG DataURL 字符串
 */
export const renderChartToDataUrl = (
  config: any,
  width: number,
  height: number,
  pixelRatio = 2,
  chartInstance?: any
): string => {
  const ChartCtor = chartInstance || Chart

  const canvas = document.createElement('canvas')
  canvas.width = width * pixelRatio
  canvas.height = height * pixelRatio
  const ctx = canvas.getContext('2d')!
  ctx.scale(pixelRatio, pixelRatio)

  const chart = new ChartCtor(ctx, {
    ...config,
    options: {
      ...config?.options,
      responsive: false,
      animation: false,
      devicePixelRatio: pixelRatio
    }
  })

  const dataUrl = chart.toBase64Image('image/png', 1)
  chart.destroy()
  canvas.remove()
  return dataUrl
}
