<template>
  <div ref="editorAppRef" class="editor-app">
    <UnifiedTopHeader
      :title="headerTitle"
      :is-view-mode="isViewMode"
      :last-save-time="headerLastSaveTime"
      :online-users="collabOnlineUsers"
    />
    <Menu
      v-show="toolbarVisible"
      :app-name-with-version="appNameWithVersion"
      :document-meta="documentMeta"
      :document-stats="documentStats"
      :show-collaboration-menu="showCollaborationMenu"
      :cursor-collaboration-enabled="collabSharedSyncState.cursor"
      :selection-collaboration-enabled="collabSharedSyncState.selection"
      @command="handleCommand"
    />
    <div class="body">
      <LeftDockBar :active-key="activeDock" @select="handleDockSelect" />
      <div class="body-main">
        <div class="split-panel">
          <div
            v-if="activeDock"
            class="split-left"
            :style="{ width: sidebarPanelSize + 'px' }"
          >
            <SearchLayout v-if="activeDock === 'search'" @command="handleCommand" />
            <CatalogLayout
              v-else-if="activeDock === 'catalog' || activeDock === 'section'"
              ref="catalogRef"
              @command="handleCommand"
            />
            <AISidebarPanel
              v-else-if="activeDock === 'ai'"
              @close="closeAIDock"
              @command="handleCommand"
              @ai-action="handleAIAction"
            />
            <RevisionPanel
              v-else-if="activeDock === 'revision'"
              :revisions="revisionList"
              :active-revision-id="activeRevisionId"
              @close="closeRevisionDock"
              @command="handleCommand"
            />
          </div>
          <div
            v-if="activeDock"
            class="split-resize-handle"
            @mousedown="handleResizeStart"
          ></div>
          <div class="split-right">
            <div class="editor-area">
              <Editor ref="editorRef" @command="handleEditorCommand" @ready="handleReady" @saved="handleEditorSaved" />


            </div>
          </div>
        </div>
        <Transition name="sidebar-slide-right">
          <AIResultPanel
            v-if="aiState.drawerVisible"
            @apply="handleAIApplyResult"
            @regenerate="handleAIRegenerate"
            @close="handleAIResultClose"
          />
        </Transition>
      </div>
    </div>
    <Footer
      ref="footerRef"
      v-show="bottomNavVisible"
      :document-meta="documentMeta"
      @command="handleCommand"
    />

    <ShortcutsDialog v-model="shortcutsDialogVisible" />
    <ProtectDialog v-model="protectDialogVisible" :mode="protectDialogMode" @confirm="handleProtectConfirm" />

    <HyperlinkDialog v-model="hyperlinkDialogVisible" @confirm="handleHyperlinkConfirm" />
    <BookmarkDialog
      v-model="bookmarkDialogVisible"
      :bookmarks="bookmarkList"
      @refresh="refreshBookmarks"
      @add="handleAddBookmark"
      @delete="handleDeleteBookmark"
      @goto="handleGotoBookmark"
    />
    <InsertTableDialog v-model="insertTableDialogVisible" @confirm="handleInsertTableDialogConfirm" />
    <TableBordersDialog v-model="tableBordersDialogVisible" @confirm="handleTableBordersConfirm" />
    <ChartDialog v-model="chartDialogVisible" @confirm="handleInsertChartConfirm" />
    <LaTeXDialog v-model="latexDialogVisible" @confirm="handleLatexConfirm" />
    <BarcodeDialog v-model="barcodeDialogVisible" @confirm="handleBarcodeConfirm" />
    <QrcodeDialog v-model="qrcodeDialogVisible" @confirm="handleQrcodeConfirm" />
    <SignatureDialog v-model="signatureDialogVisible" @confirm="handleSignatureConfirm" />
    <WatermarkDialog v-model="watermarkDialogVisible" @confirm="handleWatermarkConfirm" />
    <PaperSizeDialog v-model="paperSizeDialogVisible" @confirm="handlePaperSizeConfirm" />
    <PageNumberDialog v-model="pageNumberDialogVisible" @confirm="handlePageNumberConfirm" />
    <DateDialog v-model="dateDialogVisible" @confirm="handleDateConfirm" />
    <ParagraphDialog v-model="paragraphDialogVisible" :editor="{ executeCommand }" />

    <TocDialog v-model="tocDialogVisible" @confirm="handleTocConfirm" />
    <AISettingsDialog v-model="aiSettingsDialogVisible" />
    <VersionHistoryDialog
      v-model="versionHistoryDialogVisible"
      :doc-id="documentMeta.id"
      @restore="handleVersionRestore"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, ref, nextTick, type Ref } from 'vue'
