<template>
  <div class="gdocs-toolbar" :class="{ 'is-readonly': isLocked }">
    <MenuBar
      :is-importing="isImporting"

      :selected-bg-color="selectedBgColor"
      :zoom-percent="zoomPercent"
      :current-character-scale="currentCharacterScale"
      :current-paper-size-name="currentPaperSizeName"
      :document-stats="documentStats"
      :has-selection="hasSelection"
      :in-table="inTable"
      :in-canvas="inCanvas"
      :show-line-break="showLineBreak"
      :show-collaboration-menu="showCollaborationMenu"
      :cursor-collaboration-enabled="cursorCollaborationEnabled"
      :selection-collaboration-enabled="selectionCollaborationEnabled"

      :revision-display-mode="revisionDisplayMode"
      :current-editor-mode="currentEditorMode"
      :is-mode-locked="isLocked"
      @cmd="doMenuCmd"
      @import="handleImportClick"
      @preview="handlePreview"
      @download="handleDownload"
      @formula="handleInsertFormula"

      @separator="handleSeparator"
      @watermark="handleWatermarkPreset"
      @layout="doLayoutCmd"
      @view="doViewCmd"
      @format="doFormatCmd"
      @margin="handleMarginPreset"
      @paper-size="handlePaperSize"
      @bg-color="handleBgColor"

      @insert-table="handleInsertTable"
    />
    <!-- 紧凑双行工具栏 -->
    <CompactToolbar
      :zoom-percent="zoomPercent"
      :current-font="currentFont"
      :current-size="currentSize"
      :is-bold="isBold"
      :is-italic="isItalic"
      :is-underline="isUnderline"
      :is-strikeout="isStrikeout"
      :font-color="fontColor"
      :highlight-color="highlightColor"
      :rowFlex="rowFlex"
      :current-title-label="currentTitleLabel"
      :first-line-indent-chars="firstLineIndentChars"
      :document-stats="documentStats"
      :in-canvas="inCanvas"
      :simple-mode="simpleToolbarMode"
      :has-selection="hasSelection"

      @cmd="handleToolbarCmd"
      @zoom="handleZoom"
      @font="handleFontChange"
      @size="handleSizeChange"
      @character-scale="handleCharacterScale"
      @font-color="handleFontColor"
      @highlight="handleHighlight"
      @rowFlex="handleRowFlex"
      @line-height="handleLineHeight"
      @bullet="handleBullet"
      @number="handleNumber"

      @title="handleTitle"
      @insert-table="handleInsertTable"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

import { editorStateStore } from '@/stores/editor-state'

const INDENT_PX_PER_CHAR = 14

import { titleLevelMap } from './index'
import { ptToPx, pxToPt } from '@/config/ui-constants'
import MenuBar from './MenuBar.vue'
import CompactToolbar from './CompactToolbar.vue'

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
  showCollaborationMenu?: boolean
  cursorCollaborationEnabled?: boolean
  selectionCollaborationEnabled?: boolean
}>()

// 状态
const currentFont = ref('SimSun, serif')
const currentSize = ref(10.5)
const currentTitle = ref<string | null>(null)
const fontColor = ref('#000000')
const highlightColor = ref('#ffff00')
const zoomPercent = ref(100)
const selectedBgColor = ref('#FFFFFF')
const currentPaperSizeName = ref('A4')

const isImporting = ref(false)

// 工具栏模式 - 使用计算属性确保响应式
const simpleToolbarMode = ref(false)

// 视图状态
const showToolbar = ref(true)
const showLeftPanel = ref(true)
const showBottomNav = ref(true)
const showRuler = ref(false)
const eyeCareMode = ref(false)
const showLineBreak = ref(false)
const isTrackChanges = ref(false)
const currentEditorMode = ref('edit')
const revisionDisplayMode = ref<'all' | 'comments' | 'revisions'>('all')
let toolbarOverlayObserver: MutationObserver | null = null

// 从store获取状态
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
const inTable = computed(() => editorState.inTable)
// 使用编辑器焦点状态判断是否在canvas中
const inCanvas = computed(() => editorState.inCanvas)
const firstLineIndentChars = computed(() => {
  const px = Number(editorState.paragraphFirstLineIndent || 0)
  if (!Number.isFinite(px) || px <= 0) return 0
  return Math.round(px / INDENT_PX_PER_CHAR)
})

