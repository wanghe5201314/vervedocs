<template>
  <div ref="shellRef" class="docx-editor-lite-host" :class="{ 'is-mobile': isMobile }">
    <div class="lite-editor-root">
      <div v-if="isDesktop" class="top-fixed-area">
        <MenuBar
          :document-meta="documentMeta"
          :save-indicator-text="saveIndicatorText"
          :save-indicator-saving="saveIndicatorSaving"
          :active-dropdown="activeDropdown"
          @toggle-dropdown="toggleDropdown"
          @save="handleSave"
          @import-doc="handleImportDoc"
          @command="runCommand"
          @show-popup="showPopup"
        />
        <DesktopToolbar
          :zoom-text="zoomText"
          @command="runCommand"
          @font-change="handleFontChange"
          @font-size-change="handleFontSizeChange"
          @font-color-change="handleFontColorChange"
          @highlight-change="handleHighlightChange"
          @title-level-change="handleTitleLevelChange"
          @line-height-change="handleLineHeightChange"
          @show-popup="showPopup"
          @insert-image="insertImage"
        />
      </div>

      <MobileHeader
        v-if="isMobile"
        :document-meta="documentMeta"
        :more-menu-open="moreMenuOpen"
        :status-page-text="statusPageText"
        :status-words-text="statusWordsText"
        @toggle-catalog="toggleCatalog()"
        @save="handleSave"
        @toggle-more="moreMenuOpen = !moreMenuOpen"
        @import-doc="handleImportDoc"
        @command="runCommand"
        @show-popup="showPopup"
      />

      <div class="body-area">
        <CatalogSidebar
          v-if="isDesktop"
          :catalog-open="catalogOpen"
          :flat-catalog="flatCatalog"
          @toggle="toggleCatalog()"
          @catalog-click="handleCatalogClick"
        />

        <MobileCatalogDrawer
          v-if="isMobile"
          :catalog-open="catalogOpen"
          :flat-catalog="flatCatalog"
          @toggle="toggleCatalog()"
          @catalog-click="handleCatalogClick"
        />

        <div class="editor-wrapper" :class="{ 'mobile-editor-wrapper': isMobile }">
          <div ref="editorContainerRef" class="editor-container"></div>
        </div>
      </div>

      <StatusBar
        v-if="isDesktop"
        :catalog-open="catalogOpen"
        :status-words-text="statusWordsText"
        :status-page-text="statusPageText"
        :paper-direction-text="paperDirectionText"
        :selected-paper-size-label="selectedPaperSize.label"
        :selected-paper-size-index="selectedPaperSizeIndex"
        :paper-size-menu-open="paperSizeMenuOpen"
        :paper-sizes="PAPER_SIZES"
        :zoom-text="zoomText"
        @catalog-toggle="(checked: boolean) => toggleCatalog(checked)"
        @toggle-paper-direction="togglePaperDirection"
        @toggle-paper-size-menu="paperSizeMenuOpen = !paperSizeMenuOpen"
        @set-paper-size="setPaperSize"
        @command="runCommand"
      />


      <MobileBottomBar
        v-if="isMobile"
        :zoom-text="zoomText"
        @command="runCommand"
        @font-change="handleFontChange"
        @font-size-change="handleFontSizeChange"
        @font-color-change="handleFontColorChange"
        @highlight-change="handleHighlightChange"
        @title-level-change="handleTitleLevelChange"
        @line-height-change="handleLineHeightChange"
        @show-popup="showPopup"
        @insert-image="insertImage"
      />

      <div class="popup-overlay" :class="{ show: Boolean(activePopup) }" @click="closePopup"></div>

      <div class="popup-panel" :class="{ show: activePopup === 'table', 'mobile-popup': isMobile }">
        <div class="popup-title">插入表格</div>
        <div class="popup-row">
          <label>行数</label>
          <input v-model="tableRows" type="number" min="1" max="20" />
        </div>
        <div class="popup-row">
          <label>列数</label>
          <input v-model="tableCols" type="number" min="1" max="10" />
        </div>
        <div class="popup-actions">
          <button class="popup-btn popup-btn-secondary" @click="closePopup">取消</button>
          <button class="popup-btn popup-btn-primary" @click="confirmInsertTable">插入</button>
        </div>
      </div>

      <div class="popup-panel" :class="{ show: activePopup === 'link', 'mobile-popup': isMobile }">
        <div class="popup-title">插入链接</div>
        <div class="popup-row">
          <label>链接文字</label>
          <input v-model="linkText" type="text" placeholder="显示的文字" />
        </div>
        <div class="popup-row">
          <label>链接地址</label>
          <input v-model="linkUrl" type="url" placeholder="https://example.com" />
        </div>
        <div class="popup-actions">
          <button class="popup-btn popup-btn-secondary" @click="closePopup">取消</button>
          <button class="popup-btn popup-btn-primary" @click="confirmInsertLink">插入</button>
        </div>
      </div>

      <div class="popup-panel" :class="{ show: activePopup === 'search', 'mobile-popup': isMobile }">
        <div class="popup-title">查找和替换</div>
        <div class="popup-row">
          <label>查找</label>
          <input v-model="searchText" type="text" placeholder="输入要查找的内容" />
        </div>
        <div class="popup-row">
          <label>替换为</label>
          <input v-model="replaceText" type="text" placeholder="输入替换内容" />
        </div>
        <div class="popup-actions">
          <button class="popup-btn popup-btn-secondary" @click="doSearch">查找</button>
          <button class="popup-btn popup-btn-secondary" @click="doReplace">替换</button>
          <button class="popup-btn popup-btn-primary" @click="doReplaceAll">全部替换</button>
        </div>
      </div>

      <div class="popup-panel catalog-popup" :class="{ show: activePopup === 'catalog', 'mobile-popup': isMobile }">
        <div class="popup-title">插入自动目录</div>
        <div class="catalog-type-options">
          <label class="catalog-type-option" :class="{ active: autoCatalogType === 1 }">
            <input type="radio" v-model="autoCatalogType" :value="1" />
            <span>仅一级标题</span>
          </label>
          <label class="catalog-type-option" :class="{ active: autoCatalogType === 2 }">
            <input type="radio" v-model="autoCatalogType" :value="2" />
            <span>一至二级标题</span>
          </label>
          <label class="catalog-type-option" :class="{ active: autoCatalogType === 3 }">
            <input type="radio" v-model="autoCatalogType" :value="3" />
            <span>一至三级标题</span>
          </label>
        </div>
        <div class="catalog-preview">
          <div v-if="autoCatalogLoading" class="catalog-preview-empty">加载中...</div>
          <div v-else-if="!autoCatalogPreview.length" class="catalog-preview-empty">暂无标题内容</div>
          <div
            v-for="item in autoCatalogPreview"
            :key="item.id"
            class="catalog-preview-item"
            :class="`level-${item.level}`"
          >
            <span class="catalog-preview-name">{{ item.name }}</span>
            <span class="catalog-preview-page">第 {{ item.pageNo }} 页</span>
          </div>
        </div>
        <div class="popup-actions">
          <button class="popup-btn popup-btn-secondary" @click="closePopup">取消</button>
          <button class="popup-btn popup-btn-primary" :disabled="!autoCatalogPreview.length" @click="confirmInsertCatalog">插入</button>
        </div>
      </div>

      <div class="popup-panel shortcuts-popup" :class="{ show: activePopup === 'shortcuts', 'mobile-popup': isMobile }">
        <div class="popup-title">键盘快捷键</div>
        <div class="shortcuts-content">
          <div class="shortcut-group">
            <h3>文件操作</h3>
            <div class="shortcut-row"><span>保存</span><span><kbd>Ctrl</kbd> + <kbd>S</kbd></span></div>
            <div class="shortcut-row"><span>打印</span><span><kbd>Ctrl</kbd> + <kbd>P</kbd></span></div>
          </div>
          <div class="shortcut-group">
            <h3>编辑操作</h3>
            <div class="shortcut-row"><span>撤销</span><span><kbd>Ctrl</kbd> + <kbd>Z</kbd></span></div>
            <div class="shortcut-row"><span>重做</span><span><kbd>Ctrl</kbd> + <kbd>Y</kbd></span></div>
            <div class="shortcut-row"><span>加粗</span><span><kbd>Ctrl</kbd> + <kbd>B</kbd></span></div>
            <div class="shortcut-row"><span>斜体</span><span><kbd>Ctrl</kbd> + <kbd>I</kbd></span></div>
            <div class="shortcut-row"><span>下划线</span><span><kbd>Ctrl</kbd> + <kbd>U</kbd></span></div>
            <div class="shortcut-row"><span>插入链接</span><span><kbd>Ctrl</kbd> + <kbd>K</kbd></span></div>
          </div>
        </div>
        <div class="popup-actions">
          <button class="popup-btn popup-btn-primary" @click="closePopup">关闭</button>
        </div>
      </div>

      <div class="import-notification" :class="{ show: importNotificationVisible }">
        <h4>导入文档</h4>
        <p>{{ importInfoText }}</p>
        <div class="import-actions">
          <button class="import-btn import-btn-primary" @click="resolveImportMode('overwrite')">覆盖</button>
          <button class="import-btn import-btn-secondary" @click="resolveImportMode('append')">追加</button>
          <button class="import-btn import-btn-secondary" @click="resolveImportMode('cancel')">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {IDocxDocumentMeta, IEditorOption, IElement, TitleLevel} from '@vervedoc/core'
