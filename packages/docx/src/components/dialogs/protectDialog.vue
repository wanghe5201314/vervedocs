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

/** 组件 props 定义 */
const props = defineProps<{ modelValue: boolean; mode?: 'lock' | 'unlock' }>()
/** 组件 emits 定义 */
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'confirm', password: string): void
}>()

/** 密码输入值 */
const password = ref('')

/** 弹窗标题（解锁或保护） */
const title = computed(() => (props.mode === 'unlock' ? '解锁' : '保护'))
/** 密码输入框占位提示 */
const placeholder = computed(() => (props.mode === 'unlock' ? '请输入解锁密码' : '请输入保护密码'))
/** 是否可关闭（解锁模式不可关闭） */
const closable = computed(() => props.mode !== 'unlock')
/** 是否显示遮罩（解锁模式不显示遮罩） */
const modal = computed(() => props.mode !== 'unlock')

/** 弹窗打开时清空密码 */
watch(
  () => props.modelValue,
  visible => {
    if (visible) password.value = ''
  }
)

/** 关闭弹窗 */
const handleClose = () => {
  emit('update:modelValue', false)
}

/** 确认密码并触发 confirm 事件 */
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
