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
import { PAPER_SIZE_LIST } from '@vervedoc/core'

/** 纸张尺寸数据（像素） */
interface PaperSizeData {
  widthPx: number
  heightPx: number
}

/** 组件 props 定义 */
const props = defineProps<{
  modelValue: boolean
}>()

/** 组件 emits 定义 */
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', data: PaperSizeData): void
}>()

/** 弹窗可见性，双向绑定到 modelValue */
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

/** 厘米转像素的换算系数 */
const CM_TO_PX = 37.795275591

/** 纸张尺寸预设列表（由全局预设转换为厘米单位） */
const paperSizePresets = PAPER_SIZE_LIST.map(p => ({
  name: p.label.split(' ')[0],
  width: Number((p.width * 25.4 / 96).toFixed(1)),
  height: Number((p.height * 25.4 / 96).toFixed(1))
}))

/** 当前选中的纸张预设名称 */
const selectedPaperPreset = ref('A4')
/** 自定义纸张尺寸表单（厘米） */
const customPaperSizeForm = ref({
  width: 21,
  height: 29.7
})

/**
 * 切换纸张预设时同步宽高到表单
 * @param presetName 预设名称
 * @returns {void}
 */
const handlePaperPresetChange = (presetName: any) => {
  const name = String(presetName)
  const preset = paperSizePresets.find(p => p.name === name)
  if (preset) {
    customPaperSizeForm.value.width = preset.width
    customPaperSizeForm.value.height = preset.height
  }
}

/** 确认自定义纸张尺寸，转换为像素后触发 confirm 事件 */
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