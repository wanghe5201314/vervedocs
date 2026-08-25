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
      <a-dropdown :trigger="['click']">
        <RibbonButton icon="eye-outline" text="显示标记选项" title="显示标记选项" size="large" has-arrow />
        <template #overlay>
          <a-menu @click="({ key }: any) => emit('command', 'revisionDisplayMode', key)">
            <a-menu-item key="all"><span class="mi"><VIcon :name="revisionDisplayMode === 'all' ? 'checkbox-marked-outline' : 'checkbox-blank-outline'" /><span>显示所有批注和修订</span></span></a-menu-item>
            <a-menu-item key="comments"><span class="mi"><VIcon :name="revisionDisplayMode === 'comments' ? 'checkbox-marked-outline' : 'checkbox-blank-outline'" /><span>仅显示批注</span></span></a-menu-item>
            <a-menu-item key="revisions"><span class="mi"><VIcon :name="revisionDisplayMode === 'revisions' ? 'checkbox-marked-outline' : 'checkbox-blank-outline'" /><span>仅显示修订</span></span></a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </RibbonGroup>

    <!-- 修订 -->
    <RibbonGroup title="修订">
      <RibbonButton icon="pencil-plus" text="修订模式" title="修订模式" size="large" :active="isTrackChanges" command="toggleTrackChanges" />
      <RibbonButton icon="dock-right" text="显示修订面板" title="显示修订面板" size="large" command="openRevisionPanel" />
    </RibbonGroup>

    <!-- 比较 -->
    <RibbonGroup title="比较">
      <RibbonButton icon="compare" text="比较文档" title="比较文档" size="large" command="compare" />
    </RibbonGroup>
  </div>
</template>

<script setup lang="ts">
import { VIcon } from '@vervedoc/icons'
import RibbonGroup from '../ribbonGroup.vue'
import RibbonButton from '../ribbonButton.vue'

const emit = defineEmits<{
  (e: 'command', cmd: string, ...args: any[]): void
}>()

defineProps<{
  hasSelection?: boolean
  isTrackChanges?: boolean
  revisionDisplayMode?: 'all' | 'comments' | 'revisions'
  documentStats?: {
    totalPages: number
    wordCount: number
    paragraphCount: number
    charCount: number
    charCountWithSpaces: number
  }
}>()
</script>

<style scoped>
@import '../../toolbar/ribbon-popover.css';
.mi { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; }
</style>