import DocxEditor, {TITLE_LEVEL, PAPER_SIZE_LIST, DEFAULT_PAPER_SIZE} from '@vervedoc/core'
import {computed, onBeforeUnmount, onMounted, reactive, ref} from 'vue'
import type {ImportMode, LiteEditorShellExposed, SaveSnapshot, WordEditorOptions} from '../object/word-editor.types'
import {useResponsive} from '../composables/useResponsive'
import {useTouch} from '../composables/useTouch'
import MenuBar from './components/MenuBar.vue'
import DesktopToolbar from './components/DesktopToolbar.vue'
import CatalogSidebar from './components/CatalogSidebar.vue'
import StatusBar from './components/StatusBar.vue'
import MobileHeader from './components/MobileHeader.vue'
import MobileBottomBar from './components/MobileBottomBar.vue'
import MobileCatalogDrawer from './components/MobileCatalogDrawer.vue'



interface CatalogItem {
  id?: string
  name?: string
  level?: string | number
  subCatalog?: CatalogItem[]
}

interface FlatCatalogItem {
  id?: string
  name: string
  level: number
}

const props = defineProps<Omit<WordEditorOptions, 'container'>>()

const { isMobile, isDesktop } = useResponsive()

const PAPER_SIZES = PAPER_SIZE_LIST

