<template>
  <el-dialog v-model="visible" title="书签" width="520px" :close-on-click-modal="false" class="app-dialog">
    <div class="bookmark-body">
      <div class="bookmark-left">
        <el-form :model="form" label-width="70px">
          <el-form-item label="书签名">
            <el-input v-model="form.name" placeholder="请输入书签名" @keydown.enter.prevent="handleAdd"/>
          </el-form-item>
        </el-form>

        <div class="bookmark-list-title">书签</div>
        <el-scrollbar height="220px" class="bookmark-list">
          <div
            v-for="item in bookmarks"
            :key="item.name"
            class="bookmark-item"
            :class="{ active: selectedName === item.name }"
            @click="selectedName = item.name"
          >
            {{ item.name }}
          </div>
        </el-scrollbar>
      </div>

      <div class="bookmark-actions">
        <el-button type="primary" @click="handleAdd">添加</el-button>
        <el-button :disabled="!selectedName" @click="handleDelete">删除</el-button>
        <el-button :disabled="!selectedName" @click="handleGoto">转到</el-button>
        <el-button @click="visible = false">关闭</el-button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import {computed, ref, watch} from 'vue'

const props = defineProps<{
  modelValue: boolean
  bookmarks: Array<{ name: string }>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'refresh'): void
  (e: 'add', name: string): void
  (e: 'delete', name: string): void
  (e: 'goto', name: string): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const form = ref({name: ''})
const selectedName = ref('')

watch(
  () => props.modelValue,
  (v) => {
    if (!v) return
    form.value.name = ''
    emit('refresh')
  }
)

watch(
  () => props.bookmarks,
  (list) => {
    if (selectedName.value && list.some(i => i.name === selectedName.value)) return
    selectedName.value = list[0]?.name || ''
  },
  {immediate: true}
)

const handleAdd = () => {
  const name = form.value.name.trim()
  if (!name) return
  emit('add', name)
  form.value.name = ''
}

const handleDelete = () => {
  if (!selectedName.value) return
  emit('delete', selectedName.value)
}

const handleGoto = () => {
  if (!selectedName.value) return
  emit('goto', selectedName.value)
}
</script>

<style scoped>
.bookmark-body {
  display: flex;
  gap: 12px;
}

.bookmark-left {
  flex: 1;
  min-width: 0;
}

.bookmark-actions {
  width: 96px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 36px;
}

.bookmark-list-title {
  font-size: 13px;
  color: #606266;
  margin: 6px 0 6px;
}

.bookmark-list {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}

.bookmark-item {
  padding: 6px 10px;
  cursor: pointer;
  font-size: 13px;
  color: #303133;
  user-select: none;
}

.bookmark-item:hover {
  background: #f5f7fa;
}

.bookmark-item.active {
  background: #ecf5ff;
  color: #409eff;
}

:deep(.el-scrollbar) {
  height: auto !important;
}

:deep(.el-button+.el-button) {
  margin-left: 0 !important;
}
</style>