import { message } from 'ant-design-vue'
import type { InitialDocument } from '@/utils/resolve-app'
import { emitExternalEvent, externalApi } from '@/composables/use-external-api'
import { aiStateStore } from '@/stores/ai-state'
import type { AITab } from '@/stores/ai-state'
import { AIAction } from '@vervedoc/docx-editor-ai'
import { ShortcutsDialog, ProtectDialog, HyperlinkDialog, BookmarkDialog, InsertTableDialog, ChartDialog, LaTeXDialog, BarcodeDialog, QrcodeDialog, SignatureDialog, WatermarkDialog, PaperSizeDialog, PageNumberDialog, DateDialog, ParagraphDialog, TocDialog, TableBordersDialog, AISettingsDialog, VersionHistoryDialog } from '@/components/dialog'

import Menu from '@/components/layout/Menu.vue'
import LeftDockBar from '@/components/layout/LeftDockBar.vue'
import Footer from '@/components/layout/Footer.vue'
import CatalogLayout from '@/components/sidebars/CatalogLayout.vue'
import SearchLayout from '@/components/sidebars/SearchLayout.vue'
import AISidebarPanel from '@/components/sidebars/ai/AISidebarPanel.vue'
import AIResultPanel from '@/components/sidebars/ai/AIResultPanel.vue'
import RevisionPanel from '@/components/sidebars/RevisionPanel.vue'
import type { RevisionItem } from '@/components/sidebars/RevisionPanel.vue'
import Editor from '@/components/editor/Editor.vue'

import UnifiedTopHeader from '@/components/layout/UnifiedTopHeader.vue'

import type { CollaborationOptions } from '@/ui/index'

import { useDocumentMeta } from '@/composables/use-document-meta'
import { useDock } from '@/composables/use-dock'
import { useDialogs } from '@/composables/use-dialogs'
import { useLoadingOverlay } from '@/composables/use-loading-overlay'
import { useAIActions } from '@/composables/use-ai-actions'
import { useBookmarks } from '@/composables/use-bookmarks'
import { useImportNotification } from '@/composables/use-import-notification'
import { useEditorSave } from '@/composables/use-editor-save'
import { useCollaboration } from '@/composables/use-collaboration'
import { useDocumentActions } from '@/composables/use-document-actions'
import { useEditorCommand } from '@/composables/use-editor-command'

const initialDocument = inject<InitialDocument | null>('docx-editor-ui:initDocument', null)
const collaborationConfig = inject<CollaborationOptions | null>('docx-editor-ui:collaboration', null)

const editorAppRef = ref<HTMLElement | null>(null)
const catalogRef = ref<any>(null)
const editorRef = ref<any>(null)
const footerRef = ref<any>(null)

const {
  appNameWithVersion,
  documentMeta,
  documentStats,
  isViewMode,
  headerTitle,
  headerLastSaveTime,
  emitMetaChange,
  setMeta
} = useDocumentMeta({ initialDocument })

const busyState = ref<'idle' | 'loading' | 'saving'>('idle')
const busy = computed(() => busyState.value !== 'idle')
const busyText = computed(() => {
  if (busyState.value === 'loading') return '正在加载...'
  if (busyState.value === 'saving') return '正在保存...'
  return ''
})

const getEditorInstance = () => editorRef.value?.getEditorInstance?.() ?? null
const getCommentComponent = () => getEditorInstance()?.comment ?? null
const getRevisionComponent = () => getEditorInstance()?.revision ?? null

const executeCommand = (command: string, ...args: any[]) => {
  const fn = editorRef.value?.executeCommand
  if (typeof fn === 'function') return fn(command, ...args)
}

let suppressSaveOnce = false
const setSuppressSaveOnce = (value: boolean) => { suppressSaveOnce = value }

