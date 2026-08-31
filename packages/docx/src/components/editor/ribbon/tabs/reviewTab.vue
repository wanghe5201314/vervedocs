<template>
  <div class="ribbon-tab-panel">
    <!-- 校对 -->
    <RibbonGroup title="校对">
      <RibbonButton icon="spellcheck" text="拼写检查" title="拼写检查" size="large" command="spellcheck" />
      <a-popover placement="bottom" :overlayStyle="{ width: '280px' }" trigger="click">
        <RibbonButton icon="counter" text="字数统计" title="字数统计" size="large" />
        <template #content>
          <a-card size="small" class="ribbon-popover-card" :bordered="false" :bodyStyle="{ padding: '4px' }">
            <div class="wordcount-panel">
              <div class="wc-header">字数统计</div>
              <div class="wc-grid">
                <div class="wc-row"><span class="wc-label">字数</span><span class="wc-value">{{ documentStats?.wordCount || 0 }}</span></div>
                <div class="wc-row"><span class="wc-label">字符（不含空格）</span><span class="wc-value">{{ documentStats?.charCount || 0 }}</span></div>
                <div class="wc-row"><span class="wc-label">字符（含空格）</span><span class="wc-value">{{ documentStats?.charCountWithSpaces || 0 }}</span></div>
                <div class="wc-row"><span class="wc-label">段落</span><span class="wc-value">{{ documentStats?.paragraphCount || 0 }}</span></div>
                <div class="wc-row"><span class="wc-label">页数</span><span class="wc-value">{{ documentStats?.totalPages || 0 }}</span></div>
              </div>
              <div class="wc-tip">选中文本后查看可显示选中内容的统计</div>
            </div>
          </a-card>
        </template>
      </a-popover>
    </RibbonGroup>

    <!-- 批注 -->
    <RibbonGroup title="批注">
      <RibbonButton icon="comment-plus-outline" text="新建批注" title="新建批注 (Ctrl+Alt+M)" size="large" :disabled="!hasSelection" command="comment" />
      <RibbonButton icon="delete-outline" text="删除批注" title="删除当前批注" size="large" :disabled="!hasActiveCommentGroup" command="commentDeleteCurrent" />
    </RibbonGroup>

    <!-- 修订 -->
    <RibbonGroup title="修订">
      <RibbonButton icon="pencil-plus" text="修订模式" title="修订模式" size="large" :active="isTrackChanges" command="toggleTrackChanges" />
      <div class="review-ribbon-actions">
        <a-dropdown :trigger="['click']">
          <RibbonButton icon="eye-outline" text="显示标记" :title="currentRevisionDisplayModeLabel" size="large" has-arrow />
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
        <RibbonButton icon="arrow-left" text="上一处修订" title="上一处修订" size="large" :disabled="!hasRevisions" command="previousRevision" />
        <RibbonButton icon="arrow-right" text="下一处修订" title="下一处修订" size="large" :disabled="!hasRevisions" command="nextRevision" />
        <a-dropdown :trigger="['click']">
          <RibbonButton icon="check" text="接受" title="接受修订" size="large" :disabled="!hasRevisions" has-arrow />
          <template #overlay>
            <a-menu @click="({ key }: any) => emit('command', key)">
              <a-menu-item key="acceptRevisionCurrent">接受当前修订</a-menu-item>
              <a-menu-item key="acceptAllRevisions">接受所有修订</a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
        <a-dropdown :trigger="['click']">
          <RibbonButton icon="close" text="拒绝" title="拒绝修订" size="large" :disabled="!hasRevisions" has-arrow />
          <template #overlay>
            <a-menu @click="({ key }: any) => emit('command', key)">
              <a-menu-item key="rejectRevisionCurrent">拒绝当前修订</a-menu-item>
              <a-menu-item key="rejectAllRevisions">拒绝所有修订</a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </div>
    </RibbonGroup>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import RibbonGroup from '../ribbonGroup.vue'
import RibbonButton from '../ribbonButton.vue'

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

const revisionDisplayModeOptions = [
  { value: 'all', label: '显示所有批注和修订' },
  { value: 'comments', label: '仅显示批注' },
  { value: 'revisions', label: '仅显示修订' },
  { value: 'none', label: '不显示标记' }
] as const

const currentRevisionDisplayModeLabel = computed(() => {
  switch (props.revisionDisplayMode) {
    case 'comments':
      return '仅批注'
    case 'revisions':
      return '仅修订'
    case 'none':
      return '不显示'
    case 'all':
    default:
      return '所有标记'
  }
})

const hasRevisions = computed(() => Number(props.revisionCount || 0) > 0)
</script>

<style scoped>
@import '../../toolbar/ribbon-popover.css';

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
