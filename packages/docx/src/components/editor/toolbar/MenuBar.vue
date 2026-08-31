<template>
  <div class="office-ribbon" :class="{ 'is-readonly': isLocked, 'simple-mode': simpleMode }">
    <!-- Tab 标签页 -->
    <div class="ribbon-tabs-bar">
      <div
        v-for="tab in visibleTabs"
        :key="tab.key"
        class="ribbon-tab"
        :class="{
          active: activeTab === tab.key,
          'is-file-tab': tab.key === 'file'
        }"
        @click="activeTab = tab.key"
      >
        <span class="ribbon-tab-label">{{ tab.label }}</span>
      </div>
      <!-- 工具栏切换 -->
      <a-dropdown :trigger="['click']" class="ribbon-mode-switch">
        <div class="ribbon-mode-btn" :title="simpleMode ? '简约模式' : '专业模式'">
          <VIcon name="chevron-down" />
        </div>
        <template #overlay>
          <a-menu @click="({ key }: any) => handleSwitchToolbar(key)">
            <a-menu-item key="professional" :class="{ 'is-active': !simpleMode }">
              <span class="mi"><VIcon name="view-headline" /><span>专业工具栏</span></span>
            </a-menu-item>
            <a-menu-item key="simple" :class="{ 'is-active': simpleMode }">
              <span class="mi"><VIcon name="view-column-outline" /><span>简约工具栏</span></span>
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </div>

    <!-- Ribbon 面板 -->
    <div class="ribbon-panel" :class="{ 'non-home-tab': activeTab !== 'home' }" @ribbon-command="handleDomRibbonCommand">
      <FileTab v-if="activeTab === 'file'" :is-importing="isImporting" @command="handleCommand" />
      <HomeTab
        v-else-if="activeTab === 'home'"
        :current-font="currentFont"
        :current-size="currentSize"
        :is-bold="isBold"
        :is-italic="isItalic"
        :is-underline="isUnderline"
        :is-strikeout="isStrikeout"
        :font-color="fontColor"
        :highlight-color="highlightColor"
        :row-flex="rowFlex"
        :current-title-label="currentTitleLabel"
        :has-selection="hasSelection"
        :current-character-scale="currentCharacterScale"
        @command="handleCommand"
        @font="handleFontChange"
        @size="handleSizeChange"
        @font-color="handleFontColor"
        @highlight="handleHighlight"
        @row-flex="handleRowFlex"
        @line-height="handleLineHeight"
        @bullet="handleBullet"
        @number="handleNumber"
        @title="handleTitle"
        @character-scale="handleCharacterScale"
      />
      <InsertTab v-else-if="activeTab === 'insert'" :has-selection="hasSelection" @command="handleCommand" />
      <LayoutTab
        v-else-if="activeTab === 'layout'"
        :selected-bg-color="selectedBgColor"
        :current-paper-size-name="currentPaperSizeName"
        @command="handleCommand"
      />
      <ReferenceTab v-else-if="activeTab === 'reference'" @command="handleCommand" />
      <ReviewTab
        v-else-if="activeTab === 'review'"
        :has-selection="hasSelection"
        :has-active-comment-group="hasActiveCommentGroup"
        :is-track-changes="isTrackChanges"
        :revision-count="revisionCount"
        :revision-display-mode="revisionDisplayMode"
        :document-stats="documentStats"
        @command="handleCommand"
      />
      <ViewTab
        v-else-if="activeTab === 'view'"
        :zoom-percent="zoomPercent"
        :current-editor-mode="currentEditorMode"
        :is-mode-locked="isLocked"
        :catalog-visible="catalogVisible"
        :show-toolbar="toolbarVisible"
        :show-bottom-nav="bottomNavVisible"
        :show-ruler="rulerVisible"
        :show-line-break="showLineBreak"
        :eye-care-enabled="isEyeCareEnabled"
        @command="handleCommand"
      />
      <CollaborationTab
        v-else-if="activeTab === 'collaboration'"
        :cursor-collaboration-enabled="cursorCollaborationEnabled"
        :selection-collaboration-enabled="selectionCollaborationEnabled"
        @command="handleCommand"
      />

      <HelpTab v-else-if="activeTab === 'help'" @command="handleCommand" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { VIcon } from '@vervedoc/icons'
