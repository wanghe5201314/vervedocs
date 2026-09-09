<template>
  <div class="office-ribbon" :class="{ 'is-readonly': isLocked, 'simple-mode': simpleMode }">
    <!-- Tab 标签页 -->
    <div class="ribbon-tabs-bar">
      <a-dropdown :trigger="['click']" placement="bottomLeft" @openChange="handleFileDropdownChange">
        <div
          class="ribbon-tab is-file-tab"
          :class="{ active: fileDropdownOpen }"
        >
          <span class="ribbon-tab-label">文件</span>
        </div>
        <template #overlay>
          <FileTab :is-importing="isImporting" @command="handleCommand" />
        </template>
      </a-dropdown>
      <div
        v-for="tab in visibleTabs.filter(t => t.key !== 'file')"
        :key="tab.key"
        class="ribbon-tab"
        :class="{
          active: activeTab === tab.key
        }"
        @click="activeTab = tab.key"
      >
        <span class="ribbon-tab-label">{{ tab.label }}</span>
      </div>
      <!-- 工具栏切换 -->
      <a-dropdown :trigger="['click']" class="ribbon-mode-switch">
        <div class="ribbon-mode-btn" :title="simpleMode ? '简约模式' : '专业模式'">
          <VdIcon name="chevron-down" />
        </div>
        <template #overlay>
          <a-menu @click="({ key }: any) => handleSwitchToolbar(key)">
            <a-menu-item key="professional" :class="{ 'is-active': !simpleMode }">
              <span class="mi"><VdIcon name="view-headline" /><span>专业工具栏</span></span>
            </a-menu-item>
            <a-menu-item key="simple" :class="{ 'is-active': simpleMode }">
              <span class="mi"><VdIcon name="view-column-outline" /><span>简约工具栏</span></span>
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </div>

    <!-- Ribbon 面板 -->
    <div class="ribbon-panel" :class="{ 'non-home-tab': activeTab !== 'home' }">
      <HomeTab
        v-if="activeTab === 'home'"
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
        :toc-visible="tocVisible"
        :show-toolbar="toolbarVisible"
        :show-bottom-nav="bottomNavVisible"

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
import { VdIcon } from '@vervedoc/ui'
import { editorStateStore } from '@/stores/editor-state'
import { TITLE_LEVEL_MAP, ptToPx } from '@vervedoc/core'
import { RIBBON_TABS } from '@/config/constants'
import FileTab from '@/components/ribbon/fileTab.vue'
import HomeTab from '@/components/ribbon/homeTab.vue'
import InsertTab from '@/components/ribbon/insertTab.vue'
import LayoutTab from '@/components/ribbon/layoutTab.vue'
import ReferenceTab from '@/components/ribbon/referenceTab.vue'
import ReviewTab from '@/components/ribbon/reviewTab.vue'
import ViewTab from '@/components/ribbon/viewTab.vue'
import CollaborationTab from '@/components/ribbon/collaborationTab.vue'

import HelpTab from '@/components/ribbon/helpTab.vue'

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
  tocVisible?: boolean

  toolbarVisible?: boolean
  bottomNavVisible?: boolean
  showCollaborationMenu?: boolean
  cursorCollaborationEnabled?: boolean
  selectionCollaborationEnabled?: boolean
}>()

/** 当前激活的 Ribbon 标签页 */
const activeTab = ref<string>('home')
/** 文件下拉菜单是否展开 */
const fileDropdownOpen = ref(false)
/** 是否为简约工具栏模式 */
const simpleMode = ref(false)

/** 当前字体 */
const currentFont = ref('SimSun, serif')
/** 当前字号（磅） */
const currentSize = ref(10.5)
/** 当前标题级别 */
const currentTitle = ref<string | null>(null)
/** 字体颜色 */
const fontColor = ref('#000000')
/** 高亮颜色 */
const highlightColor = ref('#ffff00')
/** 缩放百分比 */
const zoomPercent = ref(100)
/** 选中的页面背景色 */
const selectedBgColor = ref('#FFFFFF')
/** 当前纸张大小名称 */
const currentPaperSizeName = ref('A4')
/** 是否正在导入 */
const isImporting = ref(false)