const TITLE_LEVEL_MAP: Record<string, TitleLevel> = {
  '1': TITLE_LEVEL.FIRST,
  '2': TITLE_LEVEL.SECOND,
  '3': TITLE_LEVEL.THIRD,
  '4': TITLE_LEVEL.FOURTH,
  '5': TITLE_LEVEL.FIFTH,
  '6': TITLE_LEVEL.SIXTH
}

const normalizeData = (data?: IDocxDocumentMeta | IElement[]) => {
  if (!data) return { success: true, elements: [] }
  return Array.isArray(data) ? { success: true, elements: data } : data
}

const randomId = () =>
  Array.from({ length: 4 }, () =>
    Math.random().toString(16).slice(2).toUpperCase().padEnd(4, '0').slice(0, 4)
  ).join('')

const shellRef = ref<HTMLDivElement | null>(null)
const editorContainerRef = ref<HTMLDivElement | null>(null)
const editor = ref<DocxEditor | null>(null)
const catalogRefreshTimer = ref<number | null>(null)
const activeDropdown = ref<string | null>(null)
const activePopup = ref<'table' | 'link' | 'search' | 'shortcuts' | 'catalog' | null>(null)
const catalogOpen = ref(false)
const paperDirection = ref<'vertical' | 'horizontal'>('vertical')
const selectedPaperSizeIndex = ref(PAPER_SIZE_LIST.findIndex(p => p.key === DEFAULT_PAPER_SIZE.key))
const paperSizeMenuOpen = ref(false)
const moreMenuOpen = ref(false)
const zoomText = ref('100%')
const statusPageText = ref('=共 1 页')
const statusWordsText = ref('0 字')
const saveIndicatorText = ref('')
const saveIndicatorSaving = ref(false)
const importNotificationVisible = ref(false)
const importInfoText = ref('')
const tableRows = ref(3)
const tableCols = ref(4)
const linkText = ref('')
const linkUrl = ref('')
const searchText = ref('')
const replaceText = ref('')
const importModeResolver = ref<((mode: ImportMode) => void) | null>(null)
const catalogItems = ref<CatalogItem[]>([])

