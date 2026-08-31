<template>
  <div class="revision-panel" editor-component="revision-panel">
    <div class="sidebar-header">
      <div class="sidebar-title-wrap">
        <div class="sidebar-title-row">
          <VIcon name="pencil-plus" class="sidebar-title-icon" />
          <span class="sidebar-title">修订记录</span>
        </div>
        <div class="header-stats">
          <span class="status-pill">{{ reviewItems.length }} 条记录</span>
          <span class="status-pill review-comment">{{ comments.length }} 批注</span>
          <span class="status-pill review-revision">{{ revisions.length }} 审阅</span>
        </div>
      </div>
      <div class="sidebar-close" @click="emit('close')" title="关闭">
        <VIcon name="close" />
      </div>
    </div>

    <div class="sidebar-content">
      <div v-if="reviewItems.length" class="revision-list">
        <div
          v-for="item in reviewItems"
          :key="item.key"
          class="revision-item"
          tabindex="0"
          role="button"
          :class="{ active: isActiveItem(item) }"
          @click="handleLocate(item)"
          @keydown.enter.prevent="handleLocate(item)"
          @keydown.space.prevent="handleLocate(item)"
        >
          <div class="revision-body">
            <div class="revision-item-top">
              <div class="revision-author-group">
                <span class="rev-author-dot" :style="{ backgroundColor: getItemColor(item) }"></span>
                <span class="rev-author">{{ item.author || '未知用户' }}</span>
              </div>
              <span class="rev-time">{{ formatTime(item.date) }}</span>
            </div>

            <div class="revision-main-row">
              <div class="revision-text-column">
                <div
                  class="rev-content-text"
                  :class="{ placeholder: !item.content }"
                >
                  {{ item.content || getEmptyText(item) }}
                </div>

                <div v-if="item.kind === 'comment' && item.rangeText" class="range-text">
                  {{ item.rangeText }}
                </div>
              </div>

              <div class="revision-actions">
                <template v-if="item.kind === 'revision'">
                  <button class="action-btn accept" type="button" @click.stop="props.revisionAPI.accept(item.id)">
                    <VIcon name="check" />
                    接受
                  </button>
                  <button class="action-btn reject" type="button" @click.stop="props.revisionAPI.reject(item.id)">
                    <VIcon name="close" />
                    拒绝
                  </button>
                </template>
                <template v-else>
                  <button class="action-btn review-comment" type="button" @click.stop="props.commentAPI.remove(item.id)">
                    <VIcon name="delete-outline" />
                    删除
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <a-empty
          :image="false"
          description="暂无修订记录"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { VIcon } from '@vervedoc/icons'
import { computed } from 'vue'
import type { IEditorCommentApi } from '@/composables/use-editor-comments'
import type { IRevisionApi } from '@/composables/use-editor-revisions'
import type { RevisionItem } from '@/composables/use-editor-revisions'

const props = defineProps<{
  revisionAPI: IRevisionApi
  commentAPI: IEditorCommentApi
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const revisions = computed(() => props.revisionAPI.revisionList.value)
const activeRevisionId = computed(() => props.revisionAPI.activeRevisionId.value)
const comments = computed(() => props.commentAPI.commentList.value.filter(item => item.status !== 0))
const activeCommentGroupId = computed(() => props.commentAPI.activeGroupId.value)

const AUTHOR_COLORS = ['#1890FF', '#52C41A', '#FAAD14', '#FF4D4F', '#8C8C8C', '#13C2C2', '#722ED1']
const revisionTypeLabelMap = {
  insert: '插入',
  delete: '删除',
  format: '格式'
} as const
type ReviewFeedItem =
  | {
      kind: 'revision'
      key: string
      id: string
      author: string
      date: string
      content: string
      chipClass: RevisionItem['type']
      chipLabel: string
      sortTime: number
    }
  | {
      kind: 'comment'
      key: string
      id: string
      groupId: string
      author: string
      date: string
      content: string
      rangeText: string
      chipClass: 'review-comment' | 'review-resolved'
      chipLabel: string
      sortTime: number
    }

const reviewItems = computed<ReviewFeedItem[]>(() => {
  const revisionItems: ReviewFeedItem[] = revisions.value.map(item => ({
    kind: 'revision',
    key: `revision-${item.id}`,
    id: item.id,
    author: item.author,
    date: item.date,
    content: getReviewContent(item.content),
    chipClass: item.type,
    chipLabel: revisionTypeLabelMap[item.type],
    sortTime: getSortTime(item.date)
  }))

  const commentItems: ReviewFeedItem[] = comments.value.map(item => ({
    kind: 'comment',
    key: `comment-${item.id}`,
    id: item.id,
    groupId: item.groupId,
    author: item.userName,
    date: item.createdDate,
    content: getReviewContent(item.content),
    rangeText: getReviewContent(item.rangeText),
    chipClass: item.status === 2 ? 'review-resolved' : 'review-comment',
    chipLabel: item.status === 2 ? '已解决批注' : '批注',
    sortTime: getSortTime(item.createdDate)
  }))

  return [...revisionItems, ...commentItems].sort((a, b) => {
    if (b.sortTime !== a.sortTime) return b.sortTime - a.sortTime
    return a.key.localeCompare(b.key)
  })
})

const getAuthorColor = (name: string): string => {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AUTHOR_COLORS[Math.abs(hash) % AUTHOR_COLORS.length]
}

const getReviewContent = (content: string): string => {
  const normalized = String(content || '').replace(/\s+/g, ' ').trim()
  return normalized
}

const getEmptyText = (item: ReviewFeedItem): string => {
  return item.kind === 'comment' ? '未填写批注内容' : '无审阅内容'
}

const getSortTime = (dateStr: string): number => {
  if (!dateStr) return 0
  const time = new Date(dateStr).getTime()
  return Number.isFinite(time) ? time : 0
}

const getItemColor = (item: ReviewFeedItem): string => {
  if (item.kind === 'comment') {
    if (item.chipClass === 'review-resolved') return '#67c23a'
    return '#7c3aed'
  }
  return getAuthorColor(item.author)
}

const isActiveItem = (item: ReviewFeedItem): boolean => {
  if (item.kind === 'revision') return activeRevisionId.value === item.id
  return activeCommentGroupId.value === item.groupId
}

const handleLocate = (item: ReviewFeedItem) => {
  if (item.kind === 'revision') {
    props.revisionAPI.locate(item.id)
    return
  }
  props.commentAPI.locate(item.id)
}

const formatTime = (dateStr: string): string => {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const h = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `${y}-${m}-${day} ${h}:${min}`
  } catch {
    return dateStr
  }
}
</script>

