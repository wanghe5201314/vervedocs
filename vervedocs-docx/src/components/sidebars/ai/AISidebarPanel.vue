<template>
  <div class="ai-sidebar" editor-component="ai-sidebar">
    <div class="sidebar-header">
      <div class="sidebar-title">
        <ThunderboltOutlined />
        <span>AI 助手</span>
      </div>
      <div class="sidebar-close" @click="close" title="关闭">
        <CloseOutlined />
      </div>
    </div>

    <a-tabs v-model:activeKey="activeTab" class="ai-tabs" @change="handleTabChange">
      <!-- AI 写作 -->
      <a-tab-pane tab="AI 写作" key="writing">
        <div class="tab-content">
          <div class="action-group">
            <div class="group-label">快捷操作</div>
            <div class="action-grid">
              <a-button
                v-for="action in quickActions"
                :key="action.value"
                size="small"
                :disabled="!hasSelection || aiState.operation.loading"
                @click="handleQuickAction(action.value)"
              >
                <MdiIcon :name="action.icon" />
                {{ action.label }}
              </a-button>
            </div>
          </div>

          <a-divider />

          <div class="action-group">
            <div class="group-label">翻译</div>
            <div class="translate-row">
              <a-select
                v-model:value="targetLanguage"
                size="small"
                placeholder="目标语言"
                style="width: 120px"
              >
                <a-select-option
                  v-for="lang in languages"
                  :key="lang.value"
                  :value="lang.value"
                >
                  {{ lang.label }}
                </a-select-option>
              </a-select>
              <a-button
                size="small"
                type="primary"
                :disabled="!hasSelection || aiState.operation.loading"
                @click="handleTranslate"
              >
                翻译
              </a-button>
            </div>
          </div>

          <a-divider />

          <div class="action-group">
            <div class="group-label">自定义指令</div>
            <a-textarea
              v-model:value="customPrompt"
              :rows="3"
              placeholder="输入自定义 AI 指令，例如：将文本改写为新闻稿风格"
            />
            <a-button
              size="small"
              type="primary"
              style="margin-top: 8px"
              :disabled="!hasSelection || !customPrompt.trim() || aiState.operation.loading"
              @click="handleCustomAction"
            >
              执行
            </a-button>
          </div>

          <a-divider />

          <!-- AI 续写 -->
          <div class="action-group">
            <div class="group-label">AI 续写</div>
            <a-button
              size="small"
              type="primary"
              :disabled="aiState.operation.loading"
              @click="handleContinueWriting"
            >
              <MdiIcon name="pen-plus" />
              从光标处续写
            </a-button>
          </div>
        </div>
      </a-tab-pane>

      <!-- 排版建议 -->
      <a-tab-pane tab="排版建议" key="layout">
        <div class="tab-content">
          <div class="action-group">
            <div class="group-label">智能排版</div>
            <p class="hint-text">分析当前文档内容，提供排版优化建议。</p>
            <a-button
              size="small"
              type="primary"
              :disabled="aiState.operation.loading"
              @click="handleLayoutSuggestion"
            >
              <MdiIcon name="auto-fix" />
              获取排版建议
            </a-button>
          </div>
        </div>
      </a-tab-pane>

      <!-- 全文分析 -->
      <a-tab-pane tab="全文分析" key="analysis">
        <div class="tab-content">
          <div class="action-group">
            <div class="group-label">文档分析</div>
            <p class="hint-text">对全文进行综合分析，包括内容质量、结构建议等。</p>
            <a-button
              size="small"
              type="primary"
              :disabled="aiState.operation.loading"
              @click="handleDocAnalysis"
            >
              <MdiIcon name="file-search-outline" />
              开始分析
            </a-button>
          </div>

          <a-divider />

          <div class="action-group">
            <div class="group-label">全文总结</div>
            <a-button
              size="small"
              :disabled="aiState.operation.loading"
              @click="handleDocSummarize"
            >
              <MdiIcon name="text-box-check-outline" />
              生成摘要
            </a-button>
          </div>
        </div>
      </a-tab-pane>

      <!-- 多媒体辅助 -->
      <a-tab-pane tab="多媒体" key="media">
        <div class="tab-content">
          <div class="action-group">
            <div class="group-label">图片描述生成</div>
            <p class="hint-text">为文档中选中的图片生成 alt 描述文字。</p>
            <a-button
              size="small"
              type="primary"
              :disabled="aiState.operation.loading"
              @click="handleImageAlt"
            >
              <MdiIcon name="image-text" />
              生成图片描述
            </a-button>
          </div>
        </div>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { CloseOutlined, ThunderboltOutlined } from '@ant-design/icons-vue'
