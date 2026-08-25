<template>
  <div class="ribbon-tab-panel">
    <!-- 视图模式 -->
    <RibbonGroup title="视图模式">
      <a-dropdown :trigger="['click']">
        <RibbonButton :icon="currentModeIcon" text="编辑模式" title="编辑模式" size="large" has-arrow :disabled="isModeLocked" />
        <template #overlay>
          <a-menu @click="({ key }: any) => handleModeSelect(key)">
            <a-menu-item v-for="mode in editorModeList" :key="mode.value" :disabled="isModeLocked" :title="mode.title">
              <div class="mi-row mi-row--toggle">
                <span class="mi"><VIcon :name="mode.icon" /><span>{{ mode.label }}</span></span>
                <span class="menu-toggle-check"><VIcon v-if="currentEditorMode === mode.value" name="check" /></span>
              </div>
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </RibbonGroup>

    <!-- 显示 -->
    <RibbonGroup title="显示">
      <RibbonButton icon="page-layout-sidebar-left" text="显示/隐藏左侧面板" title="显示/隐藏左侧面板" size="large" command="toggleCatalog" />
      <RibbonButton icon="dock-bottom" text="显示/隐藏状态栏" title="显示/隐藏状态栏" size="large" command="toggleBottomNav" />
      <RibbonButton icon="ruler" text="显示/隐藏标尺" title="显示/隐藏标尺" size="large" command="toggleRuler" />
      <RibbonButton :icon="showLineBreak ? 'checkbox-marked-outline' : 'checkbox-blank-outline'" text="显示换行符" title="显示换行符" size="large" command="toggleLineBreak" />
      <RibbonButton icon="eye-outline" text="护眼模式" title="护眼模式" size="large" command="toggleEyeCare" />
    </RibbonGroup>

    <!-- 缩放 -->
    <RibbonGroup title="页面缩放">
      <a-dropdown :trigger="['click']">
        <RibbonButton icon="magnify-plus-outline" :text="`${zoomPercent}%`" title="缩放" size="large" has-arrow />
        <template #overlay>
          <a-menu @click="({ key }: any) => emit('command', 'pageScale', Number(key) / 100)">
            <a-menu-item v-for="z in zoomLevels" :key="z">
              <span class="zoom-check"><VIcon v-if="zoomPercent === z" name="check" /></span>{{ z }}%
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
      <RibbonButton icon="fit-to-page-outline" text="适应页面" title="适应页面" size="large" command="fitPage" />
      <RibbonButton icon="arrow-expand-horizontal" text="适应宽度" title="适应宽度" size="large" command="fitWidth" />
    </RibbonGroup>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { VIcon } from '@vervedoc/icons'
import { editorModeList, zoomLevels } from '../../toolbar/ribbon-tabs'
import RibbonGroup from '../ribbonGroup.vue'
import RibbonButton from '../ribbonButton.vue'

const emit = defineEmits<{
  (e: 'command', cmd: string, ...args: any[]): void
}>()

const props = defineProps<{
  zoomPercent?: number
  currentEditorMode?: string
  isModeLocked?: boolean
  showLineBreak?: boolean
}>()

const zoomPercent = computed(() => props.zoomPercent ?? 100)
const currentModeIcon = computed(() => {
  const mode = editorModeList.find(m => m.value === props.currentEditorMode)
  return mode?.icon || 'pencil'
})

const handleModeSelect = (modeValue: string) => {
  if (modeValue === 'revision') {
    emit('command', 'toggleTrackChanges', true)
    emit('command', 'mode', 'edit')
  } else {
    emit('command', 'toggleTrackChanges', false)
    emit('command', 'mode', modeValue)
  }
}
</script>

<style scoped>
.mi { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; }
.mi-row { display: inline-flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; }
.mi-row--toggle { min-width: 180px; }
.menu-toggle-check { display: inline-flex; align-items: center; width: 16px; color: #1677ff; }
.zoom-check { display: inline-flex; align-items: center; width: 16px; color: #1677ff; }
</style>
