<template>
  <div class="ai-result-sidebar" editor-component="ai-result-sidebar">
    <div class="sidebar-header">
      <div class="sidebar-title">
        <el-icon><MagicStick /></el-icon>
        <span>AI 结果</span>
        <el-tag v-if="actionLabel" size="small" type="info" effect="plain">{{ actionLabel }}</el-tag>
      </div>
      <div class="sidebar-close" @click="close" title="关闭">
        <el-icon><Close /></el-icon>
      </div>
    </div>

    <div class="panel-body">
      <!-- 加载中：流式输出 -->
      <template v-if="aiState.operation.loading">
        <div class="stream-status">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>AI 正在生成中...</span>
        </div>
        <div v-if="aiState.operation.streamContent" class="stream-content">
          {{ aiState.operation.streamContent }}
          <span class="cursor-blink">|</span>
        </div>
        <div v-else class="stream-placeholder">等待响应...</div>
      </template>

      <!-- 错误 -->
      <template v-else-if="aiState.operation.error">
        <el-alert :title="aiState.operation.error" type="error" :closable="false" show-icon />
        <div class="action-bar">
          <el-button size="small" @click="handleRegenerate">
            <el-icon><RefreshRight /></el-icon>
            重新生成
          </el-button>
        </div>
      </template>

      <!-- 完成：展示结果 -->
      <template v-else-if="aiState.operation.result">
        <div class="result-content">{{ aiState.operation.result }}</div>
        <div class="action-bar">
          <el-button size="small" type="primary" @click="handleApply">
            <el-icon><Check /></el-icon>
            应用
          </el-button>
          <el-button size="small" @click="handleCopy">
            <el-icon><CopyDocument /></el-icon>
            复制
          </el-button>
          <el-button size="small" @click="handleRegenerate">
            <el-icon><RefreshRight /></el-icon>
            重新生成
          </el-button>
        </div>
      </template>

      <!-- 空状态 -->
      <template v-else>
        <el-empty description="暂无结果" :image-size="80" />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Close, MagicStick, Loading, Check, CopyDocument, RefreshRight } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { AIAction } from '@wanghe1995/docx-editor-ai'
import { aiStateStore } from '@/stores/ai-state'

const emit = defineEmits<{
  (e: 'apply', result: string): void
  (e: 'regenerate'): void
  (e: 'close'): void
}>()

const aiState = aiStateStore.state

const ACTION_LABELS: Record<string, string> = {
  [AIAction.POLISH]: '润色',
  [AIAction.TRANSLATE]: '翻译',
  [AIAction.SUMMARIZE]: '总结',
  [AIAction.CONTINUE]: '续写',
  [AIAction.EXPAND]: '扩展',
  [AIAction.FIX_GRAMMAR]: '修正语法',
  [AIAction.FORMAL]: '正式化',
  [AIAction.CASUAL]: '轻松化',
  [AIAction.CUSTOM]: '自定义'
}

const actionLabel = computed(() => {
  const action = aiState.operation.action
  return action ? (ACTION_LABELS[action] || action) : ''
})

const close = () => {
  emit('close')
}

const handleApply = () => {
  if (aiState.operation.result) {
    emit('apply', aiState.operation.result)
  }
}

const handleCopy = async () => {
  if (!aiState.operation.result) return
  try {
    await navigator.clipboard.writeText(aiState.operation.result)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败')
  }
}

const handleRegenerate = () => {
  emit('regenerate')
}
</script>

<style scoped>
.ai-result-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 320px;
  background-color: #f2f4f7;
  border-left: 1px solid gainsboro;
  flex-shrink: 0;
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 10px;
  height: 40px;
  border-bottom: 1px solid #e2e6ed;
  flex-shrink: 0;
}

.sidebar-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.sidebar-close {
  color: #909399;
  cursor: pointer;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.sidebar-close:hover {
  color: #409eff;
  background-color: #ecf5ff;
}

.panel-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
}

/* 流式输出状态 */
.stream-status {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #409eff;
  font-size: 13px;
  margin-bottom: 10px;
  flex-shrink: 0;
}

.stream-status .is-loading {
  font-size: 16px;
}

.stream-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  font-size: 13px;
  color: #303133;
  line-height: 1.8;
  background: #fff;
  border-radius: 6px;
  padding: 12px;
  white-space: pre-wrap;
  word-break: break-word;
  border: 1px solid #ebeef5;
}

.cursor-blink {
  animation: blink 1s step-end infinite;
  color: #409eff;
  font-weight: bold;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.stream-placeholder {
  color: #c0c4cc;
  font-size: 13px;
  text-align: center;
  padding: 32px 0;
}

/* 结果展示 */
.result-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  font-size: 13px;
  color: #303133;
  line-height: 1.8;
  background: #fff;
  border-radius: 6px;
  padding: 12px;
  white-space: pre-wrap;
  word-break: break-word;
  border: 1px solid #ebeef5;
}

/* 操作栏 */
.action-bar {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  padding-top: 10px;
  flex-shrink: 0;
  margin-top: 10px;
}

.action-bar .el-button {
  margin: 0;
}
</style>
