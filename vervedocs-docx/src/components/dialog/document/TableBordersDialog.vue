<template>
  <el-dialog v-model="visible" title="表格边框" width="520px" :close-on-click-modal="false" class="app-dialog" destroy-on-close>
    <el-card shadow="never" class="dialog-card">
      <template #header>边框设置</template>
      <div class="dialog-grid-2">
        <div class="dialog-field">
          <div class="dialog-label">边框类型</div>
          <el-select v-model="form.type" style="width: 100%">
            <el-option value="all" label="全部" />
            <el-option value="outside" label="外边框" />
            <el-option value="none" label="无边框" />
          </el-select>
        </div>
        <div class="dialog-field">
          <div class="dialog-label">颜色</div>
          <el-color-picker v-model="form.color" show-alpha />
        </div>
      </div>
      <div class="dialog-grid-2" style="margin-top: 12px">
        <div class="dialog-field">
          <div class="dialog-label">内部线宽</div>
          <el-input-number v-model="form.width" :min="0" :max="20" :step="0.5" style="width: 100%" />
        </div>
        <div class="dialog-field">
          <div class="dialog-label">外框线宽</div>
          <el-input-number v-model="form.externalWidth" :min="0" :max="20" :step="0.5" style="width: 100%" />
        </div>
      </div>
    </el-card>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="handleConfirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

export type TableBordersDialogPayload = {
  type: 'all' | 'outside' | 'none'
  color: string
  width: number
  externalWidth: number
}

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', payload: TableBordersDialogPayload): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const form = ref<TableBordersDialogPayload>({
  type: 'all',
  color: '#000000',
  width: 1,
  externalWidth: 1
})

watch(
  () => props.modelValue,
  v => {
    if (!v) return
    form.value = { type: 'all', color: '#000000', width: 1, externalWidth: 1 }
  }
)

const handleConfirm = () => {
  emit('confirm', { ...form.value })
  visible.value = false
}
</script>
