<template>
  <div class="remote-cursors-container">
    <div
      v-for="[userId, cursor] in cursorEntries"
      :key="userId"
      class="remote-cursor-wrapper"
      :style="getCursorStyle(cursor)"
    >
      <div
        class="remote-cursor-line"
        :style="{ backgroundColor: cursor.user.color }"
      ></div>
      <div
        class="remote-cursor-label"
        :style="{ backgroundColor: cursor.user.color }"
      >
        {{ cursor.user.userName }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import type { SimulatedCollabUser, RemoteCursorPosition } from '@/composables/use-collab-users'

interface CursorEntry {
  user: SimulatedCollabUser
  position: RemoteCursorPosition
}

const props = defineProps<{
  cursors: Map<string, { user: SimulatedCollabUser; position: RemoteCursorPosition }>
  editorArea: HTMLElement | null
  getEditorInstance: () => any
}>()

const positionList = ref<any[] | null>(null)

const cursorEntries = computed(() => {
  return Array.from(props.cursors.entries())
})

const getCursorStyle = (cursor: CursorEntry) => {
  const pos = cursor.position
  const area = props.editorArea
  if (!area || !positionList.value) return { display: 'none' }

  const pList = positionList.value
  if (pos.index < 0 || pos.index >= pList.length) return { display: 'none' }

  const elemPos = pList[pos.index]
  if (!elemPos?.coordinate) return { display: 'none' }

  const pageNo = elemPos.pageNo ?? 0
  const canvases = area.querySelectorAll('canvas[data-index]')
  const canvas = canvases[pageNo] as HTMLElement
  if (!canvas) return { display: 'none' }

  const canvasRect = canvas.getBoundingClientRect()
  const areaRect = area.getBoundingClientRect()

  const x = canvasRect.left - areaRect.left + area.scrollLeft + (elemPos.coordinate.leftTop?.[0] || 0)
  const y = canvasRect.top - areaRect.top + area.scrollTop + (elemPos.coordinate.leftTop?.[1] || 0)
  const height = elemPos.lineHeight || 16

  return {
    left: `${x}px`,
    top: `${y}px`,
    height: `${height}px`,
    display: 'block'
  }
}

let refreshTimer: number | null = null

const refreshPositions = () => {
  const instance = props.getEditorInstance()
  if (instance?.command) {
    positionList.value = instance.command.getPositionList?.() || null
  }
}

const startRefresh = () => {
  refreshPositions()
  refreshTimer = window.setInterval(refreshPositions, 500)
}

const stopRefresh = () => {
  if (refreshTimer) {
    window.clearInterval(refreshTimer)
    refreshTimer = null
  }
}

watch(() => props.cursors, () => {
  nextTick(refreshPositions)
}, { deep: true })

onMounted(() => { startRefresh() })
onBeforeUnmount(() => { stopRefresh() })

defineExpose({ refreshPositions })
</script>

<style scoped>
.remote-cursors-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
}

.remote-cursor-wrapper {
  position: absolute;
  pointer-events: none;
}

.remote-cursor-line {
  width: 2px;
  height: 100%;
  border-radius: 1px;
  animation: cursor-blink 1s step-end infinite;
}

.remote-cursor-label {
  position: absolute;
  top: -20px;
  left: 0;
  padding: 1px 6px;
  font-size: 11px;
  font-weight: 500;
  color: #fff;
  white-space: nowrap;
  border-radius: 2px;
  line-height: 18px;
  pointer-events: none;
  opacity: 0.9;
}

@keyframes cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
</style>
