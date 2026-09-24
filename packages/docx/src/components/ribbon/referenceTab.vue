<template>
  <div class="ribbon-tab-panel">
    <VdRibbonGroup :title="t('ribbon.reference.toc')">
      <a-dropdown v-model:open="dropdownOpen" :trigger="['click']">
        <VdRibbonButton icon="table-of-contents" :text="t('ribbon.reference.autoToc')" :title="t('ribbon.reference.insertAutoToc')" size="large" has-arrow />
        <template #overlay>
          <div class="toc-gallery" @mousedown.prevent>
            <div class="toc-gallery-header">内置自动目录</div>
            <div class="toc-gallery-options">
              <button v-for="opt in tocOptions" :key="opt.maxLevel" type="button" class="toc-gallery-option" :aria-label="`${opt.label}，收录到第 ${opt.maxLevel} 级标题`" @click="handleTocInsert(opt.maxLevel)">
                <span class="toc-gallery-paper" aria-hidden="true">
                  <span class="toc-gallery-heading">目录</span>
                  <span v-for="(item, index) in opt.items" :key="index" class="toc-gallery-row" :style="{ paddingLeft: `${(item.level - 1) * 12}px` }">
                    <span class="toc-gallery-text">{{ item.number ? item.number + ' ' : '' }}{{ item.name }}</span>
                    <span class="toc-gallery-leader"></span>
                    <span class="toc-gallery-page">{{ item.pageNo }}</span>
                  </span>
                  <span v-if="!opt.items.length" class="toc-gallery-empty">当前文档暂无匹配标题</span>
                </span>
                <span class="toc-gallery-label">{{ opt.label }}</span>
                <span class="toc-gallery-description">收录到第 {{ opt.maxLevel }} 级标题 · 共 {{ opt.total }} 项</span>
              </button>
            </div>
            <div class="toc-gallery-note">预览来自当前文档，最多展示前 5 项；插入时收录所选级别的全部标题。</div>
          </div>
        </template>
      </a-dropdown>
      <VdRibbonButton icon="refresh" text="更新整个目录" title="更新目录标题与页码" size="large" @click="emit('command', 'tocInsert', { mode: 'update' })" />
      <VdRibbonButton icon="delete-outline" :text="t('ribbon.reference.deleteToc')" :title="t('ribbon.reference.deleteToc')" size="large" @click="emit('command', 'tocRemove')" />
    </VdRibbonGroup>
    <VdRibbonGroup :title="t('ribbon.reference.bookmarkAndFootnote')">
      <VdRibbonButton icon="bookmark-outline" :text="t('ribbon.reference.bookmark')" :title="t('ribbon.reference.bookmark')" size="large" @click="emit('command', 'bookmark')" />
      <VdRibbonButton icon="format-annotation-plus" :text="t('ribbon.reference.footnote')" :title="t('ribbon.reference.footnote')" size="large" @click="emit('command', 'footnote')" />
    </VdRibbonGroup>
  </div>
</template>

<script setup lang="ts">
import { VdRibbonButton, VdRibbonGroup } from '@vervedoc/ui'
import { ref, computed, inject, watch } from 'vue'
import type { IAutoTocItem } from '@vervedoc/core'
import { t } from '@/i18n'

const emit = defineEmits<{
  (e: 'command', cmd: string, ...args: any[]): void
}>()
const getAutoToc = inject<() => { toc3: IAutoTocItem[] } | null>('docx-editor:getAutoToc', () => null)
const dropdownOpen = ref(false)
const currentPreview = ref<IAutoTocItem[]>([])
const tocOptions = computed(() => [
  { maxLevel: 1 as const, label: '仅一级标题' },
  { maxLevel: 2 as const, label: '包含一至二级' },
  { maxLevel: 3 as const, label: '包含一至三级' }
].map(opt => {
  const items = currentPreview.value.filter(item => item.level >= 1 && item.level <= opt.maxLevel)
  return {
    ...opt,
    total: items.length,
    items: items.slice(0, 5)
  }
}))
const handleTocInsert = (maxLevel: 1 | 2 | 3) => {
  dropdownOpen.value = false
  emit('command', 'tocInsert', { mode: 'auto', type: 1, maxLevel })
}
watch(dropdownOpen, open => {
  if (open) currentPreview.value = getAutoToc()?.toc3 ?? []
})
</script>

<style scoped>
.toc-gallery {
  width: min(660px, calc(100vw - 24px));
  padding: 16px;
  background: #fff;
  border: 1px solid #e2e5e9;
  border-radius: 10px;
  box-shadow: 0 8px 28px rgb(24 39 58 / 14%);
  color: #303843;
  box-sizing: border-box;
}
.toc-gallery-header { margin-bottom: 12px; font-size: 12px; font-weight: 600; color: #657080; }
.toc-gallery-options { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
@media (max-width: 600px) {
  .toc-gallery-options { grid-template-columns: 1fr; }
  .toc-gallery { max-height: calc(100vh - 160px); overflow-y: auto; }
}
.toc-gallery-option {
  min-width: 0;
  padding: 8px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.toc-gallery-option:hover { background: #f0f6ff; border-color: #b8d3f5; }
.toc-gallery-option:focus-visible { outline: 2px solid #3879ca; outline-offset: 2px; }
.toc-gallery-paper {
  display: flex;
  flex-direction: column;
  height: 160px;
  padding: 16px 12px;
  box-sizing: border-box;
  background: #fff;
  border: 1px solid #dce1e7;
  box-shadow: 0 2px 4px rgb(24 39 58 / 5%);
  overflow: hidden;
}
.toc-gallery-heading { margin-bottom: 14px; color: #222; font-size: 16px; font-weight: 700; }
.toc-gallery-row { display: flex; align-items: baseline; gap: 4px; min-width: 0; margin-bottom: 7px; font-size: 10px; line-height: 14px; }
.toc-gallery-empty { margin: auto 0; color: #748091; font-size: 11px; text-align: center; }
.toc-gallery-text { min-width: 0; max-width: 75%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.toc-gallery-leader { flex: 1; min-width: 8px; border-bottom: 1px dotted #8b929b; }
.toc-gallery-page { flex-shrink: 0; font-variant-numeric: tabular-nums; }
.toc-gallery-label { display: block; margin-top: 10px; font-size: 13px; font-weight: 600; }
.toc-gallery-description { display: block; margin-top: 3px; font-size: 11px; color: #748091; }
.toc-gallery-note { margin-top: 14px; padding-top: 12px; border-top: 1px solid #edf0f3; font-size: 11px; line-height: 1.6; color: #748091; }
</style>