const {
  activeDock,
  sidebarPanelSize,
  cachedCatalog,
  closeRevisionDock,
  handleDockSelect,
  closeDock,
  closeAIDock,
  handleResizeStart
} = useDock({ catalogRef })

const {
  shortcutsDialogVisible,
  protectDialogVisible,
  protectDialogMode,
  hyperlinkDialogVisible,
  bookmarkDialogVisible,
  insertTableDialogVisible,
  tableBordersDialogVisible,
  chartDialogVisible,
  latexDialogVisible,
  barcodeDialogVisible,
  qrcodeDialogVisible,
  signatureDialogVisible,
  watermarkDialogVisible,
  paperSizeDialogVisible,
  pageNumberDialogVisible,
  dateDialogVisible,
  paragraphDialogVisible,
  tocDialogVisible,
  aiSettingsDialogVisible,
  versionHistoryDialogVisible,
  openShortcuts,
  openProtect,
  openUnprotect,
  handleProtectConfirm,
  handleHyperlinkConfirm,
  handleLatexConfirm,
  handleBarcodeConfirm,
  handleQrcodeConfirm,
  handleSignatureConfirm,
  handleWatermarkConfirm,
  handlePaperSizeConfirm,
  handlePageNumberConfirm,
  handleDateConfirm,
  handleTocConfirm,
  handleInsertChartConfirm,
  handleInsertTableDialogConfirm,
  handleTableBordersConfirm
} = useDialogs({ executeCommand, documentMeta, emitMetaChange })

const { closeLoadingOverlay } = useLoadingOverlay({ busy, busyText, editorAppRef })

const {
  handleAIAction,
  handleAIApplyResult,
  handleAIRegenerate,
  handleAIResultClose
} = useAIActions({ getEditorInstance })

const {
  bookmarkList,
  refreshBookmarks,
  handleAddBookmark,
  handleDeleteBookmark,
  handleGotoBookmark
} = useBookmarks({ getEditorInstance, executeCommand })

const {
  importFileName,
  importFileSize,
  importParseProgress,
  showImportNotification,
  setImportModeResolver
} = useImportNotification({ setSuppressSaveOnce })

const toolbarVisible = ref(true)
const bottomNavVisible = ref(true)

const isTrackChanges = ref(false)
const revisionList = ref<RevisionItem[]>([])
const activeRevisionId = ref<string>('')

const aiState = aiStateStore.state

let loaded = false

const { getSnapshot, saveNow, scheduleSave } = useEditorSave({
  getEditorInstance,
  getCommentComponent,
  documentMeta,
  busyState,
  emitMetaChange
})

const {
  collabOnlineUsers,
  collabSharedSyncState,
  showCollaborationMenu,
  initCollaboration,
  installCommentCallbacks,
  cleanupCollaboration,
  getCollabPlugin
} = useCollaboration({
  collaborationConfig,
  getEditorInstance,
  getCommentComponent,
  executeCommand,
  documentMeta,
  editorRef,
  isSuppressSaveOnce: () => suppressSaveOnce,
  scheduleSave
})

const {
  renameDoc,
  newDoc,
  openAccessPermission,
  openFeedback
} = useDocumentActions({
  documentMeta,
  emitMetaChange,
  saveNow,
  executeCommand,
  setSuppressSaveOnce
})

;(externalApi as any).document = {
  getMeta: () => ({ ...documentMeta }),
  setMeta,
  getSnapshot,
  save: (opts?: { silent?: boolean }) => saveNow(opts)
}

const normalizeContent = (content: any): any => {
  if (Array.isArray(content)) return { main: content }
  if (Array.isArray(content?.main)) return { main: content.main }
  if (Array.isArray(content?.data?.main)) return { main: content.data.main }
  return content
}

