<template>
  <div class="revision-panel" editor-component="revision-panel">
    <div class="revision-header">
      <div class="revision-title">
        <MdiIcon name="pencil-plus" />
        <span>修订记录</span>
      </div>
      <div class="revision-header-right">
        <span v-if="revisions.length > 0" class="rev-count">共 {{ revisions.length }} 处修订</span>
        <div class="revision-close" @click="emit('close')" title="关闭">
          <MdiIcon name="close" />
        </div>
      </div>
    </div>

    <div class="revision-toolbar">
      <button class="rev-btn accept" @click="emit('command', 'acceptAllRevisions')" title="接受所有修订">
        <MdiIcon name="check-all" />
        <span>接受所有修订</span>
      </button>
      <button class="rev-btn reject" @click="emit('command', 'rejectAllRevisions')" title="拒绝所有修订">
        <MdiIcon name="close-box-multiple-outline" />
        <span>拒绝所有修订</span>
      </button>
    </div>

    <div class="revision-list">
      <el-empty v-if="revisions.length === 0" description="暂无修订记录" :image-size="80" />
      <div
        v-for="rev in revisions"
        :key="rev.id"
        class="revision-item"
        :class="{ active: activeRevisionId === rev.id }"
        @click="emit('command', 'locateRevision', rev.id)"
      >
        <div class="rev-item-left-bar"></div>
        <div class="rev-item-body">
          <div class="rev-item-header">
            <span class="rev-author">
              <span class="rev-author-dot" :style="{ backgroundColor: getAuthorColor(rev.author) }"></span>
              {{ rev.author }}
            </span>
            <span class="rev-time">{{ formatTime(rev.date) }}</span>
          </div>
          <div class="rev-item-content">
            <span class="rev-type-tag delete">删除</span>
            <span class="rev-content-text">{{ rev.content }}</span>
          </div>
          <div class="rev-item-actions">
            <button class="rev-action-btn accept" @click.stop="emit('command', 'acceptRevisionById', rev.id)" title="接受">
              <MdiIcon name="check" />
            </button>
            <button class="rev-action-btn reject" @click.stop="emit('command', 'rejectRevisionById', rev.id)" title="拒绝">
              <MdiIcon name="close" />
            </button>
          </div>
        </div>
      </div>
    </div>


  </div>
</template>

<script setup lang="ts">
import MdiIcon from '@/components/common/MdiIcon.vue'

export interface RevisionItem {
  id: string
  type: 'delete'
  author: string
  date: string
  content: string
}

const _props = defineProps<{
  revisions: RevisionItem[]
  activeRevisionId?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'command', cmd: string, ...args: any[]): void
}>()

const AUTHOR_COLORS = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399', '#00BCD4', '#9C27B0']

const getAuthorColor = (name: string): string => {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AUTHOR_COLORS[Math.abs(hash) % AUTHOR_COLORS.length]
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
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f2f4f7;
  overflow: hidden;
}

.revision-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
}

.revision-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.revision-title .material-icons {
  font-size: 18px;
  color: #409eff;
}

.revision-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.revision-close {
  cursor: pointer;
  color: #909399;
  display: flex;
  align-items: center;
  padding: 4px;
  border-radius: 0;
  transition: all 0.2s;
}

.revision-close:hover {
  color: #606266;
  background: #e4e7ed;
}

.revision-toolbar {
  padding: 8px 12px;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

.rev-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid #dcdfe6;
  background: #fff;
  border-radius: 0;
  cursor: pointer;
  color: #606266;
  font-size: 12px;
  transition: all 0.15s;
  white-space: nowrap;
  flex: none;
}

.rev-btn:hover {
  background: #f0f2f5;
  color: #303133;
  border-color: #c0c4cc;
}

.rev-btn.accept {
  color: #67c23a;
  border-color: #b3e19d;
}

.rev-btn.accept:hover {
  background: #f0f9eb;
  border-color: #67c23a;
}

.rev-btn.reject {
  color: #f56c6c;
  border-color: #fab6b6;
}

.rev-btn.reject:hover {
  background: #fef0f0;
  border-color: #f56c6c;
}

.rev-btn .material-icons {
  font-size: 16px;
}

.revision-list {
  display: flex;
  overflow-y: auto;
  flex-direction: column;
  gap: 6px;
  padding:6px;
}

.revision-item {
  display: flex;
  cursor: pointer;
  transition: background 0.15s;
  position: relative;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
}

.revision-item:hover {
  background: #f5f7fa;
}

.revision-item.active {
  background: #ecf5ff;
}

.rev-item-left-bar {
  width: 3px;
  flex-shrink: 0;

  background: #f56c6c;
}

.rev-item-body {
  flex: 1;
  padding: 10px 12px;
  min-width: 0;
}

.rev-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.rev-author {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #303133;
}

.rev-author-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.rev-time {
  font-size: 11px;
  color: #c0c4cc;
  white-space: nowrap;
}

.rev-item-content {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-bottom: 6px;
}

.rev-type-tag {
  display: inline-block;
  padding: 1px 6px;
  font-size: 11px;
  font-weight: 500;
  border-radius: 0;
  flex-shrink: 0;
  line-height: 18px;

  color: #f56c6c;
  background: #fef0f0;
}

.rev-content-text {
  font-size: 13px;
  color: #606266;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-all;
}

.rev-item-actions {
  display: flex;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.15s;
}

.revision-item:hover .rev-item-actions,
.revision-item.active .rev-item-actions {
  opacity: 1;
}

.rev-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: 1px solid #dcdfe6;
  background: #fff;
  border-radius: 0;
  cursor: pointer;
  transition: all 0.15s;
}

.rev-action-btn .material-icons {
  font-size: 14px;
}

.rev-action-btn.accept {
  color: #67c23a;
}

.rev-action-btn.accept:hover {
  border-color: #67c23a;
  background: #f0f9eb;
}

.rev-action-btn.reject {
  color: #f56c6c;
}

.rev-action-btn.reject:hover {
  border-color: #f56c6c;
  background: #fef0f0;
}


.rev-count {
  font-size: 12px;
  color: #909399;
}
</style>
