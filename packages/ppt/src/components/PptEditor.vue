<template>
  <div class="ppt-editor">
    <UnifiedTopHeader
      doc-type="ppt"
      :title="headerTitle"
      :is-view-mode="!!readOnly"
      :last-save-time="headerLastSaveTime"
      :t="t"
      @command="handleHeaderCommand"
    />
    <div class="ribbon-tabs-bar">
      <div v-for="tab in menuTabs" :key="tab.key" class="ribbon-tab" :class="{ active: activeMenuTab === tab.key }" @click="activeMenuTab = tab.key">{{ tab.label }}</div>
    </div>
    <div class="ribbon-panel">
      <div v-if="activeMenuTab === 'home'" class="ribbon-tab-panel">
        <CanvasTool v-if="!screening" :t="t" class="canvas-tool-ribbon" />
      </div>
      <div v-else-if="activeMenuTab === 'file'" class="ribbon-tab-panel">
        <div class="ribbon-group">
          <div class="ribbon-group-content">
            <button class="ribbon-btn-lg" :disabled="readOnly" @click="handleCreateNewFile()" title="新建演示文稿"><PlusOutlined /><span>新建</span></button>
            <button class="ribbon-btn-lg" :disabled="readOnly" @click="handleImportPptx()" title="导入演示文稿"><UploadOutlined /><span>导入</span></button>
            <button class="ribbon-btn-lg" @click="handleExportPpt()" title="导出"><DownloadOutlined /><span>导出</span></button>
            <button class="ribbon-btn-lg" @click="handlePrint()" title="打印"><PrinterOutlined /><span>打印</span></button>
          </div>
          <div class="ribbon-group-title">文件</div>
        </div>
      </div>
      <div v-else-if="activeMenuTab === 'edit'" class="ribbon-tab-panel">
        <div class="ribbon-group">
          <div class="ribbon-group-content">
            <button class="ribbon-btn-lg" @click="createSlide()" title="添加幻灯片"><PlusOutlined /><span>添加幻灯片</span></button>
            <button class="ribbon-btn-lg" @click="deleteSlide()" title="删除幻灯片"><DeleteOutlined /><span>删除幻灯片</span></button>
            <button class="ribbon-btn-lg" @click="resetSlides()" title="重置"><ReloadOutlined /><span>重置</span></button>
          </div>
          <div class="ribbon-group-title">幻灯片</div>
        </div>
      </div>
      <div v-else-if="activeMenuTab === 'view'" class="ribbon-tab-panel">
        <div class="ribbon-group">
          <div class="ribbon-group-content">
            <button class="ribbon-btn-lg" @click="toggleGridLines()" :class="{ active: showGridLines }" title="网格线"><BorderOutlined /><span>网格线</span></button>
            <button class="ribbon-btn-lg" @click="toggleRuler()" :class="{ active: showRuler }" title="标尺"><ColumnHeightOutlined /><span>标尺</span></button>
          </div>
          <div class="ribbon-group-title">显示</div>
        </div>
      </div>
      <div v-else-if="activeMenuTab === 'present'" class="ribbon-tab-panel">
        <div class="ribbon-group">
          <div class="ribbon-group-content">
            <button class="ribbon-btn-lg" @click="enterScreeningFromStart()" title="从头放映 (F5)"><PlayCircleOutlined /><span>从头开始</span></button>
            <button class="ribbon-btn-lg" @click="enterScreening()" title="从当前放映 (Shift+F5)"><CaretRightOutlined /><span>从当前</span></button>
          </div>
          <div class="ribbon-group-title">放映</div>
        </div>
      </div>
      <div v-else-if="activeMenuTab === 'help'" class="ribbon-tab-panel">
        <div class="ribbon-group">
          <div class="ribbon-group-content">
            <button class="ribbon-btn-lg" @click="shortcutsVisible = true" title="快捷键"><KeyOutlined /><span>快捷键</span></button>
            <button class="ribbon-btn-lg" @click="aboutVisible = true" title="关于"><InfoCircleOutlined /><span>关于</span></button>
          </div>
          <div class="ribbon-group-title">帮助</div>
        </div>
      </div>
    </div>

    <!-- 主体区域 -->
    <div class="ppt-body" v-if="!screening">
      <Thumbnails class="thumbnails-panel" />
      <div class="canvas-area">
        <Canvas class="canvas-main" :style="{ height: `calc(100% - ${remarkHeight}px)` }" />
        <Remark class="canvas-remark" v-model:height="remarkHeight" :style="{ height: `${remarkHeight}px` }" />
      </div>
      <Toolbar class="toolbar-panel" />
    </div>

    <!-- 底部状态栏 -->
    <div class="ppt-footer" v-if="!screening">
      <div class="footer-left">
        <span>{{ t('editor.pageLabel', { current: currentSlideIndex + 1, total: slidesStore.slides.length }) }}</span>
      </div>
      <div class="footer-right">
        <IconMinus class="footer-icon" @click="scaleCanvas('-')" />
        <a-dropdown :trigger="['click']">
          <span class="footer-scale">
            {{ canvasScalePercentage }}
            <span class="footer-scale-arrow">▾</span>
          </span>
          <template #overlay>
            <a-menu @click="({ key }: any) => onScaleDropdownCommand(key)">
              <a-menu-item v-for="item in canvasScalePresetList" :key="item">{{ item }}%</a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
        <IconPlus class="footer-icon" @click="scaleCanvas('+')" />
        <a-slider
          class="zoom-slider"
          :min="50"
          :max="200"
          :step="10"
          :tooltip-open="false"
          :value="Number(canvasScalePercentage.replace('%', '')) || 100"
          @change="onScaleSliderInput"
        />
        <a-tooltip :title="t('editor.fitScreen')" placement="top">
          <IconFullScreen class="footer-icon" @click="resetCanvas()" />
        </a-tooltip>
      </div>
    </div>

    <!-- 放映模式 -->
    <Screen v-if="screening" />

    <!-- 导出对话框 -->
    <a-modal
      v-model:open="exportDialogVisible"
      :title="t('editor.exportTitle')"
      width="680px"
      :footer="null"
      destroy-on-close
      @cancel="closeExportDialog()"
    >
      <ExportDialog />
    </a-modal>

    <!-- 快捷键对话框 -->
    <a-modal v-model:open="shortcutsVisible" :title="t('editor.shortcutsTitle')" width="400px" :footer="null">
      <HotkeyDoc />
    </a-modal>

    <!-- 关于对话框 -->
    <a-modal v-model:open="aboutVisible" :title="t('editor.aboutTitle')" width="400px" :footer="null">
      <div style="text-align: center; padding: 20px 0;">
        <h3 style="margin: 0 0 12px;">{{ t('editor.aboutSubtitle') }}</h3>
        <p style="color: #999; font-size: 12px; margin-top: 8px;">版本 1.0.0 · Apache 2.0 License</p>
      </div>
    </a-modal>

    <!-- 隐藏的文件选择器 -->
    <input
      ref="pptxFileInputRef"
      type="file"
      accept=".pptx"
      style="display: none"
      @change="onPptxFileSelected"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, watch, getCurrentInstance } from 'vue'
