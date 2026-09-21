<template>
  <VdDialog v-model:open="visible" title="条形码生成" width="630px" :maskClosable="false" class="app-dialog">
    <a-form :model="barcodeForm" :label-col="{ style: { width: '80px' } }">
      <a-form-item label="编码">
        <div style="display: flex; align-items: center; justify-content: space-between;width: 100%">
          <div style="display: flex; align-items: center; gap: 10px;">
            <a-select v-model:value="barcodeForm.type" style="width: 180px;">
              <a-select-option value="code128" label="Code128 (Auto)"/>
              <a-select-option value="code39" label="Code39"/>
              <a-select-option value="code93" label="Code93"/>
              <a-select-option value="ean13" label="EAN-13"/>
              <a-select-option value="ean8" label="EAN-8"/>
              <a-select-option value="upc" label="UPC-A"/>
              <a-select-option value="upce" label="UPC-E"/>
              <a-select-option value="itf14" label="ITF-14"/>
              <a-select-option value="itf" label="ITF (Interleaved 2 of 5)"/>
              <a-select-option value="msi" label="MSI"/>
              <a-select-option value="pharmacode" label="Pharmacode"/>
              <a-select-option value="codabar" label="Codabar"/>
            </a-select>
            <span style="color: #999; font-size: 12px;">应用领域: {{ applicationField }}</span>
          </div>

          <a-dropdown :trigger="['click']" placement="bottomRight">
            <VdButton type="link">
              高级设置
              <VdIcon name="expand-more" />
            </VdButton>
            <template #overlay>
              <VdCard style="min-width: 260px">
                <a-form :label-col="{ style: { width: '80px' } }" size="small">
                  <a-form-item label="条形码颜色">
                    <input type="color" :value="barcodeStyle.lineColor" @change.stop="(e: Event) => barcodeStyle.lineColor = (e.target as HTMLInputElement).value" @click.stop style="width:40px;height:28px;border:1px solid #d9d9d9;border-radius:4px;cursor:pointer;padding:2px;" />
                  </a-form-item>
                  <a-form-item label="背景颜色">
                    <input type="color" :value="barcodeStyle.background" @change.stop="(e: Event) => barcodeStyle.background = (e.target as HTMLInputElement).value" @click.stop style="width:40px;height:28px;border:1px solid #d9d9d9;border-radius:4px;cursor:pointer;padding:2px;" />
                  </a-form-item>
                  <a-form-item label="文字颜色">
                    <input type="color" :value="barcodeStyle.textColor" @change.stop="(e: Event) => barcodeStyle.textColor = (e.target as HTMLInputElement).value" @click.stop style="width:40px;height:28px;border:1px solid #d9d9d9;border-radius:4px;cursor:pointer;padding:2px;" />
                  </a-form-item>
                  <a-form-item label="文字位置">
                    <a-select v-model:value="barcodeStyle.textPosition">
                      <a-select-option value="bottom" label="下方"/>
                      <a-select-option value="top" label="上方"/>
                      <a-select-option value="none" label="隐藏"/>
                    </a-select>
                  </a-form-item>
                  <a-form-item label="文字大小">
                    <a-slider v-model:value="barcodeStyle.fontSize" :min="10" :max="24" :step="1"/>
                  </a-form-item>
                </a-form>
              </VdCard>
            </template>
          </a-dropdown>
        </div>
      </a-form-item>
      <a-form-item label="输入">
        <div class="input-wrapper">
          <a-textarea
            v-model:value="barcodeForm.content"
            :rows="3"
            placeholder="输入支持: 数字、大小写字母、普通符号以及控制符"
            :maxlength="200"
          />
        </div>
      </a-form-item>
    </a-form>

    <div class="barcode-preview">
      <div class="preview-container">
        <canvas ref="barcodeCanvas" class="barcode-canvas"></canvas>
        <div v-if="barcodeError" class="barcode-error">{{ barcodeError }}</div>
      </div>
    </div>
    <template #footer>
      <VdButton type="primary" icon="check" :disabled="!canConfirm" @click="confirmBarcode">确定</VdButton>
      <VdButton icon="close" @click="visible = false">取消</VdButton>
    </template>
  </VdDialog>
</template>

<script setup lang="ts">
import {computed, nextTick, ref, watch} from 'vue'
import { VdCard, VdDialog, VdButton, VdIcon } from '@vervedoc/ui'
import JsBarcode from 'jsbarcode'

/** 组件 props 定义 */
const props = defineProps<{
  modelValue: boolean
}>()

/** 组件 emits 定义 */
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', data: { imageDataUrl: string; width: number; height: number }): void
}>()

/** 弹窗可见性，双向绑定到 modelValue */
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

/** 条形码表单数据（类型与内容） */
const barcodeForm = ref({
  type: 'code128',
  content: 'AB+cd-1234%'
})

/** 条形码画布 DOM 引用 */
const barcodeCanvas = ref<HTMLCanvasElement | null>(null)
/** 条形码错误信息 */
const barcodeError = ref('')

/** 条形码样式配置 */
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

/** 条形码类型对应的应用领域映射 */
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

/** 条形码类型对应的 JsBarcode 格式名映射 */
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

/** 当前类型对应的应用领域 */
const applicationField = computed(() => {
  return applicationFieldMap[barcodeForm.value.type] || '通用'
})

/** 是否可以确认生成（内容非空且无错误） */
const canConfirm = computed(() => {
  return !!barcodeForm.value.content.trim() && !barcodeError.value
})

/** 生成条形码到画布 */
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

/** 监听类型、内容与样式变化，重新生成条形码 */
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

/** 弹窗打开时生成一次条形码 */
watch(visible, (isVisible) => {
  if (isVisible) {
    nextTick(() => {
      generateBarcode()
    })
  }
})

/** 确认条形码，导出为 PNG Data URL 并触发 confirm 事件 */
const confirmBarcode = () => {
  if (!canConfirm.value || !barcodeCanvas.value) return
  const canvas = barcodeCanvas.value
  const imageDataUrl = canvas.toDataURL('image/png')
  emit('confirm', {
    imageDataUrl,
    width: canvas.width,
    height: canvas.height
  })
  visible.value = false
}

</script>

<style scoped>
.input-wrapper {
  width: 100%;
}

.barcode-preview {
  margin-top: 20px;
}

.preview-container {
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
</style>
