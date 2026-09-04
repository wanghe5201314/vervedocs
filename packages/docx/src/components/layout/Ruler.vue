<template>
  <div class="vervedocs-ruler" :class="{ 'ruler-visible': visible }" v-show="visible">
    <div class="ruler-corner"></div>
    <div class="ruler-h" ref="hRulerRef" @mousedown="onHMouseDown">
      <canvas ref="hCanvasRef"></canvas>
      <div
        class="ruler-margin-marker marker-left"
        :style="{ left: leftMarkerPx + 'px' }"
        @mousedown.stop="onMarkerMouseDown('left', $event)"
      >
        <span class="marker-stem"></span>
        <span class="marker-triangle marker-triangle-top"></span>
        <span class="marker-triangle marker-triangle-bottom"></span>
      </div>
      <div
        class="ruler-margin-marker marker-right"
        :style="{ left: rightMarkerPx + 'px' }"
        @mousedown.stop="onMarkerMouseDown('right', $event)"
      >
        <span class="marker-stem"></span>
        <span class="marker-triangle marker-triangle-top"></span>
        <span class="marker-triangle marker-triangle-bottom"></span>
      </div>
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
      >
        <span class="marker-line-v"></span>
        <span class="marker-cap-v marker-cap-v-left"></span>
        <span class="marker-cap-v marker-cap-v-right"></span>
      </div>
      <div
        class="ruler-margin-marker marker-bottom"
        :style="{ top: bottomMarkerPx + 'px' }"
        @mousedown.stop="onMarkerMouseDown('bottom', $event)"
      >
        <span class="marker-line-v"></span>
        <span class="marker-cap-v marker-cap-v-left"></span>
        <span class="marker-cap-v marker-cap-v-right"></span>
      </div>
      <div
        class="ruler-margin-indicator-v"
        :style="{ top: topMarkerPx + 'px', height: (bottomMarkerPx - topMarkerPx) + 'px' }"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

export interface IPageMetrics {
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
const RULER_THICKNESS = 20
const RULER_CORNER = 20
const H_RULER_BASELINE_Y = 16
const H_RULER_LABEL_Y = 2
const MINOR_DIVISIONS = 4

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

const setupCanvas = (
  canvas: HTMLCanvasElement,
  cssWidth: number,
  cssHeight: number
) => {
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.max(1, Math.round(cssWidth * dpr))
  canvas.height = Math.max(1, Math.round(cssHeight * dpr))
  canvas.style.width = `${cssWidth}px`
  canvas.style.height = `${cssHeight}px`
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.scale(dpr, dpr)
  return ctx
}

const drawHorizontalTick = (
  ctx: CanvasRenderingContext2D,
  x: number,
  tickHeight: number
) => {
  ctx.beginPath()
  ctx.moveTo(x, H_RULER_BASELINE_Y - tickHeight)
  ctx.lineTo(x, H_RULER_BASELINE_Y)
  ctx.stroke()
}

const drawRulerNumber = (
  ctx: CanvasRenderingContext2D,
  x: number,
  label: string
) => {
  ctx.fillText(label, x + 2, H_RULER_LABEL_Y)
}

const drawHRuler = () => {
  const canvas = hCanvasRef.value
  if (!canvas) return
  const pageWidthPx = effectiveWidth.value * scale.value
  const width = originX.value + pageWidthPx
  const ctx = setupCanvas(canvas, width, RULER_THICKNESS)
  if (!ctx) return
  const pageStartX = originX.value
  const pageEndX = pageStartX + pageWidthPx
  const leftMarginX = leftMarkerPx.value
  const rightMarginX = rightMarkerPx.value
  const cmStep = PX_PER_CM * scale.value
  const minorStep = cmStep / MINOR_DIVISIONS

  // 外部平灰底
  ctx.fillStyle = '#dcdcdc'
  ctx.fillRect(0, 0, width, RULER_THICKNESS)

  // 页面范围底板
  ctx.fillStyle = '#ececec'
  ctx.fillRect(pageStartX, 1, Math.max(pageEndX - pageStartX, 0), RULER_THICKNESS - 2)

  // 正文可书写区域更亮，边距区更暗
  ctx.fillStyle = '#f7f7f7'
  ctx.fillRect(leftMarginX, 1, Math.max(rightMarginX - leftMarginX, 0), RULER_THICKNESS - 2)
  ctx.fillStyle = '#e2e2e2'
  ctx.fillRect(pageStartX, 1, Math.max(leftMarginX - pageStartX, 0), RULER_THICKNESS - 2)
  ctx.fillRect(rightMarginX, 1, Math.max(pageEndX - rightMarginX, 0), RULER_THICKNESS - 2)

  // 顶部高光和底部阴影
  ctx.strokeStyle = '#fafafa'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(pageStartX, 0.5)
  ctx.lineTo(pageEndX, 0.5)
  ctx.stroke()
  ctx.strokeStyle = '#b7b7b7'
  ctx.beginPath()
  ctx.moveTo(pageStartX, RULER_THICKNESS - 0.5)
  ctx.lineTo(pageEndX, RULER_THICKNESS - 0.5)
  ctx.stroke()
  ctx.strokeStyle = '#c7c7c7'
  ctx.strokeRect(pageStartX + 0.5, 0.5, Math.max(pageEndX - pageStartX - 1, 0), RULER_THICKNESS - 1)

  // 细分刻度
  const startMinorIndex = Math.floor((pageStartX - leftMarginX) / minorStep) - 1
  const endMinorIndex = Math.ceil((pageEndX - leftMarginX) / minorStep) + 1
  ctx.strokeStyle = '#6f6f6f'
  for (let i = startMinorIndex; i <= endMinorIndex; i++) {
    const x = leftMarginX + i * minorStep
    if (x < pageStartX || x > pageEndX) continue
    const mod = Math.abs(i % MINOR_DIVISIONS)
    const tickHeight = mod === 0 ? 8 : mod === 2 ? 5 : 3
    drawHorizontalTick(ctx, Math.round(x) + 0.5, tickHeight)
  }

  // 每厘米分段线
  const startMajorIndex = Math.floor((pageStartX - leftMarginX) / cmStep) - 1
  const endMajorIndex = Math.ceil((pageEndX - leftMarginX) / cmStep) + 1
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.14)'
  for (let i = startMajorIndex; i <= endMajorIndex; i++) {
    const x = leftMarginX + i * cmStep
    if (x < pageStartX || x > pageEndX) continue
    ctx.beginPath()
    ctx.moveTo(Math.round(x) + 0.5, 1)
    ctx.lineTo(Math.round(x) + 0.5, H_RULER_BASELINE_Y)
    ctx.stroke()
  }

