<template>
  <div class="left-dock" editor-component="left-dock">
    <div class="dock-group">
      <el-tooltip content="搜索" placement="right" :show-after="300" effect="light">
        <button
          class="dock-btn"
          type="button"
          :class="{ active: activeKey === 'search' }"
          aria-label="搜索"
          @click="emit('select', 'search')"
        >
          <el-icon :size="18"><Search /></el-icon>
        </button>
      </el-tooltip>

      <el-tooltip content="目录" placement="right" :show-after="300" effect="light">
        <button
          class="dock-btn"
          type="button"
          :class="{ active: activeKey === 'catalog' }"
          aria-label="目录"
          @click="emit('select', 'catalog')"
        >
          <el-icon :size="18"><Fold /></el-icon>
        </button>
      </el-tooltip>

      <el-tooltip content="章节" placement="right" :show-after="300" effect="light">
        <button
          class="dock-btn"
          type="button"
          :class="{ active: activeKey === 'section' }"
          aria-label="章节"
          @click="emit('select', 'section')"
        >
          <el-icon :size="18"><Files /></el-icon>
        </button>
      </el-tooltip>

      <el-tooltip content="AI 助手" placement="right" :show-after="300" effect="light">
        <button
          class="dock-btn"
          type="button"
          :class="{ active: activeKey === 'ai' }"
          aria-label="AI 助手"
          @click="emit('select', 'ai')"
        >
          <el-icon :size="18"><MagicStick /></el-icon>
        </button>
      </el-tooltip>

      <el-tooltip content="修订" placement="right" :show-after="300" effect="light">
        <button
          class="dock-btn"
          type="button"
          :class="{ active: activeKey === 'revision' }"
          aria-label="修订"
          @click="emit('select', 'revision')"
        >
          <MdiIcon name="pencil-plus" :size="18" />
        </button>
      </el-tooltip>

    </div>
  </div>
</template>

<script setup lang="ts">
import { Fold, Files, Search, MagicStick } from '@element-plus/icons-vue'
import MdiIcon from '@/components/common/MdiIcon.vue'

type DockKey = 'search' | 'catalog' | 'section' | 'ai' | 'revision' | ''

defineProps<{
  activeKey: DockKey
}>()

const emit = defineEmits<{
  (e: 'select', key: Exclude<DockKey, ''>): void
}>()
</script>

<style scoped>
.left-dock {
  width: 40px;
  height: 100%;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-right: 1px solid #e4e7ed;
  background-color: #f2f4f7;
  padding: 12px 0;
}

.dock-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}

.dock-spacer {
  flex: 1;
}

.dock-btn {
  width: 36px;
  height: 36px;
  border-radius: 2px;
  border: 1px solid transparent;
  background-color: #f2f4f7;
  color: #606266;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
  padding: 0;
  outline: none;
}

.dock-btn:hover {
  color: #409eff;
}

.dock-btn.active {
  color: #409eff;
}
</style>