import { DownloadOutlined, PlusOutlined, PrinterOutlined, UploadOutlined, DeleteOutlined, ReloadOutlined, BorderOutlined, ColumnHeightOutlined, PlayCircleOutlined, CaretRightOutlined, KeyOutlined, InfoCircleOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { parsePptxToEditorData } from '@/utils/pptxImport/index'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore, useSnapshotStore, useScreenStore } from '@/store'
import PptPlugins from '@/plugins'
import { createPptI18n } from '@/i18n'
import type { PptI18nMessages, PptLocale } from '@/i18n'

// 宿主未安装插件时补注册（指令 / 图标 / 全局组件）；入口已安装则跳过
const instance = getCurrentInstance()
if (instance && !instance.appContext.directives.contextmenu) {
  instance.appContext.app.use(PptPlugins)
}

import useGlobalHotkey from '@/hooks/useGlobalHotkey'
import usePasteEvent from '@/hooks/usePasteEvent'
import useScreening from '@/hooks/useScreening'
import useSlideHandler from '@/hooks/useSlideHandler'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'
import useExport from '@/hooks/useExport'
import useScaleCanvas from '@/hooks/useScaleCanvas'

import Canvas from '@/views/Editor/Canvas/index.vue'
import CanvasTool from '@/views/Editor/CanvasTool/index.vue'
import Thumbnails from '@/views/Editor/Thumbnails/index.vue'
import Toolbar from '@/views/Editor/Toolbar/index.vue'
import Remark from '@/views/Editor/Remark/index.vue'
import ExportDialog from '@/views/Editor/ExportDialog/index.vue'
import Screen from '@/views/Screen/index.vue'
import HotkeyDoc from '@/views/Editor/EditorHeader/HotkeyDoc.vue'
import UnifiedTopHeader from '@/components/UnifiedTopHeader.vue'