import MdiIcon from '@/components/common/MdiIcon.vue'
import { AIAction, TranslateLanguage } from '@vervedoc/docx-editor-ai'
import { aiStateStore } from '@/stores/ai-state'
import { editorStateStore } from '@/stores/editor-state'
import type { AITab } from '@/stores/ai-state'

const emit = defineEmits<{
  (e: 'command', command: string, ...args: any[]): void
  (e: 'close'): void
  (e: 'ai-action', action: string, payload?: any): void
}>()

const aiState = aiStateStore.state
const editorState = editorStateStore.state

const activeTab = ref<AITab>('writing')
const customPrompt = ref('')
const targetLanguage = ref<TranslateLanguage>(TranslateLanguage.ENGLISH)

const hasSelection = computed(() => editorState.hasSelection)

const quickActions = [
  { label: '润色', value: AIAction.POLISH, icon: 'mdi-auto-fix' },
  { label: '扩展', value: AIAction.EXPAND, icon: 'mdi-arrow-expand-all' },
  { label: '总结', value: AIAction.SUMMARIZE, icon: 'mdi-text-box-check-outline' },
  { label: '修正语法', value: AIAction.FIX_GRAMMAR, icon: 'mdi-spellcheck' },
  { label: '正式化', value: AIAction.FORMAL, icon: 'mdi-format-letter-case' },
  { label: '轻松化', value: AIAction.CASUAL, icon: 'mdi-emoticon-outline' }
]

const languages = [
  { label: '英文', value: TranslateLanguage.ENGLISH },
  { label: '中文', value: TranslateLanguage.CHINESE },
  { label: '日文', value: TranslateLanguage.JAPANESE },
  { label: '韩文', value: TranslateLanguage.KOREAN },
  { label: '法文', value: TranslateLanguage.FRENCH },
  { label: '德文', value: TranslateLanguage.GERMAN },
  { label: '西班牙文', value: TranslateLanguage.SPANISH },
  { label: '俄文', value: TranslateLanguage.RUSSIAN }
]

const handleTabChange = (tab: string | number) => {
  aiStateStore.setActiveTab(String(tab) as AITab)
}

const handleQuickAction = (action: AIAction) => {
  emit('ai-action', 'quickAction', { action })
}

const handleTranslate = () => {
  emit('ai-action', 'translate', { targetLanguage: targetLanguage.value })
}

const handleCustomAction = () => {
  emit('ai-action', 'custom', { prompt: customPrompt.value.trim() })
}

const handleContinueWriting = () => {
  emit('ai-action', 'continue')
}

const handleLayoutSuggestion = () => {
  emit('ai-action', 'layoutSuggestion')
}

const handleDocAnalysis = () => {
  emit('ai-action', 'docAnalysis')
}

const handleDocSummarize = () => {
  emit('ai-action', 'docSummarize')
}

const handleImageAlt = () => {
  emit('ai-action', 'imageAlt')
}

const close = () => {
  emit('close')
}
</script>

<style scoped>
.ai-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background-color: #f2f4f7;
  border-right: 1px solid gainsboro;
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

.ai-tabs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ai-tabs :deep(.ant-tabs-nav) {
  margin: 0;
  padding: 0 10px;
}

.ai-tabs :deep(.ant-tabs-content) {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.ai-tabs :deep(.ant-tabs-tabpane) {
  height: 100%;
}

.tab-content {
  padding: 12px 10px;
}

.action-group {
  margin-bottom: 4px;
}

.group-label {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.hint-text {
  font-size: 12px;
  color: #909399;
  margin: 0 0 8px 0;
  line-height: 1.5;
}

.action-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.action-grid :deep(.ant-btn) {
  margin: 0;
}

.translate-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

:deep(.ant-divider) {
  margin: 10px 0;
}
</style>