/** 是否显示换行符 */
const showLineBreak = ref(false)
/** 是否启用修订跟踪 */
const isTrackChanges = ref(false)
/** 当前编辑器模式 */
const currentEditorMode = ref('edit')
/** 修订显示模式 */
const revisionDisplayMode = ref<'all' | 'comments' | 'revisions' | 'none'>('all')
/** 是否启用护眼模式 */
const isEyeCareEnabled = ref(false)

/** 编辑器状态对象 */
const editorState = editorStateStore.state
/** 是否加粗 */
const isBold = computed(() => editorState.bold)
/** 是否斜体 */
const isItalic = computed(() => editorState.italic)
/** 是否下划线 */
const isUnderline = computed(() => editorState.underline)
/** 是否删除线 */
const isStrikeout = computed(() => editorState.strikeout)
/** 当前字符缩放百分比 */
const currentCharacterScale = computed(() => {
  const value = Number(editorState.characterScale ?? 100)
  return Number.isFinite(value) ? Math.round(value) : 100
})
/** 当前行对齐方式 */
const rowFlex = computed(() => editorState.rowFlex || undefined)
/** 是否有选中文本 */
const hasSelection = computed(() => editorState.hasSelection)
/** 是否有激活的批注组 */
const hasActiveCommentGroup = computed(() => Array.isArray(editorState.groupIds) && editorState.groupIds.length > 0)
/** 修订数量 */
const revisionCount = computed(() => Number(props.revisionCount || 0))

/** 监听字体变化并同步 */
watch(() => editorState.font, v => { if (v) currentFont.value = v })
/** 监听字号变化（getRangeStyle 已返回磅值，直接使用） */
watch(() => editorState.size, v => { if (v) currentSize.value = v })
/** 监听字体颜色变化 */
watch(() => editorState.color, v => { if (v) fontColor.value = v })
/** 监听高亮颜色变化 */
watch(() => editorState.highlight, v => { if (v) highlightColor.value = v })
/** 监听标题级别变化 */
watch(() => editorState.level, v => { currentTitle.value = v })

/** 当前标题级别的中文标签 */
const currentTitleLabel = computed(() => currentTitle.value ? TITLE_LEVEL_MAP[currentTitle.value] || '正文' : '正文')

/** 可见的 Ribbon 标签页列表，协同标签页根据配置显示 */
const visibleTabs = computed(() =>
  RIBBON_TABS.filter(tab => tab.key !== 'collaboration' || props.showCollaborationMenu)
)

/** 挂载时检测护眼模式是否已启用 */
onMounted(() => {
  isEyeCareEnabled.value = document.body.classList.contains('eye-care-mode')
})

/**
 * 处理文件下拉菜单展开/收起
 * @param open - 是否展开
 */
const handleFileDropdownChange = (open: boolean) => {
  fileDropdownOpen.value = open
}

/**
 * 处理工具栏模式切换
 * @param mode - 'simple' 或 'professional'
 */
const handleSwitchToolbar = (mode: string) => {
  simpleMode.value = mode === 'simple'
}

/**
 * 统一命令处理入口，分发工具栏、修订、模式、纸张、护眼等命令
 * @param cmd - 命令名称
 * @param args - 命令参数
 */
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
    case 'toggleToc':
      emit('command', 'toggleToc', !props.tocVisible)
      return
    case 'toggleBottomNav':
      emit('command', 'bottomNavVisible', !props.bottomNavVisible)
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

/**
 * 处理字体变更
 * @param font - 字体名称
 */
const handleFontChange = (font: string) => emit('command', 'font', font)
/**
 * 处理字号变更，将磅转换为像素
 * @param size - 字号（磅）
 */
const handleSizeChange = (size: number) => emit('command', 'size', ptToPx(size))
/**
 * 处理字符缩放变更
 * @param value - 缩放百分比
 */
const handleCharacterScale = (value: number) => {
  editorStateStore.updateStyle({ characterScale: value })
  emit('command', 'characterScale', value)
}
/** 处理自定义字符缩放：弹出输入框并校验范围 */
const handleCustomCharacterScale = () => {
  const input = window.prompt('请输入字符缩放百分比（33-200）', `${currentCharacterScale.value}`)
  if (input === null) return
  const value = Math.round(Number(input))
  if (!Number.isFinite(value) || value < 33 || value > 200) return
  handleCharacterScale(value)
}
/**
 * 处理字体颜色变更
 * @param c - 颜色值
 */
const handleFontColor = (c: string) => { fontColor.value = c; emit('command', 'color', c) }
/**
 * 处理高亮颜色变更
 * @param c - 颜色值
 */
