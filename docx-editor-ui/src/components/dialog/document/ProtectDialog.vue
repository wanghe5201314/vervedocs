<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    width="420px"
    append-to-body
    :modal="modal"
    :close-on-click-modal="closable"
    :close-on-press-escape="closable"
    :show-close="closable"
    @close="handleClose"
  >
    <el-form label-width="90px" @submit.prevent>
      <el-form-item label="密码">
        <el-input
          v-model="password"
          type="password"
          show-password
          :placeholder="placeholder"
          @keyup.enter="handleConfirm"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button v-if="closable" @click="handleClose">取消</el-button>
        <el-button type="primary" :disabled="!password" @click="handleConfirm">确定</el-button>
      </div>
    </template>
  </el-dialog>
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
