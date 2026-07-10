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
                  <input type="color" :value="qrcodeStyle.lightColor" @change="(e: Event) => qrcodeStyle.lightColor = (e.target as HTMLInputElement).value" style="width:40px;height:28px;border:1px solid #d9d9d9;border-radius:4px;cursor:pointer;padding:2px;" />
                </a-form-item>
                <a-form-item label="二维码颜色">
                  <input type="color" :value="qrcodeStyle.darkColor" @change="(e: Event) => qrcodeStyle.darkColor = (e.target as HTMLInputElement).value" style="width:40px;height:28px;border:1px solid #d9d9d9;border-radius:4px;cursor:pointer;padding:2px;" />
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

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', content: string): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const qrcodeForm = ref({
  content: ''
})

const qrcodeStyle = ref({
  darkColor: '#000000',
  lightColor: '#ffffff'
})

const previewDataUrl = ref('')
const previewLoading = ref(false)
const previewError = ref('')

const canConfirm = computed(() => {
  const content = qrcodeForm.value.content.trim()
  return !!content && !previewLoading.value && !previewError.value
})

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

const buildPreviewDebounced = debounce((content: string) => {
  void buildPreview(content)
}, 250)

watch(
  () => props.modelValue,
  (v) => {
    if (!v) return
    void buildPreview(qrcodeForm.value.content)
  }
)

watch(
  () => qrcodeForm.value.content,
  (val) => {
    if (!visible.value) return
    buildPreviewDebounced(val)
  }
)

watch(
  () => [qrcodeStyle.value.darkColor, qrcodeStyle.value.lightColor],
  () => {
    if (!visible.value) return
    void buildPreview(qrcodeForm.value.content)
  }
)

const confirmQrcode = () => {
  if (!canConfirm.value) return
  emit('confirm', qrcodeForm.value.content.trim())
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