interface AutoCatalogItem {
  id: string
  level: number
  name: string
  pageNo: number
}
interface AutoCatalogResult {
  catalog1: AutoCatalogItem[]
  catalog2: AutoCatalogItem[]
  catalog3: AutoCatalogItem[]
}
const autoCatalogData = ref<AutoCatalogResult | null>(null)
const autoCatalogType = ref<1 | 2 | 3>(1)
const autoCatalogLoading = ref(false)

useTouch(editorContainerRef, {
  minScale: 0.5,
  maxScale: 3,
  onSwipeLeft: () => {
    if (isMobile.value) toggleCatalog(false)
  },
  onSwipeRight: () => {
    if (isMobile.value) toggleCatalog(true)
  }
})

const documentMeta = reactive<SaveSnapshot['meta']>({
  id: `DEU${randomId()}`,
  name: props.title || '新建文档',
  createdAt: new Date().toISOString(),
  submittedAt: ''
})

const selectedPaperSize = computed(() => PAPER_SIZES[selectedPaperSizeIndex.value] || PAPER_SIZES[0])
const paperDirectionText = computed(() => (paperDirection.value === 'vertical' ? '纵向' : '横向'))
const flatCatalog = computed<FlatCatalogItem[]>(() => {
  const result: FlatCatalogItem[] = []

  const levelMap: Record<string, number> = {
    first: 1,
    second: 2,
    third: 3,
    fourth: 4,
    fifth: 5,
    sixth: 6
  }

  const walk = (items: CatalogItem[]) => {
    for (const item of items) {
      result.push({
        id: item.id,
        name: item.name || '',
        level: typeof item.level === 'number' ? item.level : levelMap[item.level || 'first'] || 1
      })
      if (item.subCatalog?.length) {
        walk(item.subCatalog)
      }
    }
  }

  walk(catalogItems.value)
  return result
})

const updateMobileScale = () => {
  if (!isMobile.value || !editorContainerRef.value) return
  const wrapper = editorContainerRef.value.parentElement
  if (!wrapper) return
  const availableWidth = wrapper.clientWidth - 24
  const paperWidth = selectedPaperSize.value.width
  const scale = Math.min(1, availableWidth / paperWidth)
  editorContainerRef.value.style.transform = `scale(${scale})`
  editorContainerRef.value.style.transformOrigin = 'top center'
  const realHeight = editorContainerRef.value.getBoundingClientRect().height / scale
  editorContainerRef.value.style.height = `${Math.round(realHeight * scale)}px`
}

const createEditor = () => {
  if (!editorContainerRef.value) return
  editor.value = new DocxEditor(editorContainerRef.value, normalizeData(props.data), {
    pageWidth: selectedPaperSize.value.width,
    pageHeight: selectedPaperSize.value.height,
    pageMargins: isMobile.value ? [48, 60, 48, 60] : [96, 120, 96, 120],
    defaultFont: '微软雅黑',
    defaultSize: 14,
    marginIndicatorDisabled: isMobile.value,
    ...(props.options as IEditorOption | undefined)
  })

  editor.value.listener.on('contentChange', () => {
    void updateWordCount()
    refreshCatalogLater()
    props.onChange?.()
    if (isMobile.value) {
      requestAnimationFrame(() => updateMobileScale())
    }
  })

  editor.value.listener.on('pageSizeChange', (size: { width: number; height: number }) => {
    statusPageText.value = `共 ${Math.round(size.height / 1123) || 1} 页`
    props.onPageChange?.(Math.round(size.height / 1123) || 1)
    if (isMobile.value) {
      requestAnimationFrame(() => updateMobileScale())
    }
  })

  editor.value.listener.on('pageScaleChange', (scale: number) => {
    zoomText.value = `${Math.round(scale * 100)}%`
    props.onScaleChange?.(scale)
  })

  props.onReady?.(editor.value)
}

