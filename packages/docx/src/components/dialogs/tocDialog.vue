<template>
  <VdDialog v-model:open="visible" :title="t('dialog.toc.title')" width="520px" :maskClosable="false" class="app-dialog" :destroyOnClose="true">
    <VdCard :bordered="true" class="dialog-card">
      <template #title>{{ t('dialog.toc.options') }}</template>
      <div class="dialog-grid-2">
        <div class="dialog-field">
          <div class="dialog-label">{{ t('dialog.toc.heading') }}</div>
          <a-input v-model:value="form.title" :placeholder="t('dialog.toc.placeholder')" />
        </div>
        <div class="dialog-field">
          <div class="dialog-label">{{ t('dialog.toc.maxLevel') }}</div>
          <a-select v-model:value="form.maxLevel" style="width: 100%">
            <a-select-option :value="1" :label="t('dialog.toc.level1')" />
            <a-select-option :value="2" :label="t('dialog.toc.level2')" />
            <a-select-option :value="3" :label="t('dialog.toc.level3')" />
          </a-select>
        </div>
      </div>
      <div class="dialog-row" style="margin-top: 10px">
        <a-checkbox v-model:checked="form.showPageNumber">{{ t('dialog.toc.showPageNumber') }}</a-checkbox>
        <a-checkbox v-model:checked="form.useDotLeader">{{ t('dialog.toc.dotLeader') }}</a-checkbox>
      </div>
      <div class="dialog-tip">{{ t('dialog.toc.hint') }}</div>
    </VdCard>
    <template #footer>
      <VdButton type="primary" @click="handleConfirm">{{ t('dialog.toc.insert') }}</VdButton>
      <VdButton @click="visible = false">{{ t('common.cancel') }}</VdButton>
    </template>
  </VdDialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { VdCard, VdDialog, VdButton } from '@vervedoc/ui'
import { t } from '@/i18n'

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
  title: t('dialog.toc.placeholder'),
  maxLevel: 3,
  showPageNumber: true,
  useDotLeader: true
})

/** 确认插入目录，触发 confirm 事件并关闭弹窗 */
const handleConfirm = () => {
  emit('confirm', { ...form.value, title: form.value.title.trim() || t('dialog.toc.placeholder') })
  visible.value = false
}
</script>