import { editorStateStore } from '@/stores/editor-state'
import { titleLevelMap } from './index'
import { ptToPx, pxToPt } from '@/config/ui-constants'
import { ribbonTabs } from './ribbon-tabs'
import FileTab from '../ribbon/tabs/fileTab.vue'
import HomeTab from '../ribbon/tabs/homeTab.vue'
import InsertTab from '../ribbon/tabs/insertTab.vue'
import LayoutTab from '../ribbon/tabs/layoutTab.vue'
import ReferenceTab from '../ribbon/tabs/referenceTab.vue'
import ReviewTab from '../ribbon/tabs/reviewTab.vue'
import ViewTab from '../ribbon/tabs/viewTab.vue'
import CollaborationTab from '../ribbon/tabs/collaborationTab.vue'

import HelpTab from '../ribbon/tabs/helpTab.vue'

const emit = defineEmits(['command'])

const props = defineProps<{
  isLocked?: boolean
  documentName?: string
  documentStats?: {
    totalPages: number
    wordCount: number
    paragraphCount: number
    charCount: number
    charCountWithSpaces: number
  }
  revisionCount?: number
  catalogVisible?: boolean
  rulerVisible?: boolean
  toolbarVisible?: boolean
  bottomNavVisible?: boolean
  showCollaborationMenu?: boolean
  cursorCollaborationEnabled?: boolean
  selectionCollaborationEnabled?: boolean
}>()

const activeTab = ref<string>('home')
const simpleMode = ref(false)

const currentFont = ref('SimSun, serif')
const currentSize = ref(10.5)
const currentTitle = ref<string | null>(null)
const fontColor = ref('#000000')
const highlightColor = ref('#ffff00')
const zoomPercent = ref(100)
const selectedBgColor = ref('#FFFFFF')
const currentPaperSizeName = ref('A4')
const isImporting = ref(false)

const showLineBreak = ref(false)
const isTrackChanges = ref(false)
const currentEditorMode = ref('edit')
const revisionDisplayMode = ref<'all' | 'comments' | 'revisions' | 'none'>('all')
const isEyeCareEnabled = ref(false)

const editorState = editorStateStore.state
const isBold = computed(() => editorState.bold)
const isItalic = computed(() => editorState.italic)
const isUnderline = computed(() => editorState.underline)
const isStrikeout = computed(() => editorState.strikeout)
const currentCharacterScale = computed(() => {
  const value = Number(editorState.characterScale ?? 100)
  return Number.isFinite(value) ? Math.round(value) : 100
})
const rowFlex = computed(() => editorState.rowFlex || undefined)
const hasSelection = computed(() => editorState.hasSelection)
const hasActiveCommentGroup = computed(() => Array.isArray(editorState.groupIds) && editorState.groupIds.length > 0)
const revisionCount = computed(() => Number(props.revisionCount || 0))

watch(() => editorState.font, v => { if (v) currentFont.value = v })
watch(() => editorState.size, v => { if (v) currentSize.value = pxToPt(v) })
watch(() => editorState.color, v => { if (v) fontColor.value = v })
watch(() => editorState.highlight, v => { if (v) highlightColor.value = v })
watch(() => editorState.level, v => { currentTitle.value = v })

const currentTitleLabel = computed(() => currentTitle.value ? titleLevelMap[currentTitle.value] || '正文' : '正文')

const visibleTabs = computed(() =>
  ribbonTabs.filter(tab => tab.key !== 'collaboration' || props.showCollaborationMenu)
)

onMounted(() => {
  isEyeCareEnabled.value = document.body.classList.contains('eye-care-mode')
})

const handleSwitchToolbar = (mode: string) => {
  simpleMode.value = mode === 'simple'
}

