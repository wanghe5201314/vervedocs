<template>
  <VdDialog v-model:open="visible" width="600px" :closable="false" class="insert-table-dialog app-dialog">
    <template #title>
      <div class="custom-dialog-header">
        <AppstoreOutlined class="title-icon" />
        <span>{{ t('dialog.table.title') }}</span>
      </div>
    </template>
    <div class="insert-table-body">
      <div class="setting-section">
        <div class="group-title">
          <span>{{ t('dialog.table.size') }}</span>
          <div class="line"></div>
        </div>
        <div class="table-size-container">
          <div class="size-item">
            <div class="size-label">{{ t('dialog.table.columns') }}</div>
            <a-input-number v-model:value="insertTableForm.cols" :min="1" :max="50" style="width: 150px;" />
          </div>
          <div class="size-item">
            <div class="size-label">{{ t('dialog.table.rows') }}</div>
            <a-input-number v-model:value="insertTableForm.rows" :min="1" :max="100" style="width: 150px;" />
          </div>
        </div>
      </div>

      <a-divider style="margin: 20px 0;" />

      <div class="setting-section">
        <div class="group-title">
          <span>{{ t('dialog.table.borderSettings') }}</span>
          <div class="line"></div>
        </div>
        <div class="border-setting-content">
          <div class="left-panel">
            <div
              class="option-item"
              :class="{ active: selectedOption === 'none' }"
              @click="selectedOption = 'none'"
            >
              <FileOutlined class="option-icon" />
              <span>{{ t('dialog.table.none') }}</span>
            </div>
            <div
              class="option-item"
              :class="{ active: selectedOption === 'box' }"
              @click="selectedOption = 'box'"
            >
              <BorderOutlined class="option-icon" />
              <span>{{ t('dialog.table.box') }}</span>
            </div>
            <div
              class="option-item"
              :class="{ active: selectedOption === 'all' }"
              @click="selectedOption = 'all'"
            >
              <AppstoreOutlined class="option-icon" />
              <span>{{ t('dialog.table.all') }}</span>
            </div>
            <div
              class="option-item"
              :class="{ active: selectedOption === 'grid' }"
              @click="selectedOption = 'grid'"
            >
              <AppstoreOutlined class="option-icon" />
              <span>{{ t('dialog.table.grid') }}</span>
            </div>
            <div
              class="option-item"
              :class="{ active: selectedOption === 'custom' }"
              @click="selectedOption = 'custom'"
            >
              <EditOutlined class="option-icon" />
              <span>{{ t('dialog.table.custom') }}</span>
            </div>
          </div>

          <div class="right-panel">
            <div class="setting-group">
              <div class="setting-label">{{ t('dialog.table.lineStyle') }}</div>
              <div class="line-type-list">
                <div
                  class="line-type-item"
                  :class="{ active: selectedLineType === 'solid' }"
                  @click="selectedLineType = 'solid'"
                >
                  <div class="line-preview solid"></div>
                </div>
                <div
                  class="line-type-item"
                  :class="{ active: selectedLineType === 'dashed' }"
                  @click="selectedLineType = 'dashed'"
                >
                  <div class="line-preview dashed"></div>
                </div>
                <div
                  class="line-type-item"
                  :class="{ active: selectedLineType === 'dotted' }"
                  @click="selectedLineType = 'dotted'"
                >
                  <div class="line-preview dotted"></div>
                </div>
                <div
                  class="line-type-item"
                  :class="{ active: selectedLineType === 'double' }"
                  @click="selectedLineType = 'double'"
                >
                  <div class="line-preview double"></div>
                </div>
                <div
                  class="line-type-item"
                  :class="{ active: selectedLineType === 'dash-dot' }"
                  @click="selectedLineType = 'dash-dot'"
                >
                  <div class="line-preview dash-dot"></div>
                </div>
                <div
                  class="line-type-item"
                  :class="{ active: selectedLineType === 'dash-dot-dot' }"
                  @click="selectedLineType = 'dash-dot-dot'"
                >
                  <div class="line-preview dash-dot-dot"></div>
                </div>
              </div>
            </div>

            <div class="setting-group">
              <div class="setting-label">{{ t('dialog.table.color') }}</div>
              <div class="color-selector">
                <input
                  type="color"
                  :value="selectedColor"
                  @change="(e: Event) => selectedColor = (e.target as HTMLInputElement).value"
                  style="width:40px;height:28px;border:1px solid #d9d9d9;border-radius:4px;cursor:pointer;padding:2px;"
                />
              </div>
            </div>

            <div class="setting-group">
              <div class="setting-label">{{ t('dialog.table.width') }}</div>
              <div class="width-selector">
                <a-slider
                  v-model:value="lineWidth"
                  :min="0.1"
                  :max="5"
                  :step="0.1"
                  class="width-slider"
                />
                <div class="width-value">{{ lineWidth }} {{ t('dialog.table.widthUnit') }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <VdButton type="primary" icon="check" @click="confirmInsertTable">{{ t('common.ok') }}</VdButton>
        <VdButton icon="close" @click="visible = false">{{ t('common.cancel') }}</VdButton>
      </div>
    </template>
  </VdDialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { VdDialog, VdButton } from '@vervedoc/ui'
import { AppstoreOutlined, FileOutlined, BorderOutlined, EditOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'

/** 组件 props 定义 */
const props = defineProps<{
  modelValue: boolean
}>()

/** 组件 emits 定义 */
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', data: { rows: number; cols: number; border?: any }): void
}>()

/** 弹窗可见性，双向绑定到 modelValue */
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

/** 插入表格表单数据（行数与列数） */
const insertTableForm = ref({
  rows: 2,
  cols: 5
})

/** 选中的边框选项 */
const selectedOption = ref('none')
/** 选中的线型 */
const selectedLineType = ref('solid')
/** 选中的颜色 */
const selectedColor = ref('#000000')
/** 线宽 */
const lineWidth = ref(0.5)

/** 确认插入表格，触发 confirm 事件并关闭弹窗 */
const confirmInsertTable = () => {
  emit('confirm', {
    ...insertTableForm.value,
    border: {
      option: selectedOption.value,
      lineType: selectedLineType.value,
      color: selectedColor.value,
      width: lineWidth.value
    }
  })
  visible.value = false
}
</script>

<style scoped>
.custom-dialog-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  color: #303133;
}

