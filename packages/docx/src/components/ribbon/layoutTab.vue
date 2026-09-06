<template>
  <div class="ribbon-tab-panel">
    <!-- 页面设置 -->
    <RibbonGroup title="页面设置">
      <a-dropdown :trigger="['click']">
        <RibbonButton icon="layout-paper-direction" text="纸张方向" title="纸张方向" size="large" has-arrow />
        <template #overlay>
          <a-card size="small" :bordered="false" class="ribbon-overlay-card" :bodyStyle="{ padding: '0' }">
            <div class="direction-panel">
              <div class="direction-item" @click="emit('command', 'paperDirection', PaperDirection.VERTICAL)">
                <div class="direction-icon vertical-icon"></div>
                <span>纵向</span>
              </div>
              <div class="direction-item" @click="emit('command', 'paperDirection', PaperDirection.HORIZONTAL)">
                <div class="direction-icon horizontal-icon"></div>
                <span>横向</span>
              </div>
            </div>
          </a-card>
        </template>
      </a-dropdown>
      <a-dropdown :trigger="['click']">
        <RibbonButton icon="layout-paper-size" text="纸张大小" title="纸张大小" size="large" has-arrow />
        <template #overlay>
          <a-card size="small" :bordered="false" class="ribbon-overlay-card" :bodyStyle="{ padding: '0' }">
            <div class="size-panel">
              <div class="size-item" :class="{ 'size-active': currentPaperSizeName === size.name }" v-for="size in paperSizes" :key="size.name" @click="emit('command', 'paperSize', size.width, size.height)">
                <div class="size-icon"></div>
                <div class="size-info">
                  <div class="size-name">{{ size.name }}</div>
                  <div class="size-dimensions">{{ size.displayHeight }} × {{ size.displayWidth }}</div>
                </div>
              </div>
            </div>
          </a-card>
        </template>
      </a-dropdown>
      <a-dropdown :trigger="['click']" overlayClassName="gdocs-menu-popper gdocs-margin-popper">
        <RibbonButton icon="aspect_ratio" text="页边距" title="页边距" size="large" has-arrow />
        <template #overlay>
          <a-card size="small" :bordered="false" class="ribbon-overlay-card" :bodyStyle="{ padding: '0' }">
            <div class="margin-presets">
              <div class="preset-item" v-for="preset in MARGIN_PRESETS" :key="preset.name" @click="emit('command', 'setPaperMargin', preset.margins)">
                <div class="page-icon"><div class="page-content" :style="preset.style"></div></div>
                <div class="preset-info">
                  <div class="preset-name">{{ preset.name }}</div>
                  <div class="preset-dimensions"><span class="margin-pair">上{{ (preset.margins[0] / 37.8).toFixed(1) }}厘米</span><span class="margin-pair">下{{ (preset.margins[2] / 37.8).toFixed(1) }}厘米</span></div>
                  <div class="preset-dimensions"><span class="margin-pair">左{{ (preset.margins[3] / 37.8).toFixed(1) }}厘米</span><span class="margin-pair">右{{ (preset.margins[1] / 37.8).toFixed(1) }}厘米</span></div>
                </div>
              </div>
            </div>
          </a-card>
        </template>
      </a-dropdown>
      <a-dropdown :trigger="['click']">
        <RibbonButton icon="layout-page-color" text="页面颜色" title="页面颜色" size="large" has-arrow />
        <template #overlay>
          <a-card size="small" :bordered="false" class="ribbon-overlay-card" :bodyStyle="{ padding: '0' }">
            <div class="bg-menu">
              <div class="bg-item" @click="emit('command', 'setPaperBackground', '#FFFFFF')">
                <span class="bg-check"><VIcon v-if="selectedBgColor === '#FFFFFF'" name="check" /></span>
                <span class="bg-item-text">无填充</span>
              </div>
              <div class="bg-divider"></div>
              <div class="bg-section-title">主题颜色</div>
              <div class="bg-grid">
                <button v-for="c in BG_COLOR_PALETTE" :key="c" class="bg-color" :class="{ selected: selectedBgColor === c }" :style="{ backgroundColor: c }" @click="emit('command', 'setPaperBackground', c)"></button>
              </div>
            </div>
          </a-card>
        </template>
      </a-dropdown>
    </RibbonGroup>

    <!-- 分栏 -->
    <RibbonGroup title="分栏">
      <RibbonButton icon="layout-column-one" text="一栏" title="一栏" size="large" command="columns" command-args="1" />
      <RibbonButton icon="layout-column-two" text="两栏" title="两栏" size="large" command="columns" command-args="2" />
      <RibbonButton icon="layout-column-three" text="三栏" title="三栏" size="large" command="columns" command-args="3" />
    </RibbonGroup>


    <!-- 水印 -->
    <RibbonGroup title="水印">
      <a-dropdown :trigger="['click']">
        <RibbonButton icon="watermark" text="水印" title="水印" size="large" has-arrow />
        <template #overlay>
          <a-card size="small" class="watermark-card">
            <div class="dropdown-card-title">水印</div>
            <div class="wm-section">
              <div class="wm-section-title">自定义水印</div>
              <button class="wm-custom-add" @click="emit('command', 'addWatermark')">
                <VIcon name="plus" />
                <span>点击添加</span>
              </button>
            </div>
            <div class="wm-section">
              <div class="wm-section-title">预设水印</div>
              <div class="wm-preset-grid">
                <div class="wm-preset-item" v-for="preset in WATERMARK_PRESETS" :key="preset.name" @click="emit('command', 'addWatermark', preset.options)">
                  <div class="wm-preset-preview"><span>{{ preset.name }}</span></div>
                  <div class="wm-preset-name">{{ preset.name }}</div>
                </div>
              </div>
            </div>
            <div class="dropdown-card-footer">
              <button class="dropdown-footer-btn" @click="emit('command', 'deleteWatermark')">
                <span class="mi"><VIcon name="delete-outline" /><span>删除水印</span></span>
              </button>
            </div>
          </a-card>
        </template>
      </a-dropdown>
    </RibbonGroup>
  </div>
