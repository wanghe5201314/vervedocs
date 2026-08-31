<template>
  <div class="search-sidebar" editor-component="search-sidebar">
    <div class="sidebar-header">
      <div class="sidebar-title-wrap">
        <SearchOutlined class="sidebar-title-icon" />
        <span class="sidebar-title">查找和替换</span>
      </div>
      <div class="sidebar-close" @click="emit('close')" title="关闭">
        <CloseOutlined />
      </div>
    </div>
    <div class="sidebar-content">
      <a-input
        v-model:value="searchText"
        allow-clear
        placeholder="输入要查找的内容回车后开始搜索"
        @keyup.enter="runSearch"
      />
      <a-input
        v-model:value="replaceText"
        allow-clear
        placeholder="替换为"
        @keyup.enter="replaceCurrent"
      />

      <div class="result-toolbar">
        <div class="result-summary">
          搜索结果：
          <span class="result-count">{{ currentDisplay }}/{{ resultList.length }}</span>
        </div>
        <div class="navigate-actions">
          <button
            class="icon-btn"
            type="button"
            :disabled="!resultList.length"
            @click="navigate(-1)"
          >
            <UpOutlined />
          </button>
          <button
            class="icon-btn"
            type="button"
            :disabled="!resultList.length"
            @click="navigate(1)"
          >
            <DownOutlined />
          </button>
        </div>
      </div>

      <div class="actions">
        <a-button :disabled="!canReplaceCurrent" @click="replaceCurrent">
          <VIcon name="find-replace" />
          替换
        </a-button>
        <a-button :disabled="!canReplaceAll" @click="replaceAll">
          <VIcon name="check-all" />
          全部替换
        </a-button>
      </div>

      <div v-if="resultList.length" class="result-list">
        <button
          v-for="item in resultList"
          :key="item.groupId"
          class="result-item"
          type="button"
          :class="{ active: item.resultIndex === activeIndex }"
          @click="selectResult(item.resultIndex)"
        >
          <div class="result-item-meta">
            <span class="result-page">第 {{ item.pageNo }} 页</span>
            <span class="result-coord">
              {{ Math.round(item.startPosition.coordinate.leftTop[0]) }},
              {{ Math.round(item.startPosition.coordinate.leftTop[1]) }}
            </span>
          </div>
          <div class="result-item-text" v-html="renderPreviewHtml(item.previewText, item.text)"></div>
        </button>
      </div>
      <div v-else class="empty-state">
        <a-empty :image="false" :description="searchText ? '没有找到匹配内容' : '请输入关键词开始搜索'" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { CloseOutlined, DownOutlined, SearchOutlined, UpOutlined } from '@ant-design/icons-vue'
import { VIcon } from '@vervedoc/icons'
import type { ISearchResultItem } from '@vervedoc/core'
import type { IEditorSearchApi } from '@/composables/use-editor-search'