  // 数字：左侧倒数到 0，右侧从 0 递增
  ctx.fillStyle = '#3f3f3f'
  ctx.font = '12px Arial'
  ctx.textBaseline = 'top'
  for (let i = startMajorIndex; i <= endMajorIndex; i++) {
    const x = leftMarginX + i * cmStep
    if (x < pageStartX || x > pageEndX) continue
    drawRulerNumber(ctx, x, String(Math.abs(i)))
  }
}

const drawVRuler = () => {
  const canvas = vCanvasRef.value
  if (!canvas) return
  const height = effectiveHeight.value * scale.value
  const ctx = setupCanvas(canvas, RULER_THICKNESS, height)
  if (!ctx) return

  const pageStartY = 0
  const pageEndY = height
  ctx.fillStyle = '#dcdcdc'
  ctx.fillRect(0, 0, RULER_THICKNESS, height)

  ctx.fillStyle = '#ececec'
  ctx.fillRect(1, pageStartY, RULER_THICKNESS - 2, pageEndY - pageStartY)

  // 正文可书写区域更亮，上下边距区更暗
  ctx.fillStyle = '#f7f7f7'
  ctx.fillRect(1, topMarkerPx.value, RULER_THICKNESS - 2, Math.max(bottomMarkerPx.value - topMarkerPx.value, 0))
  ctx.fillStyle = '#e2e2e2'
  ctx.fillRect(1, pageStartY, RULER_THICKNESS - 2, Math.max(topMarkerPx.value - pageStartY, 0))
  ctx.fillRect(1, bottomMarkerPx.value, RULER_THICKNESS - 2, Math.max(pageEndY - bottomMarkerPx.value, 0))

  // 左侧高光和右侧阴影
  ctx.strokeStyle = '#fafafa'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0.5, pageStartY)
  ctx.lineTo(0.5, pageEndY)
  ctx.stroke()
  ctx.strokeStyle = '#b7b7b7'
  ctx.beginPath()
  ctx.moveTo(RULER_THICKNESS - 0.5, pageStartY)
  ctx.lineTo(RULER_THICKNESS - 0.5, pageEndY)
  ctx.stroke()
  ctx.strokeStyle = '#c7c7c7'
  ctx.strokeRect(0.5, pageStartY + 0.5, RULER_THICKNESS - 1, Math.max(pageEndY - pageStartY - 1, 0))

  ctx.strokeStyle = '#6f6f6f'
  ctx.fillStyle = '#3f3f3f'
  ctx.font = '10px Arial'
  ctx.textBaseline = 'top'

  const startY = topMarkerPx.value
  const cmStep = PX_PER_CM * scale.value
  const minorStep = cmStep / MINOR_DIVISIONS
  const totalCm = (height - startY) / cmStep
  for (let i = 0; i <= totalCm * MINOR_DIVISIONS; i++) {
    const y = startY + i * minorStep
    if (y > height) break
    const mod = i % MINOR_DIVISIONS
    const tickWidth = mod === 0 ? 8 : mod === 2 ? 5 : 3
    ctx.beginPath()
    ctx.moveTo(RULER_THICKNESS - tickWidth - 2, Math.round(y) + 0.5)
    ctx.lineTo(RULER_THICKNESS - 2, Math.round(y) + 0.5)
    ctx.stroke()
    if (mod === 0) {
      ctx.save()
      ctx.translate(4, y + 2)
      ctx.rotate(-Math.PI / 2)
      ctx.fillText(String(i / MINOR_DIVISIONS), 0, 0)
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
  width: 20px;
  height: 20px;
  background: #dcdcdc;
  border-right: 1px solid #bcbcbc;
  border-bottom: 1px solid #bcbcbc;
  z-index: 2;
}

.ruler-h {
  position: absolute;
  top: 0;
  left: 20px;
  height: 20px;
  background: #dcdcdc;
  border-bottom: 1px solid #bcbcbc;
  overflow: hidden;
  cursor: ew-resize;
}

.ruler-v {
  position: absolute;
  top: 20px;
  left: 0;
  width: 20px;
  background: #dcdcdc;
  border-right: 1px solid #bcbcbc;
  overflow: hidden;
  cursor: ns-resize;
}

.ruler-margin-marker {
  position: absolute;
  z-index: 3;
  pointer-events: auto;
}

.marker-left, .marker-right {
  top: 0;
  width: 12px;
  height: 20px;
  cursor: ew-resize;
  transform: translateX(-50%);
}

.marker-top, .marker-bottom {
  left: 0;
  width: 20px;
  height: 12px;
  cursor: ns-resize;
  transform: translateY(-50%);
}

.ruler-margin-indicator {
  position: absolute;
  top: 18px;
  height: 3px;
  background: rgba(0, 0, 0, 0.12);
  z-index: 2;
  pointer-events: none;
}

.ruler-margin-indicator-v {
  position: absolute;
  left: 18px;
  width: 3px;
  background: rgba(0, 0, 0, 0.12);
  z-index: 2;
  pointer-events: none;
}

.marker-stem {
  position: absolute;
  top: 5px;
  bottom: 5px;
  left: 50%;
  width: 1px;
  transform: translateX(-50%);
  background: #6f6f6f;
  box-shadow: 1px 0 0 rgba(255, 255, 255, 0.65);
}

.marker-triangle {
  position: absolute;
  left: 50%;
  width: 0;
  height: 0;
  transform: translateX(-50%);
}

.marker-triangle-top {
  top: 1px;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 0;
  border-bottom: 6px solid #ffffff;
  filter: drop-shadow(0 0 0 #6f6f6f) drop-shadow(0 1px 0 #6f6f6f);
}

.marker-triangle-bottom {
  bottom: 1px;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-bottom: 0;
  border-top: 6px solid #ffffff;
  filter: drop-shadow(0 0 0 #6f6f6f) drop-shadow(0 -1px 0 #6f6f6f);
}

.marker-left .marker-triangle-top,
.marker-left .marker-triangle-bottom,
.marker-right .marker-triangle-top,
.marker-right .marker-triangle-bottom {
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85);
}

.marker-line-v {
  position: absolute;
  left: 3px;
  right: 3px;
  top: 50%;
  height: 1px;
  transform: translateY(-50%);
  background: #7f7f7f;
}

.marker-cap-v {
  position: absolute;
  top: 50%;
  width: 7px;
  height: 10px;
  transform: translateY(-50%);
  background: linear-gradient(180deg, #ffffff 0%, #efefef 100%);
  border: 1px solid #7f7f7f;
  box-sizing: border-box;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.marker-cap-v-left {
  left: 1px;
  clip-path: polygon(0 50%, 45% 0, 100% 0, 100% 100%, 45% 100%);
}

.marker-cap-v-right {
  right: 1px;
  clip-path: polygon(0 0, 55% 0, 100% 50%, 55% 100%, 0 100%);
}

.ruler-margin-marker:hover {
  filter: brightness(0.96);
}
</style>
