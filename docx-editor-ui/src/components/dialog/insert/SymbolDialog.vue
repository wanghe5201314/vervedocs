<template>
  <el-dialog v-model="visible" title="插入符号" width="450px" :close-on-click-modal="false" class="app-dialog">
    <div class="symbol-dialog-content">
      <!-- 搜索框 -->
      <div class="search-box">
        <el-input
          v-model="searchText"
          placeholder="搜索符号..."
          clearable
          @input="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>

      <!-- 符号分类 -->
      <div class="symbol-categories">
        <div
          v-for="category in filteredCategories"
          :key="category.name"
          class="symbol-category"
        >
          <div class="category-header">
            <span class="category-name">{{ category.name }}</span>
            <span class="category-count">{{ category.symbols.length }}个符号</span>
          </div>
          <div class="symbol-grid">
            <button
              v-for="symbol in category.symbols"
              :key="symbol"
              class="symbol-item"
              :title="symbol"
              @click="handleInsertSymbol(symbol)"
            >
              {{ symbol }}
            </button>
          </div>
        </div>
      </div>

      <!-- 最近使用 -->
      <div v-if="recentSymbols.length > 0" class="recent-symbols">
        <div class="category-header">
          <span class="category-name">最近使用</span>
          <el-button link type="primary" size="small" @click="clearRecentSymbols">清空</el-button>
        </div>
        <div class="symbol-grid">
          <button
            v-for="symbol in recentSymbols"
            :key="symbol"
            class="symbol-item"
            :title="symbol"
            @click="handleInsertSymbol(symbol)"
          >
            {{ symbol }}
          </button>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">
        <el-icon><Close /></el-icon>
        取消
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Search, Close } from '@element-plus/icons-vue'
import { symbolCategories } from '@/components/editor/toolbar/index'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', symbol: string): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const searchText = ref('')
const recentSymbols = ref<string[]>([])

// 过滤后的分类
const filteredCategories = computed(() => {
  if (!searchText.value) {
    return symbolCategories
  }

  const search = searchText.value.toLowerCase()
  return symbolCategories
    .map(category => {
      const filteredSymbols = category.symbols.filter(symbol => {
        return symbol.includes(searchText.value) ||
               category.name.toLowerCase().includes(search)
      })
      return {
        name: category.name,
        symbols: filteredSymbols
      }
    })
    .filter(category => category.symbols.length > 0)
})

// 搜索处理
const handleSearch = () => {
  // 搜索逻辑已在 computed 中处理
}

// 插入符号
const handleInsertSymbol = (symbol: string) => {
  // 添加到最近使用
  const index = recentSymbols.value.indexOf(symbol)
  if (index > -1) {
    recentSymbols.value.splice(index, 1)
  }
  recentSymbols.value.unshift(symbol)
  // 最多保留20个最近使用的符号
  if (recentSymbols.value.length > 20) {
    recentSymbols.value.pop()
  }

  // 保存到 localStorage
  localStorage.setItem('recentSymbols', JSON.stringify(recentSymbols.value))

  // 发送确认事件
  emit('confirm', symbol)
  visible.value = false
}

// 清空最近使用
const clearRecentSymbols = () => {
  recentSymbols.value = []
  localStorage.removeItem('recentSymbols')
}

// 监听对话框打开，加载最近使用的符号
watch(visible, (isVisible) => {
  if (isVisible) {
    // 从 localStorage 加载最近使用的符号
    const saved = localStorage.getItem('recentSymbols')
    if (saved) {
      try {
        recentSymbols.value = JSON.parse(saved)
      } catch {
        recentSymbols.value = []
      }
    }
    searchText.value = ''
  }
})
</script>

<style scoped>
.symbol-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.search-box {
  margin-bottom: 8px;
}

.symbol-categories {
  max-height: 400px;
  overflow-y: auto;
  padding-right: 8px;
}

.symbol-category {
  margin-bottom: 16px;
}

.symbol-category:last-child {
  margin-bottom: 0;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid #e8eaed;
}

.category-name {
  font-size: 13px;
  font-weight: 500;
  color: #202124;
}

.category-count {
  font-size: 11px;
  color: #5f6368;
}

.symbol-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 6px;
}

.symbol-item {
  width: 100%;
  aspect-ratio: 1;
  border: 1px solid #dadce0;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #202124;
  transition: all 0.2s;
  padding: 0;
}

.symbol-item:hover {
  background: #f1f3f4;
  border-color: #1a73e8;
  color: #1a73e8;
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(26, 115, 232, 0.2);
}

.symbol-item:active {
  transform: scale(1.05);
}

.recent-symbols {
  padding-top: 16px;
  border-top: 1px solid #e8eaed;
}

/* 滚动条样式 */
.symbol-categories::-webkit-scrollbar {
  width: 8px;
}

.symbol-categories::-webkit-scrollbar-track {
  background: #f1f3f4;
  border-radius: 4px;
}

.symbol-categories::-webkit-scrollbar-thumb {
  background: #dadce0;
  border-radius: 4px;
}

.symbol-categories::-webkit-scrollbar-thumb:hover {
  background: #bdc1c6;
}
</style>