// 同步编辑器状态
watch(() => editorState.font, v => { if (v) currentFont.value = v })
watch(() => editorState.size, v => { if (v) currentSize.value = pxToPt(v) })
watch(() => editorState.color, v => { if (v) fontColor.value = v })
watch(() => editorState.highlight, v => { if (v) highlightColor.value = v })
watch(() => editorState.level, v => { currentTitle.value = v })


const currentTitleLabel = computed(() => currentTitle.value ? titleLevelMap[currentTitle.value] || '正文' : '正文')

const markToolbarOverlayNodes = () => {
  if (typeof document === 'undefined') return
  const overlaySelector = [
    '.gdocs-menu-popper',
    '.ant-menu-submenu-popup',
    '.ant-dropdown',
    '.ant-select-dropdown',
    '.ant-popover',
    '.ant-tooltip'
  ].join(', ')
  document.querySelectorAll<HTMLElement>(overlaySelector).forEach(node => {
    node.setAttribute('editor-component', 'toolbar-popup')
  })
}

const isEditableShortcutTarget = (target: EventTarget | null) => {
  const el = target as HTMLElement | null
  if (!el) return false
  const tagName = el.tagName?.toLowerCase()
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true
  }
  if ((el as HTMLElement).isContentEditable) {
    return true
  }
  return !!el.closest?.('[contenteditable="true"], input, textarea, select')
}

const handleGlobalShortcut = (evt: KeyboardEvent) => {
  if (props.isLocked || isImporting.value) return
  if (!(evt.ctrlKey || evt.metaKey) || evt.shiftKey || !evt.altKey) return
  if (isEditableShortcutTarget(evt.target)) return
  if (evt.key.toLowerCase() !== 'o') return
  evt.preventDefault()
  handleImportClick()
}

onMounted(() => {
  markToolbarOverlayNodes()
  document.addEventListener('keydown', handleGlobalShortcut)
  if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return
  toolbarOverlayObserver = new MutationObserver(() => {
    markToolbarOverlayNodes()
  })
  toolbarOverlayObserver.observe(document.body, {
    childList: true,
    subtree: true
  })
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleGlobalShortcut)
  toolbarOverlayObserver?.disconnect()
  toolbarOverlayObserver = null
})

// 通用命令
const doMenuCmd = (cmd: string, args?: any) => {
  if (cmd === 'switchToolbar') {
    simpleToolbarMode.value = args === 'simple'
    return
  }
  if (cmd === 'toggleTrackChanges') {
    isTrackChanges.value = args !== undefined ? args : !isTrackChanges.value
    if (isTrackChanges.value) currentEditorMode.value = 'revision'
    emit('command', 'toggleTrackChanges', isTrackChanges.value)
    return
  }
  if (cmd === 'mode') {
    currentEditorMode.value = args
    args !== undefined ? emit('command', cmd, args) : emit('command', cmd)
    return
  }
  if (cmd === 'revisionDisplayMode') {
    revisionDisplayMode.value = args
    emit('command', 'revisionDisplayMode', args)
    return
  }
  args !== undefined ? emit('command', cmd, args) : emit('command', cmd)
}

// 工具栏命令处理
const handleToolbarCmd = (cmd: string, ...args: any[]) => {
  if (cmd === 'switchToolbar') {
    simpleToolbarMode.value = args[0] === 'simple'
    return
  }
  if (cmd === 'toggleTrackChanges') {
    isTrackChanges.value = !isTrackChanges.value
    emit('command', 'toggleTrackChanges', isTrackChanges.value)
    return
  }
  emit('command', cmd, ...args)
}

// 导入文档
const handleImportClick = () => {
  emit('command', 'import')
}


// 预览
const handlePreview = () => {
  emit('command', 'preview')
}

// 下载
const handleDownload = (format: string) => {
  emit('command', 'export', format)
}