const handleReady = (...args: any[]) => {
  emitExternalEvent('ready', args[0] ?? null)
  if (loaded) return
  loaded = true
  emitMetaChange()

  const instance = getEditorInstance()

  if (instance?.command) {
    const revisionComp = getRevisionComponent()
    if (revisionComp) {
      revisionComp.install(instance.command, {
        onAccept: (id: string) => executeCommand('acceptRevision', id),
        onReject: (id: string) => executeCommand('rejectRevision', id)
      })
      instance.command.setRevisionOverlay?.(revisionComp)
    }
    const commentComp = getCommentComponent()
    if (commentComp) {
      instance.command.setCommentOverlay?.(commentComp)
    }
  }

  const updateRevisionList = () => {
    const revisionComp = getRevisionComponent()
    if (revisionComp) {
      revisionList.value = revisionComp.getRevisions().map((r: any) => ({
        id: r.id, type: r.type, author: r.author, date: r.date, content: r.content
      }))
    }
  }

  if (instance?.listener) {
    const origContentChange = instance.listener.contentChange
    instance.listener.contentChange = (...a: any[]) => {
      origContentChange?.(...a)
      updateRevisionList()
    }
  }

  installCommentCallbacks(instance)

  const content = (initialDocument as any)?.content
  const docUrl = (initialDocument as any)?.url
  const docFormat = (initialDocument as any)?.format

  if (docFormat === 'word' && docUrl && typeof docUrl === 'string') {
    busyState.value = 'loading'
    executeCommand('importWordFromUrl', {
      url: docUrl,
      onProgress: () => {},
      onComplete: (success: boolean) => {
        busyState.value = 'idle'
        if (!success) message.error('文档加载失败')
        nextTick(() => initCollaboration())
      }
    })
    return
  }

  if (content == null) {
    nextTick(() => initCollaboration())
    return
  }

  void (async () => {
    busyState.value = 'loading'
    try {
      suppressSaveOnce = true
      const savedComments = content?.comments
      if (Array.isArray(savedComments) && savedComments.length > 0) {
        getCommentComponent()?.restoreComments(savedComments)
      }
      await executeCommand('setValue', normalizeContent(content))
      nextTick(() => {
        executeCommand('forceUpdate', { isSubmitHistory: false, isLazy: false, isPartialRender: false, isCompute: true })
        executeCommand('refreshCatalog')
        requestAnimationFrame(() => {
          getCommentComponent()?.render()
          getRevisionComponent()?.update()
        })
      })
    } finally {
      busyState.value = 'idle'
      nextTick(() => initCollaboration())
    }
  })()
}

onBeforeUnmount(() => {
  closeLoadingOverlay()
  cleanupCollaboration()
})

const { handleEditorCommand, handleEditorSaved } = useEditorCommand({
  cachedCatalog,
  catalogRef,
  footerRef,
  documentStats,
  getCommentComponent,
  getRevisionComponent,
  revisionList,
  isSuppressSaveOnce: () => suppressSaveOnce,
  setSuppressSaveOnce,
  getCollabPlugin,
  saveNow,
  setMeta,
  importFileName,
  importFileSize,
  importParseProgress,
  setImportModeResolver,
  showImportNotification
})


const dialogCommands: Record<string, Ref<boolean>> = {
  hyperlink: hyperlinkDialogVisible,
  insertTableDialog: insertTableDialogVisible,
  tableBordersDialog: tableBordersDialogVisible,
  insertChart: chartDialogVisible,
  latex: latexDialogVisible,
  barcode: barcodeDialogVisible,
  qrcode: qrcodeDialogVisible,
  signature: signatureDialogVisible,
  addWatermark: watermarkDialogVisible,
  customPaperSizeDialog: paperSizeDialogVisible,
  pageNumberDialog: pageNumberDialogVisible,
  insertDate: dateDialogVisible,
  paragraphDialog: paragraphDialogVisible,
  versionHistory: versionHistoryDialogVisible,
  aiSettings: aiSettingsDialogVisible,
}

const infoMessages: Record<string, string> = {
  exportPdf: '暂不支持导出 PDF',
  exportHtml: '暂不支持导出 HTML',
  footnote: '暂不支持脚注',
  spellcheck: '暂不支持拼写检查',
  compare: '暂不支持比较文档',
  separatorDialog: '分割线颜色暂未接入',
}

const aiCommands: Record<string, { action: string; payload?: any; tab?: AITab }> = {
  aiPolish: { action: 'quickAction', payload: { action: AIAction.POLISH } },
  aiSummarize: { action: 'quickAction', payload: { action: AIAction.SUMMARIZE } },
  aiContinue: { action: 'continue' },
  aiFixGrammar: { action: 'quickAction', payload: { action: AIAction.FIX_GRAMMAR } },
  aiDocAnalysis: { action: 'docAnalysis', tab: 'analysis' },
  aiLayout: { action: 'layoutSuggestion', tab: 'layout' },
}

