<template>
  <a-modal v-model:open="visible" title="插入签名" width="580px" :maskClosable="false" class="app-dialog" @afterOpenChange="(open: boolean) => { if (open) initSignatureCanvas() }">
    <div class="signature-content">
      <div class="signature-operation">
        <a-button type="link" @click="signatureUndo" :disabled="signatureUndoStack.length <= 1">
          <UndoOutlined />
          <span>撤销</span>
        </a-button>
        <a-button type="link" @click="signatureClear">
          <DeleteOutlined />
          <span>清空</span>
        </a-button>
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
      <span style="color: red;font-size: 12px">说明：签名仅用于本系统，不具备法律效力.</span>
    </div>
    <template #footer>
      <a-button type="primary" @click="confirmSignature">
        <CheckOutlined />
        确定
      </a-button>
      <a-button @click="visible = false">
        <CloseOutlined />
        取消
      </a-button>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { UndoOutlined, DeleteOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons-vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', dataUrl: string): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const signatureCanvasRef = ref<HTMLCanvasElement | null>(null)
const signatureUndoStack = ref<ImageData[]>([])
const signatureIsDrawing = ref(false)
const signatureLastX = ref(0)
const signatureLastY = ref(0)
const signatureLinePoints = ref<[number, number][]>([])
const signaturePreTimeStamp = ref(0)

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

.signature-operation :deep(.ant-btn) {
  display: flex;
  align-items: center;
  gap: 4px;
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