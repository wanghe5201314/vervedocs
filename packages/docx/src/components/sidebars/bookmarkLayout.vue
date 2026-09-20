<template>
  <div class="bookmark-sidebar" editor-component="bookmark-sidebar">
    <div class="sidebar-header">
      <div class="sidebar-title-wrap">
        <VdIcon name="bookmark-outline" :size="16" />
        <span class="sidebar-title">书签</span>
      </div>
      <div class="sidebar-close" @click="emit('close')" title="关闭">
        <CloseOutlined />
      </div>
    </div>

    <div class="sidebar-content">
      <div class="bookmark-add-bar">
        <a-input
          v-model:value="form.name"
          size="small"
          allow-clear
          placeholder="书签名"
          :status="nameError ? 'error' : ''"
          @keydown.enter.prevent="handleAdd"
        />
        <VdButton
          type="primary"
          size="small"
          :disabled="!canAdd"
          @click="handleAdd"
        >
          添加
        </VdButton>
      </div>

      <div v-if="hasSelectionRange" class="bookmark-tip">
        将按当前选中内容创建范围书签
      </div>
      <div v-if="hasSelectionRange && selectionPreview" class="bookmark-selection-preview" :title="selectionPreview">
        {{ selectionPreview }}
      </div>
      <div v-if="nameError" class="bookmark-error">{{ nameError }}</div>

      <div class="bookmark-list-header">
        <span>书签列表</span>
        <span class="bookmark-count">{{ bookmarks.length }}</span>
      </div>

      <div class="bookmark-list">
        <div
          v-for="item in bookmarks"
          :key="item.name"
          class="bookmark-item"
          :class="{ active: selectedName === item.name }"
          @click="selectedName = item.name"
          @dblclick="handleLocate(item.name)"
        >
          <div class="bookmark-item-main">
            <VdIcon name="bookmark-outline" :size="14" class="bookmark-item-icon" />
            <span class="bookmark-item-name" :title="item.name">{{ item.name }}</span>
          </div>
          <div class="bookmark-item-meta">
            <span>{{ item.collapsed ? '位置' : '范围' }}</span>
            <div class="bookmark-item-actions">
              <button
                type="button"
                class="bookmark-item-locate"
                title="跳转到该书签"
                @click.stop="handleLocate(item.name)"
              >
                <RightOutlined />
              </button>
              <button
                type="button"
                class="bookmark-item-delete"
                title="删除该书签"
                @click.stop="handleDelete(item.name)"
              >
                <DeleteOutlined />
              </button>
            </div>
          </div>
        </div>
        <div v-if="!bookmarks.length" class="bookmark-empty">
          <a-empty :image="false" description="暂无书签" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CloseOutlined, RightOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { VdIcon, VdButton } from '@vervedoc/ui'
import type { IBookmarkApi } from '@/composables/use-bookmarks'

