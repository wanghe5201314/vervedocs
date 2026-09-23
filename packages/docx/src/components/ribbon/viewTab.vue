<template>
  <div class="ribbon-tab-panel">
    <!-- 视图模式 -->
    <VdRibbonGroup :title="t('ribbon.view.viewMode')">
      <a-dropdown :trigger="['click']">
        <VdRibbonButton :icon="currentModeIcon" :text="t('ribbon.view.editMode')" :title="t('ribbon.view.editMode')" size="large" has-arrow :disabled="isModeLocked" />
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
    <VdRibbonGroup :title="t('ribbon.view.pageZoom')">
      <div class="view-zoom-layout">
        <div class="view-zoom-select-wrap">
          <a-dropdown :trigger="['click']">
            <button class="view-zoom-select" type="button" :title="t('ribbon.view.zoom')">
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
          <div class="view-zoom-caption">{{ t('ribbon.view.zoom') }}</div>
        </div>
        <div class="view-zoom-actions">
          <VdRibbonButton icon="fit-to-page-outline" :text="t('ribbon.view.fitPage')" :title="t('ribbon.view.fitPage')" @click="emit('command', 'fitPage')" />
          <VdRibbonButton icon="arrow-expand-horizontal" :text="t('ribbon.view.fitWidth')" :title="t('ribbon.view.fitWidth')" @click="emit('command', 'fitWidth')" />
        </div>
      </div>
    </VdRibbonGroup>

    <!-- 显示 -->
    <VdRibbonGroup :title="t('ribbon.view.show')">
      <div class="view-toggle-grid">
        <button
          class="view-check-btn"
          :class="{ active: showToolbar }"
          type="button"
          :title="t('ribbon.view.alwaysShowToolbar')"
          @click="handleCommand('toggleToolbar')"
        >
          <span class="view-check-box">
            <VdIcon v-if="showToolbar" name="check" />
          </span>
          <span class="view-check-label">{{ t('ribbon.view.alwaysShowToolbar') }}</span>
        </button>
        <button
          class="view-check-btn"
          :class="{ active: showBottomNav }"
          type="button"
          :title="t('ribbon.view.statusBar')"
          @click="handleCommand('toggleBottomNav')"
        >
          <span class="view-check-box">
            <VdIcon v-if="showBottomNav" name="check" />
          </span>
          <span class="view-check-label">{{ t('ribbon.view.statusBar') }}</span>
        </button>
        <button
          class="view-check-btn"
          :class="{ active: tocVisible }"
          type="button"
          :title="t('ribbon.view.leftPanel')"
          @click="handleCommand('toggleToc')"
        >
          <span class="view-check-box">
            <VdIcon v-if="tocVisible" name="check" />
          </span>
          <span class="view-check-label">{{ t('ribbon.view.leftPanel') }}</span>
        </button>
        <button
          class="view-check-btn"
          :class="{ active: showRuler }"
          type="button"
          :title="t('ribbon.view.ruler')"
          @click="handleCommand('toggleRuler')"
        >
          <span class="view-check-box">
            <VdIcon v-if="showRuler" name="check" />
          </span>
          <span class="view-check-label">{{ t('ribbon.view.ruler') }}</span>
        </button>
        <button
          class="view-check-btn"

          :class="{ active: eyeCareEnabled }"
          type="button"
          :title="t('ribbon.view.eyeCareMode')"
          @click="handleCommand('toggleEyeCare')"
        >
          <span class="view-check-box">
            <VdIcon v-if="eyeCareEnabled" name="check" />
          </span>
          <span class="view-check-label">{{ t('ribbon.view.eyeCareMode') }}</span>
        </button>
      </div>
    </VdRibbonGroup>
  </div>
</template>

<script setup lang="ts">
import { VdRibbonButton, VdRibbonGroup, VdIcon } from '@vervedoc/ui'
import { computed } from 'vue'

import { getEditorModeList, ZOOM_LEVELS } from '@/config/constants'
import { t } from '@/i18n'



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

  showRuler?: boolean
  eyeCareEnabled?: boolean
}>()

const EDITOR_MODE_LIST = computed(() => getEditorModeList())

/** 缩放百分比，默认 100 */
const zoomPercent = computed(() => props.zoomPercent ?? 100)
/** 当前编辑器模式对应的图标名称 */
const currentModeIcon = computed(() => {
  const mode = EDITOR_MODE_LIST.value.find(m => m.value === props.currentEditorMode)
  return mode?.icon || 'pencil'
})

/**
 * 处理编辑器模式选择
 * @param modeValue - 模式值
 */
const handleModeSelect = (modeValue: string) => {
  emit('command', 'mode', modeValue)
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
