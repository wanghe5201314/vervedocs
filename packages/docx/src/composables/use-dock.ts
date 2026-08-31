import { ref } from 'vue'
import { aiStateStore } from '@/stores/ai-state'

/**
 * 侧边栏停靠面板类型
 */
type DockKey = 'search' | 'catalog' | 'section' | 'ai' | 'revision' | ''

/**
 * 侧边栏停靠面板 composable
 * @param options 配置项
 * @returns 停靠面板状态与切换方法
 */
export function useDock() {
  const activeDock = ref<DockKey>('search')
  const sidebarPanelSize = ref(295)

  /** 关闭修订停靠面板（若当前处于修订面板） */
  const closeRevisionDock = () => {
    if (activeDock.value === 'revision') {
      activeDock.value = ''
    }
  }

  /**
   * 处理停靠面板选择切换
   * @param key 停靠面板标识
   */
  const handleDockSelect = (key: Exclude<DockKey, ''>) => {
    activeDock.value = key
    if (key === 'ai') {
      aiStateStore.setVisible(true)
    }
  }

  /** 关闭当前停靠面板 */
  const closeDock = () => {
    activeDock.value = ''
  }

  /** 关闭 AI 停靠面板（若当前处于 AI 面板） */
  const closeAIDock = () => {
    if (activeDock.value === 'ai') {
      activeDock.value = ''
      aiStateStore.setVisible(false)
    }
  }

  /**
   * 处理侧边栏宽度调整起始事件
   * @param e 鼠标按下事件
   */
  const handleResizeStart = (e: MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = sidebarPanelSize.value

    /**
     * 鼠标移动时更新侧边栏宽度
     * @param moveEvent 鼠标移动事件
     */
    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX
      const newWidth = Math.min(420, Math.max(300, startWidth + delta))
      sidebarPanelSize.value = newWidth
    }

    /** 鼠标抬起时结束宽度调整并清理监听 */
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  return {
    activeDock,
    sidebarPanelSize,
    closeRevisionDock,
    handleDockSelect,
    closeDock,
    closeAIDock,
    handleResizeStart
  }
}
