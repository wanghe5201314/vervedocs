<template>
  <div class="ai-sidebar" editor-component="ai-sidebar">
    <div class="sidebar-header">
      <div class="sidebar-title-wrap">
        <RobotOutlined class="sidebar-title-icon" />
        <span class="sidebar-title">{{ t('sidebar.ai.title') }}</span>
      </div>
      <div class="sidebar-close" @click="close" :title="t('common.close')">
        <CloseOutlined />
      </div>
    </div>

    <div class="sidebar-content">
      <section class="overview-card">
        <div class="overview-main">
          <div class="overview-heading">{{ t('sidebar.ai.context') }}</div>
          <div class="overview-description">
            {{ hasSelection ? t('sidebar.ai.contextSelected') : t('sidebar.ai.contextNotSelected') }}
          </div>
        </div>
        <div class="overview-stats">
          <span class="status-pill" :class="{ active: hasSelection }">
            {{ hasSelection ? t('sidebar.ai.selectedText') : t('sidebar.ai.notSelectedText') }}
          </span>
          <span class="status-pill" :class="{ loading: aiState.operation.loading }">
            {{ aiState.operation.loading ? t('sidebar.ai.generating') : t('sidebar.ai.ready') }}
          </span>
          <span class="status-pill">{{ recentHistory.length }} {{ t('sidebar.ai.records') }}</span>
        </div>
      </section>

      <div class="tab-nav" role="tablist" :aria-label="t('sidebar.ai.featureGroup')">
        <button
          v-for="tab in tabOptions"
          :key="tab.key"
          class="tab-chip"
          type="button"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          <span class="tab-chip-label">{{ tab.label }}</span>
          <span class="tab-chip-desc">{{ tab.desc }}</span>
        </button>
      </div>

      <div class="tab-panel">
        <template v-if="activeTab === 'writing'">
          <section class="panel-card">
            <div class="section-title">{{ t('sidebar.ai.quickWrite') }}</div>
            <div class="section-desc">{{ t('sidebar.ai.quickWriteDesc') }}</div>
            <div class="action-tile-grid">
              <button
                v-for="action in quickActions"
                :key="action.value"
                class="action-tile"
                type="button"
                :disabled="!hasSelection || aiState.operation.loading"
                @click="handleQuickAction(action.value)"
              >
                <div class="action-tile-icon">
                  <VdIcon :name="action.icon" />
                </div>
                <div class="action-tile-body">
                  <span class="action-tile-title">{{ action.label }}</span>
                  <span class="action-tile-desc">{{ action.desc }}</span>
                </div>
              </button>
            </div>
          </section>

          <section class="panel-card">
            <div class="section-title">{{ t('sidebar.ai.translate') }}</div>
            <div class="section-desc">{{ t('sidebar.ai.translateDesc') }}</div>
            <div class="translate-row">
              <a-select
                v-model:value="targetLanguage"
                size="small"
                class="translate-select"
                :placeholder="t('sidebar.ai.translatePlaceholder')"
              >
                <a-select-option
                  v-for="lang in languages"
                  :key="lang.value"
                  :value="lang.value"
                >
                  {{ lang.label }}
                </a-select-option>
              </a-select>
              <VdButton
                size="small"
                type="primary"
                :disabled="!hasSelection || aiState.operation.loading"
                @click="handleTranslate"
              >
                {{ t('sidebar.ai.translate') }}
              </VdButton>
            </div>
          </section>

          <section class="panel-card">
            <div class="section-title">{{ t('sidebar.ai.customInstruction') }}</div>
            <div class="section-desc">{{ t('sidebar.ai.customInstructionDesc') }}</div>
            <a-textarea
              v-model:value="customPrompt"
              :rows="4"
              :maxlength="120"
              :placeholder="t('sidebar.ai.customInstructionPlaceholder')"
            />
            <div class="custom-footer">
              <span class="input-count">{{ customPrompt.trim().length }}/120</span>
              <VdButton
                size="small"
                type="primary"
                :disabled="!hasSelection || !customPrompt.trim() || aiState.operation.loading"
                @click="handleCustomAction"
              >
                {{ t('sidebar.ai.executeInstruction') }}
              </VdButton>
            </div>
          </section>

          <section class="panel-card">
            <div class="section-title">{{ t('sidebar.ai.aiContinue') }}</div>
            <div class="section-desc">{{ t('sidebar.ai.aiContinueDesc') }}</div>
            <button
              class="primary-action"
              type="button"
              :disabled="aiState.operation.loading"
              @click="handleContinueWriting"
            >
              <VdIcon name="pen-plus" />
              <span>{{ t('sidebar.ai.continueFromCursor') }}</span>
            </button>
          </section>
        </template>

        <template v-else-if="activeTab === 'layout'">
          <section class="panel-card feature-card">
            <div class="section-title">{{ t('sidebar.ai.layoutSuggest') }}</div>
            <div class="section-desc">
              {{ t('sidebar.ai.layoutSuggestDesc') }}
            </div>
            <button
              class="primary-action"
              type="button"
              :disabled="aiState.operation.loading"
              @click="handleLayoutSuggestion"
            >
              <VdIcon name="auto-fix" />
              <span>{{ t('sidebar.ai.getLayoutSuggest') }}</span>
            </button>
          </section>
        </template>

        <template v-else-if="activeTab === 'analysis'">
          <section class="panel-card feature-card">
            <div class="section-title">{{ t('sidebar.ai.docAnalysis') }}</div>
            <div class="section-desc">{{ t('sidebar.ai.docAnalysisDesc') }}</div>
            <button
              class="primary-action"
              type="button"
              :disabled="aiState.operation.loading"
              @click="handleDocAnalysis"
            >
              <VdIcon name="file-search-outline" />
              <span>{{ t('sidebar.ai.startAnalysis') }}</span>
            </button>
          </section>

          <section class="panel-card feature-card">
            <div class="section-title">{{ t('sidebar.ai.summary') }}</div>
            <div class="section-desc">{{ t('sidebar.ai.summaryDesc') }}</div>
            <button
              class="secondary-action"
              type="button"
              :disabled="aiState.operation.loading"
              @click="handleDocSummarize"
            >
              <VdIcon name="text-box-check-outline" />
              <span>{{ t('sidebar.ai.generateSummary') }}</span>
            </button>
          </section>
        </template>

        <template v-else>
          <section class="panel-card feature-card">
            <div class="section-title">{{ t('sidebar.ai.imageDesc') }}</div>
            <div class="section-desc">{{ t('sidebar.ai.imageDescDesc') }}</div>
            <div class="beta-row">
              <span class="beta-badge">Beta</span>
              <span class="beta-text">{{ t('sidebar.ai.imageDescReserved') }}</span>
            </div>
            <button
              class="secondary-action"
              type="button"
              :disabled="aiState.operation.loading"
              @click="handleImageAlt"
            >
              <VdIcon name="image-text" />
              <span>{{ t('sidebar.ai.generateImageDesc') }}</span>
            </button>
          </section>
        </template>

        <section class="history-card">
          <div class="history-header">
            <span class="section-title">{{ t('sidebar.ai.recentRecords') }}</span>
            <span class="history-count">{{ recentHistory.length }} {{ t('sidebar.ai.recordsCount') }}</span>
          </div>
          <div v-if="recentHistory.length" class="history-list">
            <div
              v-for="item in recentHistory"
              :key="item.timestamp"
              class="history-item"
            >
              <div class="history-meta">
                <span class="history-action">{{ getActionLabel(item.action) }}</span>
                <span class="history-time">{{ formatTime(item.timestamp) }}</span>
              </div>
              <div class="history-text">{{ truncateText(item.output) }}</div>
            </div>
          </div>
          <a-empty
            v-else
            :image="false"
            :description="t('sidebar.ai.noRecords')"
          />
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { CloseOutlined, RobotOutlined } from '@ant-design/icons-vue'
import { VdIcon, VdButton } from '@vervedoc/ui'
import { AIAction, TranslateLanguage } from '@vervedoc/docx-editor-ai'
import { aiStateStore } from '@/stores/ai-state'
import { editorStateStore } from '@/stores/editor-state'
import type { AITab } from '@/stores/ai-state'
import { t } from '@/i18n'

