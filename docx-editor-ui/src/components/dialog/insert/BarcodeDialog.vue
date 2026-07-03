<template>
  <el-dialog v-model="visible" title="条形码生成" width="630px" :close-on-click-modal="false" class="app-dialog">
    <el-form :model="barcodeForm" label-width="80px">
      <el-form-item label="编码">
        <div style="display: flex; align-items: center; justify-content: space-between;width: 100%">
          <div style="display: flex; align-items: center; gap: 10px;">
            <el-select v-model="barcodeForm.type" style="width: 180px;">
              <el-option value="code128" label="Code128 (Auto)"/>
              <el-option value="code39" label="Code39"/>
              <el-option value="code93" label="Code93"/>
              <el-option value="ean13" label="EAN-13"/>
              <el-option value="ean8" label="EAN-8"/>
              <el-option value="upc" label="UPC-A"/>
              <el-option value="upce" label="UPC-E"/>
              <el-option value="itf14" label="ITF-14"/>
              <el-option value="itf" label="ITF (Interleaved 2 of 5)"/>
              <el-option value="msi" label="MSI"/>
              <el-option value="pharmacode" label="Pharmacode"/>
              <el-option value="codabar" label="Codabar"/>
            </el-select>
            <span style="color: #999; font-size: 12px;">应用领域: {{ applicationField }}</span>
          </div>

          <!-- 高级设置下拉菜单 -->
          <el-dropdown
            trigger="click"
            placement="bottom-end"
            :teleported="true"
            popper-class="barcode-style-dropdown"
            :popper-options="{
              modifiers: [
                {
                  name: 'offset',
                  options: {
                    offset: [200, 8]
                  }
                }
              ]
            }"
          >
            <el-button type="primary" link>
              高级设置
              <el-icon class="el-icon--right">
                <ArrowDown/>
              </el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu class="barcode-style-dropdown">
                <el-card style="min-width: 260px">
                  <el-form label-width="80px" size="small">
                    <!-- 颜色设置 -->
                    <el-form-item label="条形码颜色">
                      <el-color-picker v-model="barcodeStyle.lineColor"/>
                    </el-form-item>
                    <el-form-item label="背景颜色">
                      <el-color-picker v-model="barcodeStyle.background"/>
                    </el-form-item>
                    <el-form-item label="文字颜色">
                      <el-color-picker v-model="barcodeStyle.textColor"/>
                    </el-form-item>
                    <!-- 文字位置 -->
                    <el-form-item label="文字位置">
                      <el-select v-model="barcodeStyle.textPosition">
                        <el-option value="bottom" label="下方"/>
                        <el-option value="top" label="上方"/>
                        <el-option value="none" label="隐藏"/>
                      </el-select>
                    </el-form-item>
                    <!-- 尺寸设置 -->
                    <el-form-item label="文字大小">
                      <el-slider v-model="barcodeStyle.fontSize" :min="10" :max="24" :step="1"/>
                    </el-form-item>
                  </el-form>
                </el-card>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-form-item>
      <el-form-item label="输入">
        <div class="input-wrapper">
          <el-input
            type="textarea"
            v-model="barcodeForm.content"
            :rows="3"
            placeholder="输入支持: 数字、大小写字母、普通符号以及控制符"
            maxlength="200"
            show-word-limit
          />
        </div>
      </el-form-item>
    </el-form>

    <!-- 预览区域 -->
    <div class="barcode-preview">
      <div class="preview-container">
        <canvas ref="barcodeCanvas" class="barcode-canvas"></canvas>
        <div v-if="barcodeError" class="barcode-error">{{ barcodeError }}</div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import {computed, nextTick, ref, watch} from 'vue'
import {ArrowDown} from '@element-plus/icons-vue'
import JsBarcode from 'jsbarcode'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', data: { imageDataUrl: string; width: number; height: number }): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const barcodeForm = ref({
  type: 'code128',
  content: 'AB+cd-1234%'
})

const barcodeCanvas = ref<HTMLCanvasElement | null>(null)
const barcodeError = ref('')

// 条形码样式设置
const barcodeStyle = ref({
  lineColor: '#000000',
  background: '#FFFFFF',
  textColor: '#000000',
  fontSize: 14,
  textPosition: 'bottom',
  width: 2,
  height: 80,
  margin: 10
})

// 条形码应用领域映射
const applicationFieldMap: Record<string, string> = {
  code128: '物流业、仓储业、医疗业',
  code39: '工业、国防、汽车制造',
  code93: '物流、仓储、制造业',
  ean13: '零售业、商品流通',
  ean8: '零售业、小包装商品',
  upc: '北美零售业',
  upce: '北美零售业、小商品',
  itf14: '物流包装、仓储运输',
  itf: '仓储、物流、批发',
  msi: '仓储、货架管理',
  pharmacode: '医药行业',
  codabar: '图书馆、血库、快递'
}

// JsBarcode 格式映射
const barcodeFormatMap: Record<string, string> = {
  code128: 'CODE128',
  code39: 'CODE39',
  code93: 'CODE93',
  ean13: 'EAN13',
  ean8: 'EAN8',
  upc: 'UPC',
  upce: 'UPCE',
  itf14: 'ITF14',
  itf: 'ITF',
  msi: 'MSI',
  pharmacode: 'pharmacode',
  codabar: 'codabar'
}

// 计算当前编码的应用领域
const applicationField = computed(() => {
  return applicationFieldMap[barcodeForm.value.type] || '通用'
})