// 事件处理
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
const handleInsertTable = (r: number, c: number) => emit('command', 'insertTable', { rows: r, cols: c })
const handleRowFlex = (v: string) => emit('command', 'rowFlex', v)
const handleMarginPreset = (p: any) => emit('command', 'setPaperMargin', p.margins)
const handlePaperSize = (s: any) => { currentPaperSizeName.value = s.name; emit('command', 'paperSize', s.width, s.height) }
const handleBgColor = (c: string) => { selectedBgColor.value = c; emit('command', 'setPaperBackground', c) }
const handleWatermarkPreset = (p: any) => emit('command', 'addWatermark', p.options)
const handleSeparator = (d: { type: string; width: number; dashArray: number[] }) => emit('command', 'separator', d)
const handleInsertFormula = (l: string) => emit('command', 'insertLatex', l)

// 布局命令
const doLayoutCmd = (cmd: string) => {
  switch (cmd) {

    case 'paperVertical': emit('command', 'paperDirection', 'vertical'); break
    case 'paperHorizontal': emit('command', 'paperDirection', 'horizontal'); break
    default: emit('command', cmd)
  }
}

// 视图命令
const doViewCmd = (cmd: string) => {
  switch (cmd) {
    case 'zoom50': case 'zoom75': case 'zoom100': case 'zoom125': case 'zoom150': case 'zoom200': handleZoom(parseInt(cmd.replace('zoom', ''))); break
    case 'fitPage': handleZoom(42); break
    case 'fitWidth': handleZoom(145); break
    case 'toggleToolbar': showToolbar.value = !showToolbar.value; emit('command', 'toolbarVisible', showToolbar.value); break
    case 'toggleLeftPanel': showLeftPanel.value = !showLeftPanel.value; emit('command', 'toggleCatalog', showLeftPanel.value); break
    case 'toggleBottomNav': showBottomNav.value = !showBottomNav.value; emit('command', 'bottomNavVisible', showBottomNav.value); break
    case 'toggleRuler': showRuler.value = !showRuler.value; emit('command', 'rulerVisible', showRuler.value); break
    case 'toggleEyeCare': eyeCareMode.value = !eyeCareMode.value; eyeCareMode.value ? document.body.classList.add('eye-care-mode') : document.body.classList.remove('eye-care-mode'); break
    case 'toggleLineBreak': showLineBreak.value = !showLineBreak.value; emit('command', 'updateOptions', { lineBreak: { disabled: !showLineBreak.value } }); break
    case 'tocInsert1': emit('command', 'tocInsert', { mode: 'auto', maxLevel: 1 }); break
    case 'tocInsert2': emit('command', 'tocInsert', { mode: 'auto', maxLevel: 2 }); break
    case 'tocInsert3': emit('command', 'tocInsert', { mode: 'auto', maxLevel: 3 }); break
    case 'tocRemove': emit('command', 'tocRemove'); break
    default: emit('command', cmd)
  }
}

// 格式命令
const doFormatCmd = (cmd: string, value?: any) => {
  switch (cmd) {
    case 'alignLeft': emit('command', 'rowFlex', 'left'); break
    case 'alignCenter': emit('command', 'rowFlex', 'center'); break
    case 'alignRight': emit('command', 'rowFlex', 'right'); break
    case 'alignJustify': emit('command', 'rowFlex', 'alignment'); break
    case 'lineHeight': emit('command', 'lineHeight', value); break
    case 'bulletList': emit('command', 'list', 'ul', 'disc'); break
    case 'numberList': emit('command', 'list', 'ol', 'decimal'); break
    case 'checkList': emit('command', 'list', 'checkbox'); break
    case 'columns': emit('command', 'columns', value); break
    case 'bordersDialog': emit('command', 'tableBordersDialog'); break
    case 'firstLineIndent': emit('command', 'paragraphDialog'); break
    case 'characterScale': handleCharacterScale(value); break
    case 'characterScaleCustom': handleCustomCharacterScale(); break
    default: emit('command', cmd, value)
  }
}
</script>

<style scoped>
.gdocs-toolbar { background: #f5f5f5; border-bottom: 1px solid #e0e0e0; }
.gdocs-toolbar.is-readonly { pointer-events: none; opacity: 0.6; }
</style>
