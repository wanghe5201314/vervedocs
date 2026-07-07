<template>
  <div class="ppt-editor">
    <UnifiedTopHeader
      doc-type="ppt"
      :title="headerTitle"
      :is-view-mode="!!readOnly"
      :last-save-time="headerLastSaveTime"
      :t="t"
    />
    <el-card class="menu-card" :body-style="{ padding: '0 0 0 8px' }" shadow="never">
      <el-menu mode="horizontal" class="ppt-menu-bar" :ellipsis="false">
        <!-- 文件 -->
        <el-sub-menu index="file" popper-class="ppt-menu-popper">
          <template #title>{{ t('editor.file') }}</template>
          <el-menu-item index="file-new-slide" @click="handleCreateNewFile()"><el-icon class="menu-el-icon"><Plus /></el-icon>{{ t('editor.newPresentation') }}</el-menu-item>
          <el-menu-item index="file-import" @click="handleImportPptx()">
            <el-icon class="menu-el-icon"><Upload /></el-icon>{{ t('editor.importPresentation') }}
            <el-tag size="small" type="danger">1.0.0-BETA.20260402</el-tag>
          </el-menu-item>
          <el-menu-item index="file-export" @click="handleExportPpt()"><el-icon class="menu-el-icon"><Download /></el-icon>{{ t('editor.exportFile') }}</el-menu-item>
          <el-menu-item index="file-print" @click="handlePrint()"><el-icon class="menu-el-icon"><Printer /></el-icon>{{ t('editor.print') }}</el-menu-item>
        </el-sub-menu>

        <!-- 编辑 -->
        <el-sub-menu index="edit" popper-class="ppt-menu-popper">
          <template #title>{{ t('editor.edit') }}</template>
          <el-menu-item index="undo" @click="undo()">{{ t('editor.undo') }}<span class="shortcut">Ctrl+Z</span></el-menu-item>
          <el-menu-item index="redo" @click="redo()">{{ t('editor.redo') }}<span class="shortcut">Ctrl+Y</span></el-menu-item>
          <el-divider />
          <el-menu-item index="add-slide" @click="createSlide()">{{ t('editor.addSlide') }}</el-menu-item>
          <el-menu-item index="del-slide" @click="deleteSlide()">{{ t('editor.deleteSlide') }}</el-menu-item>
          <el-divider />
          <el-menu-item index="reset" @click="resetSlides()">{{ t('editor.resetSlides') }}</el-menu-item>
        </el-sub-menu>

        <!-- 视图 -->
        <el-sub-menu index="view" popper-class="ppt-menu-popper">
          <template #title>{{ t('editor.view') }}</template>
          <el-menu-item index="grid" @click="toggleGridLines()">
            {{ showGridLines ? t('editor.closeGrid') : t('editor.openGrid') }}
          </el-menu-item>
          <el-menu-item index="ruler" @click="toggleRuler()">
            {{ showRuler ? t('editor.closeRuler') : t('editor.openRuler') }}
          </el-menu-item>
        </el-sub-menu>

        <!-- 放映 -->
        <el-sub-menu index="present" popper-class="ppt-menu-popper">
          <template #title>{{ t('editor.present') }}</template>
          <el-menu-item index="screen-start" @click="enterScreeningFromStart()">{{ t('editor.fromStart') }}<span class="shortcut">F5</span></el-menu-item>
          <el-menu-item index="screen-current" @click="enterScreening()">{{ t('editor.fromCurrent') }}<span class="shortcut">Shift+F5</span></el-menu-item>
        </el-sub-menu>

        <!-- 帮助 -->
        <el-sub-menu index="help" popper-class="ppt-menu-popper">
          <template #title>{{ t('editor.help') }}</template>
          <el-menu-item index="hotkey" @click="shortcutsVisible = true">{{ t('editor.shortcuts') }}</el-menu-item>
          <el-menu-item index="about" @click="aboutVisible = true">{{ t('editor.about') }}</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-card>

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
        <el-dropdown trigger="click" @command="onScaleDropdownCommand">
          <span class="footer-scale">
            {{ canvasScalePercentage }}
            <span class="footer-scale-arrow">▾</span>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-for="item in canvasScalePresetList" :key="item" :command="item">{{ item }}%</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <IconPlus class="footer-icon" @click="scaleCanvas('+')" />
        <el-slider
          class="zoom-slider"
          size="small"
          :min="50"
          :max="200"
          :step="10"
          :show-tooltip="false"
          :model-value="Number(canvasScalePercentage.replace('%', '')) || 100"
          @input="onScaleSliderInput"
        />
        <el-tooltip :content="t('editor.fitScreen')" :show-after="500" :hide-after="0">
          <IconFullScreen class="footer-icon" @click="resetCanvas()" />
        </el-tooltip>
      </div>
    </div>

    <!-- 放映模式 -->
    <Screen v-if="screening" />

    <!-- 导出对话框 -->
    <el-dialog
      v-model="exportDialogVisible"
      :title="t('editor.exportTitle')"
      width="680px"
      destroy-on-close
      @close="closeExportDialog()"
    >
      <ExportDialog />
    </el-dialog>

    <!-- 快捷键对话框 -->
    <el-dialog v-model="shortcutsVisible" :title="t('editor.shortcutsTitle')" width="400px">
      <HotkeyDoc />
    </el-dialog>

    <!-- 关于对话框 -->
    <el-dialog v-model="aboutVisible" :title="t('editor.aboutTitle')" width="400px">
      <div style="text-align: center; padding: 20px 0;">
        <h3 style="margin: 0 0 12px;">{{ t('editor.aboutSubtitle') }}</h3>
        <p style="color: #999; font-size: 12px; margin-top: 8px;">版本 1.0.0 · Apache 2.0 License</p>
      </div>
    </el-dialog>

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
import { Download, Plus, Printer, Upload } from '@element-plus/icons-vue'
import { ElMessage, ElLoading } from 'element-plus'
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
    ElMessage.error(t('editor.importOnlyPptx'))
    input.value = ''
    return
  }

  // 显示红色 loading，持续 1 秒
  const loading = ElLoading.service({
    lock: true,
    text: t('editor.importing'),
    background: 'rgba(255, 255, 255, 0.9)',
    customClass: 'custom-red-loading',
  })

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
    ElMessage.error(t('editor.importFailed'))
  }
  finally {
    loading.close()
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
      format: 'slide',
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

.menu-card {
  border-radius: 0 !important;
  border-left: none !important;
  border-right: none !important;
  border-top: none !important;
  border-bottom: 1px solid #e2e6ed !important;
  background: var(--tabs-bg-color, #f2f4f7) !important;
  flex-shrink: 0;
}

/* 菜单栏 - 参照 docx-editor-ui */
.ppt-menu-bar {
  border-bottom: none !important;
  height: auto !important;
  background: transparent !important;
}
.ppt-menu-bar :deep(.el-menu--horizontal) {
  border-bottom: none !important;
  background: transparent !important;
}
.ppt-menu-bar :deep(.el-sub-menu__title) {
  padding: 6px 12px !important;
  height: auto !important;
  line-height: 1.4 !important;
  font-size: 13px !important;
  color: var(--tabs-text-color, #3c4043) !important;
  border-radius: 4px !important;
  border-bottom: none !important;
}
.ppt-menu-bar :deep(.el-sub-menu__title:hover) {
  background: rgba(255, 255, 255, 0.2) !important;
}
.ppt-menu-bar :deep(.el-sub-menu.is-opened > .el-sub-menu__title) {
  background: rgba(255, 255, 255, 0.3) !important;
}
.ppt-menu-bar :deep(.el-sub-menu__icon-arrow) {
  display: none !important;
}
.ppt-menu-bar :deep(.el-menu-item),
.ppt-menu-bar :deep(.el-sub-menu .el-sub-menu__title) {
  height: auto !important;
  line-height: 1.6 !important;
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

.zoom-slider :deep(.el-slider__runway) {
  margin: 0;
}


</style>

<!-- 全局样式：ProseMirror 富文本样式（必须非 scoped，因为 .ProseMirror 类由库动态生成） -->
<style lang="scss">
@import '@/assets/styles/prosemirror.scss';
</style>

<!-- 全局样式：popper 是 teleport 到 body 的，必须用非 scoped 样式 -->
<style>
.ppt-menu-popper {
  min-width: 200px !important;
}

.ppt-menu-popper .el-menu {
  border-right: none !important;
}

.ppt-menu-popper .el-menu-item {
  height: 32px !important;
  line-height: 32px !important;
  font-size: 13px !important;
  color: #3c4043 !important;
  padding: 0 16px !important;
  display: flex !important;
  align-items: center !important;
  gap: 8px;
  white-space: nowrap;
}

.ppt-menu-popper .el-sub-menu__title {
  height: 32px !important;
  line-height: 32px !important;
  font-size: 13px !important;
  color: #3c4043 !important;
  padding: 0 16px !important;
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

.ppt-menu-popper .el-menu-item:hover {
  background: #f1f3f4 !important;
}

.ppt-menu-popper .el-divider--horizontal {
  margin: 4px 12px !important;
  width: calc(100% - 24px) !important;
}

/* 自定义红色 loading 样式 */
.custom-red-loading .el-loading-spinner {
  /* 修改旋转图标颜色 */
  & .path {
    stroke: #f56c6c !important; /* Element Plus 红色 */
  }
  
  /* 修改文字颜色 */
  & .el-loading-text {
    color: #f56c6c !important;
    font-weight: 500;
  }
  
  /* 修改 SVG 图标颜色 */
  & svg {
    fill: #f56c6c !important;
  }
}
</style>