const props = defineProps<{
  searchAPI: IEditorSearchApi
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const searchText = ref('')
const replaceText = ref('')
const resultList = ref<ISearchResultItem[]>([])
const activeIndex = ref(-1)

const currentDisplay = computed(() =>
  resultList.value.length && activeIndex.value >= 0
    ? activeIndex.value + 1
    : 0
)

const canReplaceCurrent = computed(() =>
  !!replaceText.value && !!searchText.value && activeIndex.value >= 0
)

const canReplaceAll = computed(() =>
  !!replaceText.value && !!searchText.value && resultList.value.length > 0
)

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const renderPreviewHtml = (previewText: string, keyword: string) => {
  const safePreview = escapeHtml(previewText || '')
  const safeKeyword = escapeHtml(keyword || '')
  if (!safeKeyword) return safePreview
  const pattern = new RegExp(
    safeKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    'ig'
  )
  return safePreview.replace(pattern, match => `<mark>${match}</mark>`)
}

const syncResultList = async (nextList: ISearchResultItem[]) => {
  resultList.value = Array.isArray(nextList) ? nextList : []
  if (!resultList.value.length) {
    activeIndex.value = -1
    return
  }
  activeIndex.value = Math.min(
    Math.max(activeIndex.value, 0),
    resultList.value.length - 1
  )
}

const runSearch = async () => {
  const keyword = searchText.value.trim()
  const nextList = !keyword
    ? await Promise.resolve(props.searchAPI.clear())
    : await Promise.resolve(props.searchAPI.query(keyword))
  await syncResultList(nextList)
  if (resultList.value.length) {
    activeIndex.value = 0
  }
}

const selectResult = async (index: number) => {
  const result = resultList.value[index]
  if (!result) return
  activeIndex.value = index
  await Promise.resolve(props.searchAPI.locate(result))
}

const navigate = async (step: number) => {
  if (!resultList.value.length) return
  const nextIndex =
    activeIndex.value < 0
      ? 0
      : (activeIndex.value + step + resultList.value.length) % resultList.value.length
  await selectResult(nextIndex)
}

const replaceCurrent = async () => {
  const keyword = searchText.value.trim()
  const currentResult = resultList.value[activeIndex.value] || null
  if (!keyword || !replaceText.value || !currentResult) return
  const nextList = await Promise.resolve(
    props.searchAPI.replaceOne(currentResult, replaceText.value)
  )
  await syncResultList(nextList)
  if (activeIndex.value >= 0) {
    await selectResult(activeIndex.value)
  }
}

const replaceAll = async () => {
  const keyword = searchText.value.trim()
  if (!keyword || !replaceText.value) return
  const nextList = await Promise.resolve(
    props.searchAPI.replaceAll(keyword, replaceText.value)
  )
  await syncResultList(nextList)
}

watch(
  () => searchText.value,
  value => {
    if (!value.trim()) {
      void runSearch()
    }
  }
)

onMounted(() => {
  if (!searchText.value.trim()) {
    void runSearch()
  }
})

onBeforeUnmount(() => {
  void Promise.resolve(props.searchAPI.clear())
})
</script>

<style scoped>
.search-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background-color: #f1f1f1;
  border-right: 1px solid #f1f1f1;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 44px;
  padding: 0 10px;
  border-bottom: 1px solid #d9d9d9;
}

.sidebar-title-wrap {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

.sidebar-title-icon {
  font-size: 14px;
  color: #303133;
  flex-shrink: 0;
}

.sidebar-title {
  font-size: 13px;
  font-weight: 600;
  color: #111;
}

.sidebar-close {
  color: #666;
  cursor: pointer;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
  margin-left: 8px;
}

.sidebar-close:hover {
  color: #111;
  background-color: #e5e5e5;
}

.sidebar-content {
  padding: 10px 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}

.sidebar-content :deep(.ant-input) {
  min-height: 30px;
  padding: 4px 8px;
  font-size: 12px;
  line-height: 1.4;
  border-radius: 4px;
}

.sidebar-content :deep(.ant-btn) {
  height: 28px;
  padding: 0 10px;
  font-size: 12px;
  border-radius: 4px;
}

.result-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #70757a;
  font-size: 12px;
}

.result-count {
  color: #7c73c7;
}

.navigate-actions,
.actions {
  display: flex;
  gap: 8px;
}

.actions :deep(.ant-btn) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 24px;
  padding: 0 8px;
  font-size: 12px;
  border-radius: 2px;
}

.actions :deep(.material-icons) {
  font-size: 12px;
}

.icon-btn,
.result-item {
  border: none;
  outline: none;
}

.icon-btn {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: #333;
  border-radius: 2px;
  cursor: pointer;
}

.icon-btn:hover:not(:disabled) {
  background: #e5e5e5;
}

.icon-btn:disabled {
  color: #bbb;
  cursor: not-allowed;
}

.result-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: transparent;
  padding-right: 2px;
}

.result-item {
  width: 100%;
  display: block;
  text-align: left;
  padding: 8px 8px;
  background: #ebebeb;
  border-bottom: 1px solid #d7d7d7;
  cursor: pointer;
}

.result-item:hover {
  background: #e2e2e2;
}

.result-item.active {
  background: #9aa0a6;
  color: #fff;
}

.result-item-meta {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  opacity: 0.8;
  margin-bottom: 4px;
}

.result-item-text {
  font-size: 12px;
  line-height: 1.45;
  color: inherit;
  word-break: break-word;
}

.result-item-text :deep(mark) {
  background: #ffe58f;
  color: inherit;
  padding: 0;
}

.result-item.active .result-item-text :deep(mark) {
  background: rgba(255, 229, 143, 0.78);
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  min-height: 180px;
}
</style>
