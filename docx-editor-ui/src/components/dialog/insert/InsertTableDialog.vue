<template>
  <el-dialog v-model="visible" width="600px" :show-close="false" class="insert-table-dialog app-dialog">
    <template #header>
      <div class="custom-dialog-header">
        <el-icon class="title-icon"><Grid /></el-icon>
        <span>插入表格</span>
      </div>
    </template>
    <div class="insert-table-body">
      <!-- 表格尺寸设置 -->
      <div class="setting-section">
        <div class="group-title">
          <span>表格尺寸</span>
          <div class="line"></div>
        </div>
        <div class="table-size-container">
          <div class="size-item">
            <div class="size-label">列数(C):</div>
            <el-input-number v-model="insertTableForm.cols" :min="1" :max="50" controls-position="right" style="width: 150px;" />
          </div>
          <div class="size-item">
            <div class="size-label">行数(R):</div>
            <el-input-number v-model="insertTableForm.rows" :min="1" :max="100" controls-position="right" style="width: 150px;" />
          </div>
        </div>
      </div>
      
      <el-divider style="margin: 20px 0;" />
      
      <!-- 边框设置 -->
      <div class="setting-section">
        <div class="group-title">
          <span>边框设置</span>
          <div class="line"></div>
        </div>
        <div class="border-setting-content">
          <!-- 左侧选项列表 -->
          <div class="left-panel">
            <div 
              class="option-item" 
              :class="{ active: selectedOption === 'none' }"
              @click="selectedOption = 'none'"
            >
              <el-icon class="option-icon"><Document /></el-icon>
              <span>无(N)</span>
            </div>
            <div 
              class="option-item" 
              :class="{ active: selectedOption === 'box' }"
              @click="selectedOption = 'box'"
            >
              <el-icon class="option-icon"><Postcard /></el-icon>
              <span>方框(X)</span>
            </div>
            <div 
              class="option-item" 
              :class="{ active: selectedOption === 'all' }"
              @click="selectedOption = 'all'"
            >
              <el-icon class="option-icon"><Grid /></el-icon>
              <span>全部(A)</span>
            </div>
            <div 
              class="option-item" 
              :class="{ active: selectedOption === 'grid' }"
              @click="selectedOption = 'grid'"
            >
              <el-icon class="option-icon"><Grid /></el-icon>
              <span>网格(D)</span>
            </div>
            <div 
              class="option-item" 
              :class="{ active: selectedOption === 'custom' }"
              @click="selectedOption = 'custom'"
            >
              <el-icon class="option-icon"><EditPen /></el-icon>
              <span>自定义(U)</span>
            </div>
          </div>
          
          <!-- 右侧设置区域 -->
          <div class="right-panel">
            <!-- 线型设置 -->
            <div class="setting-group">
              <div class="setting-label">线型(V):</div>
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
            
            <!-- 颜色设置 -->
            <div class="setting-group">
              <div class="setting-label">颜色(C):</div>
              <div class="color-selector">
                <el-color-picker 
                  v-model="selectedColor" 
                  show-alpha
                  class="color-picker"
                />
              </div>
            </div>
            
            <!-- 宽度设置 -->
            <div class="setting-group">
              <div class="setting-label">宽度(W):</div>
              <div class="width-selector">
                <el-slider 
                  v-model="lineWidth" 
                  :min="0.1" 
                  :max="5" 
                  :step="0.1"
                  class="width-slider"
                />
                <div class="width-value">{{ lineWidth }} 磅</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button type="primary" @click="confirmInsertTable">
          <el-icon><Check /></el-icon>
          确定
        </el-button>
        <el-button @click="visible = false">
          <el-icon><Close /></el-icon>
          取消
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Grid, Check, Close, Document, Postcard, EditPen } from '@element-plus/icons-vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', data: { rows: number; cols: number; border?: any }): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// 表格尺寸设置
const insertTableForm = ref({
  rows: 2,
  cols: 5
})

// 边框设置
const selectedOption = ref('none')
const selectedLineType = ref('solid')
const selectedColor = ref('#000000')
const lineWidth = ref(0.5)

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
:deep(.insert-table-dialog) {
  border-radius: 8px;
}

.custom-dialog-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  color: #303133;
}

.title-icon {
  background-color: #409eff;
  color: #fff;
  padding: 4px;
  border-radius: 4px;
}

.insert-table-body {
  padding: 10px 0;
}

/* 设置区域 */
.setting-section {
  margin-bottom: 20px;
}

/* 分组标题 */
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

/* 表格尺寸设置 */
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

:deep(.el-input-number.is-controls-right .el-input-number__decrease),
:deep(.el-input-number.is-controls-right .el-input-number__increase) {
  background: transparent;
  border-left: none;
}

:deep(.el-input-number .el-input__wrapper) {
  box-shadow: none !important;
  border-bottom: 1px solid #409eff;
  border-radius: 0;
  padding-left: 0;
}

/* 边框设置内容 */
.border-setting-content {
  display: flex;
  gap: 20px;
  padding: 10px 0;
}

/* 左侧面板 */
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
  background-color: #ecf5ff;
  color: #409eff;
}

.option-item.active {
  background-color: #409eff;
  color: #fff;
}

.option-icon {
  font-size: 16px;
}

/* 右侧面板 */
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

/* 线型选择 */
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
  background-color: #ecf5ff;
}

.line-type-item.active {
  background-color: #409eff;
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

/* 颜色选择器 */
.color-selector {
  display: flex;
  align-items: center;
}

.color-picker {
  width: 100%;
}

/* 宽度选择器 */
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

/* 底部按钮 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 10px;
}
</style>
