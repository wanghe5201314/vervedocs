<template>
  <div class="ribbon-tab-panel">
    <!-- 页面设置 -->
    <VdRibbonGroup :title="t('ribbon.layout.pageSetup')">
      <a-dropdown :trigger="['click']">
        <VdRibbonButton icon="layout-paper-direction" :text="t('ribbon.layout.paperDirection')" :title="t('ribbon.layout.paperDirection')" size="large" has-arrow />
        <template #overlay>
          <VdCard size="small" :bordered="false" class="ribbon-overlay-card" :bodyStyle="{ padding: '0' }">
            <div class="direction-panel">
              <div class="direction-item" @click="emit('command', 'paperDirection', PaperDirection.VERTICAL)">
                <div class="direction-icon vertical-icon"></div>
                <span>{{ t('ribbon.layout.vertical') }}</span>
              </div>
              <div class="direction-item" @click="emit('command', 'paperDirection', PaperDirection.HORIZONTAL)">
                <div class="direction-icon horizontal-icon"></div>
                <span>{{ t('ribbon.layout.horizontal') }}</span>
              </div>
            </div>
          </VdCard>
        </template>
      </a-dropdown>
      <a-dropdown :trigger="['click']">
        <VdRibbonButton icon="layout-paper-size" :text="t('ribbon.layout.paperSize')" :title="t('ribbon.layout.paperSize')" size="large" has-arrow />
        <template #overlay>
          <VdCard size="small" :bordered="false" class="ribbon-overlay-card" :bodyStyle="{ padding: '0' }">
            <div class="size-panel">
              <div class="size-item" :class="{ 'size-active': currentPaperSizeName === size.name }" v-for="size in paperSizes" :key="size.name" @click="emit('command', 'paperSize', size.width, size.height)">
                <div class="size-icon"></div>
                <div class="size-info">
                  <div class="size-name">{{ size.name }}</div>
                  <div class="size-dimensions">{{ size.displayHeight }} × {{ size.displayWidth }}</div>
                </div>
              </div>
            </div>
          </VdCard>
        </template>
      </a-dropdown>
      <a-dropdown :trigger="['click']" overlayClassName="gdocs-menu-popper gdocs-margin-popper">
        <VdRibbonButton icon="aspect_ratio" :text="t('ribbon.layout.pageMargin')" :title="t('ribbon.layout.pageMargin')" size="large" has-arrow />
        <template #overlay>
          <VdCard size="small" :bordered="false" class="ribbon-overlay-card" :bodyStyle="{ padding: '0' }">
            <div class="margin-presets">
              <div class="preset-item" v-for="preset in MARGIN_PRESETS" :key="preset.name" @click="emit('command', 'setPaperMargin', preset.margins)">
                <div class="page-icon"><div class="page-content" :style="preset.style"></div></div>
                <div class="preset-info">
                  <div class="preset-name">{{ preset.name }}</div>
                  <div class="preset-dimensions"><span class="margin-pair">{{ t('ribbon.layout.top') }}{{ (preset.margins[0] / 37.8).toFixed(1) }}{{ t('ribbon.layout.cm') }}</span><span class="margin-pair">{{ t('ribbon.layout.bottom') }}{{ (preset.margins[2] / 37.8).toFixed(1) }}{{ t('ribbon.layout.cm') }}</span></div>
                  <div class="preset-dimensions"><span class="margin-pair">{{ t('ribbon.layout.left') }}{{ (preset.margins[3] / 37.8).toFixed(1) }}{{ t('ribbon.layout.cm') }}</span><span class="margin-pair">{{ t('ribbon.layout.right') }}{{ (preset.margins[1] / 37.8).toFixed(1) }}{{ t('ribbon.layout.cm') }}</span></div>
                </div>
              </div>
            </div>
          </VdCard>
        </template>
      </a-dropdown>
      <a-dropdown :trigger="['click']">
        <VdRibbonButton icon="layout-page-color" :text="t('ribbon.layout.pageColor')" :title="t('ribbon.layout.pageColor')" size="large" has-arrow />
        <template #overlay>
          <VdCard size="small" :bordered="false" class="ribbon-overlay-card" :bodyStyle="{ padding: '0' }">
            <div class="bg-menu">
              <div class="bg-item" @click="emit('command', 'setPaperBackground', '#FFFFFF')">
                <span class="bg-check"><VdIcon v-if="selectedBgColor === '#FFFFFF'" name="check" /></span>
                <span class="bg-item-text">{{ t('ribbon.layout.noFill') }}</span>
              </div>
              <div class="bg-divider"></div>
              <div class="bg-section-title">{{ t('ribbon.layout.themeColor') }}</div>
              <div class="bg-grid">
                <button v-for="c in BG_COLOR_PALETTE" :key="c" class="bg-color" :class="{ selected: selectedBgColor === c }" :style="{ backgroundColor: c }" @click="emit('command', 'setPaperBackground', c)"></button>
              </div>
            </div>
          </VdCard>
        </template>
      </a-dropdown>
    </VdRibbonGroup>

    <!-- 分栏 -->
    <VdRibbonGroup :title="t('ribbon.layout.columns')">
      <VdRibbonButton icon="layout-column-one" :text="t('ribbon.layout.oneColumn')" :title="t('ribbon.layout.oneColumn')" size="large" @click="emit('command', 'columns', 1)" />
      <VdRibbonButton icon="layout-column-two" :text="t('ribbon.layout.twoColumns')" :title="t('ribbon.layout.twoColumns')" size="large" @click="emit('command', 'columns', 2)" />
      <VdRibbonButton icon="layout-column-three" :text="t('ribbon.layout.threeColumns')" :title="t('ribbon.layout.threeColumns')" size="large" @click="emit('command', 'columns', 3)" />
    </VdRibbonGroup>


    <!-- 水印 -->
    <VdRibbonGroup :title="t('ribbon.layout.watermark')">
      <a-dropdown :trigger="['click']">
        <VdRibbonButton icon="watermark" :text="t('ribbon.layout.watermark')" :title="t('ribbon.layout.watermark')" size="large" has-arrow />
        <template #overlay>
          <VdCard size="small" class="watermark-card">
            <div class="dropdown-card-title">{{ t('ribbon.layout.watermark') }}</div>
            <div class="wm-section">
              <div class="wm-section-title">{{ t('ribbon.layout.customWatermark') }}</div>
              <button class="wm-custom-add" @click="emit('command', 'addWatermark')">
                <VdIcon name="plus" />
                <span>{{ t('ribbon.layout.clickToAdd') }}</span>
              </button>
            </div>
            <div class="wm-section">
              <div class="wm-section-title">{{ t('ribbon.layout.presetWatermark') }}</div>
              <div class="wm-preset-grid">
                <div class="wm-preset-item" v-for="preset in WATERMARK_PRESETS" :key="preset.name" @click="emit('command', 'addWatermark', preset.options)">
                  <div class="wm-preset-preview">
                    <span class="wm-preset-text" :style="{ color: preset.options.color, opacity: preset.options.opacity }">{{ preset.name }}</span>
                  </div>
                  <div class="wm-preset-name">{{ preset.name }}</div>
                </div>
              </div>
            </div>
            <div class="dropdown-card-footer">
              <button class="dropdown-footer-btn" @click="emit('command', 'deleteWatermark')">
                <span class="mi"><VdIcon name="delete-outline" /><span>{{ t('ribbon.layout.deleteWatermark') }}</span></span>
              </button>
            </div>
          </VdCard>
        </template>
      </a-dropdown>
    </VdRibbonGroup>
  </div>
