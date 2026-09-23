<template>
  <div class="ribbon-tab-panel">
    <!-- 目录 -->
    <VdRibbonGroup :title="t('ribbon.reference.toc')">
      <a-dropdown
        v-model:open="dropdownOpen"
        :trigger="['click']"
        overlay-class-name="gdocs-toc-submenu-popper"
      >
        <VdRibbonButton icon="table-of-contents" :text="t('ribbon.reference.autoToc')" :title="t('ribbon.reference.insertAutoToc')" size="large" has-arrow />
        <template #overlay>
          <div class="toc-submenu-panel">
            <div class="toc-submenu-list">
              <div
                v-for="opt in tocOptions"
                :key="opt.type"
                class="toc-submenu-item"
                :class="{ active: hoverType === opt.type }"
                @mouseenter="handlePreviewHover(opt.type)"
                @click="handleTocInsert(opt.type)"
              >
                <span class="mi"><VdIcon name="table-of-contents" /></span>
                <span class="toc-submenu-label">{{ opt.label }}</span>
              </div>
            </div>
            <div class="toc-preview-panel">
              <div class="toc-preview-title">{{ t('ribbon.reference.toc') }}</div>
              <div class="toc-preview-list">
                <template v-if="currentPreview.length">
                  <div
                    v-for="item in currentPreview"
                    :key="item.id"
                    class="toc-preview-item"
                    :class="`level-${item.level}`"
                  >
                    <span class="toc-preview-text">{{ item.number ? item.number + ' ' : '' }}{{ item.name }}</span>
                    <span class="toc-dots"></span>
                    <span class="toc-preview-page">{{ item.pageNo }}</span>
                  </div>
                </template>
                <div v-else class="toc-preview-empty">{{ t('ribbon.reference.noTocData') }}</div>
              </div>
            </div>
          </div>
        </template>
      </a-dropdown>
      <VdRibbonButton icon="delete-outline" :text="t('ribbon.reference.deleteToc')" :title="t('ribbon.reference.deleteToc')" size="large" @click="emit('command', 'tocRemove')" />
    </VdRibbonGroup>

    <!-- 书签与脚注 -->
    <VdRibbonGroup :title="t('ribbon.reference.bookmarkAndFootnote')">
      <VdRibbonButton icon="bookmark-outline" :text="t('ribbon.reference.bookmark')" :title="t('ribbon.reference.bookmark')" size="large" @click="emit('command', 'bookmark')" />
      <VdRibbonButton icon="format-annotation-plus" :text="t('ribbon.reference.footnote')" :title="t('ribbon.reference.footnote')" size="large" @click="emit('command', 'footnote')" />
    </VdRibbonGroup>
  </div>
</template>

<script setup lang="ts">
import { VdRibbonButton, VdRibbonGroup, VdIcon } from '@vervedoc/ui'
import { ref, computed, inject, watch } from 'vue'

import type { IAutoTocItem } from '@vervedoc/core'
import { t } from '@/i18n'



interface IAutoTocResult {
  toc1: IAutoTocItem[]
  toc2: IAutoTocItem[]
  toc3: IAutoTocItem[]
}

const emit = defineEmits<{
  (e: 'command', cmd: string, ...args: any[]): void
}>()

const getAutoToc = inject<() => IAutoTocResult | null>('docx-editor:getAutoToc', () => null)

const tocOptions = [
  { type: 1 as const, label: t('ribbon.reference.autoToc1') },
  { type: 2 as const, label: t('ribbon.reference.autoToc2') },
  { type: 3 as const, label: t('ribbon.reference.autoToc3') }
]

const dropdownOpen = ref(false)
const hoverType = ref<1 | 2 | 3>(3)
const tocResult = ref<IAutoTocResult | null>(null)

const currentPreview = computed<IAutoTocItem[]>(() => {
  const r = tocResult.value
  if (!r) return []
  return hoverType.value === 1 ? r.toc1 : hoverType.value === 2 ? r.toc2 : r.toc3
})

/**
 * 悬浮子菜单项时切换预览级别
 * @param type 目录类型：1=仅一级，2=一至二级，3=一至三级
 */
const handlePreviewHover = (type: 1 | 2 | 3) => {
  hoverType.value = type
}

/**
 * 点击子菜单项，按指定类型插入自动目录
 * @param type 目录类型
 */
const handleTocInsert = (type: 1 | 2 | 3) => {
  dropdownOpen.value = false
  emit('command', 'tocInsert', { mode: 'auto', type })
}

watch(dropdownOpen, (open) => {
  if (open) {
    hoverType.value = 3
    tocResult.value = getAutoToc()
  }
})
</script>
