<template>
  <VdDialog
    v-model:open="visible"
    :title="t('dialog.aiSettings.title')"
    width="480px"
    :maskClosable="false"
    @cancel="handleClose"
  >
    <a-form :model="form" :label-col="{ style: { width: '100px' } }">
      <a-form-item :label="t('dialog.aiSettings.apiEndpoint')">
        <a-input
          v-model:value="form.apiEndpoint"
          placeholder="/api/ai"
        />
      </a-form-item>
      <a-form-item :label="t('dialog.aiSettings.streamResponse')">
        <a-switch v-model:checked="form.streaming" />
        <span class="form-hint">{{ t('dialog.aiSettings.streamHint') }}</span>
      </a-form-item>
      <a-form-item :label="t('dialog.aiSettings.timeout')">
        <a-input-number
          v-model:value="form.timeout"
          :min="5000"
          :max="300000"
          :step="5000"
          style="width: 160px"
        />
        <span class="form-hint">{{ t('dialog.aiSettings.timeoutUnit') }}</span>
      </a-form-item>
      <a-form-item :label="t('dialog.aiSettings.customHeaders')">
        <a-textarea
          v-model:value="form.customHeaders"
          :rows="3"
          placeholder='{"Authorization": "Bearer xxx"}'
        />
        <span class="form-hint">{{ t('dialog.aiSettings.headersPlaceholder') }}</span>
      </a-form-item>
    </a-form>
    <template #footer>
      <div class="dialog-footer">
        <VdButton @click="handleClose">{{ t('common.cancel') }}</VdButton>
        <VdButton type="primary" @click="handleSave">{{ t('common.save') }}</VdButton>
      </div>
    </template>
  </VdDialog>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { VdDialog, VdButton } from '@vervedoc/ui'
import { message } from 'ant-design-vue'
import { updateAIServiceConfig } from '@/composables/use-ai'
import { t } from '@/i18n'

/** 弹窗可见性，双向绑定 model */
const visible = defineModel<boolean>({ default: false })

/** 表单状态结构 */
interface FormState {
  apiEndpoint: string
  streaming: boolean
  timeout: number
  customHeaders: string
}

/** AI 设置表单数据 */
const form = reactive<FormState>({
  apiEndpoint: import.meta.env.VITE_AI_API_ENDPOINT || '/api/ai',
  streaming: import.meta.env.VITE_AI_STREAMING !== 'false',
  timeout: Number(import.meta.env.VITE_AI_TIMEOUT) || 60000,
  customHeaders: ''
})

/** 弹窗打开时从环境变量重置表单 */
watch(visible, (val) => {
  if (val) {
    form.apiEndpoint = import.meta.env.VITE_AI_API_ENDPOINT || '/api/ai'
    form.streaming = import.meta.env.VITE_AI_STREAMING !== 'false'
    form.timeout = Number(import.meta.env.VITE_AI_TIMEOUT) || 60000
  }
})

/** 保存 AI 设置，校验自定义请求头 JSON 并更新配置 */
const handleSave = () => {
  let headers: Record<string, string> | undefined
  if (form.customHeaders.trim()) {
    try {
      headers = JSON.parse(form.customHeaders)
    } catch {
      message.error(t('message.invalidHeaders'))
      return
    }
  }

  updateAIServiceConfig({
    apiEndpoint: form.apiEndpoint,
    streaming: form.streaming,
    timeout: form.timeout,
    headers
  })

  message.success(t('message.aiSettingsSaved'))
  visible.value = false
}

/** 关闭弹窗 */
const handleClose = () => {
  visible.value = false
}
</script>

<style scoped>
.form-hint {
  font-size: 12px;
  color: #909399;
  margin-left: 8px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
