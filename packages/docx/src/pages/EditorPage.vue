<template>
  <div ref="editorAppRef" class="editor-app">
    <AppSkeleton v-if="!isAppReady" />
    <UnifiedTopHeader
      :title="headerTitle"
      :is-view-mode="isViewMode"
      :last-save-time="headerLastSaveTime"
      :online-users="collabOnlineUsers"
      @command="handleCommand"
    />
    <Menu
      v-show="toolbarVisible"
      :app-name-with-version="appNameWithVersion"
      :document-meta="documentMeta"
      :document-stats="documentStats"
      :revision-count="revisionList.length"
      :catalog-visible="activeDock === 'catalog' || activeDock === 'section'"
      :ruler-visible="rulerVisible"
      :toolbar-visible="toolbarVisible"
      :bottom-nav-visible="bottomNavVisible"
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
            <SearchLayout
              v-if="activeDock === 'search'"
              :searchAPI="searchAPI"
              @close="closeDock"
            />
            <CatalogLayout
              v-else-if="activeDock === 'catalog' || activeDock === 'section'"
              :catalogAPI="catalogAPI"
            />
            <AISidebarPanel
              v-else-if="activeDock === 'ai'"
              @close="closeAIDock"
              @command="handleCommand"
              @ai-action="handleAIAction"
            />
            <RevisionPanel
              v-else-if="activeDock === 'revision'"
              :revisionAPI="revisionAPI"
              :commentAPI="commentAPI"
              @close="closeRevisionDock"
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
                ref="rulerRef"
                :visible="rulerVisible"
                :get-page-metrics="getPageMetrics"
                :set-margins="setMargins"
                :container-el="editorAreaRef"
              />
              <Editor
                v-if="isContentVisible"
                ref="editorRef"
                @command="handleEditorCommand"
                @ready="handleReady"
                @saved="handleEditorSaved"
              />
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

    <HyperlinkDialog
      v-model="hyperlinkDialogVisible"
      @confirm="handleHyperlinkConfirm"
    />
    <BookmarkDialog
      v-model="bookmarkDialogVisible"
      :bookmarkAPI="bookmarkAPI"
    />
    <InsertTableDialog
      v-model="insertTableDialogVisible"
      @confirm="handleInsertTableDialogConfirm"
    />
    <TableBordersDialog
      v-model="tableBordersDialogVisible"
      @confirm="handleTableBordersConfirm"
    />
    <ChartDialog
      v-model="chartDialogVisible"
      @confirm="handleInsertChartConfirm"
    />
    <LaTeXDialog v-model="latexDialogVisible" @confirm="handleLatexConfirm" />
    <BarcodeDialog
      v-model="barcodeDialogVisible"
      @confirm="handleBarcodeConfirm"
    />
    <QrcodeDialog
      v-model="qrcodeDialogVisible"
      @confirm="handleQrcodeConfirm"
    />
    <SignatureDialog
      v-model="signatureDialogVisible"
      @confirm="handleSignatureConfirm"
    />
    <WatermarkDialog
      v-model="watermarkDialogVisible"
      @confirm="handleWatermarkConfirm"
    />
    <PaperSizeDialog
      v-model="paperSizeDialogVisible"
      @confirm="handlePaperSizeConfirm"
    />
    <PageNumberDialog
      v-model="pageNumberDialogVisible"
      @confirm="handlePageNumberConfirm"
    />
    <DateDialog v-model="dateDialogVisible" @confirm="handleDateConfirm" />
    <ParagraphDialog
      v-model="paragraphDialogVisible"
      :editor="{ executeCommand }"
    />

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
import type { InitialDocument } from '@/types/document'
import type {
  DocxImportCallback,
  DocxExportCallback,
  ICommandBookmarkState,
  ICommandRevisionState
} from '@vervedoc/core'
import type { IEditorSearchApi } from '@/composables/use-editor-search'
import {
  emitExternalEvent,
  externalApi,
  type ExternalBookmarkApi,
  type ExternalCatalogApi,
  type ExternalCommentApi,
  type ExternalRevisionApi
} from '@/composables/use-external-events'
import { aiStateStore } from '@/stores/ai-state'
import { editorStateStore } from '@/stores/editor-state'
import type { AITab } from '@/stores/ai-state'
import { AIAction } from '@vervedoc/docx-editor-ai'
import {
  ShortcutsDialog,
  HyperlinkDialog,
  BookmarkDialog,
  InsertTableDialog,
  ChartDialog,
  LaTeXDialog,
  BarcodeDialog,
  QrcodeDialog,
  SignatureDialog,
  WatermarkDialog,
  PaperSizeDialog,
  PageNumberDialog,
  DateDialog,
  ParagraphDialog,
  TocDialog,
  TableBordersDialog,
  AISettingsDialog,
  VersionHistoryDialog
} from '@/components/dialog'

