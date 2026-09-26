<template>
  <VdDialog v-model:open="visible" :title="title || t('dialog.tableBorders.title')" width="520px" :maskClosable="false" class="app-dialog" :destroyOnClose="true" @afterOpenChange="handleOpenChange">
    <div ref="dialogContent" tabindex="-1">
    <VdCard :bordered="true" class="dialog-card">
      <template #title>{{ t('dialog.tableBorders.borderSettings') }}</template>
      <div class="dialog-tip">{{ t('dialog.tableBorders.applyHint') }}</div>
      <div class="dialog-grid-2">
        <div class="dialog-field">
          <div class="dialog-label">{{ t('dialog.tableBorders.borderType') }}</div>
          <a-select v-model:value="form.type" :placeholder="t('dialog.tableBorders.borderTypePlaceholder')" style="width: 100%">
            <a-select-option value="all" :label="t('dialog.tableBorders.all')" />
            <a-select-option value="outside" :label="t('dialog.tableBorders.outer')" />
            <a-select-option value="none" :label="t('dialog.tableBorders.none')" />
          </a-select>
        </div>
        <div class="dialog-field">
          <div class="dialog-label">{{ t('dialog.tableBorders.color') }}<span v-if="!form.color">{{ t('dialog.tableBorders.colorMixed') }}</span></div>
          <input type="color" :value="form.color || '#000000'" @change="(e: Event) => form.color = (e.target as HTMLInputElement).value" style="width:40px;height:28px;border:1px solid #d9d9d9;border-radius:4px;cursor:pointer;padding:2px;" />
        </div>
      </div>
      <div class="dialog-grid-2" style="margin-top: 12px">
        <div class="dialog-field">
          <div class="dialog-label">{{ t('dialog.tableBorders.innerWidth') }}</div>
          <a-input-number v-model:value="form.width" :min="0" :max="20" :step="0.5" style="width: 100%" />
        </div>
        <div class="dialog-field">
          <div class="dialog-label">{{ t('dialog.tableBorders.outerWidth') }}</div>
          <a-input-number v-model:value="form.externalWidth" :min="0" :max="20" :step="0.5" style="width: 100%" />
        </div>
      </div>
    </VdCard>
    </div>
    <template #footer>
      <VdButton icon="close" @click="visible = false">{{ t('common.cancel') }}</VdButton>
      <VdButton type="primary" icon="check" @click="handleConfirm">{{ t('common.ok') }}</VdButton>
    </template>
  </VdDialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { VdCard, VdDialog, VdButton } from '@vervedoc/ui'
import { t } from '@/i18n'

type TableBorders = { type?: string; color?: string; width?: number; externalWidth?: number }
const props = defineProps<{
  modelValue: boolean
  title?: string
  editor: { executeCommand: (command: string, ...args: any[]) => any }
}>()
const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()
const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})
const dialogContent = ref<HTMLElement | null>(null)
const form = ref<TableBorders>({})
let initial: TableBorders = {}
let context: any = null

watch(() => props.modelValue, open => {
  if (!open) return
  context = props.editor.executeCommand('getTableDialogContext')
  const current = props.editor.executeCommand('getTableBorders')
  if (!current) {
    visible.value = false
    return
  }
  initial = { ...current }
  form.value = { ...current }
  void nextTick(() => dialogContent.value?.focus())
}, { flush: 'sync' })

const handleOpenChange = (open: boolean) => {
  if (open || props.modelValue || !context) return
  props.editor.executeCommand('restoreTableDialogContext', context)
  props.editor.executeCommand('focusEditor')
  context = null
}

const handleConfirm = () => {
  if (!context) return
  const patch = Object.fromEntries(Object.entries(form.value).filter(([key, value]) =>
    value != null && value !== initial[key as keyof TableBorders]
  ))
  props.editor.executeCommand('restoreTableDialogContext', context)
  if (Object.keys(patch).length) props.editor.executeCommand('tableBorders', patch)
  visible.value = false
}
</script>
