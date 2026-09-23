<template>
  <VdDialog v-model:open="visible" :title="t('dialog.bookmark.title')" width="520px" :maskClosable="false" class="app-dialog">
    <div class="bookmark-body">
      <div class="bookmark-left">
        <a-form :model="form">
          <a-form-item :label="t('dialog.bookmark.name')">
            <a-input size="small"
              v-model:value="form.name"
              :placeholder="t('dialog.bookmark.placeholder')"
              @keydown.enter.prevent="handleAdd"
            />
          </a-form-item>
        </a-form>
        <div v-if="hasSelectionRange" class="bookmark-tip">
          {{ t('dialog.bookmark.rangeHint') }}
        </div>
        <div v-if="hasSelectionRange && selectionPreview" class="bookmark-selection-preview">
          {{ selectionPreview }}
        </div>
        <div v-if="nameError" class="bookmark-error">{{ nameError }}</div>

        <div class="bookmark-list-title">{{ t('dialog.bookmark.listTitle') }}</div>
        <div style="overflow-y:auto;height:220px" class="bookmark-list">
          <div
            v-for="item in bookmarks"
            :key="item.name"
            class="bookmark-item"
            :class="{ active: selectedName === item.name }"
            @click="selectedName = item.name"
            @dblclick="handleItemGoto(item.name)"
          >
            <div class="bookmark-item-name">{{ item.name }}</div>
            <div class="bookmark-item-meta">
              {{ item.collapsed ? t('dialog.bookmark.positionBookmark') : t('dialog.bookmark.rangeBookmark') }}
            </div>
          </div>
          <div v-if="!bookmarks.length" class="bookmark-empty">{{ t('dialog.bookmark.noBookmarks') }}</div>
        </div>
      </div>

      <div class="bookmark-actions">
        <VdButton type="primary" size="small" :disabled="!canAdd" @click="handleAdd">{{ t('dialog.bookmark.add') }}</VdButton>
        <VdButton :disabled="!selectedName" size="small" @click="handleDelete">{{ t('dialog.bookmark.delete') }}</VdButton>
        <VdButton :disabled="!selectedName" size="small" @click="handleGoto">{{ t('dialog.bookmark.goto') }}</VdButton>
        <VdButton size="small" @click="visible = false">{{ t('dialog.bookmark.close') }}</VdButton>
      </div>
    </div>
  </VdDialog>
</template>

<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import { VdDialog, VdButton } from '@vervedoc/ui'
import type { IBookmarkApi } from '@/composables/use-bookmarks'
import { t } from '@/i18n'

/** 组件 props 定义 */
const props = defineProps<{
  modelValue: boolean
  bookmarkAPI: IBookmarkApi
}>()

/** 组件 emits 定义 */
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

/** 弹窗可见性，双向绑定到 modelValue */
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

/** 书签表单数据 */
const form = ref({name: ''})
/** 当前选中的书签名 */
const selectedName = ref('')
/** 书签名称错误信息 */
const nameError = ref('')
/** 上一次自动填入的建议名称 */
const lastSuggestedName = ref('')
/** 书签名称合法字符正则（中文、字母、数字、下划线） */
const BOOKMARK_NAME_REG = /^[\w\u4e00-\u9fff]+$/
/** 当前文档书签列表 */
const bookmarks = computed(() => props.bookmarkAPI.bookmarkList.value)
/** 建议的书签名称 */
const suggestedName = computed(() => props.bookmarkAPI.suggestedBookmarkName.value)
/** 是否存在可创建范围书签的选区 */
const hasSelectionRange = computed(() => props.bookmarkAPI.hasBookmarkSelectionRange.value)
/** 选区内容预览 */
const selectionPreview = computed(() => props.bookmarkAPI.bookmarkSelectionPreview.value)
/** 是否可以添加书签（名称非空且无错误） */
const canAdd = computed(() => !!form.value.name.trim() && !nameError.value)

/**
 * 应用建议的书签名称（仅在用户未输入或未修改时填入）
 * @param name 建议名称
 * @returns {void}
 */
const applySuggestedName = (name?: string) => {
  const nextName = name?.trim() || ''
  if (!visible.value || !nextName) return
  if (!form.value.name.trim() || form.value.name === lastSuggestedName.value) {
    form.value.name = nextName
    lastSuggestedName.value = nextName
  }
}

/** 弹窗打开时初始化表单并刷新书签列表 */
watch(
  () => props.modelValue,
  (v) => {
    if (!v) return
    form.value.name = suggestedName.value.trim() || ''
    lastSuggestedName.value = form.value.name
    nameError.value = ''
    props.bookmarkAPI.refresh()
  }
)

/** 监听建议名称变化并自动应用 */
watch(
  suggestedName,
  (value) => {
    applySuggestedName(value)
  }
)

/** 书签列表变化时维护选中项的有效性 */
watch(
  bookmarks,
  (list) => {
    if (selectedName.value && list.some(i => i.name === selectedName.value)) return
    selectedName.value = list[0]?.name || ''
  },
  {immediate: true}
)

/** 校验书签名称：非空、合法字符、不重复 */
watch(
  () => form.value.name,
  (value) => {
    const name = value.trim()
    if (!name) {
      nameError.value = ''
      return
    }
    if (!BOOKMARK_NAME_REG.test(name)) {
      nameError.value = t('message.bookmarkNameInvalid')
      return
    }
    if (bookmarks.value.some(item => item.name === name)) {
      nameError.value = t('message.bookmarkNameExists')
      return
    }
    nameError.value = ''
  }
)

/** 添加书签 */
const handleAdd = () => {
  const name = form.value.name.trim()
  if (!name || nameError.value) return
  props.bookmarkAPI.add(name)
  form.value.name = suggestedName.value.trim() || ''
  lastSuggestedName.value = form.value.name
  nameError.value = ''
}

/** 删除当前选中的书签 */
const handleDelete = () => {
  if (!selectedName.value) return
  props.bookmarkAPI.remove(selectedName.value)
}

/** 转到当前选中的书签位置 */
const handleGoto = () => {
  if (!selectedName.value) return
  props.bookmarkAPI.locate(selectedName.value)
}

/**
 * 双击书签项时定位到该书签
 * @param name 书签名称
 * @returns {void}
 */
const handleItemGoto = (name: string) => {
  selectedName.value = name
  props.bookmarkAPI.locate(name)
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

.bookmark-tip {
  margin: -10px 0 8px 70px;
  font-size: 12px;
  color: #909399;
}

.bookmark-selection-preview {
  margin: -2px 0 8px 70px;
  max-width: calc(100% - 70px);
  font-size: 12px;
  color: #606266;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  border-bottom: 1px solid #f2f3f5;
}

.bookmark-item:last-child {
  border-bottom: none;
}

.bookmark-item:hover {
  background: #f5f7fa;
}

.bookmark-item.active {
  background: #e6f7ff;
  color: #1890ff;
}

.bookmark-item-name {
  font-weight: 500;
}

.bookmark-item-meta {
  margin-top: 2px;
  font-size: 12px;
  color: #909399;
}

.bookmark-empty {
  padding: 20px 12px;
  color: #909399;
  font-size: 13px;
  text-align: center;
}

.bookmark-error {
  margin: -2px 0 8px 70px;
  font-size: 12px;
  color: #f56c6c;
}
</style>
