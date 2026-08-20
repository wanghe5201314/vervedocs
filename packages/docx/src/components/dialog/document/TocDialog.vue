<template>
  <a-modal v-model:open="visible" title="目录" width="520px" :maskClosable="false" class="app-dialog" :destroyOnClose="true">
    <a-card :bordered="true" class="dialog-card">
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
    </a-card>
    <template #footer>
      <a-button type="primary" @click="handleConfirm">插入</a-button>
      <a-button @click="visible = false">取消</a-button>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

export interface TocDialogPayload {
  title: string
  maxLevel: number
  showPageNumber: boolean
  useDotLeader: boolean
}

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', payload: TocDialogPayload): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const form = ref<TocDialogPayload>({
  title: '目录',
  maxLevel: 3,
  showPageNumber: true,
  useDotLeader: true
})

const handleConfirm = () => {
  emit('confirm', { ...form.value, title: form.value.title.trim() || '目录' })
  visible.value = false
}
</script>
