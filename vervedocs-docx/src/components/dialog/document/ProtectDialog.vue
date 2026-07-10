<template>
  <a-modal
    :open="modelValue"
    :title="title"
    width="420px"
    :mask="modal"
    :maskClosable="closable"
    :keyboard="closable"
    :closable="closable"
    @cancel="handleClose"
  >
    <a-form :label-col="{ style: { width: '90px' } }" @submit.prevent>
      <a-form-item label="密码">
        <a-input-password
          v-model:value="password"
          :placeholder="placeholder"
          @keyup.enter="handleConfirm"
        />
      </a-form-item>
    </a-form>

    <template #footer>
      <div class="dialog-footer">
        <a-button v-if="closable" @click="handleClose">取消</a-button>
        <a-button type="primary" :disabled="!password" @click="handleConfirm">确定</a-button>
      </div>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{ modelValue: boolean; mode?: 'lock' | 'unlock' }>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'confirm', password: string): void
}>()

const password = ref('')

const title = computed(() => (props.mode === 'unlock' ? '解锁' : '保护'))
const placeholder = computed(() => (props.mode === 'unlock' ? '请输入解锁密码' : '请输入保护密码'))
const closable = computed(() => props.mode !== 'unlock')
const modal = computed(() => props.mode !== 'unlock')

watch(
  () => props.modelValue,
  visible => {
    if (visible) password.value = ''
  }
)

const handleClose = () => {
  emit('update:modelValue', false)
}

const handleConfirm = () => {
  if (!password.value) return
  emit('confirm', password.value)
}
</script>

<style scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