import Menu from '@/components/layout/Menu.vue'
import LeftDockBar from '@/components/layout/LeftDockBar.vue'
import Footer from '@/components/layout/Footer.vue'
import CatalogLayout from '@/components/sidebars/CatalogLayout.vue'
import SearchLayout from '@/components/sidebars/SearchLayout.vue'
import AISidebarPanel from '@/components/sidebars/ai/AISidebarPanel.vue'
import AIResultPanel from '@/components/sidebars/ai/AIResultPanel.vue'
import RevisionPanel from '@/components/sidebars/RevisionPanel.vue'
import Editor from '@/components/editor/Editor.vue'
import AppSkeleton from '@/components/layout/app-skeleton.vue'
import PasswordCard from '@/components/editor/PasswordCard.vue'
import Ruler from '@/components/layout/Ruler.vue'

import UnifiedTopHeader from '@/components/layout/UnifiedTopHeader.vue'

import type { CollaborationOptions } from '@/ui/index'

import { useDocumentMeta } from '@/composables/use-document-meta'
import { useDock } from '@/composables/use-dock'
import { useDialogs } from '@/composables/use-dialogs'

import { useAIActions } from '@/composables/use-ai-actions'
import { useBookmarks } from '@/composables/use-bookmarks'
import { useEditorCatalog } from '@/composables/use-editor-catalog'
import { useEditorComments } from '@/composables/use-editor-comments'
import { useEditorRevisions } from '@/composables/use-editor-revisions'

import { useEditorSave } from '@/composables/use-editor-save'
import { useCollaboration } from '@/composables/use-collaboration'
import { useDocumentActions } from '@/composables/use-document-actions'
import { useEditorCommand } from '@/composables/use-editor-command'
import { replaceDocument } from '@/composables/use-replace-document'
import { deriveDocumentNameFromPath } from '@/utils'

const initialDocument = inject<InitialDocument | null>(
  'docx-editor-ui:initDocument',
  null
)
const collaborationConfig = inject<CollaborationOptions | null>(
  'docx-editor-ui:collaboration',
  null
)
const importCallback = inject<DocxImportCallback | undefined>(
  'docx-editor-ui:importCallback',
  undefined
)
const exportCallback = inject<DocxExportCallback | undefined>(
  'docx-editor-ui:exportCallback',
  undefined
)

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
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
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
const rulerRef = ref<{ refreshMetrics?: () => void } | null>(null)
const rulerVisible = ref(false)
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
watch(busyState, state => {
  const inst = getEditorInstance()
  if (!inst) return
  if (state === 'idle') {
    inst.setLoading(false)
  } else {
    inst.setLoading(
      true,
      state === 'loading' ? '正在加载文档......' : '正在保存...'
    )
  }
})

const isAppReady = ref(false)
watch(
  isContentVisible,
  visible => {
    if (!visible) isAppReady.value = true
  },
  { immediate: true }
)

