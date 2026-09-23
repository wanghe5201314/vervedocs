<template>
  <VdDialog v-model:open="visible" :title="t('dialog.signature.title')" width="580px" :maskClosable="false" class="app-dialog" @afterOpenChange="(open: boolean) => { if (open) initSignatureCanvas() }">
    <div class="signature-content">
      <div class="signature-operation">
        <VdButton type="link" icon="undo" @click="signatureUndo" :disabled="signatureUndoStack.length <= 1">{{ t('dialog.signature.undo') }}</VdButton>
        <VdButton type="link" icon="delete-outline" @click="signatureClear">{{ t('dialog.signature.clear') }}</VdButton>
      </div>
      <div class="signature-canvas-wrapper">
        <canvas
          ref="signatureCanvasRef"
          width="780"
          height="360"
          @mousedown="signatureStartDraw"
          @mousemove="signatureDraw"
          @mouseup="signatureStopDraw"
          @mouseleave="signatureStopDraw"
        ></canvas>
      </div>
      <span style="color: red;font-size: 12px">{{ t('dialog.signature.hint') }}</span>
    </div>
    <template #footer>
      <VdButton type="primary" icon="check" @click="confirmSignature">{{ t('common.ok') }}</VdButton>
      <VdButton icon="close" @click="visible = false">{{ t('common.cancel') }}</VdButton>
    </template>
  </VdDialog>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { VdDialog, VdButton } from '@vervedoc/ui'
import { t } from '@/i18n'


/** 组件 props 定义 */
const props = defineProps<{
  modelValue: boolean
}>()

/** 组件 emits 定义 */
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', dataUrl: string): void
}>()

/** 弹窗可见性，双向绑定到 modelValue */
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

/** 签名画布 DOM 引用 */
const signatureCanvasRef = ref<HTMLCanvasElement | null>(null)
/** 撤销栈，保存每一笔的 ImageData */
const signatureUndoStack = ref<ImageData[]>([])
/** 是否正在绘制 */
const signatureIsDrawing = ref(false)
/** 上一笔的 x 坐标 */
const signatureLastX = ref(0)
/** 上一笔的 y 坐标 */
const signatureLastY = ref(0)
/** 当前笔画的点集合 */
const signatureLinePoints = ref<[number, number][]>([])
/** 上一帧时间戳，用于计算绘制速度 */
const signaturePreTimeStamp = ref(0)

/** 初始化签名画布：清空内容、重置上下文与撤销栈 */
const initSignatureCanvas = () => {
  nextTick(() => {
    if (signatureCanvasRef.value) {
      const ctx = signatureCanvasRef.value.getContext('2d', { willReadFrequently: true })
      if (ctx) {
        ctx.clearRect(0, 0, 780, 360)
        ctx.lineCap = 'round'
        ctx.lineWidth = 2
        signatureUndoStack.value = []
        signatureLinePoints.value = []
      }
    }
  })
}

/**
 * 鼠标按下时开始绘制
 * @param e 鼠标事件
 * @returns {void}
 */
const signatureStartDraw = (e: MouseEvent) => {
  signatureIsDrawing.value = true
  const canvas = signatureCanvasRef.value
  if (canvas) {
    const rect = canvas.getBoundingClientRect()
    signatureLastX.value = (e.clientX - rect.left) * 2
    signatureLastY.value = (e.clientY - rect.top) * 2
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.lineWidth = 2
    }
  }
}

/**
 * 鼠标移动时绘制签名（根据速度动态调整线宽）
 * @param e 鼠标事件
 * @returns {void}
 */
const signatureDraw = (e: MouseEvent) => {
  if (!signatureIsDrawing.value) return
  const canvas = signatureCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const rect = canvas.getBoundingClientRect()
  const x = (e.clientX - rect.left) * 2
  const y = (e.clientY - rect.top) * 2

  const curTimestamp = performance.now()
  const dx = x - signatureLastX.value
  const dy = y - signatureLastY.value
  const distance = Math.sqrt(dx * dx + dy * dy)
  const speed = distance / (curTimestamp - signaturePreTimeStamp.value + 1)
  const targetLineWidth = Math.min(5, Math.max(1, 5 - speed * 3))
  ctx.lineWidth = ctx.lineWidth * 0.8 + targetLineWidth * 0.2

  ctx.beginPath()
  ctx.moveTo(signatureLastX.value, signatureLastY.value)
  ctx.lineTo(x, y)
  ctx.stroke()

  signatureLastX.value = x
  signatureLastY.value = y
  signatureLinePoints.value.push([x / 2, y / 2])
  signaturePreTimeStamp.value = curTimestamp
}

/** 鼠标抬起/离开时结束绘制，并将当前画面压入撤销栈 */
const signatureStopDraw = () => {
  if (signatureIsDrawing.value && signatureCanvasRef.value) {
    const ctx = signatureCanvasRef.value.getContext('2d')
    if (ctx && signatureLinePoints.value.length > 0) {
      const imageData = ctx.getImageData(0, 0, 780, 360)
      signatureUndoStack.value.push(imageData)
    }
  }
  signatureIsDrawing.value = false
}

/** 撤销上一笔 */
const signatureUndo = () => {
  if (signatureUndoStack.value.length > 0 && signatureCanvasRef.value) {
    signatureUndoStack.value.pop()
    const ctx = signatureCanvasRef.value.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, 780, 360)
      if (signatureUndoStack.value.length > 0) {
        ctx.putImageData(signatureUndoStack.value[signatureUndoStack.value.length - 1], 0, 0)
      }
    }
  }
}

/** 清空签名画布 */
const signatureClear = () => {
  if (signatureCanvasRef.value) {
    const ctx = signatureCanvasRef.value.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, 780, 360)
      signatureUndoStack.value = []
      signatureLinePoints.value = []
    }
  }
}

/** 确认签名，导出为 PNG Data URL 并触发 confirm 事件 */
const confirmSignature = () => {
  if (!signatureCanvasRef.value || signatureLinePoints.value.length === 0) {
    visible.value = false
    return
  }

  const canvas = signatureCanvasRef.value
  const dataUrl = canvas.toDataURL('image/png')
  emit('confirm', dataUrl)
  visible.value = false
}
</script>

<style scoped>
.signature-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.signature-operation {
  display: flex;
  gap: 16px;
}


.signature-canvas-wrapper {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
}

.signature-canvas-wrapper canvas {
  width: 100%;
  height: 180px;
  background: #f5f7fa;
  cursor: crosshair;
  display: block;
}
</style>