const handleCommand = (cmd: string, ...args: any[]) => {
  switch (cmd) {
    case 'switchToolbar':
      simpleMode.value = args[0] === 'simple'
      return
    case 'toggleTrackChanges':
      isTrackChanges.value = args[0] !== undefined ? args[0] : !isTrackChanges.value
      if (isTrackChanges.value) currentEditorMode.value = 'revision'
      emit('command', 'toggleTrackChanges', isTrackChanges.value)
      return
    case 'mode':
      currentEditorMode.value = args[0]
      emit('command', 'mode', ...args)
      return
    case 'revisionDisplayMode':
      revisionDisplayMode.value = args[0]
      emit('command', 'revisionDisplayMode', ...args)
      return
    case 'paperDirection':
      emit('command', 'paperDirection', ...args)
      return
    case 'paperSize':
      currentPaperSizeName.value = ''
      emit('command', 'paperSize', ...args)
      return
    case 'setPaperBackground':
      selectedBgColor.value = args[0]
      emit('command', 'setPaperBackground', ...args)
      return
    case 'toggleLineBreak':
      showLineBreak.value = !showLineBreak.value
      emit('command', 'updateOptions', { lineBreak: { disabled: !showLineBreak.value } })
      return
    case 'toggleEyeCare':
      document.body.classList.toggle('eye-care-mode')
      isEyeCareEnabled.value = document.body.classList.contains('eye-care-mode')
      emit('command', 'eyeCareChange', isEyeCareEnabled.value)
      return
    case 'toggleCatalog':
      emit('command', 'toggleCatalog', !props.catalogVisible)
      return
    case 'toggleBottomNav':
      emit('command', 'bottomNavVisible', !props.bottomNavVisible)
      return
    case 'toggleRuler':
      emit('command', 'rulerVisible', !props.rulerVisible)
      return
    case 'toggleToolbar':
      emit('command', 'toolbarVisible', !props.toolbarVisible)
      return
    case 'commentDeleteCurrent':
      if (hasActiveCommentGroup.value) {
        emit('command', 'commentDeleteCurrent', editorState.groupIds?.[0])
      }
      return
    case 'fitPage':
      handleZoom(42)
      return
    case 'fitWidth':
      handleZoom(145)
      return
    case 'columns':
      emit('command', 'columns', args[0] === '1' ? 1 : args[0] === '2' ? 2 : 3)
      return
    case 'tocInsert':
      emit('command', 'tocInsert', args[0])
      return
    case 'tocRemove':
      emit('command', 'tocRemove')
      return
    case 'firstLineIndent':
      emit('command', 'firstLineIndent', args[0])
      return
    case 'characterScaleCustom':
      handleCustomCharacterScale()
      return
    default:
      if (args.length > 0) emit('command', cmd, ...args)
      else emit('command', cmd)
  }
}

const handleDomRibbonCommand = (event: Event) => {
  const detail = (event as Event & { detail?: { cmd?: string, args?: any[] } }).detail
  if (!detail?.cmd) return
  handleCommand(detail.cmd, ...(detail.args || []))
}

const handleFontChange = (font: string) => emit('command', 'font', font)
const handleSizeChange = (size: number) => emit('command', 'size', ptToPx(size))
const handleCharacterScale = (value: number) => {
  editorStateStore.updateStyle({ characterScale: value })
  emit('command', 'characterScale', value)
}
const handleCustomCharacterScale = () => {
  const input = window.prompt('请输入字符缩放百分比（33-200）', `${currentCharacterScale.value}`)
  if (input === null) return
  const value = Math.round(Number(input))
  if (!Number.isFinite(value) || value < 33 || value > 200) return
  handleCharacterScale(value)
}
const handleFontColor = (c: string) => { fontColor.value = c; emit('command', 'color', c) }
const handleHighlight = (c: string) => { highlightColor.value = c; emit('command', 'highlight', c) }
const handleZoom = (v: number) => { zoomPercent.value = v; emit('command', 'pageScale', v / 100) }
const handleTitle = (v: string | null) => { currentTitle.value = v; emit('command', 'title', v) }
const handleLineHeight = (v: number) => emit('command', 'lineHeight', v)
const handleBullet = (s: string | null) => emit('command', 'list', s ? 'ul' : null, s)
const handleNumber = (s: string | null) => emit('command', 'list', s ? 'ol' : null, s)
const handleRowFlex = (v: string) => emit('command', 'rowFlex', v)
</script>

