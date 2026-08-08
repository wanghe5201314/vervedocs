import { Ref, ref, nextTick } from 'vue'
import { aiStateStore } from '@/stores/ai-state'

type DockKey = 'search' | 'catalog' | 'section' | 'ai' | 'revision' | ''

export function useDock(options: {
  catalogRef: Ref<any>
}) {
  const { catalogRef } = options
  const activeDock = ref<DockKey>('search')
  const sidebarPanelSize = ref(310)
  const cachedCatalog = ref<any[]>([])

  const closeRevisionDock = () => {
    if (activeDock.value === 'revision') {
      activeDock.value = ''
    }
  }

  const handleDockSelect = (key: Exclude<DockKey, ''>) => {
    activeDock.value = key
    if (key === 'catalog') {
      void nextTick(() => {
        catalogRef.value?.switchToCatalogTab?.()
        if (cachedCatalog.value.length > 0) {
          catalogRef.value?.updateCatalog?.(cachedCatalog.value)
        }
      })
    }
    if (key === 'section') {
      void nextTick(() => catalogRef.value?.switchToSectionTab?.())
    }
    if (key === 'ai') {
      aiStateStore.setVisible(true)
    }
  }

  const closeDock = () => {
    activeDock.value = ''
  }

  const closeAIDock = () => {
    if (activeDock.value === 'ai') {
      activeDock.value = ''
      aiStateStore.setVisible(false)
    }
  }

  const handleResizeStart = (e: MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = sidebarPanelSize.value

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX
      const newWidth = Math.min(400, Math.max(300, startWidth + delta))
      sidebarPanelSize.value = newWidth
    }

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
    cachedCatalog,
    closeRevisionDock,
    handleDockSelect,
    closeDock,
    closeAIDock,
    handleResizeStart
  }
}