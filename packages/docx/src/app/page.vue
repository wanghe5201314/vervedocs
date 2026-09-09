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
      :toc-visible="activeDock === 'toc' || activeDock === 'section'"

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
            <TocLayout
              v-else-if="activeDock === 'toc' || activeDock === 'section'"
              :tocNavAPI="tocNavAPI"
            />
            <AISidebarLayout
              v-else-if="activeDock === 'ai'"
              @close="closeAIDock"
              @command="handleCommand"
              @ai-action="handleAIAction"
            />
            <RevisionLayout
              v-else-if="activeDock === 'revision'"
              :revisionAPI="revisionAPI"
              :commentAPI="commentAPI"
              @close="closeRevisionDock"
            />
            <BookmarkLayout
              v-else-if="activeDock === 'bookmark'"
              :bookmarkAPI="bookmarkAPI"
              @close="closeDock"
            />
          </div>
          <div
            v-if="activeDock"
            class="split-resize-handle"
            @mousedown="handleResizeStart"
          ></div>
          <div class="split-right">
            <div class="editor-area" ref="editorAreaRef">

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
          <AIResultLayout
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
        <span class="material-symbols-outlined" style="font-size: 48px">lock</span>
        <p>文档已保护，请解除保护后查看</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, provide, onBeforeUnmount, ref, nextTick, watch, type Ref } from 'vue'
import { message } from 'ant-design-vue'
import type { InitialDocument } from '@/types/document'
import type { DocxImportCallback, DocxExportCallback } from '@vervedoc/core'
import type { IEditorSearchApi } from '@/composables/use-editor-search'
import {
  emitExternalEvent,
  externalApi,
  type BookmarkState,
  type RevisionState,
  type ExternalBookmarkApi,
  type ExternalTocApi,
  type ExternalCommentApi,
  type ExternalRevisionApi
} from '@/composables/use-external-events'
import { aiStateStore } from '@/stores/ai-state'
import { editorStateStore } from '@/stores/editor-state'
import type { AITab } from '@/stores/ai-state'
import { AIAction } from '@vervedoc/docx-editor-ai'
import ShortcutsDialog from '@/components/dialogs/shortcutsDialog.vue'
import HyperlinkDialog from '@/components/dialogs/hyperlinkDialog.vue'
import BookmarkDialog from '@/components/dialogs/bookmarkDialog.vue'
import InsertTableDialog from '@/components/dialogs/tableDialog.vue'
import ChartDialog from '@/components/dialogs/chartDialog.vue'
import LaTeXDialog from '@/components/dialogs/latexDialog.vue'
import BarcodeDialog from '@/components/dialogs/barcodeDialog.vue'
import QrcodeDialog from '@/components/dialogs/qrcodeDialog.vue'
import SignatureDialog from '@/components/dialogs/signatureDialog.vue'
import WatermarkDialog from '@/components/dialogs/watermarkDialog.vue'
import PaperSizeDialog from '@/components/dialogs/paperSizeDialog.vue'

import DateDialog from '@/components/dialogs/dateDialog.vue'
import ParagraphDialog from '@/components/dialogs/paragraphDialog.vue'
import TocDialog from '@/components/dialogs/tocDialog.vue'
import TableBordersDialog from '@/components/dialogs/tableBordersDialog.vue'
import AISettingsDialog from '@/components/dialogs/aiSettingsDialog.vue'
import VersionHistoryDialog from '@/components/dialogs/versionHistoryDialog.vue'

import Menu from '@/components/layout/menu.vue'
import LeftDockBar from '@/components/layout/leftDockBar.vue'
import Footer from '@/components/layout/footer.vue'
import TocLayout from '@/components/sidebars/tocLayout.vue'
import SearchLayout from '@/components/sidebars/searchLayout.vue'
import AISidebarLayout from '@/components/sidebars/aiSidebarLayout.vue'
import AIResultLayout from '@/components/sidebars/aiResultLayout.vue'
import RevisionLayout from '@/components/sidebars/revisionLayout.vue'
import BookmarkLayout from '@/components/sidebars/bookmarkLayout.vue'
import Editor from '@/components/editor/editor.vue'
import AppSkeleton from '@/components/layout/loadingPlaceholder.vue'
import PasswordCard from '@/components/editor/passwordCard.vue'