const getEditorInstance = () => editorRef.value?.getEditorInstance?.() ?? null
const getCommentComponent = () => getEditorInstance()?.comment ?? null
const getRevisionComponent = () => getEditorInstance()?.revision ?? null
const refreshReviewOverlays = () => {
  nextTick(() =>
    requestAnimationFrame(() => {
      getCommentComponent()?.render()
      commentAPI.sync()
      getRevisionComponent()?.update()
      revisionAPI.sync()
    })
  )
}

const getPageMetrics = () => {
  const instance = getEditorInstance()
  if (!instance) return null
  const options = instance.command?.getOptions?.() ?? {}
  const margins = options.margins ?? [113, 79, 113, 79]
  const paperDirection = options.paperDirection ?? 'vertical'
  const scale = options.scale ?? 1
  const baseWidth = options.width ?? 794
  const baseHeight = options.height ?? 1123
  const width = paperDirection === 'horizontal' ? baseHeight : baseWidth
  const height = paperDirection === 'horizontal' ? baseWidth : baseHeight
  let pageOffsetLeft = 0
  const areaEl = editorAreaRef.value
  const pageEl = areaEl?.querySelector(
    '.ce-page-container'
  ) as HTMLElement | null
  if (pageEl && areaEl) {
    pageOffsetLeft =
      pageEl.getBoundingClientRect().left - areaEl.getBoundingClientRect().left
  }
  return { width, height, margins, scale, paperDirection, pageOffsetLeft }
}

const refreshRulerMetrics = () => {
  nextTick(() =>
    requestAnimationFrame(() => {
      rulerRef.value?.refreshMetrics?.()
      requestAnimationFrame(() => {
        rulerRef.value?.refreshMetrics?.()
      })
    })
  )
}

const refreshSectionThumbnails = () => {
  if (activeDock.value !== 'section') return
  nextTick(() =>
    requestAnimationFrame(() => {
      executeCommand('refreshThumbnails')
      requestAnimationFrame(() => {
        executeCommand('refreshThumbnails')
      })
    })
  )
}

const setMargins = (margins: number[]) => {
  const instance = getEditorInstance()
  instance?.command?.executeUpdateOptions?.({ margins })
}

const executeCommand = (command: string, ...args: any[]) => {
  const fn = editorRef.value?.executeCommand
  if (typeof fn === 'function') return fn(command, ...args)
}

const getSearchAPI = (): IEditorSearchApi | null => {
  return editorRef.value?.getSearchAPI?.() ?? null
}

const searchAPI: IEditorSearchApi = {
  query(keyword) {
    return getSearchAPI()?.query(keyword) ?? []
  },
  locate(result) {
    return getSearchAPI()?.locate(result) ?? null
  },
  replaceOne(result, replacement) {
    return getSearchAPI()?.replaceOne(result, replacement) ?? []
  },
  replaceAll(keyword, replacement) {
    return getSearchAPI()?.replaceAll(keyword, replacement) ?? []
  },
  clear() {
    return getSearchAPI()?.clear() ?? []
  }
}

let suppressSaveOnce = false
const setSuppressSaveOnce = (value: boolean) => {
  suppressSaveOnce = value
}

const {
  activeDock,
  sidebarPanelSize,
  closeRevisionDock,
  handleDockSelect: baseHandleDockSelect,
  closeDock,
  closeAIDock,
  handleResizeStart
} = useDock()

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

const { bookmarkAPI } = useBookmarks({ getEditorInstance })
const { commentAPI } = useEditorComments({
  getEditorInstance,
  getCommentComponent,
  getActiveGroupId: () => editorStateStore.state.groupIds?.[0] || ''
})

const toolbarVisible = ref(true)
const bottomNavVisible = ref(true)

const isTrackChanges = ref(false)
const { revisionAPI } = useEditorRevisions({ getEditorInstance })
const revisionList = revisionAPI.revisionList
const { catalogAPI } = useEditorCatalog({
  getEditorInstance,
  executeCommand,
  activeDock
})