const emit = defineEmits<{
  (e: 'command', command: string, ...args: any[]): void
  (e: 'close'): void
  (e: 'ai-action', action: string, payload?: any): void
}>()

/** AI 状态对象 */
const aiState = aiStateStore.state
/** 编辑器状态对象 */
const editorState = editorStateStore.state

/** 当前激活的 AI 标签页，可读写 */
const activeTab = computed<AITab>({
  get: () => aiState.activeTab,
  set: tab => aiStateStore.setActiveTab(tab)
})
/** 自定义指令输入值 */
const customPrompt = ref('')
/** 翻译目标语言 */
const targetLanguage = ref<TranslateLanguage>(TranslateLanguage.ENGLISH)

/** 是否有选中文本 */
const hasSelection = computed(() => editorState.hasSelection)
/** 最近的 AI 处理记录（最多 4 条） */
const recentHistory = computed(() => aiState.history.slice(0, 4))

/** AI 标签页选项配置 */
const tabOptions: Array<{ key: AITab; label: string; desc: string }> = [
  { key: 'writing', label: t('sidebar.ai.tabWrite'), desc: t('sidebar.ai.tabWriteDesc') },
  { key: 'layout', label: t('sidebar.ai.tabLayout'), desc: t('sidebar.ai.tabLayoutDesc') },
  { key: 'analysis', label: t('sidebar.ai.tabAnalysis'), desc: t('sidebar.ai.tabAnalysisDesc') },
  { key: 'media', label: t('sidebar.ai.tabMultimedia'), desc: t('sidebar.ai.tabMultimediaDesc') }
]