const handleCommand = (command: string, ...args: any[]) => {
  if (dialogCommands[command]) {
    dialogCommands[command].value = true
    if (command === 'bookmark') refreshBookmarks()
    return
  }

  if (infoMessages[command]) {
    message.info(infoMessages[command])
    return
  }

  if (aiCommands[command]) {
    activeDock.value = 'ai'
    aiStateStore.setVisible(true)
    const cfg = aiCommands[command]
    if (cfg.tab) aiStateStore.setActiveTab(cfg.tab)
    handleAIAction(cfg.action, cfg.payload ?? (command === 'aiTranslate' ? { targetLanguage: args[0] } : undefined))
    return
  }

  switch (command) {
    case 'new': return void newDoc()
    case 'save': return void saveNow({ silent: false })
    case 'rename': return void renameDoc()
    case 'protect':
    case 'protectDoc': return openProtect()
    case 'unprotect': return openUnprotect()
    case 'accessPermission': return openAccessPermission()
    case 'shortcuts':
    case 'openShortcuts':
    case 'help': return openShortcuts()
    case 'feedback': return openFeedback()
    case 'openSearchPanel': activeDock.value = 'search'; return
    case 'openAIPanel': activeDock.value = 'ai'; aiStateStore.setVisible(true); return
    case 'closeAIPanel': return closeAIDock()
    case 'openRevisionPanel': activeDock.value = 'revision'; return
    case 'rulerVisible': {
      const instance = getEditorInstance()
      instance?.command?.executeUpdateOptions?.({ marginIndicatorDisabled: !args[0] })
      return
    }
    case 'comment': return executeCommand('comment')
    case 'toolbarVisible': toolbarVisible.value = !!args[0]; return
    case 'bottomNavVisible': bottomNavVisible.value = !!args[0]; return
    case 'tocInsert': return executeCommand('tocInsert', args[0] ?? {})
    case 'tocRemove': return executeCommand('tocRemove')
    case 'columns': return executeCommand('columns', args[0])
    case 'search': activeDock.value = 'search'; break
    case 'closeSearchPanel':
      if (activeDock.value === 'search') closeDock()
      return
    case 'replaceCurrent': {
      const navInfo = executeCommand('getSearchNavigateInfo')
      executeCommand('replace', args[0], { index: navInfo ? navInfo.index - 1 : 0 })
      return
    }
    case 'toggleCollaborationCursor': {
      const plugin = getCollabPlugin()
      if (plugin) plugin.setSharedSyncState({ cursor: !collabSharedSyncState.value.cursor })
      return
    }
    case 'toggleCollaborationSelection': {
      const plugin = getCollabPlugin()
      if (plugin) plugin.setSharedSyncState({ selection: !collabSharedSyncState.value.selection })
      return
    }
    case 'toggleTrackChanges': {
      isTrackChanges.value = !!args[0]
      executeCommand('updateOptions', { trackChanges: isTrackChanges.value })
      activeDock.value = isTrackChanges.value ? 'revision' : 'search'
      return
    }
    case 'revisionDisplayMode': {
      const mode = args[0] as string
      executeCommand('updateOptions', {
        revisionDisplayMode: mode,
        showCommentBalloons: mode === 'all' || mode === 'comments',
        showRevisionBalloons: mode === 'all' || mode === 'revisions'
      })
      nextTick(() => requestAnimationFrame(() => { getCommentComponent()?.render(); getRevisionComponent()?.update() }))
      return
    }
    case 'acceptAllRevisions':
    case 'rejectAllRevisions': return executeCommand(command)
    case 'locateRevision':
      activeRevisionId.value = String(args[0] || '')
      return executeCommand('locateRevision', args[0])
    case 'acceptRevisionById':
    case 'rejectRevisionById': return executeCommand(command, args[0])
    case 'toggleCatalog': {
      const desired = args.length > 0 && typeof args[0] === 'boolean' ? (args[0] as boolean) : null
      const opened = activeDock.value === 'catalog' || activeDock.value === 'section'
      if (desired === null ? opened : !desired) {
        closeDock()
      } else {
        activeDock.value = 'catalog'
        void nextTick(() => {
          catalogRef.value?.switchToCatalogTab?.()
          if (cachedCatalog.value.length > 0) catalogRef.value?.updateCatalog?.(cachedCatalog.value)
        })
      }
      return
    }
    case 'aiTranslate':
      activeDock.value = 'ai'
      aiStateStore.setVisible(true)
      handleAIAction('translate', { targetLanguage: args[0] })
      return
  }

  const fn = editorRef.value?.executeCommand
  if (typeof fn === 'function') fn(command, ...args)
}

