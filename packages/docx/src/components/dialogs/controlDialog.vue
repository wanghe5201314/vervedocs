<template>
  <VdDialog v-model:open="visible" :title="t('control.guide.heading', { kind: kindLabel })" :close-text="t('common.close')" width="440px" :maskClosable="false" class="app-dialog" @after-open-change="handleOpenChange">
    <template #title>
      <ControlFieldLabel :label="t('control.guide.heading', { kind: kindLabel })" :help="t(`control.guide.descriptions.${kind}`)" />
    </template>
    <a-form :model="form" layout="vertical">
      <a-form-item v-if="hasOptions" :style="{ marginBottom: 0 }">
        <template #label>
          <ControlFieldLabel :label="t('control.options')" :help="t('control.guide.optionsHelp')" />
        </template>
        <div class="control-options">
          <div v-for="(opt, i) in form.options" :key="opt.rowId" class="control-option-row">
            <a-input v-model:value="opt.label" :aria-label="t('control.guide.label') + ' ' + (i + 1)" :placeholder="t('control.guide.optionExample')" />
            <VdButton icon="minus" :title="t('control.removeOption')" :aria-label="t('control.removeOption') + ' ' + (i + 1)" @click="removeOption(i)" />
          </div>
        </div>
        <VdButton icon="plus" type="dashed" @click="addOption">{{ t('control.addOption') }}</VdButton>
      </a-form-item>

      <a-form-item v-if="kind === 'checkbox'" :style="{ marginBottom: 0 }">
        <template #label>
          <ControlFieldLabel :label="t('control.guide.checkboxLabel')" :help="t('control.guide.checkboxHelp')" />
        </template>
        <a-input v-model:value="form.checkboxLabel" :aria-label="t('control.guide.checkboxLabel')" :placeholder="t('control.guide.checkboxExample')" />
      </a-form-item>

      <a-form-item v-if="kind === 'date'" :style="{ marginBottom: 0 }">
        <template #label>
          <ControlFieldLabel :label="t('control.dateMode')" :help="t('control.guide.dateHelp')" />
        </template>
        <a-radio-group v-model:value="form.dateMode">
          <a-radio value="date">{{ t('control.dateOnly') }}</a-radio>
          <a-radio value="dateTime">{{ t('control.dateTime') }}</a-radio>
        </a-radio-group>
      </a-form-item>

      <a-form-item v-if="kind === 'text'" :style="{ marginBottom: 0 }">
        <template #label>
          <ControlFieldLabel :label="t('control.guide.maxLength')" :help="t('control.guide.maxLengthHelp')" />
        </template>
        <a-input-number v-model:value="form.maxLength" :aria-label="t('control.guide.maxLength')" :placeholder="t('control.guide.unlimited')" :min="0" :precision="0" style="width: 100%" />
      </a-form-item>

      <div v-if="kind === 'number'" class="control-number-range">
        <a-form-item :style="{ marginBottom: 0 }">
          <template #label>
            <ControlFieldLabel :label="t('control.guide.min')" :help="t('control.guide.rangeHelp')" />
          </template>
          <a-input-number v-model:value="form.min" :aria-label="t('control.guide.min')" :placeholder="t('control.guide.unlimited')" style="width: 100%" />
        </a-form-item>
        <a-form-item :style="{ marginBottom: 0 }">
          <template #label>
            <ControlFieldLabel :label="t('control.guide.max')" :help="t('control.guide.rangeHelp')" />
          </template>
          <a-input-number v-model:value="form.max" :aria-label="t('control.guide.max')" :placeholder="t('control.guide.unlimited')" style="width: 100%" />
        </a-form-item>
      </div>
      <div class="control-behavior">
        <div class="control-toggle">
          <ControlFieldLabel :label="t('control.required')" :help="t(kind === 'checkbox' ? 'control.guide.checkboxRequiredHelp' : 'control.guide.requiredHelp')" />
          <a-switch v-model:checked="form.required" size="small" :aria-label="t('control.required')" />
        </div>
        <div class="control-toggle">
          <ControlFieldLabel :label="t('control.readOnly')" :help="t('control.guide.readOnlyHelp')" />
          <a-switch v-model:checked="form.readOnly" size="small" :aria-label="t('control.readOnly')" />
        </div>
      </div>
      <details v-if="hasPlaceholder" :key="settingsKey" class="control-more">
        <summary>{{ t('control.guide.more') }}</summary>
        <a-form-item v-if="hasPlaceholder">
          <template #label>
            <ControlFieldLabel :label="t('control.placeholder')" :help="t('control.guide.placeholderHelp')" />
          </template>
          <a-input v-model:value="form.placeholder" :placeholder="defaultPlaceholder" :aria-label="t('control.placeholder')" />
        </a-form-item>
        <a-form-item v-if="kind === 'multiSelect'">
          <template #label>
            <ControlFieldLabel :label="t('control.delimiter')" :help="t('control.guide.delimiterHelp')" />
          </template>
          <a-input v-model:value="form.delimiter" :aria-label="t('control.delimiter')" />
        </a-form-item>
        <a-form-item v-if="kind === 'number'">
          <template #label>
            <ControlFieldLabel :label="t('control.guide.precision')" :help="t('control.guide.precisionHelp')" />
          </template>
          <a-input-number v-model:value="form.precision" :min="0" :max="10" :precision="0" :placeholder="t('control.guide.unlimited')" :aria-label="t('control.guide.precision')" style="width: 100%" />
        </a-form-item>
      </details>
    </a-form>

    <template #footer>
      <div class="control-footer">
        <p v-if="showErrors && validationError" class="control-error" role="alert">{{ validationError }}</p>
        <div class="control-actions">
          <VdButton type="primary" icon="check" @click="handleConfirm">{{ t('control.guide.insert') }}</VdButton>
          <VdButton icon="close" @click="visible = false">{{ t('control.cancel') }}</VdButton>
        </div>
      </div>
    </template>
  </VdDialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { VdDialog, VdButton } from '@vervedoc/ui'