import UnifiedTopHeader from '@/components/layout/unifiedTopHeader.vue'

import type { CollaborationOptions } from '@/editor/types'

import { useDocumentMeta } from '@/composables/use-document-meta'
import { useDock } from '@/composables/use-dock'
import { useDialogs } from '@/composables/use-dialogs'

import { useAIActions } from '@/composables/use-ai-actions'
import { useBookmarks } from '@/composables/use-bookmarks'
import { useEditorTocNav } from '@/composables/use-editor-toc-nav'
import { useEditorComments } from '@/composables/use-editor-comments'
import { useEditorRevisions } from '@/composables/use-editor-revisions'

import { useEditorSave } from '@/composables/use-editor-save'
import { useCollaboration } from '@/composables/use-collaboration'
import { useDocumentActions } from '@/composables/use-document-actions'
import { useEditorCommand } from '@/composables/use-editor-command'
import { replaceDocument } from '@/composables/use-replace-document'
import { deriveDocumentNameFromPath } from '@/utils'

/** 注入的初始文档对象 */
const initialDocument = inject<InitialDocument | null>(
  'docx-editor-ui:initDocument',
  null
)
/** 注入的协同配置 */
const collaborationConfig = inject<CollaborationOptions | null>(
  'docx-editor-ui:collaboration',
  null
)
/** 注入的文档导入回调 */
const importCallback = inject<DocxImportCallback | undefined>(
  'docx-editor-ui:importCallback',
  undefined
)
/** 注入的文档导出回调 */
const exportCallback = inject<DocxExportCallback | undefined>(
  'docx-editor-ui:exportCallback',
  undefined
)

/** 文档内容是否可见（受保护时为 false） */
const isContentVisible = ref(true)
/** 文档保护密码的 SHA-256 哈希值 */
const protectPasswordHash = ref<string | null>(null)
/** 密码弹窗是否可见 */
const passwordModalVisible = ref(false)
/** 密码弹窗模式：protect 为设置保护，unprotect 为解除保护 */
const passwordModalMode = ref<'protect' | 'unprotect'>('protect')
/** 密码弹窗加载状态 */
const passwordModalLoading = ref(false)
/** 密码弹窗错误信息 */
const passwordError = ref('')

/** localStorage 中存储保护密码哈希的键名 */
const PROTECT_HASH_KEY = 'docx-editor:protect-hash'

/**
 * 计算文本的 SHA-256 哈希值
 * @param text - 待哈希的文本
 * @returns 十六进制字符串形式的哈希值
 */
