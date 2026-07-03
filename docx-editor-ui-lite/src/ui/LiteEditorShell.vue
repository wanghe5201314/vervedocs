<template>
  <div ref="shellRef" class="docx-editor-lite-host">
    <div class="lite-editor-root">
      <div class="top-fixed-area">
        <div class="menu-bar">
          <div class="logo" aria-hidden="true">
            <svg viewBox="0 0 1024 1024" width="40" height="40">
              <path d="M205.5 64H674l223 225.5V935c0 13.807-11.193 25-25 25H205.5c-13.807 0-25-11.193-25-25V89c0-13.807 11.193-25 25-25z" fill="#FFFFFF" />
              <path d="M674 64v200.5c0 13.807 11.193 25 25 25h198L674 64z" fill="#E5E5E5" />
              <path d="M67 193m16 0l287 0q16 0 16 16l0 287q0 16-16 16l-287 0q-16 0-16-16l0-287q0-16 16-16Z" fill="#4297FC" />
              <path d="M255 571m10 0l556 0q10 0 10 10l0 0q0 10-10 10l-556 0q-10 0-10-10l0 0q0-10 10-10Z" fill="#D8D8D8" />
              <path d="M255 707m10 0l556 0q10 0 10 10l0 0q0 10-10 10l-556 0q-10 0-10-10l0 0q0-10 10-10Z" fill="#D8D8D8" />
              <path d="M255 639m10 0l556 0q10 0 10 10l0 0q0 10-10 10l-556 0q-10 0-10-10l0 0q0-10 10-10Z" fill="#D8D8D8" />
              <path d="M255 774m10 0l556 0q10 0 10 10l0 0q0 10-10 10l-556 0q-10 0-10-10l0 0q0-10 10-10Z" fill="#D8D8D8" />
              <path d="M255 842m10 0l556 0q10 0 10 10l0 0q0 10-10 10l-556 0q-10 0-10-10l0 0q0-10 10-10Z" fill="#D8D8D8" />
              <path d="M315.269 451.314c7.015 7.61 19.731 2.651 19.731-7.693V271h-22.737v143.524l-76.9-83.418c-4.503-4.885-12.223-4.885-16.726 0l-76.9 83.418V271H119v172.62c0 10.345 12.716 15.303 19.731 7.694L227 355.564l88.269 95.75z" fill="#FFFFFF" />
            </svg>
          </div>
          <div class="doc-info">
            <div class="doc-title-row">
              <input
                v-model="documentMeta.name"
                class="doc-title"
                :title="documentMeta.name"
              />
              <span class="save-indicator" :class="{ saving: saveIndicatorSaving }">{{ saveIndicatorText }}</span>
            </div>
            <div class="menu-items">
              <div class="menu-item" @click.stop="toggleDropdown('file')">
                文件
                <div class="dropdown-menu" :class="{ show: activeDropdown === 'file' }">
                  <div class="dropdown-item" @click.stop="handleSave">
                    <span>保存</span>
                    <span class="shortcut-hint">Ctrl+S</span>
                  </div>
                  <div class="dropdown-item" @click.stop="handleImportDoc">导入文档</div>
                  <div class="dropdown-separator"></div>
                  <div class="dropdown-item" @click.stop="runCommand('executePrint')">
                    <span>打印</span>
                    <span class="shortcut-hint">Ctrl+P</span>
                  </div>
                </div>
              </div>
              <div class="menu-item" @click.stop="toggleDropdown('help')">
                帮助
                <div class="dropdown-menu" :class="{ show: activeDropdown === 'help' }">
                  <div class="dropdown-item" @click.stop="showPopup('shortcuts')">快捷键</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="toolbar">
          <button class="toolbar-btn" title="撤销 (Ctrl+Z)" @click="runCommand('executeUndo')"><span class="material-icons">undo</span></button>
          <button class="toolbar-btn" title="重做 (Ctrl+Y)" @click="runCommand('executeRedo')"><span class="material-icons">redo</span></button>
          <button class="toolbar-btn" title="打印 (Ctrl+P)" @click="runCommand('executePrint')"><span class="material-icons">print</span></button>
          <button class="toolbar-btn" title="格式刷" @click="runCommand('executePainter')"><span class="material-icons">format_paint</span></button>
          <div class="toolbar-divider"></div>
          <div class="zoom-control">
            <button class="toolbar-btn" title="缩小" @click="runCommand('executePageScaleMinus')"><span class="material-icons">remove</span></button>
            <span class="zoom-value">{{ zoomText }}</span>
            <button class="toolbar-btn" title="放大" @click="runCommand('executePageScaleAdd')"><span class="material-icons">add</span></button>
          </div>
          <div class="toolbar-divider"></div>
          <select class="toolbar-select" style="width: 120px;" title="字体" @change="handleFontChange">
            <option value="">字体</option>
            <option value="宋体">宋体</option>
            <option value="黑体">黑体</option>
            <option value="微软雅黑" selected>微软雅黑</option>
            <option value="楷体">楷体</option>
            <option value="仿宋">仿宋</option>
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times New Roman</option>
          </select>
          <button class="toolbar-btn" title="减小字号" @click="runCommand('executeSizeMinus')"><span class="material-icons">remove_circle_outline</span></button>
          <select class="toolbar-select" style="width: 60px;" title="字号" @change="handleFontSizeChange">
            <option value="10">10</option>
            <option value="12">12</option>
            <option value="14" selected>14</option>
            <option value="16">16</option>
            <option value="18">18</option>
            <option value="20">20</option>
            <option value="24">24</option>
            <option value="28">28</option>
            <option value="32">32</option>
            <option value="36">36</option>
            <option value="48">48</option>
            <option value="72">72</option>
          </select>
          <button class="toolbar-btn" title="增大字号" @click="runCommand('executeSizeAdd')"><span class="material-icons">add_circle_outline</span></button>
          <div class="toolbar-divider"></div>
          <button class="toolbar-btn" title="加粗 (Ctrl+B)" @click="runCommand('executeBold')"><span class="material-icons">format_bold</span></button>
          <button class="toolbar-btn" title="斜体 (Ctrl+I)" @click="runCommand('executeItalic')"><span class="material-icons">format_italic</span></button>
          <button class="toolbar-btn" title="下划线 (Ctrl+U)" @click="runCommand('executeUnderline')"><span class="material-icons">format_underlined</span></button>
          <button class="toolbar-btn" title="删除线" @click="runCommand('executeStrikeout')"><span class="material-icons">strikethrough_s</span></button>
          <input class="color-picker" type="color" value="#000000" title="文字颜色" @change="handleFontColorChange" />
          <input class="color-picker" type="color" value="#ffff00" title="高亮颜色" @change="handleHighlightChange" />
          <div class="toolbar-divider"></div>
          <button class="toolbar-btn" title="插入链接 (Ctrl+K)" @click="showPopup('link')"><span class="material-icons">link</span></button>
          <div class="toolbar-divider"></div>
          <select class="toolbar-select" style="width: 100px;" title="标题样式" @change="handleTitleLevelChange">
            <option value="">正文</option>
            <option value="1">标题 1</option>
            <option value="2">标题 2</option>
            <option value="3">标题 3</option>
            <option value="4">标题 4</option>
            <option value="5">标题 5</option>
            <option value="6">标题 6</option>
          </select>
          <div class="toolbar-divider"></div>
          <button class="toolbar-btn" title="左对齐" @click="runCommand('executeRowFlex', RowFlex.LEFT)"><span class="material-icons">format_align_left</span></button>
          <button class="toolbar-btn" title="居中对齐" @click="runCommand('executeRowFlex', RowFlex.CENTER)"><span class="material-icons">format_align_center</span></button>
          <button class="toolbar-btn" title="右对齐" @click="runCommand('executeRowFlex', RowFlex.RIGHT)"><span class="material-icons">format_align_right</span></button>
          <button class="toolbar-btn" title="两端对齐" @click="runCommand('executeRowFlex', RowFlex.JUSTIFY)"><span class="material-icons">format_align_justify</span></button>
          <div class="toolbar-divider"></div>
          <select class="toolbar-select" title="行间距" @change="handleLineHeightChange">
            <option value="1">单倍行距</option>
            <option value="1.15">1.15 倍行距</option>
            <option value="1.5">1.5 倍行距</option>
            <option value="2">双倍行距</option>
          </select>
          <div class="toolbar-divider"></div>
          <button class="toolbar-btn" title="项目符号列表" @click="runCommand('executeList', ListType.UL, ListStyle.DISC)"><span class="material-icons">format_list_bulleted</span></button>
          <button class="toolbar-btn" title="编号列表" @click="runCommand('executeList', ListType.OL, ListStyle.DECIMAL)"><span class="material-icons">format_list_numbered</span></button>
          <button class="toolbar-btn" title="清除格式" @click="runCommand('executeFormat')"><span class="material-icons">format_clear</span></button>
        </div>

        <div class="toolbar toolbar-secondary">
          <button class="toolbar-btn" title="插入图片" @click="insertImage"><span class="material-icons">image</span></button>
          <button class="toolbar-btn" title="插入表格" @click="showPopup('table')"><span class="material-icons">table_chart</span></button>
          <div class="toolbar-divider"></div>
          <button class="toolbar-btn" title="插入分隔线" @click="runCommand('executeSeparator')"><span class="material-icons">horizontal_rule</span></button>
          <button class="toolbar-btn" title="插入分页符" @click="runCommand('executePageBreak')"><span class="material-icons">insert_page_break</span></button>
          <div class="toolbar-divider"></div>
          <button class="toolbar-btn" title="查找和替换 (Ctrl+H)" @click="showPopup('search')"><span class="material-icons">find_replace</span></button>
        </div>
      </div>

      <div class="body-area">
        <div class="catalog-sidebar" :class="{ open: catalogOpen }">
          <div class="catalog-sidebar-inner">
            <div class="catalog-header">
              <h3>目录</h3>
              <button class="catalog-close" title="关闭目录" @click="toggleCatalog()">
                <span class="material-icons" style="font-size: 18px;">close</span>
              </button>
            </div>
            <div class="catalog-tree">
              <div v-if="!flatCatalog.length" class="catalog-empty">暂无目录</div>
              <div
                v-for="item in flatCatalog"
                :key="`${item.id || item.name}-${item.level}`"
                class="catalog-node"
                :class="`level-${item.level}`"
                :title="item.name"
                @click="handleCatalogClick(item.id)"
              >
                {{ item.name }}
              </div>
            </div>
          </div>
        </div>

        <div class="editor-wrapper">
          <div ref="editorContainerRef" class="editor-container"></div>
        </div>
      </div>

      <div class="status-bar">
        <div class="status-left">
          <label class="catalog-toggle-label">
            <input
              type="checkbox"
              :checked="catalogOpen"
              @change="handleCatalogToggleChange"
            />
            <span>显示导航窗格</span>
          </label>
          <span class="status-divider"></span>
          <span>{{ statusWordsText }}</span>
          <span class="status-divider"></span>
          <span>{{ statusPageText }}</span>
          <span class="status-divider"></span>
          <button class="status-btn" @click="togglePaperDirection">{{ paperDirectionText }}</button>
          <span class="status-divider"></span>
          <div class="paper-size-wrap">
            <button class="status-btn" @click.stop="paperSizeMenuOpen = !paperSizeMenuOpen">{{ selectedPaperSize.label }}</button>
            <div class="paper-size-dropdown" :class="{ show: paperSizeMenuOpen }">
              <div
                v-for="(paperSize, index) in PAPER_SIZES"
                :key="paperSize.label"
                class="paper-size-item"
                :class="{ active: index === selectedPaperSizeIndex }"
                @click.stop="setPaperSize(index)"
              >
                {{ paperSize.label }}
              </div>
            </div>
          </div>
        </div>
        <div class="status-right">
          <button class="toolbar-btn status-btn status-icon-btn" title="缩小" @click="runCommand('executePageScaleMinus')"><span class="material-icons">remove</span></button>
          <span class="zoom-display">{{ zoomText }}</span>
          <button class="toolbar-btn status-btn status-icon-btn" title="放大" @click="runCommand('executePageScaleAdd')"><span class="material-icons">add</span></button>
        </div>
      </div>

      <div class="popup-overlay" :class="{ show: Boolean(activePopup) }" @click="closePopup"></div>

      <div class="popup-panel" :class="{ show: activePopup === 'table' }">
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

      <div class="popup-panel" :class="{ show: activePopup === 'link' }">
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

      <div class="popup-panel" :class="{ show: activePopup === 'search' }">
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

      <div class="popup-panel shortcuts-popup" :class="{ show: activePopup === 'shortcuts' }">
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
import DocxEditor, {
  ListStyle,
  ListType,
  RowFlex,
  TitleLevel,
  parseDocx
} from '@wanghe1995/docx-editor-core'
import type { IEditorData, IElement, IEditorOption } from '@wanghe1995/docx-editor-core'
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import type {
  ImportMode,
  LiteEditorShellExposed,
  SaveSnapshot,
  WordEditorOptions
} from '../object/word-editor.types'