const props = withDefaults(defineProps<{
  initialContent?: any
  documentName?: string
  readOnly?: boolean
  locale?: PptLocale
  i18n?: Partial<PptI18nMessages>
}>(), {
  locale: 'zhCN',
})

const pptI18n = createPptI18n({
  locale: props.locale,
  overrides: props.i18n,
})

watch(() => props.locale, (locale) => {
  pptI18n.setLocale(locale || 'zhCN')
}, { immediate: true })

watch(() => props.i18n, (overrides) => {
  pptI18n.setOverrides(overrides)
})

const t = (key: string, params?: Record<string, string | number>) => pptI18n.t(key, params)

const formatTimeLocale = computed(() => props.locale === 'enUS' ? 'en-US' : 'zh-CN')

const emit = defineEmits<{
  change: [content: { format: string; data: any }]
  'new-document': [payload: { dbPayload: any; pptData: any }]
}>()

const mainStore = useMainStore()
const slidesStore = useSlidesStore()
const snapshotStore = useSnapshotStore()
const screenStore = useScreenStore()

const { dialogForExport, showGridLines, showRuler } = storeToRefs(mainStore)
const { screening } = storeToRefs(screenStore)
const { slideIndex: currentSlideIndex } = storeToRefs(slidesStore)

const remarkHeight = ref(50)
const shortcutsVisible = ref(false)
const aboutVisible = ref(false)
const activeMenuTab = ref('home')
const menuTabs = [
  { key: 'home', label: '开始' },
  { key: 'file', label: '文件' },
  { key: 'edit', label: '编辑' },
  { key: 'view', label: '视图' },
  { key: 'present', label: '放映' },
  { key: 'help', label: '帮助' },
]
const importFileRef = ref<HTMLInputElement | null>(null)
const pptxFileInputRef = ref<HTMLInputElement | null>(null)
const headerLastSaveTime = ref('')
const localDocumentTitle = ref(String(props.documentName || '').trim())
watch(() => props.documentName, (name) => {
  localDocumentTitle.value = String(name || '').trim()
}, { immediate: true })
const headerTitle = computed(() => {
  const name = String(localDocumentTitle.value || '').trim()
  return name || t('editor.defaultTitle')
})

const exportDialogVisible = computed({
  get: () => !!dialogForExport.value,
  set: (val: boolean) => {
    if (!val) mainStore.setDialogForExport('')
  }
})

const { enterScreening, enterScreeningFromStart } = useScreening()
const { createSlide, deleteSlide, resetSlides } = useSlideHandler()
const { redo, undo } = useHistorySnapshot()
const { importSpecificFile, exportPPTX } = useExport()
const {
  scaleCanvas,
  setCanvasScalePercentage,
  resetCanvas,
  canvasScalePercentage,
} = useScaleCanvas()

