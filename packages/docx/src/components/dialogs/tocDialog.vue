<template>
  <VdDialog v-model:open="visible" title="目录" width="520px" :maskClosable="false" class="app-dialog" :destroyOnClose="true">
    <VdCard :bordered="true" class="dialog-card">
      <template #title>目录选项</template>
      <div class="dialog-grid-2">
        <div class="dialog-field">
          <div class="dialog-label">标题</div>
          <a-input v-model:value="form.title" placeholder="目录" />
        </div>
        <div class="dialog-field">
          <div class="dialog-label">最大级别</div>
          <a-select v-model:value="form.maxLevel" style="width: 100%">
            <a-select-option :value="1" label="1 级" />
            <a-select-option :value="2" label="2 级" />
            <a-select-option :value="3" label="3 级" />
          </a-select>
        </div>
      </div>
      <div class="dialog-row" style="margin-top: 10px">
        <a-checkbox v-model:checked="form.showPageNumber">显示页码</a-checkbox>
        <a-checkbox v-model:checked="form.useDotLeader">点引导符</a-checkbox>
      </div>
      <div class="dialog-tip">自定义目录会根据当前文档标题生成静态目录文本。</div>
    </VdCard>
    <template #footer>
      <VdButton type="primary" @click="handleConfirm">插入</VdButton>
      <VdButton @click="visible = false">取消</VdButton>
    </template>
  </VdDialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { VdCard, VdDialog, VdButton } from '@vervedoc/ui'

/** 目录对话框输出数据结构 */
export interface TocDialogPayload {
  title: string
  maxLevel: number
  showPageNumber: boolean
  useDotLeader: boolean
}

/** 组件 props 定义 */
const props = defineProps<{
  modelValue: boolean
}>()

/** 组件 emits 定义 */
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', payload: TocDialogPayload): void
}>()

/** 弹窗可见性，双向绑定到 modelValue */
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

/** 目录表单数据 */
const form = ref<TocDialogPayload>({
  title: '目录',
  maxLevel: 3,
  showPageNumber: true,
  useDotLeader: true
})

/** 确认插入目录，触发 confirm 事件并关闭弹窗 */
const handleConfirm = () => {
  emit('confirm', { ...form.value, title: form.value.title.trim() || '目录' })
  visible.value = false
}
</script>