const handleDockSelect = (key: 'search' | 'catalog' | 'section' | 'ai' | 'revision') => {
  if (key === 'catalog' || key === 'section') {
    catalogAPI.open(key)
    return
  }
  baseHandleDockSelect(key)
}

const externalBookmarkAPI: ExternalBookmarkApi = {
  getState(): ICommandBookmarkState {
    return (
      getEditorInstance()?.command?.bookmark?.getState?.() ?? {
        list: [],
        suggestedName: '书签',
        selectionPreview: '',
        hasSelectionRange: false
      }
    )
  },
  add(name) {
    getEditorInstance()?.command?.bookmark?.add?.(name)
  },
  remove(name) {
    getEditorInstance()?.command?.bookmark?.remove?.(name)
  },
  locate(name) {
    getEditorInstance()?.command?.bookmark?.locate?.(name)
  }
}

const externalRevisionAPI: ExternalRevisionApi = {
  getState(): ICommandRevisionState {
    revisionAPI.sync()
    return {
      list: [...revisionAPI.revisionList.value],
      activeId: revisionAPI.activeRevisionId.value
    }
  },
  locate(id) {
    revisionAPI.locate(id)
  },
  locatePrevious() {
    revisionAPI.locatePrevious()
  },
  locateNext() {
    revisionAPI.locateNext()
  },
  accept(id) {
    revisionAPI.accept(id)
  },
  reject(id) {
    revisionAPI.reject(id)
  },
  acceptCurrent() {
    revisionAPI.acceptCurrent()
  },
  rejectCurrent() {
    revisionAPI.rejectCurrent()
  },
  acceptAll() {
    revisionAPI.acceptAll()
  },
  rejectAll() {
    revisionAPI.rejectAll()
  }
}

const externalCommentAPI: ExternalCommentApi = {
  getState() {
    return commentAPI.getState()
  },
  create(userName) {
    return getEditorInstance()?.api?.comment?.create?.(userName) ?? commentAPI.create(userName)
  },
  remove(id) {
    getEditorInstance()?.api?.comment?.remove?.(id) ?? commentAPI.remove(id)
  },
  removeCurrent(groupId) {
    commentAPI.removeCurrent(groupId)
  },
  locate(id) {
    getEditorInstance()?.api?.comment?.locate?.(id) ?? commentAPI.locate(id)
  },
  refresh() {
    getEditorInstance()?.api?.comment?.refresh?.() ?? commentAPI.render()
  }
}

const externalCatalogAPI: ExternalCatalogApi = {
  getState() {
    const state = catalogAPI.getState()
    return {
      list: [...state.list],
      thumbnails: [...state.thumbnails],
      selectedId: state.selectedId,
      activeTab: state.activeTab,
      visible: state.visible
    }
  },
  sync() {
    return catalogAPI.sync()
  },
  locate(id) {
    catalogAPI.locate(id)
  },
  pageJump(index) {
    catalogAPI.pageJump(index)
  },
  open(tab) {
    catalogAPI.open(tab)
  },
  close() {
    catalogAPI.close()
  },
  toggle(desired, tab) {
    catalogAPI.toggle(desired, tab)
  },
  switchTab(tab) {
    catalogAPI.switchTab(tab)
  }
}

/**
 * 整文档替换封装（docx 导入 / JSON url / content 初始加载共用）
 * - 默认清空页眉页脚，避免与旧文档杂糅
 * - 重置批注并 render，同步修订 UI 与目录
 */
const applyDocumentReplace = async (payload: {
  main: any[]
  header?: any[]
  footer?: any[]
  comments?: any[]
}) => {
  await replaceDocument(
    {
      getEditorInstance,
      refreshCatalog: async () => {
        await executeCommand('refreshCatalog')
      },
      syncRevisionList: revisionAPI.sync
    },
    payload
  )
}

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

