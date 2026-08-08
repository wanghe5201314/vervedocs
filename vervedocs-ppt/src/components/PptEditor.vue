<template>
  <div class="ppt-editor">
    <UnifiedTopHeader
      doc-type="ppt"
      :title="headerTitle"
      :is-view-mode="!!readOnly"
      :last-save-time="headerLastSaveTime"
      :t="t"
    />
    <div class="menu-card">
      <a-menu mode="horizontal" class="ppt-menu-bar" :selectable="false">
        <!-- 文件 -->
        <a-sub-menu key="file" popupClassName="ppt-menu-popper">
          <template #title>{{ t('editor.file') }}</template>
          <a-menu-item key="file-new-slide" @click="handleCreateNewFile()"><PlusOutlined class="menu-el-icon" />{{ t('editor.newPresentation') }}</a-menu-item>
          <a-menu-item key="file-import" @click="handleImportPptx()">
            <UploadOutlined class="menu-el-icon" />{{ t('editor.importPresentation') }}
            <a-tag color="red">1.0.0-BETA.20260402</a-tag>
          </a-menu-item>
          <a-menu-item key="file-export" @click="handleExportPpt()"><DownloadOutlined class="menu-el-icon" />{{ t('editor.exportFile') }}</a-menu-item>
          <a-menu-item key="file-print" @click="handlePrint()"><PrinterOutlined class="menu-el-icon" />{{ t('editor.print') }}</a-menu-item>
        </a-sub-menu>

        <!-- 编辑 -->
        <a-sub-menu key="edit" popupClassName="ppt-menu-popper">
          <template #title>{{ t('editor.edit') }}</template>
          <a-menu-item key="undo" @click="undo()">{{ t('editor.undo') }}<span class="shortcut">Ctrl+Z</span></a-menu-item>
          <a-menu-item key="redo" @click="redo()">{{ t('editor.redo') }}<span class="shortcut">Ctrl+Y</span></a-menu-item>
          <a-divider />
          <a-menu-item key="add-slide" @click="createSlide()">{{ t('editor.addSlide') }}</a-menu-item>
          <a-menu-item key="del-slide" @click="deleteSlide()">{{ t('editor.deleteSlide') }}</a-menu-item>
          <a-divider />
          <a-menu-item key="reset" @click="resetSlides()">{{ t('editor.resetSlides') }}</a-menu-item>
        </a-sub-menu>

        <!-- 视图 -->
        <a-sub-menu key="view" popupClassName="ppt-menu-popper">
          <template #title>{{ t('editor.view') }}</template>
          <a-menu-item key="grid" @click="toggleGridLines()">
            {{ showGridLines ? t('editor.closeGrid') : t('editor.openGrid') }}
          </a-menu-item>
          <a-menu-item key="ruler" @click="toggleRuler()">
            {{ showRuler ? t('editor.closeRuler') : t('editor.openRuler') }}
          </a-menu-item>
        </a-sub-menu>

        <!-- 放映 -->
        <a-sub-menu key="present" popupClassName="ppt-menu-popper">
          <template #title>{{ t('editor.present') }}</template>
          <a-menu-item key="screen-start" @click="enterScreeningFromStart()">{{ t('editor.fromStart') }}<span class="shortcut">F5</span></a-menu-item>
          <a-menu-item key="screen-current" @click="enterScreening()">{{ t('editor.fromCurrent') }}<span class="shortcut">Shift+F5</span></a-menu-item>
        </a-sub-menu>

        <!-- 帮助 -->
        <a-sub-menu key="help" popupClassName="ppt-menu-popper">
          <template #title>{{ t('editor.help') }}</template>
          <a-menu-item key="hotkey" @click="shortcutsVisible = true">{{ t('editor.shortcuts') }}</a-menu-item>
          <a-menu-item key="about" @click="aboutVisible = true">{{ t('editor.about') }}</a-menu-item>
        </a-sub-menu>
      </a-menu>
    </div>

    <!-- 工具栏 -->
    <CanvasTool v-if="!screening" class="canvas-tool" :t="t" />

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
import { DownloadOutlined, PlusOutlined, PrinterOutlined, UploadOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { parsePptxToEditorData } from '@/utils/pptxImport/index'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore, useSnapshotStore, useScreenStore } from '@/store'
import IconPlugin from '@/plugins/icon'
import ComponentPlugin from '@/plugins/component'
import { createPptI18n } from '@/i18n'
import type { PptI18nMessages, PptLocale } from '@/i18n'