interface PaperSizePreset {
  label: string
  width: number
  height: number
}

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

const PAPER_SIZES: PaperSizePreset[] = [
  { label: 'A4 (21×29.7cm)', width: 794, height: 1123 },
  { label: 'A3 (29.7×42cm)', width: 1190, height: 1684 },
  { label: 'A5 (14.8×21cm)', width: 559, height: 794 },
  { label: 'A6 (10.5×14.8cm)', width: 396, height: 559 },
  { label: 'B4 (25×35.3cm)', width: 709, height: 1000 },
  { label: 'B5 (17.6×25cm)', width: 498, height: 709 },
  { label: 'Letter (21.6×27.9cm)', width: 612, height: 792 },
  { label: 'Legal (21.6×35.6cm)', width: 612, height: 1008 }
]

const TITLE_LEVEL_MAP: Record<string, TitleLevel> = {
  '1': TitleLevel.FIRST,
  '2': TitleLevel.SECOND,
  '3': TitleLevel.THIRD,
  '4': TitleLevel.FOURTH,
  '5': TitleLevel.FIFTH,
  '6': TitleLevel.SIXTH
}

const normalizeData = (data?: IEditorData | IElement[]) => {
  if (!data) return { main: [] }
  return Array.isArray(data) ? { main: data } : data
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
const activePopup = ref<'table' | 'link' | 'search' | 'shortcuts' | null>(null)
const catalogOpen = ref(true)
const paperDirection = ref<'vertical' | 'horizontal'>('vertical')
const selectedPaperSizeIndex = ref(0)
const paperSizeMenuOpen = ref(false)
const zoomText = ref('100%')
const statusPageText = ref('第 1 页')
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

const createEditor = () => {
  if (!editorContainerRef.value) return
  editor.value = new DocxEditor(editorContainerRef.value, normalizeData(props.data), {
    width: selectedPaperSize.value.width,
    height: selectedPaperSize.value.height,
    margins: [96, 120, 96, 120],
    defaultFont: '微软雅黑',
    defaultSize: 14,
    ...(props.options as IEditorOption | undefined)
  })

  editor.value.listener.contentChange = () => {
    void updateWordCount()
    refreshCatalogLater()
    props.onChange?.()
  }

  editor.value.listener.pageSizeChange = (pageNo: number) => {
    statusPageText.value = `第 ${pageNo} 页`
    props.onPageChange?.(pageNo)
  }

  editor.value.listener.pageScaleChange = (scale: number) => {
    const percent = `${Math.round(scale * 100)}%`
    zoomText.value = percent
    props.onScaleChange?.(scale)
  }

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
    const fn = (editor.value.command as any)?.[command]
    if (typeof fn === 'function') {
      return fn(...args) as T
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
}

const toggleDropdown = (name: string) => {
  paperSizeMenuOpen.value = false
  activeDropdown.value = activeDropdown.value === name ? null : name
}

const showPopup = (name: 'table' | 'link' | 'search' | 'shortcuts') => {
  closeDropdowns()
  activePopup.value = name
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

const handleCatalogToggleChange = (event: Event) => {
  const checked = (event.target as HTMLInputElement).checked
  toggleCatalog(checked)
}

const handleCatalogClick = (id?: string) => {
  if (id) {
    runCommand('executeLocationCatalog', id)
  }
}

const applyPaperSize = () => {
  const width = paperDirection.value === 'horizontal' ? selectedPaperSize.value.height : selectedPaperSize.value.width
  const height = paperDirection.value === 'horizontal' ? selectedPaperSize.value.width : selectedPaperSize.value.height
  runCommand('executePaperSize', width, height)
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
          const result = await parseDocx(arrayBuffer)
          if (!result.success || !result.elements?.length) {
            alert(`文档解析失败: ${result.error || '未知错误'}`)
            return
          }

          if (mode === 'overwrite') {
            runCommand('executeSetValue', { main: result.elements })
          } else {
            const current = runCommand<any>('getValue')
            const currentElements = current?.data?.main || current?.main || []
            runCommand('executeSetValue', { main: [...currentElements, ...result.elements] })
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

const handleFontChange = (event: Event) => {
  runCommand('executeFont', (event.target as HTMLSelectElement).value)
}

const handleFontSizeChange = (event: Event) => {
  runCommand('executeSize', Number((event.target as HTMLSelectElement).value))
}

const handleFontColorChange = (event: Event) => {
  runCommand('executeColor', (event.target as HTMLInputElement).value)
}

const handleHighlightChange = (event: Event) => {
  runCommand('executeHighlight', (event.target as HTMLInputElement).value)
}

const handleTitleLevelChange = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value
  runCommand('executeTitle', value ? TITLE_LEVEL_MAP[value] : null)
}

const handleLineHeightChange = (event: Event) => {
  runCommandWithFallback(['executeLineHeight', 'executeRowMargin'], Number((event.target as HTMLSelectElement).value))
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
  const shift = event.shiftKey
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
  if (ctrl && !shift && key === 'z') {
    event.preventDefault()
    runCommand('executeUndo')
    return
  }
  if ((ctrl && shift && key === 'z') || (ctrl && key === 'y')) {
    event.preventDefault()
    runCommand('executeRedo')
    return
  }
  if (ctrl && key === 'b') {
    event.preventDefault()
    runCommand('executeBold')
    return
  }
  if (ctrl && key === 'i') {
    event.preventDefault()
    runCommand('executeItalic')
    return
  }
  if (ctrl && key === 'u') {
    event.preventDefault()
    runCommand('executeUnderline')
    return
  }
  if (ctrl && key === '\\') {
    event.preventDefault()
    runCommand('executeFormat')
    return
  }
  if (ctrl && key === 'enter') {
    event.preventDefault()
    runCommand('executePageBreak')
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

onMounted(() => {
  createEditor()
  void updateWordCount()
  refreshCatalogLater(600)
  document.addEventListener('mousedown', handleGlobalMouseDown)
  document.addEventListener('keydown', handleGlobalKeyDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleGlobalMouseDown)
  document.removeEventListener('keydown', handleGlobalKeyDown)
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

<style scoped src="../object/word-editor.css"></style>
