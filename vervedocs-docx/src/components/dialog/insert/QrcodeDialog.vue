<template>
  <el-dialog v-model="visible" title="二维码生成" width="630px" :close-on-click-modal="false" class="app-dialog">
    <el-form :model="qrcodeForm" label-width="80px">
      <el-form-item label="输入">
        <el-input
          type="textarea"
          v-model="qrcodeForm.content"
          :rows="3"
          placeholder="请输入二维码内容"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>
    </el-form>
    <div class="qrcode-preview">
      <div class="advanced-btn-wrapper">
        <el-dropdown
          trigger="click"
          placement="bottom-end"
          :teleported="true"
          popper-class="qrcode-style-dropdown"
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
            高级设置 <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu class="qrcode-style-dropdown">
              <el-card style="min-width: 300px">
                <el-form label-width="80px" size="small">
                  <el-form-item label="背景颜色">
                    <el-color-picker v-model="qrcodeStyle.lightColor" />
                  </el-form-item>
                  <el-form-item label="二维码颜色">
                    <el-color-picker v-model="qrcodeStyle.darkColor" />
                  </el-form-item>
                </el-form>
              </el-card>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
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
      <el-button type="primary" :disabled="!canConfirm" @click="confirmQrcode">
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
import { ref, computed, watch } from 'vue'
import { Check, Close, ArrowDown } from '@element-plus/icons-vue'
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
  border: 1px solid #ebeef5;
  background: #fff;
  border-radius: 6px;
}

.qrcode-error {
  color: #f56c6c;
}

.qrcode-empty {
  color: #909399;
}

/* 下拉菜单样式 */
.qrcode-style-dropdown {
  z-index: 9999 !important;
  padding: 0 !important;
}

/* 颜色选择器样式 - 长条样式 */
:deep(.el-color-picker) {
  width: 100%;
}

:deep(.el-color-picker__trigger) {
  width: 100%;
  height: 28px;
  border-radius: 4px;
  padding: 2px;
}

:deep(.el-color-picker__color) {
  width: 100%;
  height: 100%;
  border-radius: 2px;
}

:deep(.el-color-picker__color-inner) {
  width: 100%;
  height: 100%;
  border-radius: 2px;
}
</style>
