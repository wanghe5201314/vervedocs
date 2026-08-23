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
            <div class="editor-area" ref="editorAreaRef">
              <Ruler
                v-if="rulerVisible && isContentVisible"
                :visible="rulerVisible"
                :get-page-metrics="getPageMetrics"
                :set-margins="setMargins"
                :container-el="editorAreaRef"
              />
              <Editor v-if="isContentVisible" ref="editorRef" @command="handleEditorCommand" @ready="handleReady" @saved="handleEditorSaved" />
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
    <PasswordCard
      :visible="passwordModalVisible"
      :mode="passwordModalMode"
      :loading="passwordModalLoading"
      :error="passwordError"
      @confirm="handlePasswordConfirm"
      @cancel="handlePasswordCancel"
    />
    <div v-if="!isContentVisible" class="editor-protect-overlay">
      <div class="protect-overlay-content">
        <span class="material-icons" style="font-size: 48px">lock</span>
        <p>文档已保护，请解除保护后查看</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, onBeforeUnmount, ref, nextTick, watch, type Ref } from 'vue'
import { message } from 'ant-design-vue'
import type { InitialDocument } from '@/utils/resolve-app'
import type { DocxImportCallback, DocxExportCallback } from '@vervedoc/core'
import { emitExternalEvent, externalApi } from '@/composables/use-external-events'
import { aiStateStore } from '@/stores/ai-state'
import type { AITab } from '@/stores/ai-state'
import { AIAction } from '@vervedoc/docx-editor-ai'
import { ShortcutsDialog, HyperlinkDialog, BookmarkDialog, InsertTableDialog, ChartDialog, LaTeXDialog, BarcodeDialog, QrcodeDialog, SignatureDialog, WatermarkDialog, PaperSizeDialog, PageNumberDialog, DateDialog, ParagraphDialog, TocDialog, TableBordersDialog, AISettingsDialog, VersionHistoryDialog } from '@/components/dialog'

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
import PasswordCard from '@/components/editor/PasswordCard.vue'
import Ruler from '@/components/layout/Ruler.vue'

import UnifiedTopHeader from '@/components/layout/UnifiedTopHeader.vue'

import type { CollaborationOptions } from '@/ui/index'

import { useDocumentMeta } from '@/composables/use-document-meta'
import { useDock } from '@/composables/use-dock'
import { useDialogs } from '@/composables/use-dialogs'

import { useAIActions } from '@/composables/use-ai-actions'
import { useBookmarks } from '@/composables/use-bookmarks'

import { useEditorSave } from '@/composables/use-editor-save'
import { useCollaboration } from '@/composables/use-collaboration'
import { useDocumentActions } from '@/composables/use-document-actions'
import { useEditorCommand } from '@/composables/use-editor-command'

const initialDocument = inject<InitialDocument | null>('docx-editor-ui:initDocument', null)
const collaborationConfig = inject<CollaborationOptions | null>('docx-editor-ui:collaboration', null)
const importCallback = inject<DocxImportCallback | undefined>('docx-editor-ui:importCallback', undefined)
const exportCallback = inject<DocxExportCallback | undefined>('docx-editor-ui:exportCallback', undefined)

const isContentVisible = ref(true)
const protectPasswordHash = ref<string | null>(null)
const passwordModalVisible = ref(false)
const passwordModalMode = ref<'protect' | 'unprotect'>('protect')
const passwordModalLoading = ref(false)
const passwordError = ref('')

const PROTECT_HASH_KEY = 'docx-editor:protect-hash'

