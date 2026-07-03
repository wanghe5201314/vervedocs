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
      @command="handleCommand"
    />
    <div class="body">
      <LeftDockBar :active-key="activeDock" @select="handleDockSelect" />
      <div class="body-main">
        <el-splitter direction="horizontal">
          <el-splitter-panel
            v-if="activeDock"
            :size="sidebarPanelSize"
            :min-size="300"
            :max-size="400"
            @resize="handleSidebarResize"
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
          </el-splitter-panel>
          <el-splitter-panel>
            <div class="editor-area">
              <Editor ref="editorRef" @command="handleEditorCommand" @ready="handleReady" @saved="handleEditorSaved" />


            </div>
          </el-splitter-panel>
        </el-splitter>
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
    <CustomSymbolDialog v-model="customSymbolDialogVisible" @confirm="handleCustomSymbolConfirm" />
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
import { computed, h, inject, onBeforeUnmount, reactive, ref, nextTick, watch } from 'vue'
import { ElLoading, ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import type { DocumentMeta, DocumentStats } from '@/types/document'
import type { InitialDocument } from '@/utils/resolve-app'
import { emitExternalEvent, externalApi } from '@/composables/use-external-api'
import { executeAIRequest } from '@/composables/use-ai'
import { aiStateStore } from '@/stores/ai-state'
import { AIAction } from '@wanghe1995/docx-editor-ai'
import { ShortcutsDialog, ProtectDialog, HyperlinkDialog, BookmarkDialog, InsertTableDialog, ChartDialog, LaTeXDialog, BarcodeDialog, QrcodeDialog, SignatureDialog, WatermarkDialog, PaperSizeDialog, PageNumberDialog, DateDialog, ParagraphDialog, TocDialog, TableBordersDialog, AISettingsDialog, VersionHistoryDialog, CustomSymbolDialog } from '@/components/dialog'

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
import ImportNotification from '@/components/common/ImportNotification.vue'

import type { DocxCommentMeta } from '@/utils/docxParser/types'

import { CollaborationPlugin } from '@wanghe1995/docx-editor-collaboration'
import type { CollaborationOptions } from '@/ui/index'
import { appConfig } from '@/config/app-config'

type DockKey = 'search' | 'catalog' | 'section' | 'ai' | 'revision' | ''

const initialDocument = inject<InitialDocument | null>('docx-editor-ui:initDocument', null)
const collaborationConfig = inject<CollaborationOptions | null>('docx-editor-ui:collaboration', null)

const appNameWithVersion = computed(() => {
  const v = String(__APP_VERSION__ || '').trim()
  return v ? `docx-editor@${v}` : 'docx-editor'
})

const documentMeta = reactive<DocumentMeta>({
  id: String(initialDocument?.meta?.id || 'local'),
  path: String((initialDocument?.meta as any)?.path || ''),
  status: ((initialDocument?.meta as any)?.status || 'edit') as DocumentMeta['status'],
  name: String((initialDocument?.meta as any)?.name || initialDocument?.meta?.fileName || '新建文档'),
  createdAt: String((initialDocument?.meta as any)?.createdAt || ''),
  submittedAt: String((initialDocument?.meta as any)?.submittedAt || '')
})

const documentStats = reactive<DocumentStats>({
  totalPages: 1,
  wordCount: 0,
  paragraphCount: 0,
  charCount: 0,
  charCountWithSpaces: 0
})

const activeDock = ref<DockKey>('search') // 默认打开搜索面板
const sidebarPanelSize = ref(310)
const editorAppRef = ref<HTMLElement | null>(null)
const catalogRef = ref<any>(null)
const editorRef = ref<any>(null)
const footerRef = ref<any>(null)
const cachedCatalog = ref<any[]>([])

// 协同状态
const collabOnlineUsers = ref<Array<{userId: string, userName: string, color: string}>>([])
const isViewMode = computed(() => documentMeta.status === 'view' || documentMeta.status === 'lock')
const headerTitle = computed(() => {
  const name = String(documentMeta.name || '').trim()
  return name || '新建文档'
})
const headerLastSaveTime = computed(() => {
  const submittedAt = String(documentMeta.submittedAt || '').trim()
  if (!submittedAt) return ''
  const d = new Date(submittedAt)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
})
const busyState = ref<'idle' | 'loading' | 'saving'>('idle')
const busy = computed(() => busyState.value !== 'idle')
const busyText = computed(() => {
  if (busyState.value === 'loading') return '正在加载...'
  if (busyState.value === 'saving') return '正在保存...'
  return ''
})


const shortcutsDialogVisible = ref(false)
const protectDialogVisible = ref(false)
const protectDialogMode = ref<'lock' | 'unlock'>('lock')

const hyperlinkDialogVisible = ref(false)
const bookmarkDialogVisible = ref(false)
const insertTableDialogVisible = ref(false)
const tableBordersDialogVisible = ref(false)
const chartDialogVisible = ref(false)
const latexDialogVisible = ref(false)
const barcodeDialogVisible = ref(false)
const qrcodeDialogVisible = ref(false)
const signatureDialogVisible = ref(false)
const watermarkDialogVisible = ref(false)
const paperSizeDialogVisible = ref(false)
const pageNumberDialogVisible = ref(false)
const dateDialogVisible = ref(false)
const paragraphDialogVisible = ref(false)
const customSymbolDialogVisible = ref(false)
const tocDialogVisible = ref(false)
const aiSettingsDialogVisible = ref(false)
const versionHistoryDialogVisible = ref(false)
const importFileName = ref('')
const importFileSize = ref('')
const importParseProgress = ref<number | undefined>(undefined) // 解析进度 0-100，undefined 表示完成

const toolbarVisible = ref(true)
const bottomNavVisible = ref(true)

const bookmarkList = ref<Array<{ name: string }>>([])



const aiState = aiStateStore.state

const isTrackChanges = ref(false)
const revisionList = ref<RevisionItem[]>([])
const activeRevisionId = ref<string>('')


const closeRevisionDock = () => {
  if (activeDock.value === 'revision') {
    activeDock.value = ''
  }
}


let saveTimer: number | null = null
let saving = false
let pendingSave = false
let loaded = false
let suppressSaveOnce = false
let collabPlugin: CollaborationPlugin | null = null
const collabOffFns: (() => void)[] = []
let importModeResolver: ((value: string) => void) | null = null
let loadingInstance: ReturnType<typeof ElLoading.service> | null = null

const closeLoadingOverlay = () => {
  loadingInstance?.close()
  loadingInstance = null
}

watch([busy, busyText], async ([active, text]) => {
  if (!active) {
    closeLoadingOverlay()
    return
  }
  await nextTick()
  if (!editorAppRef.value) return
  closeLoadingOverlay()
  loadingInstance = ElLoading.service({
    target: editorAppRef.value,
    text,
    background: 'rgba(255, 255, 255, 0.65)'
  })
}, { immediate: true })

const getEditorInstance = () => editorRef.value?.getEditorInstance?.() ?? null
const getCommentComponent = () => getEditorInstance()?.comment ?? null
const getRevisionComponent = () => getEditorInstance()?.revision ?? null

const emitMetaChange = () => {
  emitExternalEvent('metaChange', { meta: { ...documentMeta } })
}

const setMeta = (patch: Partial<DocumentMeta> & { fileName?: string }) => {
  if (!patch || typeof patch !== 'object') return
  if (patch.id !== undefined) documentMeta.id = String(patch.id || 'local')
  if (patch.path !== undefined) documentMeta.path = String(patch.path || '')
  if (patch.status !== undefined) documentMeta.status = patch.status as DocumentMeta['status']
  const nextName = (patch as any).name ?? (patch as any).fileName
  if (nextName !== undefined) documentMeta.name = String(nextName || '新建文档')
  if (patch.createdAt !== undefined) documentMeta.createdAt = String(patch.createdAt || '')
  if (patch.submittedAt !== undefined) documentMeta.submittedAt = String(patch.submittedAt || '')
  emitMetaChange()
}

const getSnapshot = () => {
  const instance = getEditorInstance()
  const content = instance?.command?.getValue?.() ?? null
  let contentWithExtras: any = content
  if (content) {
    const extras: Record<string, unknown> = {}
    if (getCommentComponent()?.getComments().length > 0) {
      extras.comments = getCommentComponent()!.serializeComments()
    }
    const revisions = instance?.command?.getRevisions?.()
    if (revisions && revisions.length > 0) {
      extras.revisions = revisions.map(({ id, type, author, date, content: revContent }) => ({
        id, type, author, date, content: revContent
      }))
    }
    if (Object.keys(extras).length > 0) {
      contentWithExtras = { ...content, ...extras }
    }
  }
  return { meta: { ...documentMeta }, content: contentWithExtras }
}

const saveNow = async (options?: { silent?: boolean }) => {
  if (saving) {
    pendingSave = true
    return
  }
  if (documentMeta.status === 'lock' || documentMeta.status === 'view') return
  const instance = getEditorInstance()
  const content = instance?.command?.getValue?.()
  if (!content) return

  // 将批注和修订数据附加到 content 中一并保存
  let contentWithExtras: any = content
  if (content) {
    const extras: Record<string, unknown> = {}
    if (getCommentComponent()?.getComments().length > 0) {
      extras.comments = getCommentComponent()!.serializeComments()
    }
    const revisions = instance?.command?.getRevisions?.()
    if (revisions && revisions.length > 0) {
      extras.revisions = revisions.map(({ id, type, author, date, content: revContent }) => ({
        id, type, author, date, content: revContent
      }))
    }
    if (Object.keys(extras).length > 0) {
      contentWithExtras = { ...content, ...extras }
    }
  }
  const saveSnapshot = {
    meta: { ...documentMeta },
    content: contentWithExtras
  }

  saving = true
  busyState.value = 'saving'
  pendingSave = false
  try {
    documentMeta.submittedAt = new Date().toISOString()
    emitMetaChange()
    try {
      console.log('[Editor.vue saveNow] 完整保存快照对象:', saveSnapshot)
    } catch (error) {
      console.warn('[Editor.vue saveNow] 保存快照 JSON 序列化失败:', error)
    }
    emitExternalEvent('statusChange', {
      command: 'save',
      args: [{ silent: !!options?.silent, snapshot: saveSnapshot }]
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '保存失败'
    emitExternalEvent('statusChange', { command: 'saveError', args: [msg] })
  } finally {
    saving = false
    busyState.value = 'idle'
    if (pendingSave) scheduleSave()
  }
}

const scheduleSave = () => {
  if (!appConfig['auto-save']) return
  if (documentMeta.status === 'view') return
  if (saveTimer) window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    void saveNow({ silent: true })
  }, 800)
}

;(externalApi as any).document = {
  getMeta: () => ({ ...documentMeta }),
  setMeta,
  getSnapshot,
  save: (opts?: { silent?: boolean }) => saveNow(opts)
}

const handleDockSelect = (key: Exclude<DockKey, ''>) => {
  activeDock.value = key
  if (key === 'catalog') {
    void nextTick(() => {
      catalogRef.value?.switchToCatalogTab?.()
      if (cachedCatalog.value.length > 0) {
        catalogRef.value?.updateCatalog?.(cachedCatalog.value)
      }
    })
  }
  if (key === 'section') {
    void nextTick(() => catalogRef.value?.switchToSectionTab?.())
  }
  if (key === 'ai') {
    aiStateStore.setVisible(true)
  }
}

const closeDock = () => {
  activeDock.value = ''
}

const closeAIDock = () => {
  if (activeDock.value === 'ai') {
    activeDock.value = ''
    aiStateStore.setVisible(false)
  }
}

const handleSidebarResize = (size: number) => {
  sidebarPanelSize.value = size
}

const handleAIAction = (action: string, payload?: any) => {
  const instance = getEditorInstance()
  if (!instance) return

  const getText = (): string => {
    try {
      return instance.command.getRangeText?.() || ''
    } catch {
      return ''
    }
  }

  const getFullText = (): string => {
    try {
      const result = instance.command.getValue?.()
      const main = result?.data?.main
      if (!Array.isArray(main)) return ''
      return main.map((el: any) => el.value || '').join('')
    } catch {
      return ''
    }
  }

  if (action === 'quickAction') {
    const text = getText().trim()
    if (!text) {
      ElMessage.warning('请先选中文本')
      return
    }
    void executeAIRequest({ action: payload.action, text })
    return
  }

  if (action === 'translate') {
    const text = getText().trim()
    if (!text) {
      ElMessage.warning('请先选中文本')
      return
    }
    void executeAIRequest({ action: AIAction.TRANSLATE, text, targetLanguage: payload?.targetLanguage })
    return
  }

  if (action === 'custom') {
    const text = getText().trim()
    if (!text) {
      ElMessage.warning('请先选中文本')
      return
    }
    void executeAIRequest({ action: AIAction.CUSTOM, text, customPrompt: payload?.prompt })
    return
  }

  if (action === 'continue') {
    const text = getText().trim() || getFullText().trim()
    if (!text) {
      ElMessage.warning('文档为空，无法续写')
      return
    }
    void executeAIRequest({ action: AIAction.CONTINUE, text: text.slice(-500) })
    return
  }

  if (action === 'layoutSuggestion' || action === 'docAnalysis' || action === 'docSummarize') {
    const text = getFullText().trim()
    if (!text) {
      ElMessage.warning('文档为空')
      return
    }
    const aiAction = action === 'docSummarize' ? AIAction.SUMMARIZE : AIAction.CUSTOM
    const customPrompt = action === 'layoutSuggestion'
      ? '请分析以下文档内容，提供排版优化建议，包括段落结构、标题层级、分栏建议等。'
      : action === 'docAnalysis'
        ? '请对以下文档进行综合分析，包括内容质量评估、结构建议、语言风格分析。'
        : undefined
    void executeAIRequest({
      action: aiAction,
      text: text.slice(0, 3000),
      customPrompt
    })
    return
  }

  if (action === 'applyResult') {
    const result = payload?.result
    if (result && instance) {
      const elementList = result.split('').map((char: string) => ({ value: char }))
      instance.command.executeInsertElementList(elementList)
      aiStateStore.resetOperation()
    }
    return
  }

  if (action === 'regenerate') {
    const opState = aiStateStore.state.operation
    if (opState.action && opState.inputText) {
      void executeAIRequest({
        action: opState.action,
        text: opState.inputText
      })
    }
    return
  }

  if (action === 'imageAlt') {
    ElMessage.info('图片描述生成功能即将推出')
    return
  }
}

const handleAIApplyResult = (result: string) => {
  const instance = getEditorInstance()
  if (result && instance) {
    const elementList = result.split('').map((char: string) => ({ value: char }))
    instance.command.executeInsertElementList(elementList)
    aiStateStore.resetOperation()
  }
}

const handleAIRegenerate = () => {
  const opState = aiStateStore.state.operation
  if (opState.action && opState.inputText) {
    void executeAIRequest({
      action: opState.action,
      text: opState.inputText
    })
  }
}

const handleAIResultClose = () => {
  aiStateStore.setDrawerVisible(false)
}

const openAccessPermission = () => {
  emitExternalEvent('statusChange', { command: 'accessPermission', args: [{ meta: { ...documentMeta } }] })
}

const openFeedback = () => {
  emitExternalEvent('statusChange', { command: 'feedback', args: [{ meta: { ...documentMeta } }] })
  ElMessage.info('请在系统内提交反馈')
}


const openShortcuts = () => {
  shortcutsDialogVisible.value = true
}


const handleHyperlinkConfirm = (data: { text: string; url: string }) => {
  executeCommand('hyperlink', data)
}

const refreshBookmarks = () => {
  const instance = getEditorInstance()
  const main = instance?.command?.getValue?.()?.data?.main
  if (!Array.isArray(main)) {
    bookmarkList.value = []
    return
  }
  const set = new Set<string>()
  for (const el of main) {
    const name = (el as any)?.extension?.bookmarkMarker?.name
    if (typeof name === 'string' && name.trim()) set.add(name.trim())
  }
  bookmarkList.value = Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

const handleAddBookmark = (name: string) => {
  executeCommand('addBookmark', { name })
  refreshBookmarks()
}

const handleDeleteBookmark = (name: string) => {
  executeCommand('deleteBookmark', { name })
  refreshBookmarks()
}

const handleGotoBookmark = (name: string) => {
  executeCommand('gotoBookmark', { name })
}

const handleLatexConfirm = (latex: string) => {
  executeCommand('insertLatex', latex)
}

const handleBarcodeConfirm = (data: { imageDataUrl: string; width: number; height: number }) => {
  executeCommand('image', {
    value: data.imageDataUrl,
    width: data.width,
    height: data.height
  })
}

const handleQrcodeConfirm = (content: string) => {
  executeCommand('qrcode', content)
}

const handleSignatureConfirm = (dataUrl: string) => {
  executeCommand('image', dataUrl)
}

const handleWatermarkConfirm = (data: any) => {
  executeCommand('addWatermark', data)
}

const handlePaperSizeConfirm = (data: { widthPx: number; heightPx: number }) => {
  executeCommand('paperSize', data.widthPx, data.heightPx)
}

const handlePageNumberConfirm = (data: any) => {
  executeCommand('setPageNumber', data)
}

const handleDateConfirm = (data: { format: string; value: string }) => {
  executeCommand('insertDate', data)
}

const handleTocConfirm = (data: any) => {
  executeCommand('tocInsert', { mode: 'custom', ...data })
}

const handleCustomSymbolConfirm = (symbol: string, font: string) => {
  executeCommand('list', 'ul', 'custom')
  executeCommand('insertElement', { value: symbol, fontFamily: font })
}

const handleInsertChartConfirm = (payload: any) => {
  const p = payload && typeof payload === 'object' ? payload : {}
  executeCommand('insertChartCore', {
    chartType: p.chartType,
    subtype: p.subtype,
    tableData: p.tableData
  })
}

const handleInsertTableDialogConfirm = (payload: { rows: number; cols: number; border?: any }) => {
  executeCommand('insertTable', { rows: payload.rows, cols: payload.cols })
  const border = payload.border || {}
  const opt = String(border.option || '').trim().toLowerCase()
  const type = opt === 'none' ? 'none' : opt === 'box' ? 'outside' : 'all'
  executeCommand('tableBorderType', type)
  if (border.color) executeCommand('tableBorderColor', String(border.color))
  if (border.width !== undefined) executeCommand('tableBorderWidth', Number(border.width))
}

const handleTableBordersConfirm = (payload: { type: 'all' | 'outside' | 'none'; color: string; width: number; externalWidth: number }) => {
  executeCommand('tableBorderType', payload.type)
  executeCommand('tableBorderColor', payload.color)
  executeCommand('tableBorderWidth', payload.width)
  executeCommand('tableBorderExternalWidth', payload.externalWidth)
}

const renameDoc = async () => {
  try {
    const { value } = await ElMessageBox.prompt('请输入新名称', '重命名', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: String(documentMeta.name || '').trim() || '新建文档',
      inputPlaceholder: '新建文档'
    })
    const next = String(value || '').trim()
    if (!next) return
    documentMeta.name = next
    emitMetaChange()
    if (String(documentMeta.id || '').trim() !== 'local') {
      await saveNow({ silent: false })
    }
  } catch {
    return
  }
}

const newDoc = async () => {
  suppressSaveOnce = true
  documentMeta.id = 'local'
  documentMeta.path = ''
  documentMeta.status = 'edit'
  documentMeta.name = '新建文档'
  documentMeta.createdAt = ''
  documentMeta.submittedAt = ''
  emitMetaChange()
  await executeCommand('setValue', { main: [] })
}

const openProtect = () => {
  protectDialogMode.value = 'lock'
  protectDialogVisible.value = true
}

const openUnprotect = () => {
  protectDialogMode.value = 'unlock'
  protectDialogVisible.value = true
}

const handleProtectConfirm = async (password: string) => {
  void password
  const nextStatus = protectDialogMode.value === 'unlock' ? ('edit' as const) : ('lock' as const)
  documentMeta.status = nextStatus
  emitMetaChange()
  protectDialogVisible.value = false
  emitExternalEvent('statusChange', { command: nextStatus === 'lock' ? 'locked' : 'unlocked', args: [] })
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
      const revs = revisionComp.getRevisions()
      revisionList.value = revs.map((r: any) => ({
        id: r.id,
        type: r.type,
        author: r.author,
        date: r.date,
        content: r.content
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

  if (instance?.command) {
    getCommentComponent()?.install(instance.command, {
      onRequestSave: () => { if (!suppressSaveOnce) scheduleSave() }
    })
  }

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
        if (!success) {
          ElMessage.error('文档加载失败')
        }
        nextTick(() => initCollaboration())
      }
    })
    return
  }

  if (content === undefined || content === null) {
    nextTick(() => initCollaboration())
    return
  }
  void (async () => {
    busyState.value = 'loading'
    try {
      suppressSaveOnce = true

      // 提取并恢复批注数据
      const savedComments = (content as any)?.comments
      if (Array.isArray(savedComments) && savedComments.length > 0) {
        getCommentComponent()?.restoreComments(savedComments)
      }

      const normalized =
        Array.isArray(content)
          ? { main: content }
          : Array.isArray((content as any)?.main)
            ? { main: (content as any).main }
            : Array.isArray((content as any)?.data?.main)
              ? { main: (content as any).data.main }
              : content
      await executeCommand('setValue', normalized)
      nextTick(() => executeCommand('forceUpdate', { isSubmitHistory: false, isLazy: false, isPartialRender: true, isCompute: false }))
      nextTick(() => executeCommand('refreshCatalog'))
      nextTick(() => getCommentComponent()?.render())

    } finally {
      busyState.value = 'idle'
      nextTick(() => initCollaboration())
    }
  })()
}

