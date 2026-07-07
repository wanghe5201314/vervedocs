<template>
  <el-dialog v-model="visible" title="页码" width="360px" :close-on-click-modal="false" class="app-dialog">
    <div class="page-number-body">
      <div class="pn-form-item">
        <span class="pn-label">样式:</span>
        <el-select v-model="pageNumberForm.label" style="flex: 1;">
          <el-option
            v-for="style in PAGE_NUMBER_STYLES"
            :key="style.label"
            :value="style.label"
            :label="style.label"
          />
        </el-select>
      </div>
      <div class="pn-form-item">
        <span class="pn-label">位置:</span>
      </div>
      <div class="pn-position-selector">
        <div
          class="pn-position-item"
          :class="{ active: pageNumberForm.position === 'left' }"
          @click="pageNumberForm.position = 'left'"
        >
          <div class="pn-preview-page">
            <div class="pn-preview-line"></div>
            <div class="pn-preview-line"></div>
            <div class="pn-preview-line"></div>
            <div class="pn-preview-line short"></div>
            <div class="pn-preview-number left">1</div>
          </div>
          <span>左侧</span>
        </div>
        <div
          class="pn-position-item"
          :class="{ active: pageNumberForm.position === 'center' }"
          @click="pageNumberForm.position = 'center'"
        >
          <div class="pn-preview-page">
            <div class="pn-preview-line"></div>
            <div class="pn-preview-line"></div>
            <div class="pn-preview-line"></div>
            <div class="pn-preview-line short"></div>
            <div class="pn-preview-number center">1</div>
          </div>
          <span>居中</span>
        </div>
        <div
          class="pn-position-item"
          :class="{ active: pageNumberForm.position === 'right' }"
          @click="pageNumberForm.position = 'right'"
        >
          <div class="pn-preview-page">
            <div class="pn-preview-line"></div>
            <div class="pn-preview-line"></div>
            <div class="pn-preview-line"></div>
            <div class="pn-preview-line short"></div>
            <div class="pn-preview-number right">1</div>
          </div>
          <span>右侧</span>
        </div>
      </div>
    </div>
    <template #footer>
      <el-button type="primary" @click="confirmPageNumber">
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
import { PAGE_NUMBER_STYLES } from '@vervedoc/core'
import { Check, Close } from '@element-plus/icons-vue'

interface PageNumberData {
  format: string
  rowFlex: string
  disabled: boolean
  numberType?: any
}

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', data: PageNumberData): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const pageNumberForm = ref({
  label: PAGE_NUMBER_STYLES[0].label,
  position: 'center' // left, center, right
})

const confirmPageNumber = () => {
  const rowFlexMap: Record<string, string> = {
    'left': 'LEFT',
    'center': 'CENTER',
    'right': 'RIGHT'
  }
  const selectedStyle = PAGE_NUMBER_STYLES.find(s => s.label === pageNumberForm.value.label)
  if (selectedStyle) {
    emit('confirm', {
      format: selectedStyle.value,
      rowFlex: rowFlexMap[pageNumberForm.value.position],
      disabled: false,
      numberType: selectedStyle.numberType
    })
  }
  visible.value = false
}
</script>

<style scoped>
.page-number-body {
  padding: 10px 0;
}

.pn-form-item {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.pn-label {
  font-size: 14px;
  color: #606266;
  min-width: 50px;
}

.pn-position-selector {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 0 10px;
}

.pn-position-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.pn-position-item span {
  font-size: 12px;
  color: #606266;
}

.pn-position-item.active span {
  color: #409eff;
}

.pn-preview-page {
  width: 80px;
  height: 100px;
  border: 2px solid #dcdfe6;
  border-radius: 2px;
  background: #fff;
  padding: 8px;
  display: flex;
  flex-direction: column;
  position: relative;
  transition: all 0.2s;
}

.pn-position-item:hover .pn-preview-page {
  border-color: #c0c4cc;
}

.pn-position-item.active .pn-preview-page {
  border-color: #409eff;
  background: #ecf5ff;
}

.pn-preview-line {
  height: 4px;
  background: #dcdfe6;
  margin-bottom: 6px;
  border-radius: 1px;
}

.pn-preview-line.short {
  width: 60%;
}

.pn-preview-number {
  position: absolute;
  bottom: 6px;
  font-size: 10px;
  color: #909399;
}

.pn-preview-number.left {
  left: 8px;
}

.pn-preview-number.center {
  left: 50%;
  transform: translateX(-50%);
}

.pn-preview-number.right {
  right: 8px;
}
</style>
