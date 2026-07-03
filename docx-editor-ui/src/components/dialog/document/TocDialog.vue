<template>
  <el-dialog v-model="visible" title="目录" width="520px" :close-on-click-modal="false" class="app-dialog" destroy-on-close>
    <el-card shadow="never" class="dialog-card">
      <template #header>目录选项</template>
      <div class="dialog-grid-2">
        <div class="dialog-field">
          <div class="dialog-label">标题</div>
          <el-input v-model="form.title" placeholder="目录" />
        </div>
        <div class="dialog-field">
          <div class="dialog-label">最大级别</div>
          <el-select v-model="form.maxLevel" style="width: 100%">
            <el-option :value="1" label="1 级" />
            <el-option :value="2" label="2 级" />
            <el-option :value="3" label="3 级" />
          </el-select>
        </div>
      </div>
      <div class="dialog-row" style="margin-top: 10px">
        <el-checkbox v-model="form.showPageNumber">显示页码</el-checkbox>
        <el-checkbox v-model="form.useDotLeader">点引导符</el-checkbox>
      </div>
      <div class="dialog-tip">自定义目录会根据当前文档标题生成静态目录文本。</div>
    </el-card>
    <template #footer>
      <el-button type="primary" @click="handleConfirm">插入</el-button>
      <el-button @click="visible = false">取消</el-button>
    </template>
  </el-dialog>
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