const focusEditorAgent = () => {
  const proxyDom = (editor.value as any)?.command?.__proxyGetAgentDom?.()
  const fallback = editorContainerRef.value?.querySelector<HTMLElement>('textarea')
  ;(proxyDom || fallback)?.focus?.()
}

const runCommand = <T = any>(command: string, ...args: any[]): T | undefined => {
  if (!editor.value) return undefined
  try {
    focusEditorAgent()
    const cmd = editor.value.command as any
    const fn = cmd?.[command]
    if (typeof fn === 'function') {
      return fn.call(cmd, ...args) as T
    }
  } catch (error) {
    console.error(`执行失败: ${command}`, error)
  }
  return undefined
}

const runCommandWithFallback = (commands: string[], ...args: any[]) => {
  for (const command of commands) {
    const fn = (editor.value?.command as any)?.[command]
    if (typeof fn === 'function') {
      return runCommand(command, ...args)
    }
  }
  return undefined
}

const closeDropdowns = () => {
  activeDropdown.value = null
  paperSizeMenuOpen.value = false
  moreMenuOpen.value = false
}

const toggleDropdown = (name: string) => {
  paperSizeMenuOpen.value = false
  moreMenuOpen.value = false
  activeDropdown.value = activeDropdown.value === name ? null : name
}

const showPopup = (name: 'table' | 'link' | 'search' | 'shortcuts' | 'catalog') => {
  closeDropdowns()
  activePopup.value = name
  if (name === 'catalog') {
    void loadAutoCatalog()
  }
}

const closePopup = () => {
  activePopup.value = null
}

const updateWordCount = async () => {
  const result = await Promise.resolve(runCommand<any>('getWordCount'))
  const count =
    typeof result === 'number'
      ? result
      : typeof result === 'object' && result && 'count' in result
        ? Number(result.count || 0)
        : 0
  statusWordsText.value = `${count} 字`
}

const refreshCatalog = async () => {
  if (!catalogOpen.value) return
  const catalog = await Promise.resolve(runCommand<CatalogItem[]>('getCatalog'))
  catalogItems.value = Array.isArray(catalog) ? catalog : []
}

const loadAutoCatalog = async () => {
  autoCatalogLoading.value = true
  try {
    const result = await Promise.resolve(runCommand<AutoCatalogResult>('getAutoCatalog'))
    autoCatalogData.value = result || null
  } catch {
    autoCatalogData.value = null
  }
  autoCatalogLoading.value = false
}

const autoCatalogPreview = computed<AutoCatalogItem[]>(() => {
  if (!autoCatalogData.value) return []
  if (autoCatalogType.value === 1) return autoCatalogData.value.catalog1
  if (autoCatalogType.value === 2) return autoCatalogData.value.catalog2
  return autoCatalogData.value.catalog3
})

const confirmInsertCatalog = () => {
  runCommand('executeInsertAutoCatalog', autoCatalogType.value)
  closePopup()
}

const refreshCatalogLater = (delay = 1000) => {
  if (catalogRefreshTimer.value) {
    window.clearTimeout(catalogRefreshTimer.value)
  }
  catalogRefreshTimer.value = window.setTimeout(() => {
    void refreshCatalog()
  }, delay)
}

const toggleCatalog = (force?: boolean) => {
  catalogOpen.value = typeof force === 'boolean' ? force : !catalogOpen.value
  if (catalogOpen.value) {
    refreshCatalogLater(0)
  }
}


const handleCatalogClick = (id?: string) => {
  if (id) {
    runCommand('executeLocationCatalog', id)
  }
  if (isMobile.value) {
    toggleCatalog(false)
  }
}