</template>

<script setup lang="ts">
import { VIcon } from '@vervedoc/icons'
import { PaperDirection, PAPER_SIZE_LIST, MARGIN_PRESETS } from '@vervedoc/core'
import { BG_COLOR_PALETTE, WATERMARK_PRESETS } from '@/config/constants'
import RibbonGroup from './ribbonGroup.vue'
import RibbonButton from './ribbonButton.vue'

/** 纸张大小选项列表，附带显示用的厘米尺寸 */
const paperSizes = PAPER_SIZE_LIST.map(p => ({
  name: p.label.split(' ')[0],
  width: p.width,
  height: p.height,
  displayWidth: `${(p.width * 25.4 / 96).toFixed(1)}厘米`,
  displayHeight: `${(p.height * 25.4 / 96).toFixed(1)}厘米`
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
  color: var(--app-ribbon-text, #3c4043);
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
  color: var(--app-ribbon-text-muted, #7a8191);
  margin-bottom: 6px;
}
.wm-custom-add {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px dashed var(--app-ribbon-border, #d8dce6);
  border-radius: 4px;
  background: #fff;
  color: var(--app-ribbon-text, #3c4043);
  padding: 8px 10px;
  cursor: pointer;
}
.wm-custom-add:hover {
  border-color: var(--app-ribbon-active-text, #1f57b8);
  background: var(--app-ribbon-hover-bg, #edf2fb);
}
.dropdown-card-footer {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--app-ribbon-border-soft, #e3e8f2);
}
.dropdown-footer-btn {
  width: 100%;
  border: none;
  border-radius: 4px;
  background: transparent;
  padding: 6px 8px;
  text-align: left;
  cursor: pointer;
  color: var(--app-ribbon-text, #3c4043);
}
.dropdown-footer-btn:hover {
  background: var(--app-ribbon-hover-bg, #edf2fb);
}
</style>
