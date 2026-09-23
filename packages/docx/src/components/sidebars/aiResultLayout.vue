<template>
  <div class="ai-result-sidebar" editor-component="ai-result-sidebar">
    <div class="sidebar-header">
      <div class="sidebar-title">
        <ThunderboltOutlined />
        <span>{{ t('sidebar.aiResult.title') }}</span>
        <a-tag v-if="actionLabel">{{ actionLabel }}</a-tag>
      </div>
      <div class="sidebar-close" @click="close" :title="t('common.close')">
        <CloseOutlined />
      </div>
    </div>

    <div class="panel-body">
      <!-- 加载中：流式输出 -->
      <template v-if="aiState.operation.loading">
        <div class="stream-status">
          <LoadingOutlined :spin="true" />
          <span>{{ t('sidebar.aiResult.generating') }}</span>
        </div>
        <div v-if="aiState.operation.streamContent" class="stream-content">
          {{ aiState.operation.streamContent }}
          <span class="cursor-blink">|</span>
        </div>
        <div v-else class="stream-placeholder">{{ t('sidebar.aiResult.waiting') }}</div>
      </template>

      <!-- 错误 -->
      <template v-else-if="aiState.operation.error">
        <a-alert :message="aiState.operation.error" type="error" :closable="false" show-icon />
        <div class="action-bar">
          <VdButton size="small" @click="handleRegenerate">
            <ReloadOutlined />
            {{ t('sidebar.aiResult.regenerate') }}
          </VdButton>
        </div>
      </template>

      <!-- 完成：展示结果 -->
      <template v-else-if="aiState.operation.result">
        <div class="result-content">{{ aiState.operation.result }}</div>
        <div class="action-bar">
          <VdButton size="small" type="primary" @click="handleApply">
            <CheckOutlined />
            {{ t('sidebar.aiResult.apply') }}
          </VdButton>
          <VdButton size="small" @click="handleCopy">
            <CopyOutlined />
            {{ t('common.copy') }}
          </VdButton>
          <VdButton size="small" @click="handleRegenerate">
            <ReloadOutlined />
            {{ t('sidebar.aiResult.regenerate') }}
          </VdButton>
        </div>
      </template>

      <!-- 空状态 -->
      <template v-else>
        <a-empty :description="t('sidebar.aiResult.noResult')" />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { VdButton } from '@vervedoc/ui'
import { CloseOutlined, ThunderboltOutlined, LoadingOutlined, CheckOutlined, CopyOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { AIAction } from '@vervedoc/docx-editor-ai'
import { aiStateStore } from '@/stores/ai-state'
import { t } from '@/i18n'

const emit = defineEmits<{
  (e: 'apply', result: string): void
  (e: 'regenerate'): void
  (e: 'close'): void
}>()

/** AI 状态对象 */
const aiState = aiStateStore.state

/** AI 动作到中文标签的映射 */
const ACTION_LABELS: Record<string, string> = {
  [AIAction.POLISH]: t('sidebar.ai.actionPolish'),
  [AIAction.TRANSLATE]: t('sidebar.ai.translate'),
  [AIAction.SUMMARIZE]: t('sidebar.ai.actionSummarize'),
  [AIAction.CONTINUE]: '续写',
  [AIAction.EXPAND]: t('sidebar.ai.actionExpand'),
  [AIAction.FIX_GRAMMAR]: t('sidebar.ai.actionFixGrammar'),
  [AIAction.FORMAL]: t('sidebar.ai.actionFormalize'),
  [AIAction.CASUAL]: t('sidebar.ai.actionRelax'),
  [AIAction.CUSTOM]: t('common.custom')
}

/** 当前 AI 动作的中文标签 */
const actionLabel = computed(() => {
  const action = aiState.operation.action
  return action ? (ACTION_LABELS[action] || action) : ''
})

/** 关闭结果面板 */
const close = () => {
  emit('close')
}

/** 应用 AI 结果到文档 */
const handleApply = () => {
  if (aiState.operation.result) {
    emit('apply', aiState.operation.result)
  }
}

/** 复制 AI 结果到剪贴板 */
const handleCopy = async () => {
  if (!aiState.operation.result) return
  try {
    await navigator.clipboard.writeText(aiState.operation.result)
    message.success(t('message.copySuccess'))
  } catch {
    message.error(t('message.copyFailed'))
  }
}

/** 重新生成 AI 结果 */
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
  color: #1890ff;
  background-color: #e6f7ff;
}

.panel-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
}

.stream-status {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1890ff;
  font-size: 13px;
  margin-bottom: 10px;
  flex-shrink: 0;
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
  border: 1px solid #f0f0f0;
}

.cursor-blink {
  animation: blink 1s step-end infinite;
  color: #1890ff;
  font-weight: bold;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.stream-placeholder {
  color: #bfbfbf;
  font-size: 13px;
  text-align: center;
  padding: 32px 0;
}

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
  border: 1px solid #f0f0f0;
}

.action-bar {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  padding-top: 10px;
  flex-shrink: 0;
  margin-top: 10px;
}

.action-bar :deep(.ant-btn) {
  margin: 0;
}
</style>
