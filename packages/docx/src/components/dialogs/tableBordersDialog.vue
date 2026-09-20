<template>
  <VdDialog v-model:open="visible" :title="title || '表格边框'" width="520px" :maskClosable="false" class="app-dialog" :destroyOnClose="true" @afterOpenChange="handleOpenChange">
    <div ref="dialogContent" tabindex="-1">
    <VdCard :bordered="true" class="dialog-card">
      <template #title>边框设置</template>
      <div class="dialog-tip">应用于当前表格。空白表示混合值或不适用，未修改的属性保持原样。</div>
      <div class="dialog-grid-2">
        <div class="dialog-field">
          <div class="dialog-label">边框类型</div>
          <a-select v-model:value="form.type" placeholder="混合" style="width: 100%">
            <a-select-option value="all" label="全部" />
            <a-select-option value="outside" label="外边框" />
            <a-select-option value="none" label="无边框" />
          </a-select>
        </div>
        <div class="dialog-field">
          <div class="dialog-label">颜色<span v-if="!form.color">（混合/无）</span></div>
          <input type="color" :value="form.color || '#000000'" @change="(e: Event) => form.color = (e.target as HTMLInputElement).value" style="width:40px;height:28px;border:1px solid #d9d9d9;border-radius:4px;cursor:pointer;padding:2px;" />
        </div>
      </div>
      <div class="dialog-grid-2" style="margin-top: 12px">
        <div class="dialog-field">
          <div class="dialog-label">内部线宽（px）</div>
          <a-input-number v-model:value="form.width" :min="0" :max="20" :step="0.5" style="width: 100%" />
        </div>
        <div class="dialog-field">
          <div class="dialog-label">外框线宽（px）</div>
          <a-input-number v-model:value="form.externalWidth" :min="0" :max="20" :step="0.5" style="width: 100%" />
        </div>
      </div>
    </VdCard>
    </div>
    <template #footer>
      <VdButton @click="visible = false">取消</VdButton>
      <VdButton type="primary" @click="handleConfirm">确定</VdButton>
    </template>
  </VdDialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { VdCard, VdDialog, VdButton } from '@vervedoc/ui'

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
