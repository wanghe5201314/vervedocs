<template>
  <VdDialog v-model:open="visible" width="460px" :title="t('dialog.table.title')" class="insert-table-dialog app-dialog">
    <div class="insert-table-body">
      <section class="setting-section">
        <div class="section-title">{{ t('dialog.table.size') }}</div>
        <div class="size-fields">
          <label class="field">
            <span>{{ t('dialog.table.columns') }}</span>
            <a-input-number v-model:value="insertTableForm.cols" :min="1" :max="50" :precision="0" class="number-input" />
          </label>
          <label class="field">
            <span>{{ t('dialog.table.rows') }}</span>
            <a-input-number v-model:value="insertTableForm.rows" :min="1" :max="100" :precision="0" class="number-input" />
          </label>
        </div>
      </section>

      <section class="setting-section">
        <div class="section-title">{{ t('dialog.table.borderSettings') }}</div>
        <div class="preset-grid">
          <button
            v-for="preset in borderPresets"
            :key="preset"
            type="button"
            class="preset-button"
            :class="{ active: selectedOption === preset }"
            :aria-pressed="selectedOption === preset"
            :title="t(`dialog.table.${presetLabels[preset]}`)"
            @click="selectedOption = preset"
          >
            <span class="border-preview" :class="`preview-${preset}`" aria-hidden="true">
              <span v-for="cell in 4" :key="cell" class="preview-cell" />
            </span>
            <span class="preset-label">{{ t(`dialog.table.${presetLabels[preset]}`) }}</span>
          </button>
        </div>
        <div class="border-fields">
          <label class="field">
            <span>{{ t('dialog.table.color') }}</span>
            <span class="color-control">
              <input v-model="selectedColor" type="color" :disabled="selectedOption === 'none'" :aria-label="t('dialog.table.color')" />
              <span>{{ selectedColor.toUpperCase() }}</span>
            </span>
          </label>
          <label class="field">
            <span>{{ t('dialog.table.width') }} ({{ t('dialog.table.widthUnit') }})</span>
            <a-input-number v-model:value="lineWidth" :min="0.1" :max="5" :step="0.1" :precision="1" :disabled="selectedOption === 'none'" class="number-input" />
          </label>
        </div>
      </section>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <VdButton icon="close" @click="visible = false">{{ t('common.cancel') }}</VdButton>
        <VdButton type="primary" icon="check" :disabled="!canConfirm" @click="confirmInsertTable">{{ t('common.ok') }}</VdButton>
      </div>
    </template>
  </VdDialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { VdDialog, VdButton } from '@vervedoc/ui'
import { t } from '@/i18n'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', data: { rows: number; cols: number; border: { option: BorderPreset; color: string; width: number } }): void
}>()

const borderPresets = ['none', 'outside', 'all', 'inside', 'inside-horizontal', 'inside-vertical', 'top', 'bottom', 'left', 'right'] as const
type BorderPreset = typeof borderPresets[number]
const presetLabels: Record<BorderPreset, string> = {
  none: 'none',
  outside: 'box',
  all: 'all',
  inside: 'inside',
  'inside-horizontal': 'insideHorizontal',
  'inside-vertical': 'insideVertical',
  top: 'top',
  bottom: 'bottom',
  left: 'left',
  right: 'right'
}

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})
const insertTableForm = ref<{ rows: number | undefined; cols: number | undefined }>({ rows: 2, cols: 5 })
const selectedOption = ref<BorderPreset>('all')
const selectedColor = ref('#000000')
const lineWidth = ref<number | undefined>(1)
const canConfirm = computed(() =>
  Number.isInteger(insertTableForm.value.rows) && Number.isInteger(insertTableForm.value.cols) &&
  insertTableForm.value.rows! >= 1 && insertTableForm.value.rows! <= 100 &&
  insertTableForm.value.cols! >= 1 && insertTableForm.value.cols! <= 50 &&
  (selectedOption.value === 'none' || (lineWidth.value != null && lineWidth.value >= 0.1 && lineWidth.value <= 5))
)

const confirmInsertTable = () => {
  if (!canConfirm.value) return
  emit('confirm', {
    rows: insertTableForm.value.rows!,
    cols: insertTableForm.value.cols!,
    border: { option: selectedOption.value, color: selectedColor.value, width: lineWidth.value ?? 1 }
  })
  visible.value = false
}
</script>

<style scoped>
.insert-table-body {
  padding: 2px 0 0;
}

.setting-section + .setting-section {
  margin-top: 18px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #30343b;
  margin-bottom: 10px;
}

.size-fields, .border-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.border-fields {
  margin-top: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  color: #555d68;
  font-size: 12px;
}

.number-input {
  width: 100%;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
}

.preset-button {
  min-width: 0;
  min-height: 72px;
  padding: 7px 2px 5px;
  border: 1px solid #d9dee5;
  border-radius: 4px;
  background: #fff;
  color: #424b58;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  font: inherit;
}

.preset-button:hover {
  border-color: #8cadd0;
  background: #f6f9fc;
}

.preset-button.active {
  border-color: #1677c9;
  background: #edf5fc;
  color: #145c9b;
}

.preset-button:focus-visible {
  outline: 2px solid #1677c9;
  outline-offset: 2px;
}

.preset-label {
  display: -webkit-box;
  width: 100%;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow-wrap: anywhere;
  text-align: center;
  line-height: 1.25;
  font-size: 11px;
}

.border-preview {
  display: grid;
  grid-template-columns: repeat(2, 13px);
  grid-template-rows: repeat(2, 10px);
  flex: none;
  border: 1px solid #d6dce2;
  color: #425466;
}

.preview-cell {
  box-sizing: border-box;
}

.preview-all, .preview-outside, .preview-top, .preview-bottom, .preview-left, .preview-right {
  border-color: #425466;
}

.preview-none, .preview-inside, .preview-inside-horizontal, .preview-inside-vertical {
  border-color: #d6dce2;
}

.preview-none, .preview-inside, .preview-inside-horizontal, .preview-inside-vertical, .preview-top, .preview-bottom, .preview-left, .preview-right {
  border-style: solid;
}

.preview-none, .preview-inside, .preview-inside-horizontal, .preview-inside-vertical {
  border-width: 1px;
}

.preview-top { border-width: 2px 1px 1px; border-right-color: #d6dce2; border-bottom-color: #d6dce2; border-left-color: #d6dce2; }
.preview-bottom { border-width: 1px 1px 2px; border-top-color: #d6dce2; border-right-color: #d6dce2; border-left-color: #d6dce2; }
.preview-left { border-width: 1px 1px 1px 2px; border-top-color: #d6dce2; border-right-color: #d6dce2; border-bottom-color: #d6dce2; }
.preview-right { border-width: 1px 2px 1px 1px; border-top-color: #d6dce2; border-bottom-color: #d6dce2; border-left-color: #d6dce2; }

.preview-all .preview-cell:nth-child(odd),
.preview-inside .preview-cell:nth-child(odd),
.preview-inside-vertical .preview-cell:nth-child(odd) {
  border-right: 1px solid #425466;
}

.preview-all .preview-cell:nth-child(-n+2),
.preview-inside .preview-cell:nth-child(-n+2),
.preview-inside-horizontal .preview-cell:nth-child(-n+2) {
  border-bottom: 1px solid #425466;
}

.color-control {
  display: flex;
  align-items: center;
  height: 32px;
  gap: 8px;
  font-size: 12px;
  color: #555d68;
}

.color-control input {
  width: 34px;
  height: 28px;
  padding: 2px;
  border: 1px solid #d9dee5;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
}

.color-control input:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 480px) {
  .preset-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
</style>
