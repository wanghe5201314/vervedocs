<template>
  <div class="ribbon-tab-panel">
    <!-- 目录 -->
    <RibbonGroup title="目录">
      <a-dropdown
        v-model:open="dropdownOpen"
        :trigger="['click']"
        overlay-class-name="gdocs-toc-submenu-popper"
      >
        <RibbonButton icon="table-of-contents" text="自动目录" title="插入自动目录" size="large" has-arrow />
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
                <span class="mi"><VIcon name="table-of-contents" /></span>
                <span class="toc-submenu-label">{{ opt.label }}</span>
              </div>
            </div>
            <div class="toc-preview-panel">
              <div class="toc-preview-title">目录</div>
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
                <div v-else class="toc-preview-empty">暂无目录数据</div>
              </div>
            </div>
          </div>
        </template>
      </a-dropdown>
      <RibbonButton icon="delete-outline" text="删除目录" title="删除目录" size="large" command="tocRemove" />
    </RibbonGroup>

    <!-- 书签与脚注 -->
    <RibbonGroup title="书签与脚注">
      <RibbonButton icon="bookmark-outline" text="书签" title="书签" size="large" command="bookmark" />
      <RibbonButton icon="format-annotation-plus" text="脚注" title="脚注" size="large" command="footnote" />
    </RibbonGroup>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, watch } from 'vue'
import { VIcon } from '@vervedoc/icons'
import type { IAutoTocItem } from '@vervedoc/core'
import RibbonGroup from './ribbonGroup.vue'
import RibbonButton from './ribbonButton.vue'

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
  { type: 1 as const, label: '自动目录 1' },
  { type: 2 as const, label: '自动目录 2' },
  { type: 3 as const, label: '自动目录 3' }
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