<style scoped>
.office-ribbon {
  background: var(--app-ribbon-surface, #fff);
  border-bottom: 1px solid var(--app-ribbon-border, #d8dce6);
}
.office-ribbon.is-readonly {
  pointer-events: none;
  opacity: 0.6;
}

/* Tab 标签页 */
.ribbon-tabs-bar {
  display: flex;
  align-items: center;
  background: var(--app-ribbon-topbar-bg, var(--tabs-bg-color, linear-gradient(180deg, #2a63c8 0%, #1f57b8 100%)));
  border-bottom: none;
  padding: 0 8px;
}
.ribbon-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  min-width: 52px;
  padding: 0 12px;
  cursor: pointer;
  font-size: 13px;
  color: var(--app-ribbon-topbar-text, rgba(255, 255, 255, 0.94));
  border-radius: 4px 4px 0 0;
  position: relative;
  user-select: none;
  transition: background-color 0.15s, color 0.15s, opacity 0.15s;
}
.ribbon-tab:hover {
  background: var(--app-ribbon-topbar-hover, rgba(255, 255, 255, 0.12));
  color: var(--app-ribbon-topbar-text, #fff);
}
.ribbon-tab.active {
  background: var(--app-ribbon-surface, #fff);
  color: var(--app-ribbon-active-text, #1f57b8);

}
.ribbon-tab.active::after {
  display: none;
}
.ribbon-tab.is-file-tab {
  min-width: 48px;
  margin-right: 4px;
  background: var(--app-ribbon-file-tab-bg, rgba(0, 0, 0, 0.16));
  border-radius: 3px 3px 0 0;
}
.ribbon-tab.is-file-tab:hover {
  background: var(--app-ribbon-file-tab-hover, rgba(0, 0, 0, 0.22));
}
.ribbon-tab.is-file-tab.active {
  background: var(--app-ribbon-surface, #fff);
  color: var(--app-ribbon-active-text, #1f57b8);
}
.ribbon-tab-label {
  line-height: 1;
  white-space: nowrap;
}

/* 工具栏模式切换 */
.ribbon-mode-switch {
  margin-left: auto;
}
.ribbon-mode-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  margin-right: 0;
  cursor: pointer;
  border-radius: 4px 4px 0 0;
  color: var(--app-ribbon-topbar-text, rgba(255, 255, 255, 0.92));
}
.ribbon-mode-btn:hover {
  background: var(--app-ribbon-topbar-hover, rgba(255, 255, 255, 0.14));
}

/* Ribbon 面板 */
.ribbon-panel {
  background: #f1f1f1;
  padding: 3px 8px 2px;
  min-height: 80px;
  overflow-x: auto;
  overflow-y: hidden;
  box-shadow: inset 0 -1px 0 var(--app-ribbon-shadow, #e6eaf2);
}

/* 简约模式：缩小面板高度 */
.office-ribbon.simple-mode .ribbon-panel {
  min-height: 56px;
}
.office-ribbon.simple-mode :deep(.ribbon-btn-lg) {
  height: 38px;
  min-width: 36px;
}
.office-ribbon.simple-mode :deep(.ribbon-btn-lg .ribbon-btn-icon svg),
.office-ribbon.simple-mode :deep(.ribbon-btn-lg .ribbon-btn-icon i) {
  font-size: 18px;
}

/* 非 home 选项卡：更大图标 + 更高面板 */
.ribbon-panel.non-home-tab {
  min-height: 90px;
}
.ribbon-panel.non-home-tab :deep(.ribbon-tab-panel) {
  min-height: 80px;
}
.ribbon-panel.non-home-tab :deep(.ribbon-tab-panel .ribbon-group) {
  min-height: 80px;
}
.ribbon-panel.non-home-tab :deep(.ribbon-btn-lg) {
  height: 56px;
}
.ribbon-panel.non-home-tab :deep(.ribbon-btn-lg .ribbon-btn-icon svg),
.ribbon-panel.non-home-tab :deep(.ribbon-btn-lg .ribbon-btn-icon i) {
  font-size: 21px;
}
.ribbon-panel.non-home-tab :deep(.ribbon-btn-sm .ribbon-btn-icon svg),
.ribbon-panel.non-home-tab :deep(.ribbon-btn-sm .ribbon-btn-icon i) {
  font-size: 16px;
}
</style>

<style>
/* Tab 面板通用 */
.ribbon-tab-panel {
  display: flex;
  align-items: stretch;
  min-height: 70px;
}
.ribbon-tab-panel .ribbon-group {
  min-height: 70px;
}

/* 简约模式 */
.office-ribbon.simple-mode .ribbon-tab-panel {
  min-height: 52px;
}
.office-ribbon.simple-mode .ribbon-tab-panel .ribbon-group {
  min-height: 52px;
}

/* antd 菜单图标 */
.ribbon-tabs-bar .mi {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
.ribbon-tabs-bar .is-active {
  color: var(--app-ribbon-active-text, #1f57b8);
}
</style>
