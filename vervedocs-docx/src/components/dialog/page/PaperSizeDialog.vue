<template>
  <a-modal v-model:open="visible" title="自定义大小" width="480px" :maskClosable="false" class="app-dialog">
    <div class="paper-size-body">
      <div class="ps-form-item">
        <a-select v-model:value="selectedPaperPreset" style="width: 100%;" @change="handlePaperPresetChange">
          <a-select-option
            v-for="preset in paperSizePresets"
            :key="preset.name"
            :value="preset.name"
            :label="preset.name"
          />
        </a-select>
      </div>
      <div class="ps-size-row">
        <div class="ps-size-item">
          <span class="ps-label">宽度(W):</span>
          <a-input-number
            v-model:value="customPaperSizeForm.width"
            :min="1"
            :max="100"
            :step="0.1"
            :precision="1"
            :size="'small'"
            style="width: 100px;"
          />
          <span class="ps-unit">厘米</span>
        </div>
        <div class="ps-size-item">
          <span class="ps-label">高度(E):</span>
          <a-input-number
            v-model:value="customPaperSizeForm.height"
            :min="1"
            :max="100"
            :step="0.1"
            :precision="1"
            :size="'small'"
            style="width: 100px;"
          />
          <span class="ps-unit">厘米</span>
        </div>
      </div>
    </div>
    <template #footer>
      <a-button type="primary" @click="confirmCustomPaperSize">
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
import { ref, computed } from 'vue'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons-vue'

interface PaperSizeData {
  widthPx: number
  heightPx: number
}

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', data: PaperSizeData): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const CM_TO_PX = 37.795275591

const paperSizePresets = [
  { name: 'A4', width: 21, height: 29.7 },
  { name: 'A3', width: 29.7, height: 42 },
  { name: 'A5', width: 14.8, height: 21 },
  { name: 'B4', width: 25, height: 35.3 },
  { name: 'B5', width: 17.6, height: 25 },
  { name: 'Letter', width: 21.6, height: 27.9 },
  { name: 'Legal', width: 21.6, height: 35.6 },
  { name: '16开', width: 18.4, height: 26 },
  { name: '32开', width: 14.6, height: 19.5 }
]

const selectedPaperPreset = ref('A4')
const customPaperSizeForm = ref({
  width: 21,
  height: 29.7
})

const handlePaperPresetChange = (presetName: any) => {
  const name = String(presetName)
  const preset = paperSizePresets.find(p => p.name === name)
  if (preset) {
    customPaperSizeForm.value.width = preset.width
    customPaperSizeForm.value.height = preset.height
  }
}

const confirmCustomPaperSize = () => {
  const widthPx = Math.round(customPaperSizeForm.value.width * CM_TO_PX)
  const heightPx = Math.round(customPaperSizeForm.value.height * CM_TO_PX)
  emit('confirm', { widthPx, heightPx })
  visible.value = false
}
</script>

<style scoped>
.paper-size-body {
  padding: 10px 0;
}

.ps-form-item {
  margin-bottom: 16px;
}

.ps-size-row {
  display: flex;
  gap: 20px;
}

.ps-size-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ps-label {
  font-size: 13px;
  color: #606266;
  min-width: 50px;
}

.ps-unit {
  font-size: 12px;
  color: #909399;
}
</style>