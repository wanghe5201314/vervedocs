<template>
  <div class="left-dock" editor-component="left-dock">
    <div class="dock-group">
      <a-tooltip placement="right" :mouseEnterDelay="0.3">
        <template #title>搜索</template>
        <button
          class="dock-btn"
          type="button"
          :class="{ active: activeKey === 'search' }"
          aria-label="搜索"
          @click="emit('select', 'search')"
        >
          <VIcon name="magnify" :size="18" />
        </button>
      </a-tooltip>

      <a-tooltip placement="right" :mouseEnterDelay="0.3">
        <template #title>目录</template>
        <button
          class="dock-btn"
          type="button"
          :class="{ active: activeKey === 'catalog' }"
          aria-label="目录"
          @click="emit('select', 'catalog')"
        >
          <VIcon name="table-of-contents" :size="18" />
        </button>
      </a-tooltip>

      <a-tooltip placement="right" :mouseEnterDelay="0.3">
        <template #title>章节</template>
        <button
          class="dock-btn"
          type="button"
          :class="{ active: activeKey === 'section' }"
          aria-label="章节"
          @click="emit('select', 'section')"
        >
          <VIcon name="format-section" :size="18" />
        </button>
      </a-tooltip>

      <a-tooltip placement="right" :mouseEnterDelay="0.3">
        <template #title>AI 助手</template>
        <button
          class="dock-btn"
          type="button"
          :class="{ active: activeKey === 'ai' }"
          aria-label="AI 助手"
          @click="emit('select', 'ai')"
        >
          <VIcon name="robot-outline" :size="18" />
        </button>
      </a-tooltip>

      <a-tooltip placement="right" :mouseEnterDelay="0.3">
        <template #title>修订</template>
        <button
          class="dock-btn"
          type="button"
          :class="{ active: activeKey === 'revision' }"
          aria-label="修订"
          @click="emit('select', 'revision')"
        >
          <VIcon name="pencil-plus" :size="18" />
        </button>
      </a-tooltip>

    </div>
  </div>
</template>

<script setup lang="ts">
import { VIcon } from '@vervedoc/icons'

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
  background-color: transparent;
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
  color: #1890ff;
}

.dock-btn.active {
  color: #1890ff;
}
</style>