const sha256 = async (text: string): Promise<string> => {
  const data = new TextEncoder().encode(text)
  const hash = await globalThis.crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

const storedHash = localStorage.getItem(PROTECT_HASH_KEY)
if (storedHash) {
  protectPasswordHash.value = storedHash
  isContentVisible.value = false
  passwordModalMode.value = 'unprotect'
  passwordModalVisible.value = true
}

const editorAppRef = ref<HTMLElement | null>(null)
const editorAreaRef = ref<HTMLElement | null>(null)
const rulerVisible = ref(false)
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
watch(busyState, (state) => {
  const inst = getEditorInstance()
  if (!inst) return
  if (state === 'idle') {
    inst.setLoading(false)
  } else {
    inst.setLoading(true, state === 'loading' ? '正在加载...' : '正在保存...')
  }
})

const getEditorInstance = () => editorRef.value?.getEditorInstance?.() ?? null
const getCommentComponent = () => getEditorInstance()?.comment ?? null
const getRevisionComponent = () => getEditorInstance()?.revision ?? null

const getPageMetrics = () => {
  const instance = getEditorInstance()
  if (!instance) return null
  const options = instance.command?.getOptions?.() ?? {}
  const margins = options.margins ?? [113, 79, 113, 79]
  const paperDirection = options.paperDirection ?? 'vertical'
  const scale = options.scale ?? 1
  const width = paperDirection === 'horizontal' ? 1123 : 794
  const height = paperDirection === 'horizontal' ? 794 : 1123
  let pageOffsetLeft = 0
  const areaEl = editorAreaRef.value
  const pageEl = areaEl?.querySelector('.ce-page-container') as HTMLElement | null
  if (pageEl && areaEl) {
    pageOffsetLeft = pageEl.getBoundingClientRect().left - areaEl.getBoundingClientRect().left
  }
  return { width, height, margins, scale, paperDirection, pageOffsetLeft }
}

const setMargins = (margins: number[]) => {
  const instance = getEditorInstance()
  instance?.command?.executeUpdateOptions?.({ margins })
}

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


  if (content == null) {
    busyState.value = 'loading'
    executeCommand('importJsonFile', {
      onComplete: (success: boolean) => {
        busyState.value = 'idle'
        if (!success) console.warn('[Editor] test-output.json 加载失败')
        nextTick(() => initCollaboration())
      }
    })
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
  getEditorInstance()?.setLoading(false)
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

const handleImportDoc = () => {
  if (!importCallback) {
    message.warning('未配置导入回调，导入功能不可用')
    return
  }
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.doc,.docx'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    try {
      const arrayBuffer = await file.arrayBuffer()
      const result = await importCallback(arrayBuffer)
      if (!result.success || !result.elements?.length) {
        message.error(`文档解析失败: ${result.error || '未知错误'}`)
        return
      }
      executeCommand('executeSetValue', { main: result.elements })
    } catch (e) {
      message.error(`导入失败: ${(e as Error)?.message || '未知错误'}`)
    }
  }
  input.click()
}

const handleExportDoc = () => {
  if (!exportCallback) {
    message.warning('未配置导出回调，导出功能不可用')
    return
  }
  const instance = getEditorInstance()
  const value = instance?.command?.getValue?.()
  const json = value?.data ?? value
  exportCallback(json).then(result => {
    if (!result.success || !result.data) {
      message.error(`导出失败: ${result.error || '未知错误'}`)
      return
    }
    const blob = new Blob([result.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${documentMeta.name || '文档'}.docx`
    a.click()
    URL.revokeObjectURL(url)
  }).catch(e => {
    message.error(`导出失败: ${(e as Error)?.message || '未知错误'}`)
  })
}

const handleProtectDoc = () => {
  passwordModalMode.value = 'protect'
  isContentVisible.value = false
  passwordModalVisible.value = true
}

const handleUnprotectDoc = () => {
  if (!protectPasswordHash.value) {
    message.warning('文档未受保护')
    return
  }
  passwordModalMode.value = 'unprotect'
  passwordModalVisible.value = true
}

const handlePasswordConfirm = async (password: string) => {
  passwordModalLoading.value = true
  passwordError.value = ''
  try {
    const hash = await sha256(password)
    if (passwordModalMode.value === 'protect') {
      protectPasswordHash.value = hash
      localStorage.setItem(PROTECT_HASH_KEY, hash)
      passwordModalMode.value = 'unprotect'
    } else {
      if (hash === protectPasswordHash.value) {
        isContentVisible.value = true
        protectPasswordHash.value = null
        localStorage.removeItem(PROTECT_HASH_KEY)
        passwordModalVisible.value = false
      } else {
        passwordError.value = '密码不正确'
      }
    }
  } finally {
    passwordModalLoading.value = false
  }
}

const handlePasswordCancel = () => {
  if (passwordModalMode.value === 'protect' && !protectPasswordHash.value) {
    isContentVisible.value = true
  }
  passwordError.value = ''
  passwordModalVisible.value = false
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
    case 'import': return handleImportDoc()
    case 'export': return handleExportDoc()
    case 'preview': return emitExternalEvent('statusChange', { command: 'preview', args: [] })
    case 'protect':
    case 'protectDoc': return handleProtectDoc()
    case 'unprotect': return handleUnprotectDoc()
    case 'eyeCareChange': {
      const instance = getEditorInstance()
      instance?.command?.executeUpdateOptions?.({ background: { color: args[0] ? '#C7EDCC' : '#FFFFFF' } })
      return
    }
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
      rulerVisible.value = !!args[0]
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

.editor-protect-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  z-index: 9999;
}

.protect-overlay-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #999;
}

.protect-overlay-content p {
  margin: 0;
  font-size: 14px;
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

</style>