const canvasScalePresetList = [200, 150, 100, 80, 50]
const applyCanvasPresetScale = (value: number) => {
  setCanvasScalePercentage(value)
}
const onScaleDropdownCommand = (value: number | string) => {
  const level = Number(value)
  if (!Number.isFinite(level)) return
  applyCanvasPresetScale(level)
}
const onScaleSliderInput = (value: number) => {
  if (!Number.isFinite(value)) return
  applyCanvasPresetScale(value)
}

const setDialogForExport = mainStore.setDialogForExport
const closeExportDialog = () => mainStore.setDialogForExport('')
const handlePrint = () => setDialogForExport('pdf')
const handleExportPpt = () => exportPPTX(slidesStore.slides, true)

const handleHeaderCommand = (cmd: string) => {
  if (cmd === 'import') handleImportPptx()
  else if (cmd === 'save') emit('change', { format: 'pptx', data: getCurrentPptData() })
  else if (cmd === 'undo') undo()
  else if (cmd === 'redo') redo()
}

const getCurrentPptData = () => ({
  slides: slidesStore.slides,
  theme: slidesStore.theme,
  viewportRatio: slidesStore.viewportRatio,
})

const handleCreateNewFile = () => {
  if (props.readOnly) return
  const now = new Date()
  localDocumentTitle.value = `${t('editor.defaultFilePrefix')}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
  resetSlides()
  const pptData = getCurrentPptData()
  const dbPayload = {
    meta: {
      format: 'slide'
    },
    content: pptData
  }
  console.log('[PptEditor] 新建演示文稿-数据库数据:', dbPayload)
  console.log('[PptEditor] 新建演示文稿-PPT数据:', pptData)
  emit('new-document', {
    dbPayload,
    pptData
  })
}

useGlobalHotkey()
usePasteEvent()

const toggleGridLines = () => mainStore.setGridLinesState(!showGridLines.value)
const toggleRuler = () => mainStore.setRulerState(!showRuler.value)

const handleImportFile = () => {
  importFileRef.value?.click()
}

const handleImportPptx = () => {
  pptxFileInputRef.value?.click()
}

const onPptxFileSelected = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  // 校验文件格式，只支持 .pptx
  const fileName = file.name
  if (!fileName.toLowerCase().endsWith('.pptx')) {
    message.error(t('editor.importOnlyPptx'))
    input.value = ''
    return
  }

  // 显示 loading 提示
  const hideLoading = message.loading(t('editor.importing'), 0)

  // 强制 loading 显示至少 1 秒
  const minLoadingTime = 1000
  const startTime = Date.now()

  try {
    const result = await parsePptxToEditorData(file)

    // 确保 loading 至少显示 1 秒
    const elapsedTime = Date.now() - startTime
    const remainingTime = minLoadingTime - elapsedTime
    
    if (remainingTime > 0) {
      await new Promise(resolve => setTimeout(resolve, remainingTime))
    }

    slidesStore.setSlides(result.slides)
    slidesStore.setViewportRatio(result.viewportRatio)
    slidesStore.updateSlideIndex(0)

    localDocumentTitle.value = fileName.replace(/\.pptx$/i, '')
  }
  catch (err) {
    console.error('[PPTX Import] Failed:', err)
    message.error(t('editor.importFailed'))
  }
  finally {
    hideLoading()
    input.value = ''
  }
}


// 初始化
onMounted(() => {
  snapshotStore.initSnapshotDatabase()
  mainStore.setAvailableFonts()

  // 如果有初始内容，加载
  if (props.initialContent) {
    try {
      const data = typeof props.initialContent === 'string'
        ? JSON.parse(props.initialContent)
        : props.initialContent
      if (data && data.slides) {
        slidesStore.setSlides(data.slides)
      }
      if (data && data.theme) {
        slidesStore.setTheme(data.theme)
      }
      if (data && typeof data.viewportRatio === 'number') {
        slidesStore.setViewportRatio(data.viewportRatio)
      }
    }
    catch (e) {
      console.warn('Failed to load initial PPT content:', e)
    }
  }
})

// 监听数据变化，触发 change 事件
watch(
  [() => slidesStore.slides, () => slidesStore.theme],
  () => {
    headerLastSaveTime.value = new Date().toLocaleTimeString(formatTimeLocale.value, { hour: '2-digit', minute: '2-digit' })
    const pptData = getCurrentPptData()
    emit('change', {
      format: 'pptx',
      data: pptData
    })
  },
  { deep: true }
)
</script>

<style scoped>
.ppt-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f1f3f4;
}




.ribbon-tabs-bar {
  height: 32px;
  display: flex;
  align-items: stretch;
  background: #c43e1c;
  padding: 0 4px;
  flex-shrink: 0;
}
.ribbon-tab {
  display: inline-flex;
  align-items: center;
  padding: 0 14px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  border-radius: 4px 4px 0 0;
  user-select: none;
  white-space: nowrap;
}
.ribbon-tab:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}
.ribbon-tab.active {
  background: #f1f1f1;
  color: #c43e1c;
}
.ribbon-panel {
  background: #f1f1f1;
  padding: 4px 8px 3px;
  min-height: 82px;
  overflow-x: auto;
  overflow-y: hidden;
  flex-shrink: 0;
}
.ribbon-tab-panel {
  display: flex;
  align-items: stretch;
  min-height: 72px;
}
.ribbon-group {
  display: flex;
  flex-direction: column;
  padding: 2px 8px;
  border-right: 1px solid #e3e8f2;
  flex-shrink: 0;
}
.ribbon-group:last-child {
  border-right: none;
}
.ribbon-group-content {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-wrap: wrap;
}
.ribbon-group-title {
  font-size: 10px;
  color: #7a8191;
  text-align: center;
  margin-top: 2px;
  line-height: 1.2;
  user-select: none;
}
.ribbon-btn-lg {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  min-width: 42px;
  height: 54px;
  padding: 4px 3px;
  gap: 1px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: #3c4043;
  transition: background-color 0.15s, border-color 0.15s, color 0.15s;
  font-family: inherit;
  flex-shrink: 0;
}
.ribbon-btn-lg:hover:not(:disabled) {
  background: #edf2fb;
  color: #202124;
}
.ribbon-btn-lg.active {
  background: #dce8ff;
  color: #1f57b8;
}
.ribbon-btn-lg:disabled {
  color: #c0c4cc;
  cursor: not-allowed;
  opacity: 0.55;
}
.ribbon-btn-lg :deep(svg) {
  font-size: 18px;
}
.ribbon-btn-lg > span {
  font-size: 11px;
  line-height: 1.2;
  text-align: center;
}
.canvas-tool-ribbon {
  flex: 1;
}

/* 主体 */
.ppt-body {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

.thumbnails-panel {
  width: 167px;
  height: 100%;
  flex-shrink: 0;
}

.canvas-area {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}


.canvas-area .canvas-main {
  flex: 1;
  min-height: 0;
}

.toolbar-panel {
  width: 15%;
  height: 100%;
  flex-shrink: 0;
}

/* 底部状态栏 */
.ppt-footer {
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f2f4f7;
  border-top: 1px solid #e2e6ed;
  padding: 0 12px;
  font-size: 12px;
  color: #606266;
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.footer-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.footer-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 3px;
  color: #606266;
  font-size: 14px;
}

.footer-icon:hover {
  background: #e2e6ed;
}

.footer-scale {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  user-select: none;
  padding: 2px 4px;
  border-radius: 3px;
  min-width: 40px;
  text-align: center;
}

.footer-scale-arrow {
  font-size: 11px;
  color: #909399;
}

.footer-scale:hover {
  background: #e2e6ed;
}

.zoom-slider {
  width: 120px;
}

.zoom-slider :deep(.ant-slider-track) {
  margin: 0;
}


</style>

<!-- 全局样式：ProseMirror 富文本样式（必须非 scoped，因为 .ProseMirror 类由库动态生成） -->
<style lang="scss">
@import '@/assets/styles/prosemirror.scss';
</style>

