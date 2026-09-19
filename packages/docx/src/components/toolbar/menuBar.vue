<template>
  <div
    class="office-ribbon"
    :class="{
      'is-readonly': isLocked,
      'non-home-tab': activeTab !== 'home'
    }"
  >
    <VdRibbonTab v-model:active-key="activeTab" :button-defaults="{ variant: 'flat' }">
      <VdRibbonTabItem item-key="file" mode="dropdown" title="文件">
        <FileTab :is-importing="isImporting" @command="handleCommand" />
      </VdRibbonTabItem>

      <VdRibbonTabItem
        item-key="home"
        title="开始"
        :button-defaults="{ size: 'compact', iconSize: 16, iconWeight: 350, iconOpticalSize: 20 }"
      >
        <HomeTab
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
          :is-painter="editorState.painter"
          :can-undo="editorState.undo"
          :can-redo="editorState.redo"
          :in-table="editorState.inTable"
          :list-type="editorState.listType"
          :show-line-break="showLineBreak"
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
      </VdRibbonTabItem>

      <VdRibbonTabItem item-key="insert" title="插入">
        <InsertTab :has-selection="hasSelection" @command="handleCommand" />
      </VdRibbonTabItem>

      <VdRibbonTabItem item-key="layout" title="页面">
        <LayoutTab
          :selected-bg-color="selectedBgColor"
          :current-paper-size-name="currentPaperSizeName"
          @command="handleCommand"
        />
      </VdRibbonTabItem>

      <VdRibbonTabItem item-key="reference" title="引用">
        <ReferenceTab @command="handleCommand" />
      </VdRibbonTabItem>

      <VdRibbonTabItem item-key="review" title="审阅">
        <ReviewTab
          :has-selection="hasSelection"
          :has-active-comment-group="hasActiveCommentGroup"
          :is-track-changes="isTrackChanges"
          :revision-count="revisionCount"
          :revision-display-mode="revisionDisplayMode"
          :document-stats="documentStats"
          @command="handleCommand"
        />
      </VdRibbonTabItem>

      <VdRibbonTabItem item-key="view" title="视图">
        <ViewTab
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
      </VdRibbonTabItem>

      <VdRibbonTabItem
        v-if="showCollaborationMenu"
        item-key="collaboration"
        title="协同"
      >
        <CollaborationTab
          :cursor-collaboration-enabled="cursorCollaborationEnabled"
          :selection-collaboration-enabled="selectionCollaborationEnabled"
          @command="handleCommand"
        />
      </VdRibbonTabItem>

      <VdRibbonTabItem item-key="help" title="帮助">
        <HelpTab @command="handleCommand" />
      </VdRibbonTabItem>
    </VdRibbonTab>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { VdRibbonTab, VdRibbonTabItem } from '@vervedoc/ui'
import { editorStateStore } from '@/stores/editor-state'
import { TITLE_LEVEL_MAP, ptToPx } from '@vervedoc/core'
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

/** 挂载时检测护眼模式是否已启用 */
onMounted(() => {
  isEyeCareEnabled.value = document.body.classList.contains('eye-care-mode')
})

/**
 * 统一命令处理入口，分发工具栏、修订、模式、纸张、护眼等命令
 * @param cmd - 命令名称
 * @param args - 命令参数
 */
const handleCommand = (cmd: string, ...args: any[]) => {
  switch (cmd) {
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
.office-ribbon.is-readonly {
  pointer-events: none;
  opacity: 0.6;
}

/* Keep all document ribbon tabs on the same icon, caption and arrow baselines. */
.office-ribbon.non-home-tab :deep(.ribbon-tab-panel) {
  display: flex;
  align-items: stretch;
  box-sizing: border-box;
  min-height: 70px;
  padding: 4px 0;
  font: 12px Arial, 'Microsoft YaHei', sans-serif;
}
.office-ribbon.non-home-tab :deep(.vd-ribbon-group) {
  padding: 0 8px;
}
.office-ribbon.non-home-tab :deep(.vd-ribbon-group:not(:last-child)::after) {
  top: 3px;
  bottom: 3px;
  height: auto;
  transform: none;
  border-color: #c2c2c2;
}
.office-ribbon.non-home-tab :deep(.vd-ribbon-group__content) {
  flex-wrap: nowrap;
  gap: 2px;
}
</style>
