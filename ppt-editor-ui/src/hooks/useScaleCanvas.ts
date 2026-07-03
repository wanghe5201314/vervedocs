import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore } from '@/store'

export default () => {
  const mainStore = useMainStore()
  const { canvasPercentage, canvasScale, canvasDragged } = storeToRefs(mainStore)

  // 100% = 填满容器，与 Office 默认视图一致
  const canvasScalePercentage = computed(() => Math.round(canvasPercentage.value) + '%')

  /**
   * 缩放画布百分比
   * @param command 缩放命令：放大、缩小
   */
  const scaleCanvas = (command: '+' | '-') => {
    let percentage = canvasPercentage.value
    const step = 5
    const max = 200
    const min = 30
    if (command === '+' && percentage <= max) percentage += step
    if (command === '-' && percentage >= min) percentage -= step

    mainStore.setCanvasPercentage(percentage)
  }

  /**
   * 设置画布缩放比例
   * canvasPercentage 控制画布占容器的比例：100 = 填满容器，50 = 一半，200 = 两倍
   * @param value 目标缩放百分比
   */
  const setCanvasScalePercentage = (value: number) => {
    mainStore.setCanvasPercentage(value)
  }

  /**
   * 重置画布尺寸和位置
   */
  const resetCanvas = () => {
    mainStore.setCanvasPercentage(100)
    if (canvasDragged) mainStore.setCanvasDragged(false)
  }

  return {
    canvasScalePercentage,
    setCanvasScalePercentage,
    scaleCanvas,
    resetCanvas,
  }
}