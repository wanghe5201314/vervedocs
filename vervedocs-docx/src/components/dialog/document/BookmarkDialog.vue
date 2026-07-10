<template>
  <a-modal v-model:open="visible" title="书签" width="520px" :maskClosable="false" :footer="null" class="app-dialog">
    <div class="bookmark-body">
      <div class="bookmark-left">
        <a-form :model="form" :label-col="{ style: { width: '70px' } }">
          <a-form-item label="书签名">
            <a-input v-model:value="form.name" placeholder="字母、数字、下划线或中文" @keydown.enter.prevent="handleAdd"/>
          </a-form-item>
        </a-form>

        <div class="bookmark-list-title">书签</div>
        <div style="overflow-y:auto;height:220px" class="bookmark-list">
          <div
            v-for="item in bookmarks"
            :key="item.name"
            class="bookmark-item"
            :class="{ active: selectedName === item.name }"
            @click="selectedName = item.name"
          >
            {{ item.name }}
          </div>
        </div>
      </div>

      <div class="bookmark-actions">
        <a-button type="primary" @click="handleAdd">添加</a-button>
        <a-button :disabled="!selectedName" @click="handleDelete">删除</a-button>
        <a-button :disabled="!selectedName" @click="handleGoto">转到</a-button>
        <a-button @click="visible = false">关闭</a-button>
      </div>
    </div>
  </a-modal>
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
  if (!/^[\w\u4e00-\u9fff]+$/.test(name)) {
    return
  }
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
  background: #e6f7ff;
  color: #1890ff;
}
</style>
