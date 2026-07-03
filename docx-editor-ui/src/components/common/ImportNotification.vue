<template>
  <div class="import-notification-content">
    <!-- 标题区域 -->
    <div class="import-notification-header">
      <div class="import-notification-icon-success">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill="#52c41a"/>
          <path d="M8 12L11 15L16 9" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <span class="import-notification-title">1 项文件上传成功</span>
    </div>

    <!-- 文件信息区域 -->
    <div class="import-notification-file">
      <div class="import-notification-file-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#409eff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M14 2V8H20" stroke="#409eff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="import-notification-file-info">
        <div class="import-notification-file-name" :title="displayFileName">{{ displayFileName }}</div>
        <div class="import-notification-file-meta">
          <span class="import-notification-file-status" :class="{ 'is-parsing': isParsing }">
            {{ statusText }}
          </span>
          <span v-if="displayFileSize" class="import-notification-file-size"> · {{ displayFileSize }}</span>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="import-notification-actions">
      <el-tooltip content="当前文档内容不再修改，会将导入的内容作为新文档保存" placement="top" effect="light" :popper-style="{ zIndex: 99999 }">
        <el-button type="primary" :disabled="isParsing" @click="handleOverwrite"><MdiIcon name="file-import-outline" /> 新建文档</el-button>
      </el-tooltip>
      <el-tooltip content="当前文档内容被替换，根据这个文档的内容全新保存" placement="top" effect="light" :popper-style="{ zIndex: 99999 }">
        <el-button :disabled="isParsing" @click="handleAppend"><MdiIcon name="content-copy" /> 替换到这个文档</el-button>
      </el-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type Ref } from 'vue'
import MdiIcon from './MdiIcon.vue'

const props = defineProps<{
  fileName: Ref<string>
  fileSize: Ref<string>
  parseProgress: Ref<number | undefined> // 0-100，undefined 表示解析完成
}>()

const emit = defineEmits<{
  overwrite: []
  append: []
}>()

// 获取显示值
const displayFileName = computed(() => props.fileName.value || '文档.docx')
const displayFileSize = computed(() => props.fileSize.value)
const displayProgress = computed(() => props.parseProgress.value)

// 是否正在解析
const isParsing = computed(() => {
  return displayProgress.value !== undefined && displayProgress.value < 100
})

// 状态文本
const statusText = computed(() => {
  if (displayProgress.value === undefined || displayProgress.value >= 100) {
    return '✓ 解析完成'
  }
  return `解析中：${displayProgress.value}%`
})

const handleOverwrite = () => {
  emit('overwrite')
}

const handleAppend = () => {
  emit('append')
}
</script>

<style scoped>
.import-notification-content {
  width: 100%;
}

.import-notification-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.import-notification-icon-success {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.import-notification-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.import-notification-file {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  background: #f5f7fa;
  border-radius: 6px;
  margin-bottom: 16px;
}

.import-notification-file-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.import-notification-file-info {
  flex: 1;
  min-width: 0;
}

.import-notification-file-name {
  font-size: 13px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4px;
}

.import-notification-file-meta {
  font-size: 12px;
  color: #909399;
}

.import-notification-file-status {
  color: #52c41a;
}

.import-notification-file-status.is-parsing {
  color: #e6a23c;
}

.import-notification-file-size {
  color: #909399;
}

.import-notification-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