const { renameDoc, newDoc, openAccessPermission, openFeedback } =
  useDocumentActions({
    documentMeta,
    emitMetaChange,
    executeCommand,
    saveNow,
    setSuppressSaveOnce,
    applyDocumentReplace
  })

externalApi.document = {
  getMeta: () => ({ ...documentMeta }),
  setMeta,
  getSnapshot,
  save: (opts?: { silent?: boolean }) => saveNow(opts)
}
externalApi.search = searchAPI
externalApi.bookmark = externalBookmarkAPI
externalApi.revision = externalRevisionAPI
externalApi.comment = externalCommentAPI
externalApi.catalog = externalCatalogAPI

const normalizeContent = (content: any): any => {
  if (Array.isArray(content)) return { main: content, header: [], footer: [] }
  if (Array.isArray(content?.main)) {
    return {
      main: content.main,
      header: Array.isArray(content.header) ? content.header : [],
      footer: Array.isArray(content.footer) ? content.footer : []
    }
  }
  if (Array.isArray(content?.data?.main)) {
    return {
      main: content.data.main,
      header: Array.isArray(content.data.header) ? content.data.header : [],
      footer: Array.isArray(content.data.footer) ? content.data.footer : []
    }
  }
  return content
}

const handleReady = (...args: any[]) => {
  isAppReady.value = true
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
      revisionAPI.sync()
    }
    const commentComp = getCommentComponent()
    if (commentComp) {
      instance.command.setCommentOverlay?.(commentComp)
    }
  }

  const updateRevisionList = () => {
    revisionAPI.sync()
  }

  if (instance?.listener) {
    const origContentChange = instance.listener.contentChange
    instance.listener.contentChange = (...a: any[]) => {
      origContentChange?.(...a)
      updateRevisionList()
    }
  }

  installCommentCallbacks(instance)
  refreshReviewOverlays()
  void catalogAPI.sync()

  // 初始内容优先级：content → url → 空文档（由宿主决定，不内置默认文件）
  const content = (initialDocument as any)?.content
  const sourceUrl = String((initialDocument as any)?.url || '').trim()

  if (content == null && sourceUrl) {
    busyState.value = 'loading'
    executeCommand('importJsonFile', {
      url: sourceUrl,
      onComplete: (success: boolean, message?: string) => {
        busyState.value = 'idle'
        catalogAPI.open('catalog')
        refreshReviewOverlays()
        if (success) {
          const explicitName = String(
            (initialDocument as any)?.meta?.name
              || (initialDocument as any)?.meta?.fileName
              || ''
          ).trim()
          if (!explicitName) {
            const derivedName = deriveDocumentNameFromPath(sourceUrl)
            if (derivedName) {
              documentMeta.name = derivedName
              emitMetaChange()
            }
          }
        } else {
          console.warn(`[Editor] 初始文档加载失败: ${sourceUrl}`, message || '')
        }
        nextTick(() => initCollaboration())
      }
    })
    return
  }

  if (content == null) {
    busyState.value = 'idle'
    catalogAPI.open('catalog')
    refreshReviewOverlays()
    nextTick(() => initCollaboration())
    return
  }

  void (async () => {
    busyState.value = 'loading'
    try {
      suppressSaveOnce = true
      const normalized = normalizeContent(content)
      const main = Array.isArray(normalized?.main) ? normalized.main : []
      const header = Array.isArray(normalized?.header) ? normalized.header : []
      const footer = Array.isArray(normalized?.footer) ? normalized.footer : []
      const savedComments = content?.comments
      await applyDocumentReplace({
        main,
        header,
        footer,
        comments: Array.isArray(savedComments) ? savedComments : []
      })
    } finally {
      busyState.value = 'idle'
      catalogAPI.open('catalog')
      refreshReviewOverlays()
      nextTick(() => initCollaboration())
    }
  })()
}

onBeforeUnmount(() => {
  getEditorInstance()?.setLoading(false)
  cleanupCollaboration()
})