/** 快捷写作动作配置 */
const quickActions = [
  { label: t('sidebar.ai.actionPolish'), value: AIAction.POLISH, icon: 'mdi-auto-fix', desc: t('sidebar.ai.actionPolishDesc') },
  { label: t('sidebar.ai.actionExpand'), value: AIAction.EXPAND, icon: 'mdi-arrow-expand-all', desc: t('sidebar.ai.actionExpandDesc') },
  { label: t('sidebar.ai.actionSummarize'), value: AIAction.SUMMARIZE, icon: 'mdi-text-box-check-outline', desc: t('sidebar.ai.actionSummarizeDesc') },
  { label: t('sidebar.ai.actionFixGrammar'), value: AIAction.FIX_GRAMMAR, icon: 'mdi-spellcheck', desc: t('sidebar.ai.actionFixGrammarDesc') },
  { label: t('sidebar.ai.actionFormalize'), value: AIAction.FORMAL, icon: 'mdi-format-letter-case', desc: t('sidebar.ai.actionFormalizeDesc') },
  { label: t('sidebar.ai.actionRelax'), value: AIAction.CASUAL, icon: 'mdi-emoticon-outline', desc: t('sidebar.ai.actionRelaxDesc') }
]

/** 翻译目标语言选项 */
const languages = [
  { label: t('sidebar.ai.langEn'), value: TranslateLanguage.ENGLISH },
  { label: t('sidebar.ai.langZh'), value: TranslateLanguage.CHINESE },
  { label: t('sidebar.ai.langJa'), value: TranslateLanguage.JAPANESE },
  { label: t('sidebar.ai.langKo'), value: TranslateLanguage.KOREAN },
  { label: t('sidebar.ai.langFr'), value: TranslateLanguage.FRENCH },
  { label: t('sidebar.ai.langDe'), value: TranslateLanguage.GERMAN },
  { label: t('sidebar.ai.langEs'), value: TranslateLanguage.SPANISH },
  { label: t('sidebar.ai.langRu'), value: TranslateLanguage.RUSSIAN }
]

/** AI 动作到中文标签的映射 */
const ACTION_LABELS: Partial<Record<AIAction, string>> = {
  [AIAction.POLISH]: t('sidebar.ai.actionPolish'),
  [AIAction.TRANSLATE]: t('sidebar.ai.translate'),
  [AIAction.SUMMARIZE]: t('sidebar.ai.actionSummarize'),
  [AIAction.CONTINUE]: t('sidebar.ai.actionContinue'),
  [AIAction.EXPAND]: t('sidebar.ai.actionExpand'),
  [AIAction.FIX_GRAMMAR]: t('sidebar.ai.actionFixGrammar'),
  [AIAction.FORMAL]: t('sidebar.ai.actionFormalize'),
  [AIAction.CASUAL]: t('sidebar.ai.actionRelax'),
  [AIAction.CUSTOM]: t('common.custom')
}

/**
 * 获取 AI 动作的中文标签
 * @param action - AI 动作
 * @returns 中文标签
 */
const getActionLabel = (action: AIAction) => ACTION_LABELS[action] || action

/**
 * 截断文本，压缩空白并限制最大长度
 * @param text - 原始文本
 * @returns 截断后的文本
 */
const truncateText = (text: string) => {
  const normalized = text.replace(/\s+/g, ' ').trim()
  return normalized.length > 56 ? `${normalized.slice(0, 56)}...` : normalized
}

/**
 * 格式化时间戳为 HH:mm 字符串
 * @param timestamp - 时间戳
 * @returns 格式化后的时间字符串
 */
const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })

/**
 * 处理快捷动作，触发 ai-action 事件
 * @param action - AI 动作
 */
const handleQuickAction = (action: AIAction) => {
  emit('ai-action', 'quickAction', { action })
}

/** 处理翻译动作 */
const handleTranslate = () => {
  emit('ai-action', 'translate', { targetLanguage: targetLanguage.value })
}

/** 处理自定义指令动作 */
const handleCustomAction = () => {
  emit('ai-action', 'custom', { prompt: customPrompt.value.trim() })
}

/** 处理续写动作 */
const handleContinueWriting = () => {
  emit('ai-action', 'continue')
}

/** 处理排版建议动作 */
const handleLayoutSuggestion = () => {
  emit('ai-action', 'layoutSuggestion')
}

