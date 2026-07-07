<template>
  <el-dialog v-model="visible" title="自定义大小" width="480px" :close-on-click-modal="false" class="app-dialog">
    <div class="paper-size-body">
      <div class="ps-form-item">
        <el-select v-model="selectedPaperPreset" style="width: 100%;" @change="handlePaperPresetChange">
          <el-option
            v-for="preset in paperSizePresets"
            :key="preset.name"
            :value="preset.name"
            :label="preset.name"
          />
        </el-select>
      </div>
      <div class="ps-size-row">
        <div class="ps-size-item">
          <span class="ps-label">宽度(W):</span>
          <el-input-number
            v-model="customPaperSizeForm.width"
            :min="1"
            :max="100"
            :step="0.1"
            :precision="1"
            controls-position="right"
            size="small"
            style="width: 100px;"
          />
          <span class="ps-unit">厘米</span>
        </div>
        <div class="ps-size-item">
          <span class="ps-label">高度(E):</span>
          <el-input-number
            v-model="customPaperSizeForm.height"
            :min="1"
            :max="100"
            :step="0.1"
            :precision="1"
            controls-position="right"
            size="small"
            style="width: 100px;"
          />
          <span class="ps-unit">厘米</span>
        </div>
      </div>
    </div>
    <template #footer>
      <el-button type="primary" @click="confirmCustomPaperSize">
        <el-icon><Check /></el-icon>
        确定
      </el-button>
      <el-button @click="visible = false">
        <el-icon><Close /></el-icon>
        取消
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Check, Close } from '@element-plus/icons-vue'

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

// 厘米转像素：1cm = 37.8px，基于96DPI
const CM_TO_PX = 37.795275591 // 96 / 2.54

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
  width: 21,   // 默认A4宽度（厘米）
  height: 29.7 // 默认A4高度（厘米）
})

const handlePaperPresetChange = (presetName: string) => {
  const preset = paperSizePresets.find(p => p.name === presetName)
  if (preset) {
    customPaperSizeForm.value.width = preset.width
    customPaperSizeForm.value.height = preset.height
  }
}

const confirmCustomPaperSize = () => {
  // 将厘米转换为像素
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