.title-icon {
  background-color: #1890ff;
  color: #fff;
  padding: 4px;
  border-radius: 4px;
}

.insert-table-body {
  padding: 10px 0;
}

.setting-section {
  margin-bottom: 20px;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
}

.group-title span {
  font-size: 14px;
  color: #303133;
  white-space: nowrap;
}

.group-title .line {
  flex: 1;
  height: 1px;
  background-color: #dcdfe6;
}

.table-size-container {
  display: flex;
  gap: 40px;
  align-items: center;
}

.size-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.size-label {
  font-size: 14px;
  color: #303133;
  font-weight: normal;
  width: 60px;
}

.border-setting-content {
  display: flex;
  gap: 20px;
  padding: 10px 0;
}

.left-panel {
  width: 120px;
  border-right: 1px solid #dcdfe6;
  padding-right: 10px;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
  color: #606266;
}

.option-item:hover {
  background-color: #e6f7ff;
  color: #1890ff;
}

.option-item.active {
  background-color: #1890ff;
  color: #fff;
}

.option-icon {
  font-size: 16px;
}

.right-panel {
  flex: 1;
  padding-left: 10px;
}

.setting-group {
  margin-bottom: 20px;
}

.setting-label {
  font-size: 14px;
  color: #303133;
  margin-bottom: 8px;
  display: block;
}

.line-type-list {
  background-color: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 10px;
  max-height: 200px;
  overflow-y: auto;
}

.line-type-item {
  padding: 8px 12px;
  margin-bottom: 4px;
  border-radius: 3px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.line-type-item:hover {
  background-color: #e6f7ff;
}

.line-type-item.active {
  background-color: #1890ff;
  color: #fff;
}

.line-preview {
  height: 20px;
  display: flex;
  align-items: center;
}

.line-preview.solid {
  border-bottom: 2px solid currentColor;
}

.line-preview.dashed {
  border-bottom: 2px dashed currentColor;
}

.line-preview.dotted {
  border-bottom: 2px dotted currentColor;
}

.line-preview.double {
  border-bottom: 3px double currentColor;
}

.line-preview.dash-dot {
  background: linear-gradient(to right, currentColor 0%, currentColor 20%, transparent 20%, transparent 30%, currentColor 30%, currentColor 50%, transparent 50%, transparent 60%, currentColor 60%, currentColor 80%, transparent 80%);
  background-size: 20px 2px;
  background-repeat: repeat-x;
  background-position: 0 9px;
  height: 10px;
}

.line-preview.dash-dot-dot {
  background: linear-gradient(to right, currentColor 0%, currentColor 20%, transparent 20%, transparent 30%, currentColor 30%, currentColor 35%, transparent 35%, transparent 45%, currentColor 45%, currentColor 50%, transparent 50%, transparent 60%, currentColor 60%, currentColor 80%, transparent 80%);
  background-size: 25px 2px;
  background-repeat: repeat-x;
  background-position: 0 9px;
  height: 10px;
}

.color-selector {
  display: flex;
  align-items: center;
}

.width-selector {
  display: flex;
  align-items: center;
  gap: 10px;
}

.width-slider {
  flex: 1;
}

.width-value {
  min-width: 80px;
  text-align: center;
  font-size: 14px;
  color: #606266;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 10px;
}
</style>