/** 处理文档分析动作 */
const handleDocAnalysis = () => {
  emit('ai-action', 'docAnalysis')
}

/** 处理文档总结动作 */
const handleDocSummarize = () => {
  emit('ai-action', 'docSummarize')
}

/** 处理图片描述生成动作 */
const handleImageAlt = () => {
  emit('ai-action', 'imageAlt')
}

/** 关闭侧边栏 */
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
  background: #f1f1f1;
  border-right: 1px solid #f1f1f1;
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  height: 44px;
  border-bottom: 1px solid #d9d9d9;
  flex-shrink: 0;
}

.sidebar-title-wrap {
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
  overflow-y: auto;
  padding: 10px 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.overview-card,
.panel-card,
.history-card {
  background: #f7f7f7;
  border: 1px solid #e2e2e2;
  border-radius: 0;
  padding: 10px;
}

.overview-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.overview-heading,
.section-title {
  font-size: 12px;
  font-weight: 600;
  color: #111;
  line-height: 1.4;
}

.overview-description,
.section-desc,
.history-text,
.beta-text {
  font-size: 12px;
  color: #666;
  line-height: 1.6;
}

.overview-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.status-pill,
.beta-badge,
.history-count {
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

.status-pill.active {
  background: #dbeafe;
  color: #1d4ed8;
}

.status-pill.loading {
  background: #e8f3ff;
  color: #1677ff;
}

.tab-nav {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.tab-chip {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 8px 10px;
  border: 1px solid #dfdfdf;
  border-radius: 0;
  background: #f7f7f7;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.tab-chip:hover {
  border-color: #b8d4ff;
  background: #f3f8ff;
}

.tab-chip.active {
  border-color: #8ab6ff;
  background: linear-gradient(180deg, #f7fbff 0%, #edf5ff 100%);
  box-shadow: inset 0 0 0 1px rgba(58, 123, 213, 0.08);
}

.tab-chip-label {
  font-size: 12px;
  font-weight: 600;
  color: #111;
}

.tab-chip-desc {
  font-size: 11px;
  color: #7a7a7a;
}

.tab-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-tile-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 8px;
}

.action-tile {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  padding: 9px 10px;
  border: 1px solid #e1e1e1;
  border-radius: 0;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.action-tile:hover:not(:disabled) {
  border-color: #9ec5ff;
  background: #f8fbff;
  transform: translateY(-1px);
}

.action-tile:disabled {
  opacity: 0.48;
  cursor: not-allowed;
}

.action-tile-icon {
  width: 28px;
  height: 28px;
  border-radius: 0;
  background: #eef4ff;
  color: #2f6bff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.action-tile-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.action-tile-title {
  font-size: 12px;
  font-weight: 600;
  color: #111;
  line-height: 1.4;
}

.action-tile-desc {
  font-size: 11px;
  color: #7a7a7a;
  line-height: 1.5;
  margin-top: 2px;
}

.translate-row,
.custom-footer,
.history-header,
.beta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.translate-row {
  margin-top: 8px;
}

.translate-select {
  flex: 1;
  min-width: 0;
}

.input-count {
  font-size: 11px;
  color: #8a8a8a;
}

.primary-action,
.secondary-action {
  width: 100%;
  min-height: 36px;
  border-radius: 0;
  border: 1px solid transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 8px;
}

.primary-action {
  color: #fff;
  background: linear-gradient(135deg, #2f80ff 0%, #5f6fff 100%);
}

.primary-action:hover:not(:disabled) {
  filter: brightness(1.03);
}

.secondary-action {
  color: #234;
  background: #eef4ff;
  border-color: #d4e4ff;
}

.secondary-action:hover:not(:disabled) {
  background: #e6f0ff;
}

.primary-action:disabled,
.secondary-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.history-item {
  padding: 8px 9px;
  border-radius: 0;
  background: #fff;
  border: 1px solid #e7e7e7;
}

.history-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.history-action {
  font-size: 11px;
  font-weight: 600;
  color: #2f6bff;
}

.history-time {
  font-size: 11px;
  color: #8a8a8a;
}

.feature-card {
  background: linear-gradient(180deg, #f7f7f7 0%, #f4f6fb 100%);
}

:deep(.ant-select-single.ant-select-sm .ant-select-selector) {
  height: 32px;
  border-radius: 0;
}

:deep(.ant-select-single.ant-select-sm .ant-select-selector .ant-select-selection-item),
:deep(.ant-select-single.ant-select-sm .ant-select-selector .ant-select-selection-placeholder) {
  line-height: 30px;
  font-size: 12px;
}

:deep(.ant-input),
:deep(.ant-input-textarea textarea) {

  background: #fff;
}

:deep(.ant-empty) {
  margin: 8px 0 0;
}
</style>
