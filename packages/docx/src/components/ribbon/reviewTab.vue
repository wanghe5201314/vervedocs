<template>
  <div class="ribbon-tab-panel">
    <!-- 校对 -->
    <VdRibbonGroup :title="t('ribbon.review.proofreading')">
      <VdRibbonButton icon="spellcheck" :text="t('ribbon.review.spellcheck')" :title="t('ribbon.review.spellcheck')" size="large" @click="emit('command', 'spellcheck')" />
      <a-popover placement="bottom" :overlayStyle="{ width: '280px' }" trigger="click">
        <VdRibbonButton icon="counter" :text="t('ribbon.review.wordCountStats')" :title="t('ribbon.review.wordCountStats')" size="large" />
        <template #content>
          <VdCard size="small" class="ribbon-popover-card" :bordered="false" :bodyStyle="{ padding: '4px' }">
            <div class="wordcount-panel">
              <div class="wc-header">{{ t('ribbon.review.wordCountStats') }}</div>
              <div class="wc-grid">
                <div class="wc-row"><span class="wc-label">{{ t('ribbon.review.wordCount') }}</span><span class="wc-value">{{ documentStats?.wordCount || 0 }}</span></div>
                <div class="wc-row"><span class="wc-label">{{ t('ribbon.review.charNoSpace') }}</span><span class="wc-value">{{ documentStats?.charCount || 0 }}</span></div>
                <div class="wc-row"><span class="wc-label">{{ t('ribbon.review.charWithSpace') }}</span><span class="wc-value">{{ documentStats?.charCountWithSpaces || 0 }}</span></div>
                <div class="wc-row"><span class="wc-label">{{ t('ribbon.review.paragraph') }}</span><span class="wc-value">{{ documentStats?.paragraphCount || 0 }}</span></div>
                <div class="wc-row"><span class="wc-label">{{ t('ribbon.review.pages') }}</span><span class="wc-value">{{ documentStats?.totalPages || 0 }}</span></div>
              </div>
              <div class="wc-tip">{{ t('ribbon.review.selectTextHint') }}</div>
            </div>
          </VdCard>
        </template>
      </a-popover>
    </VdRibbonGroup>

    <!-- 批注 -->
    <VdRibbonGroup :title="t('ribbon.review.comment')">
      <VdRibbonButton icon="comment-plus-outline" :text="t('ribbon.review.newComment')" :title="t('ribbon.review.newCommentShortcut')" size="large" :disabled="!hasSelection" @click="emit('command', 'comment')" />
      <VdRibbonButton icon="delete-outline" :text="t('ribbon.review.deleteComment')" :title="t('ribbon.review.deleteCurrentComment')" size="large" :disabled="!hasActiveCommentGroup" @click="emit('command', 'commentDeleteCurrent')" />
    </VdRibbonGroup>

    <!-- 修订 -->
    <VdRibbonGroup :title="t('ribbon.review.revision')">
      <VdRibbonButton icon="pencil-plus" :text="t('ribbon.review.revisionMode')" :title="t('ribbon.review.revisionMode')" size="large" :active="isTrackChanges" @click="emit('command', 'toggleTrackChanges')" />
      <div class="review-ribbon-actions">
        <a-dropdown :trigger="['click']">
          <VdRibbonButton icon="eye-outline" :text="t('ribbon.review.showMark')" :title="currentRevisionDisplayModeLabel" size="large" has-arrow />
          <template #overlay>
            <a-menu class="review-mode-menu" @click="({ key }: any) => emit('command', 'revisionDisplayMode', key)">
              <a-menu-item v-for="option in revisionDisplayModeOptions" :key="option.value">
                <span class="review-mode-item" :class="{ active: revisionDisplayMode === option.value }">
                  <span>{{ option.label }}</span>
                </span>
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </div>
      <div class="review-revision-actions">
        <VdRibbonButton icon="arrow-left" :text="t('ribbon.review.prevRevision')" :title="t('ribbon.review.prevRevision')" size="large" :disabled="!hasRevisions" @click="emit('command', 'previousRevision')" />
        <VdRibbonButton icon="arrow-right" :text="t('ribbon.review.nextRevision')" :title="t('ribbon.review.nextRevision')" size="large" :disabled="!hasRevisions" @click="emit('command', 'nextRevision')" />
        <a-dropdown :trigger="['click']">
          <VdRibbonButton icon="check" :text="t('ribbon.review.accept')" :title="t('ribbon.review.acceptRevision')" size="large" :disabled="!hasRevisions" has-arrow />
          <template #overlay>
            <a-menu @click="({ key }: any) => emit('command', key)">
              <a-menu-item key="acceptRevisionCurrent">{{ t('ribbon.review.acceptCurrent') }}</a-menu-item>
              <a-menu-item key="acceptAllRevisions">{{ t('ribbon.review.acceptAll') }}</a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
        <a-dropdown :trigger="['click']">
          <VdRibbonButton icon="close" :text="t('ribbon.review.reject')" :title="t('ribbon.review.rejectRevision')" size="large" :disabled="!hasRevisions" has-arrow />
          <template #overlay>
            <a-menu @click="({ key }: any) => emit('command', key)">
              <a-menu-item key="rejectRevisionCurrent">{{ t('ribbon.review.rejectCurrent') }}</a-menu-item>
              <a-menu-item key="rejectAllRevisions">{{ t('ribbon.review.rejectAll') }}</a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </div>
    </VdRibbonGroup>

  </div>
</template>

<script setup lang="ts">
import { VdRibbonButton, VdRibbonGroup, VdCard } from '@vervedoc/ui'
import { computed } from 'vue'

import { t } from '@/i18n'




const emit = defineEmits<{
  (e: 'command', cmd: string, ...args: any[]): void
}>()

const props = defineProps<{
  hasSelection?: boolean
  hasActiveCommentGroup?: boolean
  isTrackChanges?: boolean
  revisionCount?: number
  revisionDisplayMode?: 'all' | 'comments' | 'revisions' | 'none'
  documentStats?: {
    totalPages: number
    wordCount: number
    paragraphCount: number
    charCount: number
    charCountWithSpaces: number
  }
}>()

/** 修订显示模式选项 */
const revisionDisplayModeOptions = [
  { value: 'all', label: t('ribbon.review.showAll') },
  { value: 'comments', label: t('ribbon.review.showCommentOnly') },
  { value: 'revisions', label: t('ribbon.review.showRevisionOnly') },
  { value: 'none', label: t('ribbon.review.showNone') }
] as const

/** 当前修订显示模式的中文标签 */
const currentRevisionDisplayModeLabel = computed(() => {
  switch (props.revisionDisplayMode) {
    case 'comments':
      return t('ribbon.review.labelCommentOnly')
    case 'revisions':
      return t('ribbon.review.labelRevisionOnly')
    case 'none':
      return t('ribbon.review.labelNone')
    case 'all':
    default:
      return t('ribbon.review.labelAll')
  }
})

/** 是否存在修订记录 */
const hasRevisions = computed(() => Number(props.revisionCount || 0) > 0)
</script>

<style scoped>
@import '@/styles/ribbon-popover.css';

.review-ribbon-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.review-revision-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.review-mode-item {
  display: flex;
  align-items: center;
  min-width: 190px;
  padding: 4px 6px;
  border-radius: 4px;
  font-size: 12px;
}

.review-mode-item.active {
  background: #eef1f5;
}

:deep(.review-mode-menu .ant-menu-item) {
  padding: 2px 8px;
  line-height: 20px;
  margin: 0;
}
</style>
