<template>
  <div class="vervedocs-ruler" :class="{ 'ruler-visible': visible }" v-show="visible">
    <div class="ruler-corner"></div>
    <div class="ruler-h" ref="hRulerRef" @mousedown="onHMouseDown">
      <canvas ref="hCanvasRef"></canvas>
      <div
        class="ruler-margin-marker marker-left"
        :style="{ left: leftMarkerPx + 'px' }"
        @mousedown.stop="onMarkerMouseDown('left', $event)"
      ></div>
      <div
        class="ruler-margin-marker marker-right"
        :style="{ left: rightMarkerPx + 'px' }"
        @mousedown.stop="onMarkerMouseDown('right', $event)"
      ></div>
      <div
        class="ruler-margin-indicator"
        :style="{ left: leftMarkerPx + 'px', width: (rightMarkerPx - leftMarkerPx) + 'px' }"
      ></div>
    </div>
    <div class="ruler-v" ref="vRulerRef" @mousedown="onVMouseDown">
      <canvas ref="vCanvasRef"></canvas>
      <div
        class="ruler-margin-marker marker-top"
        :style="{ top: topMarkerPx + 'px' }"
        @mousedown.stop="onMarkerMouseDown('top', $event)"
      ></div>
      <div
        class="ruler-margin-marker marker-bottom"
        :style="{ top: bottomMarkerPx + 'px' }"
        @mousedown.stop="onMarkerMouseDown('bottom', $event)"
      ></div>
      <div
        class="ruler-margin-indicator-v"
        :style="{ top: topMarkerPx + 'px', height: (bottomMarkerPx - topMarkerPx) + 'px' }"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

interface IPageMetrics {
  width: number
  height: number
  margins: number[]
  scale: number
  paperDirection: 'vertical' | 'horizontal'
  pageOffsetLeft: number
}

const props = defineProps<{
  visible: boolean
  getPageMetrics: () => IPageMetrics | null
  setMargins: (margins: number[]) => void
  containerEl: HTMLElement | null
}>()

const hRulerRef = ref<HTMLDivElement | null>(null)
const vRulerRef = ref<HTMLDivElement | null>(null)
const hCanvasRef = ref<HTMLCanvasElement | null>(null)
const vCanvasRef = ref<HTMLCanvasElement | null>(null)

const pageWidth = ref(794)
const pageHeight = ref(1123)
const margins = ref<number[]>([113, 79, 113, 79])
const scale = ref(1)
const paperDirection = ref<'vertical' | 'horizontal'>('vertical')
const pageOffsetLeft = ref(0)

const PX_PER_CM = 37.795
const RULER_THICKNESS = 18
const RULER_CORNER = 18

const isHorizontal = computed(() => paperDirection.value === 'horizontal')
const effectiveWidth = computed(() => isHorizontal.value ? pageHeight.value : pageWidth.value)
const effectiveHeight = computed(() => isHorizontal.value ? pageWidth.value : pageHeight.value)

const leftMargin = computed(() => margins.value[3] || 79)
const rightMargin = computed(() => margins.value[1] || 79)
const topMargin = computed(() => margins.value[0] || 113)
const bottomMargin = computed(() => margins.value[2] || 113)

const originX = computed(() => Math.max(pageOffsetLeft.value - RULER_CORNER, 0))

const leftMarkerPx = computed(() => originX.value + leftMargin.value * scale.value)
const rightMarkerPx = computed(() => originX.value + (effectiveWidth.value - rightMargin.value) * scale.value)
const topMarkerPx = computed(() => topMargin.value * scale.value)
const bottomMarkerPx = computed(() => (effectiveHeight.value - bottomMargin.value) * scale.value)

const refreshMetrics = () => {
  const m = props.getPageMetrics?.()
  if (!m) return
  pageWidth.value = m.width || 794
  pageHeight.value = m.height || 1123
  margins.value = m.margins && m.margins.length === 4 ? [...m.margins] : margins.value
  scale.value = m.scale || 1
  paperDirection.value = m.paperDirection || 'vertical'
  pageOffsetLeft.value = m.pageOffsetLeft || 0
  drawHRuler()
  drawVRuler()
}