</template>

<script setup lang="ts">
import { VdRibbonButton, VdRibbonGroup, VdIcon, VdCard } from '@vervedoc/ui'
import { computed } from 'vue'

import { PaperDirection, PAPER_SIZE_LIST, MARGIN_PRESETS } from '@vervedoc/core'
import { BG_COLOR_PALETTE, getWatermarkPresets } from '@/config/constants'
import { t } from '@/i18n'



const WATERMARK_PRESETS = computed(() => getWatermarkPresets())

/** 纸张大小选项列表，附带显示用的厘米尺寸 */
const paperSizes = PAPER_SIZE_LIST.map(p => ({
  name: p.label.split(' ')[0],
  width: p.width,
  height: p.height,
  displayWidth: `${(p.width * 25.4 / 96).toFixed(1)}${t('ribbon.layout.cm')}`,
  displayHeight: `${(p.height * 25.4 / 96).toFixed(1)}${t('ribbon.layout.cm')}`
}))

const emit = defineEmits<{
  (e: 'command', cmd: string, ...args: any[]): void
}>()

defineProps<{
  selectedBgColor?: string
  currentPaperSizeName?: string
}>()
</script>

<style scoped>
@import '@/styles/ribbon-popover.css';
.mi { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; }
.dropdown-card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--vd-ribbon-text, #3c4043);
  margin-bottom: 8px;
}
.ribbon-overlay-card {
  min-width: 200px;
}
.watermark-card {
  min-width: 220px;
}
.wm-section + .wm-section {
  margin-top: 10px;
}
.wm-section-title {
  font-size: 12px;
  color: var(--vd-ribbon-text-muted, #7a8191);
  margin-bottom: 6px;
}
.wm-custom-add {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px dashed var(--vd-ribbon-border, #d8dce6);
  border-radius: 4px;
  background: #fff;
  color: var(--vd-ribbon-text, #3c4043);
  padding: 8px 10px;
  cursor: pointer;
}
.wm-custom-add:hover {
  border-color: var(--vd-ribbon-active-text, #1f57b8);
  background: var(--vd-ribbon-hover-bg, #edf2fb);
}
.dropdown-card-footer {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--vd-ribbon-border-soft, #e3e8f2);
}
.dropdown-footer-btn {
  width: 100%;
  border: none;
  border-radius: 4px;
  background: transparent;
  padding: 6px 8px;
  text-align: left;
  cursor: pointer;
  color: var(--vd-ribbon-text, #3c4043);
}
.dropdown-footer-btn:hover {
  background: var(--vd-ribbon-hover-bg, #edf2fb);
}
</style>