const props = defineProps<{
  bookmarkAPI: IBookmarkApi
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const form = ref({ name: '' })
const selectedName = ref('')
const nameError = ref('')
const lastSuggestedName = ref('')
const BOOKMARK_NAME_REG = /^[\w\u4e00-\u9fff]+$/

const bookmarks = computed(() => props.bookmarkAPI.bookmarkList.value)
const suggestedName = computed(() => props.bookmarkAPI.suggestedBookmarkName.value)
const hasSelectionRange = computed(() => props.bookmarkAPI.hasBookmarkSelectionRange.value)
const selectionPreview = computed(() => props.bookmarkAPI.bookmarkSelectionPreview.value)
const canAdd = computed(() => !!form.value.name.trim() && !nameError.value)

const applySuggestedName = (name?: string) => {
  const nextName = name?.trim() || ''
  if (!nextName) return
  if (!form.value.name.trim() || form.value.name === lastSuggestedName.value) {
    form.value.name = nextName
    lastSuggestedName.value = nextName
  }
}

watch(
  bookmarks,
  (list) => {
    if (selectedName.value && list.some(i => i.name === selectedName.value)) return
    selectedName.value = list[0]?.name || ''
  },
  { immediate: true }
)

watch(suggestedName, (value) => applySuggestedName(value))

watch(
  () => form.value.name,
  (value) => {
    const name = value.trim()
    if (!name) {
      nameError.value = ''
      return
    }
    if (!BOOKMARK_NAME_REG.test(name)) {
      nameError.value = '仅支持中文、字母、数字和下划线'
      return
    }
    if (bookmarks.value.some(item => item.name === name)) {
      nameError.value = '该书签名称已存在'
      return
    }
    nameError.value = ''
  }
)

const handleAdd = () => {
  const name = form.value.name.trim()
  if (!name || nameError.value) return
  props.bookmarkAPI.add(name)
  form.value.name = suggestedName.value.trim() || ''
  lastSuggestedName.value = form.value.name
  nameError.value = ''
}

const handleDelete = (name: string) => {
  props.bookmarkAPI.remove(name)
}

const handleLocate = (name: string) => {
  selectedName.value = name
  props.bookmarkAPI.locate(name)
}

watch(
  () => props.bookmarkAPI,
  () => {
    props.bookmarkAPI.refresh()
    form.value.name = suggestedName.value.trim() || ''
    lastSuggestedName.value = form.value.name
  },
  { immediate: true }
)
</script>

<style scoped>
.bookmark-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  padding: 0 8px 8px;
  background-color: var(--app-sidebar-bg, #f1f1f1);
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 34px;
  border-bottom: 1px solid #e4e7ed;
}

.sidebar-title-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #303133;
}

.sidebar-close {
  color: #909399;
  cursor: pointer;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.sidebar-close:hover {
  background-color: var(--app-sidebar-hover-bg, #f5f7fa);
  color: #ff4d4f;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 2px 2px;
  display: flex;
  flex-direction: column;
}

.bookmark-add-bar {
  display: flex;
  gap: 6px;
  align-items: center;
}

.bookmark-tip {
  margin-top: 6px;
  font-size: 12px;
  color: #909399;
}

.bookmark-selection-preview {
  margin-top: 2px;
  font-size: 12px;
  color: #606266;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bookmark-error {
  margin-top: 2px;
  font-size: 12px;
  color: #f56c6c;
}

.bookmark-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 12px 0 6px;
  font-size: 12px;
  color: #606266;
}

.bookmark-count {
  color: #909399;
}

.bookmark-list {
  flex: 1;
  overflow-y: auto;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}

.bookmark-item {
  padding: 6px 10px;
  cursor: pointer;
  font-size: 13px;
  color: #303133;
  user-select: none;
  border-bottom: 1px solid #f2f3f5;
  transition: background 0.15s ease;
}

.bookmark-item:last-child {
  border-bottom: none;
}

.bookmark-item:hover {
  background: var(--app-sidebar-hover-bg, #f5f7fa);
}

.bookmark-item.active {
  background: var(--app-sidebar-active-bg, #e6f7ff);
}

.bookmark-item-main {
  display: flex;
  align-items: center;
  gap: 6px;
}

.bookmark-item-icon {
  color: #1890ff;
  flex-shrink: 0;
}

.bookmark-item-name {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.bookmark-item-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
  padding-left: 20px;
}

.bookmark-item-actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.bookmark-item-actions button {
  background: transparent;
  border: none;
  cursor: pointer;
  color: #909399;
  padding: 2px 4px;
  border-radius: 3px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s, background 0.15s;
}

.bookmark-item-actions .bookmark-item-locate:hover {
  color: #1890ff;
  background: var(--app-sidebar-active-bg, #e6f7ff);
}

.bookmark-item-actions .bookmark-item-delete:hover {
  color: #ff4d4f;
  background: var(--app-sidebar-danger-hover-bg, #fff1f0);
}

.bookmark-empty {
  padding: 24px 12px;
  color: #909399;
  font-size: 13px;
  text-align: center;
}
</style>