const drawHRuler = () => {
  const canvas = hCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const pageWidthPx = effectiveWidth.value * scale.value
  const width = originX.value + pageWidthPx
  const dpr = window.devicePixelRatio || 1
  canvas.width = width * dpr
  canvas.height = RULER_THICKNESS * dpr
  canvas.style.width = width + 'px'
  canvas.style.height = RULER_THICKNESS + 'px'
  ctx.scale(dpr, dpr)

  ctx.fillStyle = '#fafafa'
  ctx.fillRect(0, 0, width, RULER_THICKNESS)

  ctx.strokeStyle = '#999'
  ctx.fillStyle = '#666'
  ctx.font = '9px Arial'
  ctx.textBaseline = 'top'

  const ox = originX.value
  const totalCm = pageWidthPx / PX_PER_CM
  for (let i = 0; i <= totalCm; i++) {
    const x = ox + i * PX_PER_CM
    if (x > width) break
    if (x < 0) continue
    ctx.beginPath()
    ctx.moveTo(x, RULER_THICKNESS - (i % 5 === 0 ? 10 : 6))
    ctx.lineTo(x, RULER_THICKNESS)
    ctx.stroke()
    if (i % 2 === 0) {
      ctx.fillText(String(i), x + 2, 1)
    }
  }
  for (let i = 0; i <= totalCm * 2; i++) {
    const x = ox + (i * PX_PER_CM) / 2
    if (x > width) break
    if (x < 0) continue
    ctx.beginPath()
    ctx.moveTo(x, RULER_THICKNESS - 3)
    ctx.lineTo(x, RULER_THICKNESS)
    ctx.stroke()
  }
}

const drawVRuler = () => {
  const canvas = vCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const height = effectiveHeight.value * scale.value
  const dpr = window.devicePixelRatio || 1
  canvas.width = RULER_THICKNESS * dpr
  canvas.height = height * dpr
  canvas.style.width = RULER_THICKNESS + 'px'
  canvas.style.height = height + 'px'
  ctx.scale(dpr, dpr)

  ctx.fillStyle = '#fafafa'
  ctx.fillRect(0, 0, RULER_THICKNESS, height)

  ctx.strokeStyle = '#999'
  ctx.fillStyle = '#666'
  ctx.font = '9px Arial'
  ctx.textBaseline = 'top'

  const totalCm = height / PX_PER_CM
  for (let i = 0; i <= totalCm; i++) {
    const y = i * PX_PER_CM
    if (y > height) break
    ctx.beginPath()
    ctx.moveTo(RULER_THICKNESS - (i % 5 === 0 ? 10 : 6), y)
    ctx.lineTo(RULER_THICKNESS, y)
    ctx.stroke()
    if (i % 2 === 0) {
      ctx.save()
      ctx.translate(2, y + 2)
      ctx.rotate(-Math.PI / 2)
      ctx.fillText(String(i), 0, 0)
      ctx.restore()
    }
  }
}

let dragging: 'left' | 'right' | 'top' | 'bottom' | null = null
let startX = 0
let startY = 0
let startMargin = 0

const onMarkerMouseDown = (type: 'left' | 'right' | 'top' | 'bottom', e: MouseEvent) => {
  dragging = type
  startX = e.clientX
  startY = e.clientY
  if (type === 'left') startMargin = leftMargin.value
  else if (type === 'right') startMargin = rightMargin.value
  else if (type === 'top') startMargin = topMargin.value
  else if (type === 'bottom') startMargin = bottomMargin.value
  document.addEventListener('mousemove', onMarkerMouseMove)
  document.addEventListener('mouseup', onMarkerMouseUp)
  e.preventDefault()
}

const onMarkerMouseMove = (e: MouseEvent) => {
  if (!dragging) return
  const dx = (e.clientX - startX) / scale.value
  const dy = (e.clientY - startY) / scale.value
  const next = [...margins.value]
  const MIN = 10
  const MAX_H = effectiveWidth.value / 2 - 20
  const MAX_V = effectiveHeight.value / 2 - 20
  if (dragging === 'left') {
    next[3] = Math.max(MIN, Math.min(MAX_H, startMargin + dx))
  } else if (dragging === 'right') {
    next[1] = Math.max(MIN, Math.min(MAX_H, startMargin - dx))
  } else if (dragging === 'top') {
    next[0] = Math.max(MIN, Math.min(MAX_V, startMargin + dy))
  } else if (dragging === 'bottom') {
    next[2] = Math.max(MIN, Math.min(MAX_V, startMargin - dy))
  }
  margins.value = next
  props.setMargins(next)
}