const applyPaperSize = () => {
  const width = paperDirection.value === 'horizontal' ? selectedPaperSize.value.height : selectedPaperSize.value.width
  const height = paperDirection.value === 'horizontal' ? selectedPaperSize.value.width : selectedPaperSize.value.height
  runCommand('executePaperSize', width, height)
  if (isMobile.value) {
    requestAnimationFrame(() => updateMobileScale())
  }
}

const togglePaperDirection = () => {
  paperDirection.value = paperDirection.value === 'vertical' ? 'horizontal' : 'vertical'
  runCommand('executePaperDirection', paperDirection.value)
  applyPaperSize()
}

const setPaperSize = (index: number) => {
  selectedPaperSizeIndex.value = index
  paperSizeMenuOpen.value = false
  applyPaperSize()
}

const confirmInsertTable = () => {
  runCommand('executeInsertTable', Number(tableRows.value) || 3, Number(tableCols.value) || 4)
  closePopup()
}

const confirmInsertLink = () => {
  const url = linkUrl.value.trim()
  if (!url) return
  const text = linkText.value.trim() || url
  runCommand('executeHyperlink', { type: 'hyperlink', value: text, url })
  closePopup()
}

const doSearch = () => {
  const keyword = searchText.value.trim()
  if (!keyword) return
  const result = runCommand<{ count?: number }>('executeSearch', keyword)
  alert(`找到 ${result?.count || 0} 处匹配`)
}

const doReplace = () => {
  const keyword = searchText.value.trim()
  if (!keyword) return
  runCommand('executeSearch', keyword)
  runCommand('executeReplace', replaceText.value)
}

const doReplaceAll = () => {
  const keyword = searchText.value.trim()
  if (!keyword) return
  runCommand('executeSearch', keyword)
  let count = 0
  while (runCommand('executeReplace', replaceText.value)) {
    count += 1
    if (count > 1000) break
  }
  alert(`已替换 ${count} 处`)
}

const insertImage = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = (event) => {
    const target = event.target as HTMLInputElement | null
    const file = target?.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      const value = loadEvent.target?.result
      if (typeof value !== 'string') return
      const image = new Image()
      image.onload = () => {
        const maxWidth = 400
        const scale = image.width > maxWidth ? maxWidth / image.width : 1
        runCommand('executeImage', {
          value,
          width: Math.round(image.width * scale),
          height: Math.round(image.height * scale)
        })
      }
      image.src = value
    }
    reader.readAsDataURL(file)
  }
  input.click()
}