const sha256 = async (text: string): Promise<string> => {
  const data = new TextEncoder().encode(text)
  const hash = await globalThis.crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/** 从 localStorage 读取已存储的保护密码哈希 */
const storedHash = localStorage.getItem(PROTECT_HASH_KEY)
if (storedHash) {
  protectPasswordHash.value = storedHash
  isContentVisible.value = false
  passwordModalMode.value = 'unprotect'
  passwordModalVisible.value = true
}

/** 编辑器应用根节点引用 */
const editorAppRef = ref<HTMLElement | null>(null)
/** 编辑器区域节点引用 */
const editorAreaRef = ref<HTMLElement | null>(null)

/** 编辑器组件实例引用 */
const editorRef = ref<any>(null)
/** 底部栏组件实例引用 */
const footerRef = ref<any>(null)

/** 文档元信息、统计、标题等状态及操作方法 */
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

/** 应用忙碌状态：idle 空闲、loading 加载中、saving 保存中 */
const busyState = ref<'idle' | 'loading' | 'saving'>('idle')


/** 应用是否就绪 */
const isAppReady = ref(false)
/** 当内容不可见时立即标记应用就绪 */
watch(
  isContentVisible,
  visible => {
    if (!visible) isAppReady.value = true
  },
  { immediate: true }
)

/**
 * 获取编辑器实例
 * @returns 编辑器实例，若不可用则返回 null
 */
const getEditorInstance = () => editorRef.value?.getEditorInstance?.() ?? null
/**
 * 提供自动目录数据获取函数，供引用选项卡"自动目录"子菜单悬浮预览使用
 */
provide('docx-editor:getAutoToc', () => {
  const instance = getEditorInstance()
  return instance?.command?.getAutoToc?.() ?? null
})
/**
 * 获取批注组件实例（供内部 composable 使用，需要写操作能力）
 * @returns 批注组件实例，若不可用则返回 null
 */
const getCommentComponent = () => getEditorInstance()?.comment ?? null
/**
 * 刷新批注与修订覆盖层，在下一帧同步渲染并同步 API 状态
 */
const refreshReviewOverlays = () => {
  nextTick(() =>
    requestAnimationFrame(() => {
      getEditorInstance()?.getCommentView?.()?.render()
      commentAPI.sync()
      getEditorInstance()?.getRevisionView?.()?.update()
      revisionAPI.sync()
    })
  )
}





/**
 * 执行编辑器命令，转发至内部编辑器实例
 * @param command - 命令名称
 * @param args - 命令参数
 * @returns 编辑器命令执行结果
 */
const executeCommand = (command: string, ...args: any[]) => {
  const fn = editorRef.value?.executeCommand
  if (typeof fn === 'function') return fn(command, ...args)
}

/**
 * 获取搜索 API 实例
 * @returns 搜索 API，若不可用则返回 null
 */
const getSearchAPI = (): IEditorSearchApi | null => {
  return editorRef.value?.getSearchAPI?.() ?? null
}

/** 搜索 API 对象，代理内部搜索 API 并提供默认空结果 */
const searchAPI: IEditorSearchApi = {
  search(keyword) {
    return getSearchAPI()?.search(keyword) ?? { count: 0 }
  },
  getMatches() {
    return getSearchAPI()?.getMatches() ?? []
  },
  locate(index) {
    getSearchAPI()?.locate(index)
  },
  replaceOne(index, keyword, replacement) {
    return getSearchAPI()?.replaceOne(index, keyword, replacement) ?? { count: 0 }
  },
  replaceAll(keyword, replacement) {
    return getSearchAPI()?.replaceAll(keyword, replacement) ?? { count: 0 }
  },
  clear() {
    return getSearchAPI()?.clear() ?? { count: 0 }
  }
}

/** 一次性抑制保存标志，用于内容替换后避免触发自动保存 */
let suppressSaveOnce = false
/**
 * 设置一次性抑制保存标志
 * @param value - 是否抑制下一次保存
 */
const setSuppressSaveOnce = (value: boolean) => {
  suppressSaveOnce = value
}

/** 侧边栏停靠状态及操作方法 */
const {
  activeDock,
  sidebarPanelSize,
  closeRevisionDock,
  handleDockSelect: baseHandleDockSelect,
  closeDock,
  closeAIDock,
  handleResizeStart
} = useDock()

/** 对话框可见状态及确认处理方法 */
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

  handleDateConfirm,
  handleTocConfirm,
  handleInsertChartConfirm,
  handleInsertTableDialogConfirm,
  handleTableBordersConfirm
} = useDialogs({ executeCommand, documentMeta, emitMetaChange })

/** AI 操作处理方法 */
const {
  handleAIAction,
  handleAIApplyResult,
  handleAIRegenerate,
  handleAIResultClose
} = useAIActions({ getEditorInstance })

/** 书签 API */
const { bookmarkAPI } = useBookmarks({ getEditorInstance })
/** 批注 API */
const { commentAPI } = useEditorComments({
  getEditorInstance,
  getCommentComponent,
  getActiveGroupId: () => editorStateStore.state.groupIds?.[0] || ''
})

/** 工具栏是否可见 */
const toolbarVisible = ref(true)
/** 底部导航栏是否可见 */
const bottomNavVisible = ref(true)

/** 是否启用修订跟踪模式 */
const isTrackChanges = ref(false)
/** 修订 API */
const { revisionAPI } = useEditorRevisions({ getEditorInstance })
/** 修订列表 */
const revisionList = revisionAPI.revisionList
/** 目录 API */
const { tocNavAPI } = useEditorTocNav({
  getEditorInstance,
  executeCommand,
  activeDock
})