const onMarkerMouseUp = () => {
  dragging = null
  document.removeEventListener('mousemove', onMarkerMouseMove)
  document.removeEventListener('mouseup', onMarkerMouseUp)
}

const onHMouseDown = (e: MouseEvent) => {
  if (!hRulerRef.value) return
  const rect = hRulerRef.value.getBoundingClientRect()
  const x = (e.clientX - rect.left - originX.value) / scale.value
  const leftDist = Math.abs(x - leftMargin.value)
  const rightDist = Math.abs(x - (effectiveWidth.value - rightMargin.value))
  if (leftDist < rightDist) {
    onMarkerMouseDown('left', e)
  } else {
    onMarkerMouseDown('right', e)
  }
}

const onVMouseDown = (e: MouseEvent) => {
  if (!vRulerRef.value) return
  const rect = vRulerRef.value.getBoundingClientRect()
  const y = (e.clientY - rect.top) / scale.value
  const topDist = Math.abs(y - topMargin.value)
  const bottomDist = Math.abs(y - (effectiveHeight.value - bottomMargin.value))
  if (topDist < bottomDist) {
    onMarkerMouseDown('top', e)
  } else {
    onMarkerMouseDown('bottom', e)
  }
}

/* eslint-disable no-undef */
let resizeObserver: ResizeObserver | null = null
/* eslint-enable no-undef */

watch(() => props.visible, (v) => {
  if (v) {
    nextTick(() => {
      refreshMetrics()
    })
  }
})

watch(() => props.containerEl, (el) => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (el && typeof window !== 'undefined' && window.ResizeObserver) {
    resizeObserver = new window.ResizeObserver(() => {
      if (props.visible) refreshMetrics()
    })
    resizeObserver.observe(el)
  }
}, { immediate: true })

onMounted(() => {
  nextTick(() => refreshMetrics())
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  document.removeEventListener('mousemove', onMarkerMouseMove)
  document.removeEventListener('mouseup', onMarkerMouseUp)
})

defineExpose({ refreshMetrics })
</script>

<style scoped>
.vervedocs-ruler {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 5;
  pointer-events: none;
}

.vervedocs-ruler.ruler-visible {
  pointer-events: auto;
}

.ruler-corner {
  position: absolute;
  top: 0;
  left: 0;
  width: 18px;
  height: 18px;
  background: #f0f0f0;
  border-right: 1px solid #d9d9d9;
  border-bottom: 1px solid #d9d9d9;
  z-index: 2;
}

.ruler-h {
  position: absolute;
  top: 0;
  left: 18px;
  height: 18px;
  background: #fafafa;
  border-bottom: 1px solid #d9d9d9;
  overflow: hidden;
  cursor: ew-resize;
}

.ruler-v {
  position: absolute;
  top: 18px;
  left: 0;
  width: 18px;
  background: #fafafa;
  border-right: 1px solid #d9d9d9;
  overflow: hidden;
  cursor: ns-resize;
}

.ruler-margin-marker {
  position: absolute;
  background: #4f87ff;
  z-index: 3;
}

.marker-left, .marker-right {
  top: 0;
  width: 3px;
  height: 18px;
  cursor: ew-resize;
}

.marker-top, .marker-bottom {
  left: 0;
  width: 18px;
  height: 3px;
  cursor: ns-resize;
}

.ruler-margin-indicator {
  position: absolute;
  top: 14px;
  height: 4px;
  background: rgba(79, 135, 255, 0.3);
  z-index: 2;
  pointer-events: none;
}

.ruler-margin-indicator-v {
  position: absolute;
  left: 14px;
  width: 4px;
  background: rgba(79, 135, 255, 0.3);
  z-index: 2;
  pointer-events: none;
}

.ruler-margin-marker:hover {
  background: #1668cc;
}
</style>