const handleVersionRestore = async (content: any) => {
  if (!content) return
  suppressSaveOnce = true
  await executeCommand('setValue', normalizeContent(content))
  nextTick(() => executeCommand('refreshCatalog'))
}

const getExternalApi = () => externalApi

defineExpose({
  executeCommand,
  getExternalApi
})
</script>

<style scoped>
.editor-app {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.body {
  flex: 1;
  min-height: 0;
  display: flex;
}

.body-main {
  flex: 1;
  min-width: 0;
  position: relative;
  display: flex;
  overflow: hidden;
}

.split-panel {
  display: flex;
  flex-direction: row;
  flex: 1;
  min-width: 0;
  height: 100%;
}

.split-left {
  min-width: 300px;
  max-width: 400px;
  overflow: hidden;
  flex-shrink: 0;
}

.split-resize-handle {
  width: 4px;
  cursor: col-resize;
  background: transparent;
  flex-shrink: 0;
  transition: background 0.15s ease;
  position: relative;
  z-index: 10;
}

.split-resize-handle:hover,
.split-resize-handle:active {
  background: #4f87ff;
}

.split-right {
  flex: 1;
  overflow: hidden;
  min-width: 0;
}

.body-main :deep(.ai-result-sidebar) {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  z-index: 20;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.08);
}

.editor-area {
  width: 100%;
  height: 100%;
  overflow: auto;
  background: #f5f7fa;
  position: relative;
}


/* sidebar slide right transition */
.sidebar-slide-right-enter-active {
  transition: transform 0.25s ease-out, opacity 0.25s ease-out;
}
.sidebar-slide-right-leave-active {
  transition: transform 0.2s ease-in, opacity 0.2s ease-in;
}
.sidebar-slide-right-enter-from {
  transform: translateX(100%);
  opacity: 0;
}
.sidebar-slide-right-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

</style>

<style>
.import-notification {
  width: 450px !important;
  padding: 16px !important;
  background: #fff !important;
  border-radius: 8px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}

.import-notification .ant-notification-notice-description {
  margin: 0 !important;
  padding: 0 !important;
}

.import-notification .ant-notification-notice-close {
  top: 12px !important;
  right: 12px !important;
  color: #909399 !important;
}

.import-notification .ant-notification-notice-close:hover {
  color: #606266 !important;
}

.app-loading-overlay .app-loading-spin {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.app-loading-overlay .ant-spin-dot {
  font-size: 32px;
}

.app-loading-overlay .ant-spin-dot-item {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #4f87ff;
  display: block;
  position: absolute;
  animation: antSpinDot 1.2s infinite ease-in-out;
}

.app-loading-overlay .ant-spin-dot-spin {
  width: 32px;
  height: 32px;
  position: relative;
  display: inline-block;
}

.app-loading-overlay .ant-spin-dot-item:nth-child(1) { top: 0; left: 50%; transform: translateX(-50%); animation-delay: 0s; }
.app-loading-overlay .ant-spin-dot-item:nth-child(2) { top: 50%; right: 0; transform: translateY(-50%); animation-delay: 0.3s; }
.app-loading-overlay .ant-spin-dot-item:nth-child(3) { bottom: 0; left: 50%; transform: translateX(-50%); animation-delay: 0.6s; }
.app-loading-overlay .ant-spin-dot-item:nth-child(4) { top: 50%; left: 0; transform: translateY(-50%); animation-delay: 0.9s; }

@keyframes antSpinDot {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

.app-loading-overlay .app-loading-text {
  color: #333;
  font-size: 14px;
}
</style>