const handleHighlight = (c: string) => { highlightColor.value = c; emit('command', 'highlight', c) }
/**
 * 处理缩放变更
 * @param v - 缩放百分比
 */
const handleZoom = (v: number) => { zoomPercent.value = v; emit('command', 'pageScale', v / 100) }
/**
 * 处理标题级别变更
 * @param v - 标题级别，null 表示正文
 */
const handleTitle = (v: string | null) => { currentTitle.value = v; emit('command', 'title', v) }
/**
 * 处理行距变更
 * @param v - 行距值
 */
const handleLineHeight = (v: number) => emit('command', 'lineHeight', v)
/**
 * 处理项目符号变更
 * @param s - 符号样式，null 表示取消
 */
const handleBullet = (s: string | null) => emit('command', 'list', s ? 'ul' : null, s)
/**
 * 处理编号样式变更
 * @param s - 编号样式，null 表示取消
 */
const handleNumber = (s: string | null) => emit('command', 'list', s ? 'ol' : null, s)
/**
 * 处理行对齐方式变更
 * @param v - 对齐方式
 */
const handleRowFlex = (v: string) => emit('command', 'rowFlex', v)
</script>

<style scoped>
.office-ribbon {
  background: var(--vd-ribbon-surface, #fff);
  border-bottom: 1px solid var(--vd-ribbon-border, #d8dce6);
}
.office-ribbon.is-readonly {
  pointer-events: none;
  opacity: 0.6;
}

/* Tab 标签页 */
.ribbon-tabs-bar {
  display: flex;
  align-items: center;
  background: var(--vd-ribbon-topbar-bg, var(--tabs-bg-color, linear-gradient(180deg, #2a63c8 0%, #1f57b8 100%)));
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
  color: var(--vd-ribbon-topbar-text, rgba(255, 255, 255, 0.94));
  border-radius: 4px 4px 0 0;
  position: relative;
  user-select: none;
  transition: background-color 0.15s, color 0.15s, opacity 0.15s;
}
.ribbon-tab:hover {
  background: var(--vd-ribbon-topbar-hover, rgba(255, 255, 255, 0.12));
  color: var(--vd-ribbon-topbar-text, #fff);
}
.ribbon-tab.active {
  background: var(--vd-ribbon-surface, #fff);
  color: var(--vd-ribbon-active-text, #1f57b8);

}
.ribbon-tab.active::after {
  display: none;
}
.ribbon-tab.is-file-tab {
  min-width: 48px;
  margin-right: 4px;
  background: var(--vd-ribbon-file-tab-bg, rgba(0, 0, 0, 0.16));
  border-radius: 3px 3px 0 0;
}
.ribbon-tab.is-file-tab:hover {
  background: var(--vd-ribbon-file-tab-hover, rgba(0, 0, 0, 0.22));
}
.ribbon-tab.is-file-tab.active {
  background: var(--vd-ribbon-surface, #fff);
  color: var(--vd-ribbon-active-text, #1f57b8);
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
  color: var(--vd-ribbon-topbar-text, rgba(255, 255, 255, 0.92));
}
.ribbon-mode-btn:hover {
  background: var(--vd-ribbon-topbar-hover, rgba(255, 255, 255, 0.14));
}

/* Ribbon 面板 */
.ribbon-panel {
  background: #f1f1f1;
  min-height: 66px;
  overflow-x: auto;
  overflow-y: hidden;
  box-shadow: inset 0 -1px 0 var(--vd-ribbon-shadow, #e6eaf2);
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

/* 非 home 选项卡：与 home 选项卡高度一致，图标 28px */
.ribbon-panel.non-home-tab :deep(.ribbon-tab-panel) {
  min-height: 70px;
}
.ribbon-panel.non-home-tab :deep(.ribbon-tab-panel .ribbon-group) {
  min-height: 70px;
}
.ribbon-panel.non-home-tab :deep(.ribbon-btn-lg .ribbon-btn-icon svg),
.ribbon-panel.non-home-tab :deep(.ribbon-btn-lg .ribbon-btn-icon i) {
  font-size: 28px;
}
.ribbon-panel.non-home-tab :deep(.ribbon-btn-lg .ribbon-btn-text) {
  font-weight: 400;
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
  color: var(--vd-ribbon-active-text, #1f57b8);
}
</style>
