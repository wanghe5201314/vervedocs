<template>
  <div class="search-sidebar" editor-component="search-sidebar">
    <div class="sidebar-header">
      <div class="sidebar-title">
        <SearchOutlined />
        <span>搜索与替换</span>
      </div>
      <div class="sidebar-close" @click="close" title="关闭">
        <CloseOutlined />
      </div>
    </div>
    <div class="sidebar-content">
      <div class="field">
        <div class="field-label">查找内容</div>
        <a-input v-model:value="searchText" placeholder="请输入查找内容" @keyup.enter="searchNext" />
      </div>
      <div class="actions">
        <a-button type="primary" :disabled="!searchText" @click="searchNext"><SearchOutlined />查找下一个</a-button>
        <a-button :disabled="!searchText" @click="searchPrev"><SearchOutlined />查找上一个</a-button>
      </div>
      <div class="field">
        <div class="field-label">替换为</div>
        <a-input v-model:value="replaceText" placeholder="请输入替换内容" @keyup.enter="replaceOnce" />
      </div>
      <div class="actions">
        <a-button type="primary" :disabled="!replaceText" @click="replaceOnce"><SwapOutlined />替换</a-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { CloseOutlined, SearchOutlined, SwapOutlined } from '@ant-design/icons-vue'

const emit = defineEmits(['command'])

const searchText = ref('')
const replaceText = ref('')

const searchNext = () => {
  if (!searchText.value) return
  emit('command', 'search', searchText.value)
  emit('command', 'searchNavigateNext')
}

const searchPrev = () => {
  if (!searchText.value) return
  emit('command', 'search', searchText.value)
  emit('command', 'searchNavigatePre')
}

const replaceOnce = () => {
  if (!replaceText.value) return
  emit('command', 'replaceCurrent', replaceText.value)
  if (searchText.value) {
    emit('command', 'search', searchText.value)
    emit('command', 'searchNavigateNext')
  }
}

const close = () => {
  emit('command', 'closeSearchPanel')
}
</script>

<style scoped>
.search-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background-color: #f2f4f7;
  border-right: 1px solid gainsboro;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0;
  height: 40px;
  border-bottom: 1px solid #e2e6ed;
}

.sidebar-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  height: 40px;
  flex: 1;
}

.sidebar-close {
  color: #909399;
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
  color: #1890ff;
  background-color: #e6f7ff;
}

.sidebar-content {
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.field-label {
  font-size: 14px;
  color: #595959;
  margin-bottom: 6px;
}

.actions {
  display: flex;
  gap: 8px;
}
</style>
