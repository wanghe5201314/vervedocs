<template>
  <a-modal v-model:open="visible" title="页码" width="360px" :maskClosable="false" class="app-dialog">
    <div class="page-number-body">
      <div class="pn-form-item">
        <span class="pn-label">样式:</span>
        <a-select v-model:value="pageNumberForm.label" style="flex: 1;">
          <a-select-option
            v-for="style in PAGE_NUMBER_STYLES"
            :key="style.label"
            :value="style.label"
            :label="style.label"
          />
        </a-select>
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
      <a-button type="primary" @click="confirmPageNumber">
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
import { PAGE_NUMBER_STYLES } from '@vervedoc/core'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons-vue'

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
  position: 'center'
})

const confirmPageNumber = () => {
  const rowFlexMap: Record<string, string> = {
    'left': 'left',
    'center': 'center',
    'right': 'right'
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
  color: #1890ff;
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
  border-color: #1890ff;
  background: #e6f7ff;
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