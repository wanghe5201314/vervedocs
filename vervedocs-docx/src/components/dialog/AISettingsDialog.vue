<template>
  <a-modal
    v-model:open="visible"
    title="AI 设置"
    width="480px"
    :maskClosable="false"
    @cancel="handleClose"
  >
    <a-form :model="form" :label-col="{ style: { width: '100px' } }">
      <a-form-item label="API 端点">
        <a-input
          v-model:value="form.apiEndpoint"
          placeholder="/api/ai"
        />
      </a-form-item>
      <a-form-item label="流式响应">
        <a-switch v-model:checked="form.streaming" />
        <span class="form-hint">启用后可实时查看 AI 生成内容</span>
      </a-form-item>
      <a-form-item label="超时时间">
        <a-input-number
          v-model:value="form.timeout"
          :min="5000"
          :max="300000"
          :step="5000"
          style="width: 160px"
        />
        <span class="form-hint">毫秒</span>
      </a-form-item>
      <a-form-item label="自定义请求头">
        <a-textarea
          v-model:value="form.customHeaders"
          :rows="3"
          placeholder='{"Authorization": "Bearer xxx"}'
        />
        <span class="form-hint">JSON 格式的自定义 HTTP 请求头</span>
      </a-form-item>
    </a-form>
    <template #footer>
      <div class="dialog-footer">
        <a-button @click="handleClose">取消</a-button>
        <a-button type="primary" @click="handleSave">保存</a-button>
      </div>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import { updateAIServiceConfig } from '@/composables/use-ai'

const visible = defineModel<boolean>({ default: false })

interface FormState {
  apiEndpoint: string
  streaming: boolean
  timeout: number
  customHeaders: string
}

const form = reactive<FormState>({
  apiEndpoint: import.meta.env.VITE_AI_API_ENDPOINT || '/api/ai',
  streaming: import.meta.env.VITE_AI_STREAMING !== 'false',
  timeout: Number(import.meta.env.VITE_AI_TIMEOUT) || 60000,
  customHeaders: ''
})

watch(visible, (val) => {
  if (val) {
    form.apiEndpoint = import.meta.env.VITE_AI_API_ENDPOINT || '/api/ai'
    form.streaming = import.meta.env.VITE_AI_STREAMING !== 'false'
    form.timeout = Number(import.meta.env.VITE_AI_TIMEOUT) || 60000
  }
})

const handleSave = () => {
  let headers: Record<string, string> | undefined
  if (form.customHeaders.trim()) {
    try {
      headers = JSON.parse(form.customHeaders)
    } catch {
      message.error('自定义请求头格式错误，请输入合法的 JSON')
      return
    }
  }

  updateAIServiceConfig({
    apiEndpoint: form.apiEndpoint,
    streaming: form.streaming,
    timeout: form.timeout,
    headers
  })

  message.success('AI 设置已保存')
  visible.value = false
}

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
