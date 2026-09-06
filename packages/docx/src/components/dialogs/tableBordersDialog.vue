<template>
  <a-modal v-model:open="visible" title="表格边框" width="520px" :maskClosable="false" class="app-dialog" :destroyOnClose="true">
    <a-card :bordered="true" class="dialog-card">
      <template #title>边框设置</template>
      <div class="dialog-grid-2">
        <div class="dialog-field">
          <div class="dialog-label">边框类型</div>
          <a-select v-model:value="form.type" style="width: 100%">
            <a-select-option value="all" label="全部" />
            <a-select-option value="outside" label="外边框" />
            <a-select-option value="none" label="无边框" />
          </a-select>
        </div>
        <div class="dialog-field">
          <div class="dialog-label">颜色</div>
          <input type="color" :value="form.color" @change="(e: Event) => form.color = (e.target as HTMLInputElement).value" style="width:40px;height:28px;border:1px solid #d9d9d9;border-radius:4px;cursor:pointer;padding:2px;" />
        </div>
      </div>
      <div class="dialog-grid-2" style="margin-top: 12px">
        <div class="dialog-field">
          <div class="dialog-label">内部线宽</div>
          <a-input-number v-model:value="form.width" :min="0" :max="20" :step="0.5" style="width: 100%" />
        </div>
        <div class="dialog-field">
          <div class="dialog-label">外框线宽</div>
          <a-input-number v-model:value="form.externalWidth" :min="0" :max="20" :step="0.5" style="width: 100%" />
        </div>
      </div>
    </a-card>
    <template #footer>
      <a-button @click="visible = false">取消</a-button>
      <a-button type="primary" @click="handleConfirm">确定</a-button>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

/** 表格边框对话框输出数据结构 */
export type TableBordersDialogPayload = {
  type: 'all' | 'outside' | 'none'
  color: string
  width: number
  externalWidth: number
}

/** 组件 props 定义 */
const props = defineProps<{
  modelValue: boolean
}>()

/** 组件 emits 定义 */
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', payload: TableBordersDialogPayload): void
}>()

/** 弹窗可见性，双向绑定到 modelValue */
const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

/** 边框设置表单数据 */
const form = ref<TableBordersDialogPayload>({
  type: 'all',
  color: '#000000',
  width: 1,
  externalWidth: 1
})

/** 弹窗打开时重置表单为默认值 */
watch(
  () => props.modelValue,
  v => {
    if (!v) return
    form.value = { type: 'all', color: '#000000', width: 1, externalWidth: 1 }
  }
)

/** 确认边框设置，触发 confirm 事件并关闭弹窗 */
const handleConfirm = () => {
  emit('confirm', { ...form.value })
  visible.value = false
}
</script>
