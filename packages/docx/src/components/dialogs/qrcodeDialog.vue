<template>
  <a-modal v-model:open="visible" title="二维码生成" width="630px" :maskClosable="false" class="app-dialog">
    <a-form :model="qrcodeForm" :label-col="{ style: { width: '80px' } }">
      <a-form-item label="输入">
        <a-textarea
          v-model:value="qrcodeForm.content"
          :rows="3"
          placeholder="请输入二维码内容"
          :maxlength="200"
          show-word-limit
        />
      </a-form-item>
    </a-form>
    <div class="qrcode-preview">
      <div class="advanced-btn-wrapper">
        <a-dropdown :trigger="['click']">
          <a-button type="link">
            高级设置 <ArrowDownOutlined />
          </a-button>
          <template #overlay>
            <a-card style="min-width: 300px">
              <a-form :label-col="{ style: { width: '80px' } }" size="small">
                <a-form-item label="背景颜色">
                  <input type="color" :value="qrcodeStyle.lightColor" @change.stop="(e: Event) => qrcodeStyle.lightColor = (e.target as HTMLInputElement).value" @click.stop style="width:40px;height:28px;border:1px solid #d9d9d9;border-radius:4px;cursor:pointer;padding:2px;" />
                </a-form-item>
                <a-form-item label="二维码颜色">
                  <input type="color" :value="qrcodeStyle.darkColor" @change.stop="(e: Event) => qrcodeStyle.darkColor = (e.target as HTMLInputElement).value" @click.stop style="width:40px;height:28px;border:1px solid #d9d9d9;border-radius:4px;cursor:pointer;padding:2px;" />
                </a-form-item>
              </a-form>
            </a-card>
          </template>
        </a-dropdown>
      </div>
      <div class="preview-container">
        <div v-if="previewLoading" class="qrcode-placeholder">生成中...</div>
        <img v-else-if="previewDataUrl" class="qrcode-image" :src="previewDataUrl" alt="qrcode" />
        <div v-else class="qrcode-placeholder">
          <div v-if="previewError" class="qrcode-error">{{ previewError }}</div>
          <div v-else class="qrcode-empty">请输入内容生成预览</div>
        </div>
      </div>
    </div>
    <template #footer>
      <a-button type="primary" :disabled="!canConfirm" @click="confirmQrcode">
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
import { ref, computed, watch } from 'vue'
import { CheckOutlined, CloseOutlined, ArrowDownOutlined } from '@ant-design/icons-vue'
import QRCode from 'qrcode'
import { debounce } from '@/utils'

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

/** 二维码表单数据 */
const qrcodeForm = ref({
  content: ''
})

/** 二维码样式配置（前景色与背景色） */
const qrcodeStyle = ref({
  darkColor: '#000000',
  lightColor: '#ffffff'
})

/** 预览图片的 Data URL */
const previewDataUrl = ref('')
/** 预览加载状态 */
const previewLoading = ref(false)
/** 预览错误信息 */
const previewError = ref('')

/** 是否可以确认生成（内容非空、无加载中、无错误） */
const canConfirm = computed(() => {
  const content = qrcodeForm.value.content.trim()
  return !!content && !previewLoading.value && !previewError.value
})

/**
 * 生成二维码预览
 * @param content 二维码内容文本
 * @returns {Promise<void>}
 */
const buildPreview = async (content: string) => {
  const trimmed = content.trim()
  previewError.value = ''
  previewDataUrl.value = ''
  if (!trimmed) return
  previewLoading.value = true
  try {
    previewDataUrl.value = await QRCode.toDataURL(trimmed, {
      width: 160,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: qrcodeStyle.value.darkColor, light: qrcodeStyle.value.lightColor }
    })
  } catch {
    previewError.value = '二维码生成失败，请检查内容或缩短长度'
  } finally {
    previewLoading.value = false
  }
}

/** 防抖后的预览生成函数 */
const buildPreviewDebounced = debounce((content: string) => {
  void buildPreview(content)
}, 250)

/** 弹窗打开时立即生成一次预览 */
watch(
  () => props.modelValue,
  (v) => {
    if (!v) return
    void buildPreview(qrcodeForm.value.content)
  }
)

/** 内容变化时触发防抖预览生成 */
watch(
  () => qrcodeForm.value.content,
  (val) => {
    if (!visible.value) return
    buildPreviewDebounced(val)
  }
)

/** 颜色变化时立即重新生成预览 */
watch(
  () => [qrcodeStyle.value.darkColor, qrcodeStyle.value.lightColor],
  () => {
    if (!visible.value) return
    void buildPreview(qrcodeForm.value.content)
  }
)

/** 确认生成二维码并触发 confirm 事件 */
const confirmQrcode = () => {
  if (!canConfirm.value || !previewDataUrl.value) return
  emit('confirm', {
    imageDataUrl: previewDataUrl.value,
    width: 160,
    height: 160
  })
  visible.value = false
}
</script>

<style scoped>
.qrcode-preview {
  margin-top: 20px;
  padding: 20px;
  background: #fafafa;
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 140px;
  position: relative;
}

.advanced-btn-wrapper {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
}

.preview-container {
  display: flex;
  justify-content: center;
  align-items: center;
}

.qrcode-placeholder {
  color: #909399;
  font-size: 13px;
  text-align: center;
}

.qrcode-image {
  image-rendering: pixelated;
  border: 1px solid #f0f0f0;
  background: #fff;
  border-radius: 6px;
}

.qrcode-error {
  color: #f56c6c;
}

.qrcode-empty {
  color: #909399;
}
</style>