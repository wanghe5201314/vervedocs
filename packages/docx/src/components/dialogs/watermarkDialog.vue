<template>
  <VdDialog v-model:open="visible" :title="t('dialog.watermark.title')" width="700px" :maskClosable="false" class="app-dialog">
    <div class="watermark-body">
      <div class="wm-left">
        <a-form :model="watermarkForm" :label-col="{ style: { width: '80px' } }">
          <a-form-item :label="t('dialog.watermark.content')">
            <div style="display: flex; gap: 8px;">
              <a-input v-model:value="watermarkForm.data" size="small" style="flex: 1;"/>
              <a-select v-model:value="watermarkForm.data" size="small" style="width: 120px;">
                <a-select-option :value="t('dialog.watermark.confidential')" :label="t('dialog.watermark.confidential')" />
                <a-select-option :value="t('dialog.watermark.noCopy')" :label="t('dialog.watermark.noCopy')" />
                <a-select-option :value="t('dialog.watermark.original')" :label="t('dialog.watermark.original')" />
                <a-select-option :value="t('dialog.watermark.sample')" :label="t('dialog.watermark.sample')" />
                <a-select-option :value="t('dialog.watermark.topSecret')" :label="t('dialog.watermark.topSecret')" />
                <a-select-option :value="t('dialog.watermark.urgent')" :label="t('dialog.watermark.urgent')" />
              </a-select>
            </div>
          </a-form-item>
          <a-form-item :label="t('dialog.watermark.font')">
            <a-select v-model:value="watermarkForm.font" size="small" style="width: 100%;">
              <a-select-option v-for="f in fontList" :key="f.value" :value="f.value">{{ f.label }}</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item :label="t('dialog.watermark.fontSize')">
            <a-select v-model:value="watermarkForm.size" size="small" style="width: 100%;">
              <a-select-option v-for="s in sizeList"  :key="s.value" :value="s.value">{{ s.label }}</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item :label="t('dialog.watermark.color')">
            <input type="color" :value="watermarkForm.color" @change="(e: Event) => watermarkForm.color = (e.target as HTMLInputElement).value" style="width:40px;height:28px;border:1px solid #d9d9d9;border-radius:4px;cursor:pointer;padding:2px;" />
          </a-form-item>
          <a-form-item :label="t('dialog.watermark.opacity')">
            <a-slider v-model:value="watermarkForm.opacity" size="small" :min="0" :max="1" :step="0.1" />
          </a-form-item>
          <a-form-item :label="t('dialog.watermark.repeat')">
            <a-switch v-model:checked="watermarkForm.repeat" size="small"/>
            <span style="margin-left: 8px; color: #999; font-size: 12px;">{{ watermarkForm.repeat ? t('dialog.watermark.repeat') : t('dialog.watermark.noRepeat') }}</span>
          </a-form-item>
          <a-form-item :label="t('dialog.watermark.horizontalSpacing')">
            <a-input-number v-model:value="watermarkForm.gapX" size="small" :min="0" :max="1000" style="width: 100%;" />
          </a-form-item>
          <a-form-item :label="t('dialog.watermark.verticalSpacing')">
            <a-input-number v-model:value="watermarkForm.gapY" size="small" :min="0" :max="1000" style="width: 100%;" />
          </a-form-item>
        </a-form>
      </div>
      <div class="wm-right">
        <div class="wm-preview-box">
          <div class="wm-preview-text" :style="{
            fontFamily: watermarkForm.font,
            fontSize: (watermarkForm.size / 5) + 'px',
            color: watermarkForm.color,
            opacity: watermarkForm.opacity
          }">
            {{ watermarkForm.data }}
          </div>
        </div>
        <div class="preview-label">{{ t('common.preview') }}</div>
      </div>
    </div>
    <template #footer>
      <VdButton type="primary" icon="check" @click="confirmWatermark">{{ t('common.ok') }}</VdButton>
      <VdButton icon="close" @click="visible = false">{{ t('common.cancel') }}</VdButton>
    </template>
  </VdDialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { VdDialog, VdButton } from '@vervedoc/ui'
import { t } from '@/i18n'

import { EDITOR_FONT_OPTIONS, WATERMARK_SIZE_OPTIONS } from '@vervedoc/core'

const fontList = EDITOR_FONT_OPTIONS
const sizeList = WATERMARK_SIZE_OPTIONS

/** 水印数据结构 */
interface WatermarkData {
  data: string
  font: string
  size: number
  color: string
  opacity: number
  repeat: boolean
  gapX: number
  gapY: number
}

/** 组件 props 定义 */
const props = defineProps<{
  modelValue: boolean
}>()

/** 组件 emits 定义 */
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', data: WatermarkData): void
}>()

/** 弹窗可见性，双向绑定到 modelValue */
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

/** 水印表单数据 */
const watermarkForm = ref<WatermarkData>({
  data: t('dialog.watermark.defaultText'),
  font: 'Microsoft YaHei',
  size: 120,
  color: '#AEB5C0',
  opacity: 0.3,
  repeat: false,
  gapX: 10,
  gapY: 10
})

/** 确认水印设置并触发 confirm 事件 */
const confirmWatermark = () => {
  emit('confirm', { ...watermarkForm.value })
  visible.value = false
}
</script>

<style scoped>
.watermark-body {
  display: flex;
  gap: 30px;
}

.wm-left {
  flex: 1;
}

.wm-right {
  width: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.wm-preview-box {
  width: 180px;
  height: 220px;
  border: 1px solid #eee;
  background: #fdfdfd;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.wm-preview-text {
  transform: rotate(-45deg);
  white-space: nowrap;
}

.preview-label {
  margin-top: 10px;
  color: #999;
  font-size: 12px;
}
</style>