import { t } from '@/i18n'
import type { ControlKind, IControlConfig, IControlOption } from '@vervedoc/docx-editor-schema'
import ControlFieldLabel from './controlFieldLabel.vue'

const props = defineProps<{ modelValue: boolean; kind: ControlKind }>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', config: IControlConfig): void
  (e: 'afterConfirm'): void
}>()
const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})
const hasOptions = computed(() => ['select', 'multiSelect', 'radioGroup'].includes(props.kind))
const hasPlaceholder = computed(() => props.kind !== 'checkbox' && props.kind !== 'radioGroup')
const defaultPlaceholder = computed(() => hasPlaceholder.value ? t(`control.guide.placeholders.${props.kind}`) : '')
const kindKeys: Record<ControlKind, string> = {
  text: 'controlText', number: 'controlNumber', date: 'controlDate', select: 'controlSelect',
  multiSelect: 'controlMultiSelect', checkbox: 'controlCheckbox', radioGroup: 'controlRadioGroup'
}
const kindLabel = computed(() => t(`ribbon.insert.${kindKeys[props.kind]}`))
const showErrors = ref(false)
const settingsKey = ref(0)
let confirmed = false
const handleOpenChange = (open: boolean) => {
  if (!open && confirmed) {
    confirmed = false
    emit('afterConfirm')
  }
}
let nextRowId = 0

interface ControlForm {
  placeholder: string
  required: boolean
  readOnly: boolean
  delimiter: string
  precision?: number
  maxLength?: number
  min?: number
  max?: number
  dateMode: 'date' | 'dateTime'
  checkboxLabel: string
  options: (IControlOption & { rowId: number })[]
}
const createForm = (): ControlForm => ({
  placeholder: '', required: false, readOnly: false, delimiter: ',',
  dateMode: 'date', checkboxLabel: '', options: []
})
const form = ref<ControlForm>(createForm())
const validationError = computed(() => {
  if (hasOptions.value) {
    if (!form.value.options.length) return t('control.guide.optionsRequired')
    const emptyIndex = form.value.options.findIndex(option => !option.label.trim())
    if (emptyIndex !== -1) return t('control.guide.optionIncomplete', { index: emptyIndex + 1 })
  }
  if (props.kind === 'number' && form.value.min != null && form.value.max != null && form.value.min > form.value.max) {
    return t('control.guide.invalidRange')
  }
  return ''
})

const addOption = () => {
  const used = new Set(form.value.options.map(option => option.value))
  let index = 1
  while (used.has(`option${index}`)) index++
  form.value.options.push({
    rowId: nextRowId++, value: `option${index}`,
    label: t('control.guide.defaultOption', { index })
  })
}
const removeOption = (index: number) => form.value.options.splice(index, 1)

watch(() => props.modelValue, open => {
  if (!open) return
  showErrors.value = false
  confirmed = false
  settingsKey.value++
  form.value = createForm()
  if (hasOptions.value) {
    addOption()
    addOption()
  }
}, { immediate: true })

const handleConfirm = () => {
  showErrors.value = true
  if (validationError.value) return
  const config: IControlConfig = {
    kind: props.kind,
    required: form.value.required,
    readOnly: form.value.readOnly,
    removable: true
  }
  if (hasPlaceholder.value) {
    config.placeholder = form.value.placeholder || defaultPlaceholder.value
  }
  if (props.kind === 'text' && form.value.maxLength != null) config.maxLength = form.value.maxLength
  if (props.kind === 'number') {
    if (form.value.min != null) config.min = form.value.min
    if (form.value.max != null) config.max = form.value.max
    if (form.value.precision != null) config.precision = form.value.precision
  }
  if (props.kind === 'date') config.dateMode = form.value.dateMode
  if (hasOptions.value) config.options = form.value.options.map(({ value, label }) => ({ value, label }))
  if (props.kind === 'multiSelect') config.delimiter = form.value.delimiter
  if (props.kind === 'checkbox' && form.value.checkboxLabel) config.checkboxLabel = form.value.checkboxLabel
  emit('confirm', config)
  confirmed = true
  visible.value = false
}
</script>

<style scoped>
.control-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}
.control-option-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 32px;
  gap: 8px;
  align-items: center;
}
.control-number-range {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.control-behavior {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 32px;
  margin-top: 20px;
}
.control-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
}
.control-more {
  margin-top: 16px;
  border-top: 1px solid #eee;
}
.control-more > summary {
  cursor: pointer;
  padding: 12px 0;
  color: #595959;
}
.control-error {
  color: #c62828;
  margin: 0 0 8px;
  text-align: left;
}
.control-footer {
  width: 100%;
}
.control-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