const initCollaboration = () => {
  // 如果文档状态为 view（只读分享），加载完成后设置编辑器为只读模式
  if (documentMeta.status === 'view') {
    nextTick(() => executeCommand('mode', 'readonly'))
  }

  if (!collaborationConfig || collabPlugin) return
  const editorInstance = getEditorInstance()
  if (!editorInstance) return

  collabPlugin = new CollaborationPlugin({
    collaboration: {
      serverUrl: collaborationConfig.serverUrl,
      docId: collaborationConfig.docId,
      user: collaborationConfig.user,
      token: collaborationConfig.token
    }
  })

  collabPlugin.install(editorInstance)

  collabOffFns.push(
    collabPlugin.on('connectionChange', (state) => {
      emitExternalEvent('collabConnectionChange', { state })
    }),
    collabPlugin.on('syncStateChange', (state) => {
      emitExternalEvent('collabSyncStateChange', { state })
    }),
    collabPlugin.on('usersChange', (users) => {
      collabOnlineUsers.value = users
      emitExternalEvent('collabUsersChange', { users })
    }),
    collabPlugin.on('error', (err) => {
      emitExternalEvent('collabError', err)
    })
  )

  collabPlugin.connect().catch(() => {})

  nextTick(() => {
    const editorEl = editorRef.value?.$el as HTMLElement
    if (!editorEl) return
    const editorArea = editorEl.closest('.editor-area') as HTMLElement
    if (!editorArea) return
    collabPlugin!.initializeCursorsWithEditor(editorArea)
  })

  // 浏览器标签页关闭时主动断开 WebSocket，确保后端立即感知用户离开
  const onBeforeUnload = () => {
    if (collabPlugin) {
      collabPlugin.disconnect()
    }
  }
  window.addEventListener('beforeunload', onBeforeUnload)
  collabOffFns.push(() => window.removeEventListener('beforeunload', onBeforeUnload))
}

