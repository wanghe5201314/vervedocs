<template>
  <div class="ribbon-tab-panel">
    <!-- 视图模式 -->
    <VdRibbonGroup title="视图模式">
      <a-dropdown :trigger="['click']">
        <VdRibbonButton :icon="currentModeIcon" text="编辑模式" title="编辑模式" size="large" has-arrow :disabled="isModeLocked" />
        <template #overlay>
          <a-menu @click="({ key }: any) => handleModeSelect(key)">
            <a-menu-item v-for="mode in EDITOR_MODE_LIST" :key="mode.value" :disabled="isModeLocked" :title="mode.title">
              <div class="mi-row mi-row--toggle">
                <span class="mi"><VdIcon :name="mode.icon" /><span>{{ mode.label }}</span></span>
                <span class="menu-toggle-check"><VdIcon v-if="currentEditorMode === mode.value" name="check" /></span>
              </div>
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </VdRibbonGroup>

    <!-- 缩放 -->
    <VdRibbonGroup title="页面缩放">
      <div class="view-zoom-layout">
        <div class="view-zoom-select-wrap">
          <a-dropdown :trigger="['click']">
            <button class="view-zoom-select" type="button" title="缩放">
              <span>{{ zoomPercent }}%</span>
              <VdIcon name="chevron-down" />
            </button>
            <template #overlay>
              <a-menu @click="({ key }: any) => emit('command', 'pageScale', Number(key) / 100)">
                <a-menu-item v-for="z in ZOOM_LEVELS" :key="z">
                  <span class="zoom-check"><VdIcon v-if="zoomPercent === z" name="check" /></span>{{ z }}%
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
          <div class="view-zoom-caption">缩放</div>
        </div>
        <div class="view-zoom-actions">
          <VdRibbonButton icon="fit-to-page-outline" text="适合页面" title="适合页面" @click="emit('command', 'fitPage')" />
          <VdRibbonButton icon="arrow-expand-horizontal" text="适应宽度" title="适应宽度" @click="emit('command', 'fitWidth')" />
        </div>
      </div>
    </VdRibbonGroup>

    <!-- 显示 -->
    <VdRibbonGroup title="显示">
      <div class="view-toggle-grid">
        <button
          class="view-check-btn"
          :class="{ active: showToolbar }"
          type="button"
          title="始终显示工具栏"
          @click="handleCommand('toggleToolbar')"
        >
          <span class="view-check-box">
            <VdIcon v-if="showToolbar" name="check" />
          </span>
          <span class="view-check-label">始终显示工具栏</span>
        </button>
        <button
          class="view-check-btn"
          :class="{ active: showBottomNav }"
          type="button"
          title="状态栏"
          @click="handleCommand('toggleBottomNav')"
        >
          <span class="view-check-box">
            <VdIcon v-if="showBottomNav" name="check" />
          </span>
          <span class="view-check-label">状态栏</span>
        </button>
        <button
          class="view-check-btn"
          :class="{ active: tocVisible }"
          type="button"
          title="左面板"
          @click="handleCommand('toggleToc')"
        >
          <span class="view-check-box">
            <VdIcon v-if="tocVisible" name="check" />
          </span>
          <span class="view-check-label">左面板</span>
        </button>
        <button
          class="view-check-btn"
          :class="{ active: showLineBreak }"
          type="button"
          title="换行符"
          @click="handleCommand('toggleLineBreak')"
        >
          <span class="view-check-box">
            <VdIcon v-if="showLineBreak" name="check" />
          </span>
          <span class="view-check-label">换行符</span>
        </button>
        <button
          class="view-check-btn"

          :class="{ active: eyeCareEnabled }"
          type="button"
          title="护眼模式"
          @click="handleCommand('toggleEyeCare')"
        >
          <span class="view-check-box">
            <VdIcon v-if="eyeCareEnabled" name="check" />
          </span>
          <span class="view-check-label">护眼模式</span>
        </button>
      </div>
    </VdRibbonGroup>
  </div>
</template>

<script setup lang="ts">
import { VdRibbonButton, VdRibbonGroup, VdIcon } from '@vervedoc/ui'
import { computed } from 'vue'

import { EDITOR_MODE_LIST, ZOOM_LEVELS } from '@/config/constants'



const emit = defineEmits<{
  (e: 'command', cmd: string, ...args: any[]): void
}>()

const props = defineProps<{
  zoomPercent?: number
  currentEditorMode?: string
  isModeLocked?: boolean
  tocVisible?: boolean
  showToolbar?: boolean
  showBottomNav?: boolean

  showLineBreak?: boolean
  eyeCareEnabled?: boolean
}>()

/** 缩放百分比，默认 100 */
const zoomPercent = computed(() => props.zoomPercent ?? 100)
/** 当前编辑器模式对应的图标名称 */
const currentModeIcon = computed(() => {
  const mode = EDITOR_MODE_LIST.find(m => m.value === props.currentEditorMode)
  return mode?.icon || 'pencil'
})

/**
 * 处理编辑器模式选择，修订模式特殊处理
 * @param modeValue - 模式值
 */
const handleModeSelect = (modeValue: string) => {
  if (modeValue === 'revision') {
    emit('command', 'toggleTrackChanges', true)
    emit('command', 'mode', 'edit')
  } else {
    emit('command', 'toggleTrackChanges', false)
    emit('command', 'mode', modeValue)
  }
}

/**
 * 处理命令转发
 * @param cmd - 命令名称
 */
const handleCommand = (cmd: string) => {
  emit('command', cmd)
}
</script>

<style scoped>
.mi { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; }
.mi-row { display: inline-flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; }
.mi-row--toggle { min-width: 180px; }
.menu-toggle-check { display: inline-flex; align-items: center; width: 16px; color: #1677ff; }
.zoom-check { display: inline-flex; align-items: center; width: 16px; color: #1677ff; }

.view-zoom-layout {
  display: flex;
  align-items: stretch;
  gap: 8px;
}

.view-zoom-select-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.view-zoom-select {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 72px;
  height: 28px;
  padding: 0 8px;
  border: 1px solid #cfd6e4;
  border-radius: 4px;
  background: #fff;
  color: #202124;
  cursor: pointer;
  font: inherit;
}

.view-zoom-select:hover {
  border-color: #b9c4d8;
  background: #f8faff;
}

.view-zoom-actions {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.view-zoom-caption {
  font-size: 12px;
  line-height: 1;
  color: #202124;
}

.view-toggle-grid {
  display: grid;
  grid-template-rows: repeat(2, minmax(0, 1fr));
  grid-auto-flow: column;
  gap: 6px 14px;
  align-content: center;
}

.view-check-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 86px;
  height: 24px;
  padding: 0 2px;
  border: none;
  background: transparent;
  color: #202124;
  cursor: pointer;
  border-radius: 4px;
  font: inherit;
  white-space: nowrap;
}

.view-check-btn:hover {
  background: #edf2fb;
}

.view-check-btn.active {
  color: #1f57b8;
}

.view-check-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: 1px solid #9aa3b2;
  border-radius: 2px;
  background: #fff;
  color: #1f57b8;
  flex-shrink: 0;
}

.view-check-btn.active .view-check-box {
  border-color: #1f57b8;
  background: #eef4ff;
}

.view-check-label {
  font-size: 12px;
  line-height: 1;
}
</style>
