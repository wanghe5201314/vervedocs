<template>
  <el-dialog
    v-model="visible"
    title="AI 设置"
    width="480px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form :model="form" label-width="100px" label-position="left">
      <el-form-item label="API 端点">
        <el-input
          v-model="form.apiEndpoint"
          placeholder="/api/ai"
        />
      </el-form-item>
      <el-form-item label="流式响应">
        <el-switch v-model="form.streaming" />
        <span class="form-hint">启用后可实时查看 AI 生成内容</span>
      </el-form-item>
      <el-form-item label="超时时间">
        <el-input-number
          v-model="form.timeout"
          :min="5000"
          :max="300000"
          :step="5000"
          style="width: 160px"
        />
        <span class="form-hint">毫秒</span>
      </el-form-item>
      <el-form-item label="自定义请求头">
        <el-input
          v-model="form.customHeaders"
          type="textarea"
          :rows="3"
          placeholder='{"Authorization": "Bearer xxx"}'
          resize="none"
        />
        <span class="form-hint">JSON 格式的自定义 HTTP 请求头</span>
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
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
    // 每次打开时重置为当前配置
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
      ElMessage.error('自定义请求头格式错误，请输入合法的 JSON')
      return
    }
  }

  updateAIServiceConfig({
    apiEndpoint: form.apiEndpoint,
    streaming: form.streaming,
    timeout: form.timeout,
    headers
  })

  ElMessage.success('AI 设置已保存')
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