/**
 * 处理左侧停靠栏选择，目录或章节时打开目录面板，其余走基础处理
 * @param key - 停靠栏键值
 */
const handleDockSelect = (key: 'search' | 'toc' | 'section' | 'ai' | 'revision' | 'bookmark') => {
  if (key === 'toc' || key === 'section') {
    tocNavAPI.open(key)
    return
  }
  if (key === 'bookmark') {
    bookmarkAPI.refresh()
  }
  baseHandleDockSelect(key)
}

/** 对外暴露的书签 API，代理编辑器书签命令 */
const externalBookmarkAPI: ExternalBookmarkApi = {
  getState(): BookmarkState {
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

/** 对外暴露的修订 API，代理修订列表操作 */
const externalRevisionAPI: ExternalRevisionApi = {
  getState(): RevisionState {
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

/** 对外暴露的批注 API，代理批注创建、删除、定位等操作 */
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

/** 对外暴露的目录 API，代理目录列表、缩略图、定位等操作 */
const externalTocAPI: ExternalTocApi = {
  getState() {
    const state = tocNavAPI.getState()
    return {
      list: [...state.list],
      thumbnails: [...state.thumbnails],
      selectedId: state.selectedId,
      activeTab: state.activeTab,
      visible: state.visible
    }
  },
  sync() {
    return tocNavAPI.sync()
  },
  locate(id) {
    tocNavAPI.locate(id)
  },
  pageJump(index) {
    tocNavAPI.pageJump(index)
  },
  open(tab) {
    tocNavAPI.open(tab)
  },
  close() {
    tocNavAPI.close()
  },
  toggle(desired, tab) {
    tocNavAPI.toggle(desired, tab)
  },
  switchTab(tab) {
    tocNavAPI.switchTab(tab)
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

/** AI 状态对象 */
const aiState = aiStateStore.state

/** 文档是否已加载完成标志 */
let loaded = false

/** 编辑器保存相关方法 */
const { getSnapshot, saveNow, scheduleSave } = useEditorSave({
  getEditorInstance,
  getCommentComponent,
  documentMeta,
  busyState,
  emitMetaChange
})

/** 协同相关状态与方法 */
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
  executeCommand,
  documentMeta,
  editorRef,
  isSuppressSaveOnce: () => suppressSaveOnce,
  scheduleSave
})

/** 文档操作方法：重命名、新建、权限、反馈 */
const { renameDoc, newDoc, openAccessPermission, openFeedback } =
  useDocumentActions({
    documentMeta,
    emitMetaChange,
    executeCommand,
    saveNow,
    setSuppressSaveOnce,
    applyDocumentReplace
  })

/** 注册对外暴露的 API 对象 */
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
externalApi.toc = externalTocAPI

/**
 * 规范化文档内容结构，支持数组、含 main 的对象、含 data.main 的对象等多种形态
 * @param content - 原始内容
 * @returns 规范化后的包含 main、header、footer 字段的内容对象
 */
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

/**
 * 编辑器就绪回调：标记应用就绪、安装修订与批注覆盖层、加载初始内容、初始化协同
 * @param args - 编辑器就绪事件参数
 */
const handleReady = (...args: any[]) => {
  isAppReady.value = true
  emitExternalEvent('ready', args[0] ?? null)
  if (loaded) return
  loaded = true
  emitMetaChange()

  const instance = getEditorInstance()

  if (instance?.command) {
    // 修订：通过 core 合法入口注入回调，避免覆盖内部 host
    if (typeof instance.setRevisionCallbacks === 'function') {
      instance.setRevisionCallbacks({
        onAccept: (id: string) => executeCommand('acceptRevision', id),
        onReject: (id: string) => executeCommand('rejectRevision', id)
      })
    }
    revisionAPI.sync()
  }

  const updateRevisionList = () => {
    revisionAPI.sync()
  }

  if (instance?.listener) {
    instance.listener.content.contentListener(() => {
      updateRevisionList()
    })
  }

  installCommentCallbacks(instance)
  refreshReviewOverlays()
  void tocNavAPI.sync()

  // 初始内容优先级：content → url → 空文档（由宿主决定，不内置默认文件）
  const content = (initialDocument as any)?.content
  const sourceUrl = String((initialDocument as any)?.url || '').trim()

  if (content == null && sourceUrl) {
    busyState.value = 'loading'
    executeCommand('importJsonFile', {
      url: sourceUrl,
      onComplete: (success: boolean, message?: string) => {
        busyState.value = 'idle'
        tocNavAPI.open('toc')
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
    tocNavAPI.open('toc')
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
      tocNavAPI.open('toc')
      refreshReviewOverlays()
      nextTick(() => initCollaboration())
    }
  })()
}

/** 组件卸载前清理协同资源 */
onBeforeUnmount(() => {

  cleanupCollaboration()
})

/** 编辑器命令处理及保存回调 */
const { handleEditorCommand: baseHandleEditorCommand, handleEditorSaved } = useEditorCommand({
  footerRef,
  documentStats,
  commentAPI,
  tocNavAPI,
  revisionAPI,
  refreshReviewOverlays,
  isSuppressSaveOnce: () => suppressSaveOnce,
  setSuppressSaveOnce,
  getCollabPlugin,
  saveNow
})

/**
 * 编辑器命令处理包装函数，转发至基础处理方法
 * @param command - 命令名称
 * @param args - 命令参数
 */
const handleEditorCommand = (command: string, ...args: any[]) => {
  baseHandleEditorCommand(command, ...args)

}

/** 对话框命令到可见状态引用的映射表 */
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

  insertDate: dateDialogVisible,
  paragraphDialog: paragraphDialogVisible,
  versionHistory: versionHistoryDialogVisible,
  aiSettings: aiSettingsDialogVisible
}

/** 暂不支持功能的提示信息映射表 */
const infoMessages: Record<string, string> = {
  exportPdf: '暂不支持导出 PDF',
  exportHtml: '暂不支持导出 HTML',
  footnote: '暂不支持脚注',
  spellcheck: '暂不支持拼写检查',
  compare: '暂不支持比较文档',
  separatorDialog: '分割线颜色暂未接入'
}

/** AI 命令到 AI 动作配置的映射表 */
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

/** 处理文档导入：弹出文件选择框，调用导入回调并替换文档内容 */
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

/** 处理文档导出：获取编辑器内容并调用导出回调，触发浏览器下载 */
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

/** 处理文档保护：隐藏内容并弹出保护密码输入框 */
const handleProtectDoc = () => {
  passwordModalMode.value = 'protect'
  isContentVisible.value = false
  passwordModalVisible.value = true
}

/** 处理解除文档保护：弹出密码输入框以验证 */
const handleUnprotectDoc = () => {
  if (!protectPasswordHash.value) {
    message.warning('文档未受保护')
    return
  }
  passwordModalMode.value = 'unprotect'
  passwordModalVisible.value = true
}

/**
 * 处理密码确认：设置保护或验证密码解除保护
 * @param password - 用户输入的密码
 */
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

/** 处理密码弹窗取消：恢复保护前的可见状态并关闭弹窗 */
const handlePasswordCancel = () => {
  if (passwordModalMode.value === 'protect' && !protectPasswordHash.value) {
    isContentVisible.value = true
  }
  passwordError.value = ''
  passwordModalVisible.value = false
}

/**
 * 统一命令处理入口：分发对话框、AI、信息提示、文档操作、协同等命令
 * @param command - 命令名称
 * @param args - 命令参数
 */
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
    case 'editorStatus':
      footerRef.value?.updateEditorStatus?.(args[0])
      return
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
    case 'toggleToc':
      return tocNavAPI.toggle(
        typeof args[0] === 'boolean' ? (args[0] as boolean) : undefined,
        'toc'
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

/**
 * 处理版本历史恢复：抑制保存并替换文档内容
 * @param content - 要恢复的文档内容
 */
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

/**
 * 获取外部 API 对象
 * @returns 外部 API 对象
 */
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
  position: relative;
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
