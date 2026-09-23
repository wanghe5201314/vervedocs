<template>
  <div class="left-dock" editor-component="left-dock">
    <div class="dock-group">
      <a-tooltip placement="right" :mouseEnterDelay="0.3">
        <template #title>{{ t('leftDock.search') }}</template>
        <button
          class="dock-btn"
          type="button"
          :class="{ active: activeKey === 'search' }"
          :aria-label="t('leftDock.search')"
          @click="emit('select', 'search')"
        >
          <VdIcon name="magnify" :size="18" />
        </button>
      </a-tooltip>

      <a-tooltip placement="right" :mouseEnterDelay="0.3">
        <template #title>{{ t('leftDock.toc') }}</template>
        <button
          class="dock-btn"
          type="button"
          :class="{ active: activeKey === 'toc' }"
          :aria-label="t('leftDock.toc')"
          @click="emit('select', 'toc')"
        >
          <VdIcon name="table-of-contents" :size="18" />
        </button>
      </a-tooltip>

      <a-tooltip placement="right" :mouseEnterDelay="0.3">
        <template #title>{{ t('leftDock.section') }}</template>
        <button
          class="dock-btn"
          type="button"
          :class="{ active: activeKey === 'section' }"
          :aria-label="t('leftDock.section')"
          @click="emit('select', 'section')"
        >
          <VdIcon name="format-section" :size="18" />
        </button>
      </a-tooltip>

      <a-tooltip placement="right" :mouseEnterDelay="0.3">
        <template #title>{{ t('leftDock.bookmark') }}</template>
        <button
          class="dock-btn"
          type="button"
          :class="{ active: activeKey === 'bookmark' }"
          :aria-label="t('leftDock.bookmark')"
          @click="emit('select', 'bookmark')"
        >
          <VdIcon name="bookmark-outline" :size="18" />
        </button>
      </a-tooltip>

      <a-tooltip placement="right" :mouseEnterDelay="0.3">
        <template #title>{{ t('leftDock.ai') }}</template>
        <button
          class="dock-btn"
          type="button"
          :class="{ active: activeKey === 'ai' }"
          :aria-label="t('leftDock.ai')"
          @click="emit('select', 'ai')"
        >
          <VdIcon name="robot-outline" :size="18" />
        </button>
      </a-tooltip>

      <a-tooltip placement="right" :mouseEnterDelay="0.3">
        <template #title>{{ t('leftDock.revision') }}</template>
        <button
          class="dock-btn"
          type="button"
          :class="{ active: activeKey === 'revision' }"
          :aria-label="t('leftDock.revision')"
          @click="emit('select', 'revision')"
        >
          <VdIcon name="pencil-plus" :size="18" />
        </button>
      </a-tooltip>

    </div>
  </div>
</template>

<script setup lang="ts">
import { VdIcon } from '@vervedoc/ui'
import { t } from '@/i18n'

type DockKey = 'search' | 'toc' | 'section' | 'ai' | 'revision' | 'bookmark' | ''

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
  border-right: 1px solid #f1f1f1;
  background-color: #f1f1f1;
  padding: 12px 0;
}

.dock-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
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