const { handleEditorCommand: baseHandleEditorCommand, handleEditorSaved } = useEditorCommand({
  footerRef,
  documentStats,
  commentAPI,
  catalogAPI,
  revisionAPI,
  refreshReviewOverlays,
  isSuppressSaveOnce: () => suppressSaveOnce,
  setSuppressSaveOnce,
  getCollabPlugin,
  saveNow
})

const handleEditorCommand = (command: string, ...args: any[]) => {
  baseHandleEditorCommand(command, ...args)
  if (command === 'scaleChange') {
    refreshRulerMetrics()
  }
}

const dialogCommands: Record<string, Ref<boolean>> = {
  hyperlink: hyperlinkDialogVisible,
  bookmark: bookmarkDialogVisible,
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
  aiSettings: aiSettingsDialogVisible
}

const infoMessages: Record<string, string> = {
  exportPdf: '暂不支持导出 PDF',
  exportHtml: '暂不支持导出 HTML',
  footnote: '暂不支持脚注',
  spellcheck: '暂不支持拼写检查',
  compare: '暂不支持比较文档',
  separatorDialog: '分割线颜色暂未接入'
}

const aiCommands: Record<
  string,
  { action: string; payload?: any; tab?: AITab }
> = {
  aiPolish: { action: 'quickAction', payload: { action: AIAction.POLISH } },
  aiSummarize: {
    action: 'quickAction',
    payload: { action: AIAction.SUMMARIZE }
  },
  aiContinue: { action: 'continue' },
  aiFixGrammar: {
    action: 'quickAction',
    payload: { action: AIAction.FIX_GRAMMAR }
  },
  aiDocAnalysis: { action: 'docAnalysis', tab: 'analysis' },
  aiLayout: { action: 'layoutSuggestion', tab: 'layout' }
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
      busyState.value = 'loading'
      const arrayBuffer = await file.arrayBuffer()
      const result = await importCallback(arrayBuffer)
      if (!result.success || !result.elements?.length) {
        message.error(`文档解析失败: ${result.error || '未知错误'}`)
        return
      }
      suppressSaveOnce = true
      await applyDocumentReplace({
        main: result.elements,
        header: [],
        footer: [],
        comments: result.comments || []
      })
      const importedName = deriveDocumentNameFromPath(file.name)
      if (importedName) {
        documentMeta.name = importedName
        emitMetaChange()
      }
    } catch (e) {
      message.error(`导入失败: ${(e as Error)?.message || '未知错误'}`)
    } finally {
      busyState.value = 'idle'
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
  exportCallback(json)
    .then(result => {
      if (!result.success || !result.data) {
        message.error(`导出失败: ${result.error || '未知错误'}`)
        return
      }
      const blob = new Blob([result.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${documentMeta.name || '文档'}.docx`
      a.click()
      URL.revokeObjectURL(url)
    })
    .catch(e => {
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
  if (command === 'addWatermark' && args.length > 0) {
    executeCommand('addWatermark', args[0])
    return
  }

  if (dialogCommands[command]) {
    dialogCommands[command].value = true
    if (command === 'bookmark') bookmarkAPI.refresh()
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
    handleAIAction(
      cfg.action,
      cfg.payload ??
        (command === 'aiTranslate' ? { targetLanguage: args[0] } : undefined)
    )
    return
  }

  switch (command) {
    case 'new':
      return void newDoc()
    case 'save':
      return void saveNow({ silent: false })
    case 'rename':
      return void renameDoc()
    case 'import':
      return handleImportDoc()
    case 'export':
      return handleExportDoc()
    case 'preview':
      return emitExternalEvent('statusChange', { command: 'preview', args: [] })
    case 'protect':
    case 'protectDoc':
      return handleProtectDoc()
    case 'unprotect':
      return handleUnprotectDoc()
    case 'eyeCareChange': {
      const instance = getEditorInstance()
      instance?.command?.executeUpdateOptions?.({
        background: { color: args[0] ? '#C7EDCC' : '#FFFFFF' }
      })
      refreshSectionThumbnails()
      return
    }
    case 'accessPermission':
      return openAccessPermission()
    case 'shortcuts':
    case 'openShortcuts':
    case 'help':
      return openShortcuts()
    case 'feedback':
      return openFeedback()
    case 'openSearchPanel':
      activeDock.value = 'search'
      return
    case 'openAIPanel':
      activeDock.value = 'ai'
      aiStateStore.setVisible(true)
      return
    case 'closeAIPanel':
      return closeAIDock()
    case 'openRevisionPanel':
      activeDock.value = 'revision'
      return
    case 'rulerVisible': {
      rulerVisible.value = !!args[0]
      const instance = getEditorInstance()
      instance?.command?.executeUpdateOptions?.({
        marginIndicatorDisabled: !args[0]
      })
      return
    }
    case 'comment':
      return commentAPI.create()
    case 'commentDeleteCurrent':
      return commentAPI.removeCurrent(String(args[0] || ''))
    case 'toolbarVisible':
      toolbarVisible.value = !!args[0]
      return
    case 'bottomNavVisible':
      bottomNavVisible.value = !!args[0]
      return
    case 'tocInsert':
      return executeCommand('tocInsert', args[0] ?? {})
    case 'tocRemove':
      return executeCommand('tocRemove')
    case 'columns':
      return executeCommand('columns', args[0])
    case 'pageScale':
    case 'pageScaleAdd':
    case 'pageScaleMinus':
    case 'pageScaleRecovery':
    case 'paperSize':
    case 'paperDirection': {
      const result = executeCommand(command, ...args)
      refreshRulerMetrics()
      return result
    }
    case 'toggleCollaborationCursor': {
      const plugin = getCollabPlugin()
      if (plugin)
        plugin.setSharedSyncState({
          cursor: !collabSharedSyncState.value.cursor
        })
      return
    }
    case 'toggleCollaborationSelection': {
      const plugin = getCollabPlugin()
      if (plugin)
        plugin.setSharedSyncState({
          selection: !collabSharedSyncState.value.selection
        })
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
      refreshReviewOverlays()
      return
    }
    case 'acceptAllRevisions':
      return revisionAPI.acceptAll()
    case 'rejectAllRevisions':
      return revisionAPI.rejectAll()
    case 'previousRevision':
      return revisionAPI.locatePrevious()
    case 'nextRevision':
      return revisionAPI.locateNext()
    case 'locateRevision':
      return revisionAPI.locate(String(args[0] || ''))
    case 'acceptRevisionCurrent':
      return revisionAPI.acceptCurrent()
    case 'rejectRevisionCurrent':
      return revisionAPI.rejectCurrent()
    case 'acceptRevisionById':
      return revisionAPI.accept(String(args[0] || ''))
    case 'rejectRevisionById':
      return revisionAPI.reject(String(args[0] || ''))
    case 'toggleCatalog':
      return catalogAPI.toggle(
        typeof args[0] === 'boolean' ? (args[0] as boolean) : undefined,
        'catalog'
      )
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
  const normalized = normalizeContent(content)
  await applyDocumentReplace({
    main: Array.isArray(normalized?.main) ? normalized.main : [],
    header: Array.isArray(normalized?.header) ? normalized.header : [],
    footer: Array.isArray(normalized?.footer) ? normalized.footer : [],
    comments: Array.isArray(content?.comments) ? content.comments : []
  })
}

const getExternalAPI = () => externalApi

defineExpose({
  executeCommand,
  getExternalAPI
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
  max-width: 420px;
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
  background: #e2e2e2;
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
  transition:
    transform 0.25s ease-out,
    opacity 0.25s ease-out;
}
.sidebar-slide-right-leave-active {
  transition:
    transform 0.2s ease-in,
    opacity 0.2s ease-in;
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