// 生成条形码预览
const generateBarcode = () => {
  if (!barcodeCanvas.value || !barcodeForm.value.content) {
    return
  }

  barcodeError.value = ''

  try {
    const format = barcodeFormatMap[barcodeForm.value.type] || 'CODE128'
    const content = barcodeForm.value.content

    JsBarcode(barcodeCanvas.value, content, {
      format: format,
      width: barcodeStyle.value.width,
      height: barcodeStyle.value.height,
      displayValue: barcodeStyle.value.textPosition !== 'none',
      fontSize: barcodeStyle.value.fontSize,
      textMargin: barcodeStyle.value.textPosition === 'top' ? 5 : 2,
      marginTop: barcodeStyle.value.textPosition === 'top' ? barcodeStyle.value.margin : 0,
      marginBottom: barcodeStyle.value.textPosition === 'bottom' ? barcodeStyle.value.margin : 0,
      margin: barcodeStyle.value.margin,
      background: barcodeStyle.value.background,
      lineColor: barcodeStyle.value.lineColor,
      fontOptions: `bold`,
      font: 'monospace',
      valid: (valid: boolean) => {
        if (!valid) {
          barcodeError.value = '输入内容不符合该编码格式要求'
        }
      }
    })
  } catch (error) {
    barcodeError.value = '条形码生成失败，请检查输入内容'
    console.error('Barcode generation error:', error)
  }
}

// 监听编码类型、内容和样式变化，重新生成条形码
watch([
  () => barcodeForm.value.type,
  () => barcodeForm.value.content,
  () => barcodeStyle.value.lineColor,
  () => barcodeStyle.value.background,
  () => barcodeStyle.value.fontSize,
  () => barcodeStyle.value.textPosition,
  () => barcodeStyle.value.width,
  () => barcodeStyle.value.height,
  () => barcodeStyle.value.margin
], () => {
  nextTick(() => {
    generateBarcode()
  })
})

// 监听对话框打开，初始化条形码
watch(visible, (isVisible) => {
  if (isVisible) {
    nextTick(() => {
      generateBarcode()
    })
  }
})

</script>

<style scoped>
.input-wrapper {
  width: 100%;
}

.barcode-layout {
  display: flex;
  gap: 16px;
  margin-top: 20px;
  min-height: 380px;
}

.style-panel {
  flex: 0 0 280px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 16px;
  background: #fff;
}

.preview-panel {
  flex: 1;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 16px;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.preview-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  border-radius: 4px;
  padding: 20px;
}

.barcode-canvas {
  max-width: 100%;
  height: auto;
}

.barcode-error {
  color: #f56c6c;
  font-size: 13px;
  margin-top: 10px;
  text-align: center;
}

.preview-info {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
  text-align: center;
  color: #909399;
  font-size: 12px;
}

.unit-label {
  margin-left: 4px;
  color: #909399;
  font-size: 12px;
}

/* 统一表单样式 */
.style-panel :deep(.el-form-item) {
  margin-bottom: 18px;
}

.style-panel :deep(.el-form-item__label) {
  font-size: 13px;
  color: #606266;
  padding-right: 12px;
}

.style-panel :deep(.el-form-item:last-child) {
  margin-bottom: 0;
}

/* 颜色选择器样式 - 长条样式 */
.style-panel :deep(.el-color-picker),
.barcode-style-dropdown :deep(.el-color-picker) {
  width: 100%;
}

.style-panel :deep(.el-color-picker__trigger),
.barcode-style-dropdown :deep(.el-color-picker__trigger) {
  width: 100%;
  height: 28px;
  border-radius: 4px;
  padding: 2px;
}

.style-panel :deep(.el-color-picker__color),
.barcode-style-dropdown :deep(.el-color-picker__color) {
  width: 100%;
  height: 100%;
  border-radius: 2px;
}

.style-panel :deep(.el-color-picker__color-inner),
.barcode-style-dropdown :deep(.el-color-picker__color-inner) {
  width: 100%;
  height: 100%;
  border-radius: 2px;
}

/* 数字输入框样式 */
.style-panel :deep(.el-input-number) {
  width: 120px;
}

.style-panel :deep(.el-input-number .el-input__inner) {
  text-align: center;
}

/* 滑块样式 */
.slider-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.slider-wrapper :deep(.el-slider) {
  flex: 1;
}

.slider-wrapper :deep(.el-slider__runway) {
  height: 6px;
  background-color: #e4e7ed;
  border-radius: 3px;
}

.slider-wrapper :deep(.el-slider__bar) {
  height: 6px;
  background-color: #409eff;
  border-radius: 3px;
}

.slider-wrapper :deep(.el-slider__button) {
  width: 16px;
  height: 16px;
  border: 2px solid #409eff;
}

.slider-wrapper :deep(.el-slider__input) {
  width: 60px;
}

.slider-wrapper :deep(.el-slider__input .el-input__inner) {
  text-align: center;
  padding-left: 8px;
  padding-right: 8px;
}

/* 单选按钮组样式 */
.style-panel :deep(.el-radio-group) {
  width: 100%;
  display: flex;
}

.style-panel :deep(.el-radio-button) {
  flex: 1;
}

.style-panel :deep(.el-radio-button__inner) {
  width: 100%;
  border-radius: 4px;
}

.style-panel :deep(.el-radio-button:first-child .el-radio-button__inner) {
  border-radius: 4px 0 0 4px;
}

.style-panel :deep(.el-radio-button:last-child .el-radio-button__inner) {
  border-radius: 0 4px 4px 0;
}

/* 分组标题 */
.config-group {
  margin-bottom: 16px;
}

.config-group-title {
  font-size: 12px;
  color: #909399;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #e4e7ed;
}

/* 下拉菜单样式 - 确保超出 dialog 边界 */
.barcode-style-dropdown {
  z-index: 9999 !important;
  padding: 0 !important;
}


</style>
