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

const password = ref('')

watch(() => props.visible, (v) => {
  if (v) password.value = ''
})

watch(() => props.mode, () => {
  password.value = ''
})

const handleOk = () => {
  if (!password.value) return
  emit('confirm', password.value)
}

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
