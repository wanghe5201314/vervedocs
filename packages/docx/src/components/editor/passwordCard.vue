<template>
  <a-modal
    :open="visible"
    :title="mode === 'protect' ? '保护文档' : '解密文档'"
    :confirm-loading="loading"
    :z-index="10000"
    ok-text="确认"
    cancel-text="取消"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <a-input-password
      v-model:value="password"
      :placeholder="mode === 'protect' ? '请输入保护密码' : '请输入密码以解密文档'"
      @press-enter="handleOk"
    />
    <div v-if="error" class="password-error">{{ error }}</div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  visible: boolean
  mode: 'protect' | 'unprotect'
  loading?: boolean
  error?: string
}>()

const emit = defineEmits<{
  (e: 'confirm', password: string): void
  (e: 'cancel'): void
}>()

/** 密码输入值 */
const password = ref('')

/** 弹窗显示时清空密码 */
watch(() => props.visible, (v) => {
  if (v) password.value = ''
})

/** 模式切换时清空密码 */
watch(() => props.mode, () => {
  password.value = ''
})

/** 确认处理：密码非空时触发 confirm 事件 */
const handleOk = () => {
  if (!password.value) return
  emit('confirm', password.value)
}

/** 取消处理：触发 cancel 事件 */
const handleCancel = () => {
  emit('cancel')
}
</script>

<style scoped>
.password-error {
  color: #ff4d4f;
  font-size: 13px;
  margin-top: 8px;
}
</style>