<style scoped>
.revision-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: #f1f1f1;
  overflow: hidden;
  border-right: 1px solid #f1f1f1;
}

.sidebar-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 8px 10px 9px;
  min-height: 56px;
  border-bottom: 1px solid #d9d9d9;
  flex-shrink: 0;
  box-sizing: border-box;
}

.sidebar-title-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  min-width: 0;
}

.sidebar-title-row {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

.sidebar-title-icon {
  font-size: 14px;
  color: #303133;
  flex-shrink: 0;
}

.sidebar-title {
  font-size: 13px;
  font-weight: 600;
  color: #111;
  line-height: 1;
}

.header-stats {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-left: 12px;
}

.sidebar-close {
  color: #666;
  cursor: pointer;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
  margin-left: 8px;
}

.sidebar-close:hover {
  color: #111;
  background: #e5e5e5;
}

.sidebar-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 10px 8px 12px;
  overflow: hidden;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 0;
  font-size: 11px;
  line-height: 1;
  background: #ececec;
  color: #555;
}

.status-pill.review-comment {
  background: #f3e8ff;
  color: #7c3aed;
}

.status-pill.review-revision {
  background: #e6f4ff;
  color: #1677ff;
}

.revision-item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.rev-time {
  font-size: 10px;
  color: #8a8a8a;
}
.action-btn,
.revision-item {
  border: none;
  outline: none;
}

.revision-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 0;
  overflow-y: auto;
  padding-right: 2px;
}

.revision-item {
  flex-shrink: 0;
  width: 100%;
  display: flex;
  text-align: left;
  background: #f7f7f7;
  border: 1px solid #dfdfdf;
  border-radius: 0;
  cursor: pointer;
  transition: all 0.2s;
  overflow: hidden;
}

.revision-item.active {
  background: #edf5ff;
  border-color: #b8d4ff;
  box-shadow: inset 0 0 0 1px rgba(58, 123, 213, 0.06);
}

.revision-item:hover {
  border-color: #cfcfcf;
  background: #fbfbfb;
}

.revision-body {
  flex: 1;
  padding: 10px 10px 9px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.revision-main-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.revision-text-column {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.revision-author-group,
.rev-author {
  align-items: center;
  display: flex;
  gap: 6px;
  min-width: 0;
}

.rev-author {
  font-size: 12px;
  font-weight: 500;
  color: #111;
}

.rev-author-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.rev-content-text {
  font-size: 12px;
  line-height: 1.55;
  color: #303133;
  word-break: break-word;
  white-space: pre-wrap;
}

.rev-content-text.placeholder {
  color: #9aa0a6;
}

.range-text {
  padding: 6px 8px;
  border-left: 2px solid #e3e6eb;
  background: #f3f4f6;
  color: #666;
  font-size: 11px;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}

.revision-actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  flex-shrink: 0;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  height: 24px;
  padding: 0 8px;
  border-radius: 0;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 11px;
  color: #444;
  border: 1px solid #dfdfdf;
  gap: 3px;
}

.action-btn :deep(.material-icons) {
  font-size: 12px;
}

.action-btn.accept {
  color: #237804;
  border-color: #b7eb8f;
  background: #f6ffed;
}

.action-btn.accept:hover {
  border-color: #73d13d;
  background: #edfadb;
}

.action-btn.reject {
  color: #cf1322;
  border-color: #ffccc7;
  background: #fff2f0;
}

.action-btn.reject:hover {
  border-color: #ff7875;
  background: #ffe9e6;
}

.action-btn.review-comment {
  color: #7c3aed;
  border-color: #d8b4fe;
  background: #faf5ff;
}

.action-btn.review-comment:hover {
  border-color: #c084fc;
  background: #f3e8ff;
}

.empty-state {
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
}

:deep(.ant-empty) {
  margin: 0;
}
</style>
