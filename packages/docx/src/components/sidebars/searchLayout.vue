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
          <span class="result-count">{{ currentDisplay }}/{{ matchCount }}</span>
        </div>
        <div class="navigate-actions">
          <button
            class="icon-btn"
            type="button"
            :disabled="!matchCount"
            @click="navigate(-1)"
          >
            <UpOutlined />
          </button>
          <button
            class="icon-btn"
            type="button"
            :disabled="!matchCount"
            @click="navigate(1)"
          >
            <DownOutlined />
          </button>
        </div>
      </div>

      <div class="actions">
        <a-button :disabled="!canReplaceCurrent" @click="replaceCurrent">
          <VdIcon name="find-replace" />
          替换
        </a-button>
        <a-button :disabled="!canReplaceAll" @click="replaceAll">
          <VdIcon name="check-all" />
          全部替换
        </a-button>
      </div>

      <div v-if="matchCount" class="match-list-wrap">
        <div class="match-list-header">共 {{ matchCount }} 处匹配</div>
        <div class="match-list">
          <template v-for="(item, idx) in matches" :key="item.index">
            <div
              class="match-item"
              :class="{ active: item.index === activeIndex }"
              @click="selectMatch(item.index)"
            >
              <span class="match-before">{{ item.before }}</span>
              <mark class="match-hit">{{ item.match }}</mark>
              <span class="match-after">{{ item.after }}</span>
            </div>
            <a-divider v-if="idx < matches.length - 1" class="match-divider" />
          </template>
        </div>
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
import { VdIcon } from '@vervedoc/ui'
import type { IEditorSearchApi, ISearchMatch } from '@/composables/use-editor-search'

const props = defineProps<{
  searchAPI: IEditorSearchApi
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

/** 搜索关键词 */
const searchText = ref('')
/** 替换文本 */
const replaceText = ref('')
/** 匹配结果数量 */
const matchCount = ref(0)
/** 当前激活的匹配项索引，-1 表示无激活项 */
const activeIndex = ref(-1)
/** 搜索命中列表，每项含匹配文本与上下文 */
const matches = ref<ISearchMatch[]>([])

/** 当前匹配项的展示序号（从 1 开始） */
const currentDisplay = computed(() =>
  matchCount.value && activeIndex.value >= 0
    ? activeIndex.value + 1
    : 0
)

/** 是否可执行替换当前 */
const canReplaceCurrent = computed(() =>
  !!replaceText.value && !!searchText.value && activeIndex.value >= 0
)

/** 是否可执行全部替换 */
const canReplaceAll = computed(() =>
  !!replaceText.value && !!searchText.value && matchCount.value > 0
)

/** 执行搜索：关键词为空时清空，否则搜索并定位到首个匹配项 */
const runSearch = async () => {
  const keyword = searchText.value.trim()
  if (!keyword) {
    const result = props.searchAPI.clear()
    matchCount.value = result.count
    activeIndex.value = -1
    matches.value = []
    return
  }
  const result = props.searchAPI.search(keyword)
  matchCount.value = result.count
  activeIndex.value = result.count > 0 ? 0 : -1
  matches.value = result.count > 0 ? props.searchAPI.getMatches() : []
  if (activeIndex.value >= 0) {
    props.searchAPI.locate(activeIndex.value)
  }
}

/**
 * 在匹配项之间导航
 * @param step - 步进值，正数为向后，负数为向前
 */
const navigate = (step: number) => {
  if (!matchCount.value) return
  const nextIndex =
    activeIndex.value < 0
      ? 0
      : (activeIndex.value + step + matchCount.value) % matchCount.value
  activeIndex.value = nextIndex
  props.searchAPI.locate(nextIndex)
}

/** 选中并定位到指定匹配项 */
const selectMatch = (index: number) => {

  activeIndex.value = index
  props.searchAPI.locate(index)
}

/** 替换当前匹配项并更新匹配状态 */
const replaceCurrent = async () => {
  const keyword = searchText.value.trim()
  if (!keyword || !replaceText.value || activeIndex.value < 0) return
  const result = props.searchAPI.replaceOne(
    activeIndex.value,
    keyword,
    replaceText.value
  )
  matchCount.value = result.count
  if (activeIndex.value >= matchCount.value) {
    activeIndex.value = matchCount.value - 1
  }
  matches.value = matchCount.value > 0 ? props.searchAPI.getMatches() : []
  if (activeIndex.value >= 0) {
    props.searchAPI.locate(activeIndex.value)
  }
}

/** 全部替换并重置匹配状态 */
const replaceAll = async () => {
  const keyword = searchText.value.trim()
  if (!keyword || !replaceText.value) return
  props.searchAPI.replaceAll(keyword, replaceText.value)
  matchCount.value = 0
  activeIndex.value = -1
  matches.value = []
}

/** 监听搜索关键词变化，清空时自动重置搜索 */
watch(
  () => searchText.value,
  value => {
    if (!value.trim()) {
      void runSearch()
    }
  }
)

/** 挂载时若关键词为空则执行一次搜索 */
onMounted(() => {
  if (!searchText.value.trim()) {
    void runSearch()
  }
})

/** 卸载前清空搜索状态 */
onBeforeUnmount(() => {
  props.searchAPI.clear()
})
</script>

<style scoped>
.search-sidebar {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
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
  flex: 1;
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

.actions :deep(.material-symbols-outlined) {
  font-size: 12px;
}

.icon-btn {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: #333;
  border: none;
  outline: none;
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

.match-list-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.match-list-header {
  font-size: 12px;
  color: #70757a;
  padding: 2px 2px 6px;
}

.match-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.match-item {
  padding: 5px 8px;
  font-size: 12px;
  line-height: 1.5;
  color: #444;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;

  word-break: break-all;
  transition: background 0.15s;
}

.match-item:hover {
  background: #f0eefb;
}

.match-item.active {
  background: #e8e3ff;
}

.match-divider {
  margin: 2px 0 !important;
}

.match-hit {
  background: #fff3bf;
  color: #333;
  font-weight: 500;
}

.match-before,
.match-after {
  color: #888;
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
