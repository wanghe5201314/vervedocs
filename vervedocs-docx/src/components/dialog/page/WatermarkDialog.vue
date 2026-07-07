<template>
  <el-dialog v-model="visible" title="水印设置" width="700px" :close-on-click-modal="false" class="app-dialog">
    <div class="watermark-body">
      <div class="wm-left">
        <el-form :model="watermarkForm" label-width="80px">
          <el-form-item label="内 容(T)">
            <div style="display: flex; gap: 8px;">
              <el-input v-model="watermarkForm.data" style="flex: 1;" />
              <el-select v-model="watermarkForm.data" style="width: 120px;">
                <el-option value="保密" label="保密" />
                <el-option value="严禁复制" label="严禁复制" />
                <el-option value="原件" label="原件" />
                <el-option value="样本" label="样本" />
                <el-option value="绝密" label="绝密" />
                <el-option value="紧急" label="紧急" />
              </el-select>
            </div>
          </el-form-item>
          <el-form-item label="字 体(F)">
            <el-select v-model="watermarkForm.font" style="width: 100%;">
              <el-option value="Microsoft YaHei" label="微软雅黑" />
              <el-option value="SimSun" label="宋体" />
              <el-option value="Arial" label="Arial" />
            </el-select>
          </el-form-item>
          <el-form-item label="字 号(S)">
            <el-select v-model="watermarkForm.size" style="width: 100%;">
              <el-option :value="120" label="自动" />
              <el-option :value="60" label="60" />
              <el-option :value="80" label="80" />
              <el-option :value="100" label="100" />
              <el-option :value="150" label="150" />
            </el-select>
          </el-form-item>
          <el-form-item label="颜 色(C)">
            <el-color-picker v-model="watermarkForm.color" style="width: 100%;" show-alpha />
          </el-form-item>
          <el-form-item label="透明度(O)">
            <el-slider v-model="watermarkForm.opacity" :min="0" :max="1" :step="0.1" :format-tooltip="(val: number) => Math.round(val * 100) + '%'" />
          </el-form-item>
          <el-form-item label="重复">
            <el-select v-model="watermarkForm.repeat" style="width: 100%;">
              <el-option :value="true" label="重复" />
              <el-option :value="false" label="不重复" />
            </el-select>
          </el-form-item>
          <el-form-item label="水平间隔">
            <el-input-number v-model="watermarkForm.gapX" :min="0" :max="1000" style="width: 100%;" />
          </el-form-item>
          <el-form-item label="垂直间隔">
            <el-input-number v-model="watermarkForm.gapY" :min="0" :max="1000" style="width: 100%;" />
          </el-form-item>
        </el-form>
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
        <div class="preview-label">预览</div>
      </div>
    </div>
    <template #footer>
      <el-button type="primary" @click="confirmWatermark">
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

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', data: WatermarkData): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const watermarkForm = ref<WatermarkData>({
  data: '严禁复制',
  font: 'Microsoft YaHei',
  size: 120,
  color: '#AEB5C0',
  opacity: 0.3,
  repeat: false,
  gapX: 10,
  gapY: 10
})

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