const formatTime = (date: Date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`

const handleSave = () => {
  closeDropdowns()
  try {
    const content = runCommand('getValue')
    documentMeta.submittedAt = new Date().toISOString()
    const snapshot: SaveSnapshot = {
      meta: { ...documentMeta },
      content
    }
    saveIndicatorText.value = '保存中...'
    saveIndicatorSaving.value = true
    window.setTimeout(() => {
      saveIndicatorText.value = `已保存 ${formatTime(new Date())}`
      saveIndicatorSaving.value = false
    }, 300)
    props.onSave?.(snapshot)
  } catch (error) {
    saveIndicatorText.value = '保存失败'
    saveIndicatorSaving.value = false
    console.error('保存失败:', error)
  }
}

const handleImportDoc = () => {
  closeDropdowns()
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.doc,.docx'
  input.onchange = (event) => {
    const target = event.target as HTMLInputElement | null
    const file = target?.files?.[0]
    if (!file) return

    const sizeLabel =
      file.size < 1024 * 1024
        ? `${(file.size / 1024).toFixed(1)} KB`
        : `${(file.size / 1024 / 1024).toFixed(1)} MB`

    importInfoText.value = `${file.name} (${sizeLabel})`
    importNotificationVisible.value = true

    importModeResolver.value = (mode) => {
      importNotificationVisible.value = false
      if (mode === 'cancel') return

      documentMeta.id = `DEU${randomId()}`
      documentMeta.name = file.name.replace(/\.\w+$/, '') || '导入文档'

      const reader = new FileReader()
      reader.onload = async (loadEvent) => {
        try {
          const arrayBuffer = loadEvent.target?.result
          if (!(arrayBuffer instanceof ArrayBuffer)) return
          if (!props.importCallback) {
            alert('未注入文档导入回调 importCallback，无法导入 .docx 文件')
            return
          }
          const result = await props.importCallback(arrayBuffer)
          if (!result.success || !result.elements?.length) {
            alert(`文档解析失败: ${result.error || '未知错误'}`)
            return
          }

          if (mode === 'overwrite') {
            runCommand('executeSetValue', { elements: result.elements })
          } else {
            const current = runCommand<any>('getValue')
            const currentElements = current?.elements || []
            runCommand('executeSetValue', { elements: [...currentElements, ...result.elements] })
          }

          await updateWordCount()
          await refreshCatalog()
          handleSave()
        } catch (error) {
          console.error('导入失败:', error)
          alert(`导入失败: ${(error as Error)?.message || '未知错误'}`)
        }
      }
      reader.readAsArrayBuffer(file)
    }
  }
  input.click()
}

const resolveImportMode = (mode: ImportMode) => {
  const resolver = importModeResolver.value
  importModeResolver.value = null
  resolver?.(mode)
}

const handleFontChange = (value: string) => {
  runCommand('executeFont', value)
}

const handleFontSizeChange = (value: number) => {
  runCommand('executeSize', value)
}

const handleFontColorChange = (value: string) => {
  runCommand('executeColor', value)
}

const handleHighlightChange = (value: string) => {
  runCommand('executeHighlight', value)
}

const handleTitleLevelChange = (value: string) => {
  runCommand('executeTitle', value ? TITLE_LEVEL_MAP[value] : null)
}

const handleLineHeightChange = (value: number) => {
  runCommandWithFallback(['executeLineHeight', 'executeRowMargin'], value)
}

const handleGlobalMouseDown = (event: MouseEvent) => {
  const target = event.target
  if (!(target instanceof Node)) return
  if (shellRef.value?.contains(target)) return
  closeDropdowns()
  closePopup()
}

const handleGlobalKeyDown = (event: KeyboardEvent) => {
  const target = event.target
  if (!(target instanceof Node) || !shellRef.value?.contains(target)) return

  const ctrl = event.ctrlKey || event.metaKey

  const key = event.key.toLowerCase()

  if (ctrl && key === 's') {
    event.preventDefault()
    handleSave()
    return
  }
  if (ctrl && key === 'p') {
    event.preventDefault()
    runCommand('executePrint')
    return
  }
  if (ctrl && key === 'f') {
    event.preventDefault()
    showPopup('search')
    return
  }
  if (ctrl && key === 'h') {
    event.preventDefault()
    showPopup('search')
    return
  }
  if (ctrl && key === 'k') {
    event.preventDefault()
    showPopup('link')
    return
  }

}

const destroyShell = () => {
  if (catalogRefreshTimer.value) {
    window.clearTimeout(catalogRefreshTimer.value)
    catalogRefreshTimer.value = null
  }
  importModeResolver.value = null
  editor.value?.destroy()
  editor.value = null
}

const setTitle = (title: string) => {
  documentMeta.name = title || '新建文档'
}

let mobileResizeObserver: ResizeObserver | null = null

onMounted(() => {
  createEditor()
  void updateWordCount()
  refreshCatalogLater(600)
  document.addEventListener('mousedown', handleGlobalMouseDown)
  document.addEventListener('keydown', handleGlobalKeyDown)

  if (isMobile.value && editorContainerRef.value) {
    requestAnimationFrame(() => updateMobileScale())
    mobileResizeObserver = new ResizeObserver(() => updateMobileScale())
    mobileResizeObserver.observe(editorContainerRef.value)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleGlobalMouseDown)
  document.removeEventListener('keydown', handleGlobalKeyDown)
  mobileResizeObserver?.disconnect()
  mobileResizeObserver = null
  destroyShell()
})

defineExpose<LiteEditorShellExposed>({
  getInstance: () => editor.value,
  getCommand: () => editor.value?.command,
  getListener: () => editor.value?.listener,
  executeCommand: (command: string, ...args: any[]) => runCommand(command, ...args),
  setTitle,
  destroyShell
})
</script>

<style src="../object/word-editor.css"></style>