// 自动注册图标和组件插件，确保作为库组件使用时图标正常渲染
const instance = getCurrentInstance()
if (instance) {
  const app = instance.appContext.app
  app.use(IconPlugin)
  app.use(ComponentPlugin)
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




.menu-el-icon {
  margin-right: 8px;
  font-size: 16px;
}

/* 快捷键 */
.shortcut {
  margin-left: auto;
  padding-left: 24px;
  color: #9aa0a6;
  font-size: 12px;
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

.canvas-tool {
  height: 40px;
  flex-shrink: 0;
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

<!-- 全局样式：popup 是 teleport 到 body 的，必须用非 scoped 样式 -->
<style>
.ppt-menu-popper {
  min-width: 200px !important;
}

.ppt-menu-popper .ant-menu {
  border-right: none !important;
}

.ppt-menu-popper .ant-menu-item {
  height: 32px !important;
  line-height: 32px !important;
  font-size: 13px !important;
  color: #3c4043 !important;
  padding: 0 16px !important;
  margin: 0 !important;
  display: flex !important;
  align-items: center !important;
  gap: 8px;
  white-space: nowrap;
}

.ppt-menu-popper .ant-menu-submenu-title {
  height: 32px !important;
  line-height: 32px !important;
  font-size: 13px !important;
  color: #3c4043 !important;
  padding: 0 16px !important;
  margin: 0 !important;
  display: flex !important;
  align-items: center !important;
  gap: 8px;
  white-space: nowrap;
}

.ppt-menu-popper .menu-el-icon {
  margin-right: 0;
  width: 16px;
  flex: 0 0 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.ppt-menu-popper .ant-menu-item:hover {
  background: #f1f3f4 !important;
}

.ppt-menu-popper .ant-divider-horizontal {
  margin: 4px 12px !important;
  width: calc(100% - 24px) !important;
}

/* 菜单栏样式 - 全局作用域，防止宿主 Ant Design Vue CSS 覆盖 */
.ppt-editor .ppt-menu-bar {
  border-bottom: none !important;
  height: auto !important;
  background: transparent !important;
  line-height: unset !important;
}
.ppt-editor .ppt-menu-bar .ant-menu-horizontal {
  border-bottom: none !important;
  background: transparent !important;
  line-height: unset !important;
}
.ppt-editor .ant-menu-horizontal > .ant-menu-item,
.ppt-editor .ant-menu-horizontal > .ant-menu-submenu {
  padding-inline: 0 !important;
}
.ppt-editor .ppt-menu-bar .ant-menu-submenu-title {
  padding: 6px 12px !important;
  height: auto !important;
  line-height: 1.4 !important;
  font-size: 13px !important;
  color: #ffffff !important;
  border-radius: 4px !important;
  border-bottom: none !important;
}
.ppt-editor .ppt-menu-bar .ant-menu-submenu-title:hover {
  background: rgba(255, 255, 255, 0.2) !important;
}
.ppt-editor .ppt-menu-bar .ant-menu-submenu-open > .ant-menu-submenu-title {
  background: rgba(255, 255, 255, 0.3) !important;
}
.ppt-editor .ppt-menu-bar .ant-menu-submenu-arrow {
  display: none !important;
}
.ppt-editor .ppt-menu-bar .ant-menu-item,
.ppt-editor .ppt-menu-bar .ant-menu-submenu .ant-menu-submenu-title {
  height: auto !important;
  line-height: 1.6 !important;
}
.ppt-editor .menu-card {
  border-radius: 0 !important;
  border-left: none !important;
  border-right: none !important;
  border-top: none !important;
  border-bottom: 1px solid #9e2b1a !important;
  background: #b7472a !important;
  flex-shrink: 0;
  padding: 0 0 0 8px;
}
</style>