onBeforeUnmount(() => {
  closeLoadingOverlay()
  collabOffFns.forEach(fn => { try { fn() } catch { void 0 } })
  collabOffFns.length = 0
  if (collabPlugin) {
    collabPlugin.disconnect()
    collabPlugin.uninstall()
    collabPlugin = null
  }
})

const handleEditorCommand = (command: string, ...args: any[]) => {
  if (command === 'catalogChange') {
    cachedCatalog.value = args[0] ?? []
    catalogRef.value?.updateCatalog?.(cachedCatalog.value)
    return
  }
  if (command === 'thumbnailsChange') {
    catalogRef.value?.updateThumbnails?.(args[0] ?? [])
    return
  }
  if (command === 'editorStatus') {
    const payload = (args[0] ?? {}) as Record<string, any>
    footerRef.value?.updateEditorStatus?.(payload)
    if (payload.totalPages !== undefined) documentStats.totalPages = Number(payload.totalPages) || 1
    if (payload.wordCount !== undefined) documentStats.wordCount = Number(payload.wordCount) || 0
    if (payload.paragraphCount !== undefined) documentStats.paragraphCount = Number(payload.paragraphCount) || 0
    if (payload.charCount !== undefined) documentStats.charCount = Number(payload.charCount) || 0
    if (payload.charCountWithSpaces !== undefined) {
      documentStats.charCountWithSpaces = Number(payload.charCountWithSpaces) || 0
    }
    return
  }
  if (command === 'editorAbilityChange') {
    emitExternalEvent('abilityChange', args[0] ?? null)
    return
  }
  if (command === 'contentChange') {
    emitExternalEvent('contentChange', args[0] ?? null)
    nextTick(() => {
      getCommentComponent()?.render()
      getRevisionComponent()?.update()
    })
    const revisionComp = getRevisionComponent()
    if (revisionComp) {
      const revs = revisionComp.getRevisions()
      revisionList.value = revs.map(r => ({
        id: r.id,
        type: r.type,
        author: r.author,
        date: r.date,
        content: r.content
      }))
    }
    if (suppressSaveOnce) {
      suppressSaveOnce = false
      return
    }
    collabPlugin?.markPositionListDirty()
    collabPlugin?.refreshCursors()
    return
  }
  if (command === 'commentsLoaded') {
    const metas: DocxCommentMeta[] = args[0] || []
    getCommentComponent()?.buildCommentsFromMetas(metas)
    nextTick(() => getCommentComponent()?.render())
    return
  }
  if (command === 'importFinished') {
    const payload = (args[0] || {}) as {
      source?: string
      comments?: DocxCommentMeta[]
      onSaveComplete?: () => void
    }
    const onSaveComplete = payload.onSaveComplete
    const importComments = payload.comments

    void (async () => {
      await nextTick()

      // 先加载批注，使其随内容一起保存
      if (importComments?.length) {
        getCommentComponent()?.buildCommentsFromMetas(importComments)
        nextTick(() => getCommentComponent()?.render())
      }

      await saveNow({ silent: true })

      onSaveComplete?.()
    })()
    return
  }
  if (command === 'importNewDoc') {
    const { fileName } = (args[0] || {}) as { fileName?: string }
    const hex = () => Math.random().toString(16).slice(2).toUpperCase().padEnd(4, '0').slice(0, 4)
    const newId = 'DEU' + hex() + hex() + hex() + hex()
    const now = new Date()
    const fmt = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`
    setMeta({ id: newId, name: fileName || '新建文档', createdAt: fmt, submittedAt: '' })
    return
  }
  if (command === 'importConfirm') {
    const { resolve, fileName, fileSize, parseProgress } = (args[0] || {}) as {
      resolve?: (v: string) => void
      fileName?: string
      fileSize?: string
      parseProgress?: number
    }
    if (!resolve) return
    importFileName.value = fileName || ''
    importFileSize.value = fileSize || ''
    importParseProgress.value = parseProgress
    importModeResolver = resolve
    // 使用 ElNotification 在右下角显示通知
    showImportNotification()
    return
  }
  if (command === 'importParseProgress') {
    // 更新解析进度（响应式数据会自动更新通知内容）
    importParseProgress.value = args[0] as number
    return
  }
  if (command === 'importParseComplete') {
    // 解析完成（响应式数据会自动更新通知内容）
    importParseProgress.value = undefined
    return
  }
  emitExternalEvent('statusChange', { command, args })
}

const handleEditorSaved = (_payload?: any) => {
  void saveNow({ silent: false })
}

// 显示导入通知（右下角）
let importNotificationInstance: any = null

const showImportNotification = () => {
  // 如果通知已存在，不重复创建
  if (importNotificationInstance) return

  // 使用 Vue 组件创建 VNode，传递响应式数据
  const content = h(ImportNotification, {
    fileName: importFileName,
    fileSize: importFileSize,
    parseProgress: importParseProgress,
    onOverwrite: () => handleImportAction('overwrite'),
    onAppend: () => handleImportAction('append')
  })

  importNotificationInstance = ElNotification({
    customClass: 'import-notification',
    position: 'top-right',
    duration: 0,
    showClose: true,
    onClose: () => {
      if (importModeResolver) {
        const resolver = importModeResolver
        importModeResolver = null
        resolver('cancel')
      }
      importNotificationInstance = null
    },
    message: content
  })
}

const closeImportNotification = () => {
  if (importNotificationInstance) {
    importNotificationInstance.close()
    importNotificationInstance = null
  }
}

const handleImportAction = (mode: 'overwrite' | 'append' | 'cancel') => {
  const resolver = importModeResolver
  importModeResolver = null // 先清空，防止 onClose 重复处理
  if (!resolver) {
    return
  }

  // 关闭通知（此时 importModeResolver 已为 null，onClose 不会执行 cancel 逻辑）
  closeImportNotification()

  if (mode === 'cancel') {
    resolver('cancel')
    return
  }
  suppressSaveOnce = true
  resolver(mode)
}

const handleCommand = (command: string, ...args: any[]) => {

  if (command === 'new') {
    void newDoc()
    return
  }
  if (command === 'save') {
    void saveNow({ silent: false })
    return
  }
  if (command === 'rename') {
    void renameDoc()
    return
  }
  if (command === 'protect' || command === 'protectDoc') {
    openProtect()
    return
  }
  if (command === 'unprotect') {
    openUnprotect()
    return
  }
  if (command === 'accessPermission') {
    openAccessPermission()
    return
  }
  if (command === 'shortcuts') {
    openShortcuts()
    return
  }

  if (command === 'openShortcuts') {
    openShortcuts()
    return
  }
  if (command === 'help') {
    openShortcuts()
    return
  }
  if (command === 'feedback') {
    openFeedback()
    return
  }
  if (command === 'openSearchPanel') {
    activeDock.value = 'search'
    return
  }
  if (command === 'openAIPanel') {
    activeDock.value = 'ai'
    aiStateStore.setVisible(true)
    return
  }
  if (command === 'closeAIPanel') {
    closeAIDock()
    return
  }
  if (command === 'exportPdf') {
    ElMessage.info('暂不支持导出 PDF')
    return
  }
  if (command === 'exportHtml') {
    ElMessage.info('暂不支持导出 HTML')
    return
  }
  if (command === 'rulerVisible') {
    const visible = !!args[0]
    executeCommand('updateOptions', { marginIndicatorDisabled: !visible })
    return
  }
  if (command === 'versionHistory') {
    versionHistoryDialogVisible.value = true
    return
  }
  if (command === 'footnote') {
    ElMessage.info('暂不支持脚注')
    return
  }
  if (command === 'comment') {
    getCommentComponent()?.addComment('当前用户')
    nextTick(() => getCommentComponent()?.render())
    return
  }
  if (command === 'spellcheck') {
    ElMessage.info('暂不支持拼写检查')
    return
  }
  if (command === 'compare') {
    ElMessage.info('暂不支持比较文档')
    return
  }
  if (command === 'toggleTrackChanges') {
    isTrackChanges.value = !!args[0]
    executeCommand('updateOptions', { trackChanges: isTrackChanges.value })
    if (isTrackChanges.value) {
      activeDock.value = 'revision'
    } else {
      activeDock.value = 'search'
    }
    return
  }
  if (command === 'openRevisionPanel') {
    activeDock.value = 'revision'
    return
  }
  if (command === 'revisionDisplayMode') {
    const mode = args[0] as string
    const showComments = mode === 'all' || mode === 'comments'
    const showRevisions = mode === 'all' || mode === 'revisions'
    executeCommand('updateOptions', {
      revisionDisplayMode: mode,
      showCommentBalloons: showComments,
      showRevisionBalloons: showRevisions
    })
    nextTick(() => {
      getCommentComponent()?.render()
      getRevisionComponent()?.update()
    })
    return
  }
  if (command === 'acceptAllRevisions' || command === 'rejectAllRevisions') {
    executeCommand(command)
    return
  }
  if (command === 'locateRevision') {
    activeRevisionId.value = String(args[0] || '')
    executeCommand('locateRevision', args[0])
    return
  }
  if (command === 'acceptRevisionById' || command === 'rejectRevisionById') {
    executeCommand(command, args[0])
    return
  }
  // AI 菜单命令
  if (command === 'aiPolish') {
    activeDock.value = 'ai'
    aiStateStore.setVisible(true)
    handleAIAction('quickAction', { action: AIAction.POLISH })
    return
  }
  if (command === 'aiSummarize') {
    activeDock.value = 'ai'
    aiStateStore.setVisible(true)
    handleAIAction('quickAction', { action: AIAction.SUMMARIZE })
    return
  }
  if (command === 'aiContinue') {
    activeDock.value = 'ai'
    aiStateStore.setVisible(true)
    handleAIAction('continue')
    return
  }
  if (command === 'aiFixGrammar') {
    activeDock.value = 'ai'
    aiStateStore.setVisible(true)
    handleAIAction('quickAction', { action: AIAction.FIX_GRAMMAR })
    return
  }
  if (command === 'aiTranslate') {
    activeDock.value = 'ai'
    aiStateStore.setVisible(true)
    handleAIAction('translate', { targetLanguage: args[0] })
    return
  }
  if (command === 'aiDocAnalysis') {
    activeDock.value = 'ai'
    aiStateStore.setVisible(true)
    aiStateStore.setActiveTab('analysis')
    handleAIAction('docAnalysis')
    return
  }
  if (command === 'aiLayout') {
    activeDock.value = 'ai'
    aiStateStore.setVisible(true)
    aiStateStore.setActiveTab('layout')
    handleAIAction('layoutSuggestion')
    return
  }
  if (command === 'aiSettings') {
    aiSettingsDialogVisible.value = true
    return
  }
  if (command === 'toolbarVisible') {
    toolbarVisible.value = !!args[0]
    return
  }
  if (command === 'bottomNavVisible') {
    bottomNavVisible.value = !!args[0]
    return
  }

  if (command === 'hyperlink') {
    hyperlinkDialogVisible.value = true
    return
  }
  if (command === 'bookmark') {
    bookmarkDialogVisible.value = true
    refreshBookmarks()
    return
  }
  if (command === 'insertTableDialog') {
    insertTableDialogVisible.value = true
    return
  }
  if (command === 'tableBordersDialog') {
    tableBordersDialogVisible.value = true
    return
  }
  if (command === 'insertChart') {
    chartDialogVisible.value = true
    return
  }
  if (command === 'latex') {
    latexDialogVisible.value = true
    return
  }
  if (command === 'barcode') {
    barcodeDialogVisible.value = true
    return
  }
  if (command === 'qrcode') {
    qrcodeDialogVisible.value = true
    return
  }
  if (command === 'signature') {
    signatureDialogVisible.value = true
    return
  }
  if (command === 'addWatermark') {
    watermarkDialogVisible.value = true
    return
  }
  if (command === 'customPaperSizeDialog') {
    paperSizeDialogVisible.value = true
    return
  }
  if (command === 'pageNumberDialog') {
    pageNumberDialogVisible.value = true
    return
  }
  if (command === 'insertDate') {
    dateDialogVisible.value = true
    return
  }
  if (command === 'paragraphDialog') {
    paragraphDialogVisible.value = true
    return
  }
  if (command === 'customBullet') {
    customSymbolDialogVisible.value = true
    return
  }
  if (command === 'tocInsert') {
    const p = args[0] ?? {}
    executeCommand('tocInsert', p)
    return
  }
  if (command === 'tocRemove') {
    executeCommand('tocRemove')
    return
  }
  if (command === 'toggleCatalog') {
    const desired = args.length > 0 && typeof args[0] === 'boolean' ? (args[0] as boolean) : null
    const opened = activeDock.value === 'catalog' || activeDock.value === 'section'
    const nextOpen = desired === null ? !opened : desired
    if (!nextOpen) {
      closeDock()
    } else {
      activeDock.value = 'catalog'
      void nextTick(() => {
        catalogRef.value?.switchToCatalogTab?.()
        if (cachedCatalog.value.length > 0) {
          catalogRef.value?.updateCatalog?.(cachedCatalog.value)
        }
      })
    }
    return
  }
  if (command === 'insertShape') {
    executeCommand('insertShape', args[0])
    return
  }
  if (command === 'separatorDialog') {
    ElMessage.info('分割线颜色暂未接入')
    return
  }
  if (command === 'columns') {
    executeCommand('columns', args[0])
    return
  }
  if (command === 'closeSearchPanel') {
    if (activeDock.value === 'search') closeDock()
    return
  }
  if (command === 'search') {
    activeDock.value = 'search'
  }
  if (command === 'replaceCurrent') {
    const navigateInfo = executeCommand('getSearchNavigateInfo')
    const replaceIndex = navigateInfo ? navigateInfo.index - 1 : 0
    executeCommand('replace', args[0], { index: replaceIndex })
    return
  }
  const fn = editorRef.value?.executeCommand
  if (typeof fn === 'function') fn(command, ...args)
}

const executeCommand = (command: string, ...args: any[]) => {
  const fn = editorRef.value?.executeCommand
  if (typeof fn === 'function') return fn(command, ...args)
}

// ---- 批注功能 ----



const handleVersionRestore = async (content: any) => {
  if (!content) return
  suppressSaveOnce = true
  const normalized =
    Array.isArray(content)
      ? { main: content }
      : Array.isArray((content as any)?.main)
        ? { main: (content as any).main }
        : Array.isArray((content as any)?.data?.main)
          ? { main: (content as any).data.main }
          : content
  await executeCommand('setValue', normalized)
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

.body-main :deep(.el-splitter) {
  flex: 1;
  min-width: 0;
}

.body-main :deep(.el-splitter-panel) {
  overflow: hidden;
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

.import-mode-body {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.import-mode-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.import-mode-card:hover {
  border-color: #95b8ff;
}

.import-mode-card.selected {
  border-color: #4f87ff;
  box-shadow: 0 0 0 2px rgba(79, 135, 255, 0.14);
}

.import-preview {
  width: 100%;
  height: 88px;
  border-radius: 6px;
  background: #f7f8fa;
  border: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
</style>

<style>
/* 全局样式：导入通知弹窗 */
.import-notification {
  width: 450px !important;
  padding: 16px !important;
  background: #fff !important;
  border-radius: 8px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}

.import-notification .el-notification__content {
  margin: 0 !important;
  padding: 0 !important;
}

.import-notification .el-notification__close {
  top: 12px !important;
  right: 12px !important;
  color: #909399 !important;
}

.import-notification .el-notification__close:hover {
  color: #606266 !important;
}
</style>
