<template>
  <div class="footer" editor-component="footer">
    <div class="footer-left">

      <el-tooltip content="显示/隐藏目录" placement="top" effect="light">
        <div class="footer-item">
          <el-checkbox v-model="catalogVisible" @change="handleToggleCatalog" size="small">显示导航窗格</el-checkbox>
        </div>
      </el-tooltip>
      <el-tooltip content="连页模式下，编辑器将不会显示分页" placement="top" effect="light">
        <div class="footer-item">
          <el-checkbox v-model="isContinuityMode" @change="handlePageModeChange" size="small">连页模式</el-checkbox>
        </div>
      </el-tooltip>
      <div class="footer-divider"></div>
  
      <!-- 纸张方向 -->
      <el-tooltip content="切换纸张方向" placement="top" effect="light">
        <div class="footer-item" @click="handleTogglePaperDirection">
          <MdiIcon name="page-layout-header-footer" />
          {{ selectedPaperDirectionName }}
        </div>
      </el-tooltip>
  
      <!-- 纸张大小 -->
      <div class="footer-item">
        <el-dropdown trigger="click" @command="handlePaperSizeSelect">
          <span class="el-dropdown-link">
             <MdiIcon name="crop-portrait" />
            {{ selectedPaperName }}
          </span>
          <template #dropdown>
            <el-dropdown-menu class="paper-size-dropdown">
              <el-dropdown-item
                v-for="size in paperSizeList"
                :key="size.size"
                :command="size.size"
                :disabled="selectedPaperSize === size.size"
              >
                {{ size.name }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
  
    <!-- 编辑模式（居中） -->
    <div class="editor-mode footer-item" :class="{ disabled: isModeLocked }" :title="currentModeTitle">
      <el-dropdown trigger="click" @command="handleModeSelect" :disabled="isModeLocked">
        <span class="el-dropdown-link">
          <MdiIcon :name="currentModeIcon" />
          {{ currentMode }}
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item
              v-for="mode in modeList"
              :key="mode.value"
              :command="mode.value"
              :disabled="currentModeValue === mode.value"
            >
              <div class="mode-item-content" :title="mode.title">
                <MdiIcon :name="mode.icon" class="mode-icon" />
                <span>{{ mode.label }}</span>
              </div>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  
    <div class="footer-right">
      <div class="footer-info">
        <span>页面：<span class="page-no">{{ currentPage }}</span>/<span class="page-size">{{ totalPages }}</span></span>
        <span>字数：<span class="word-count">{{ wordCount }}</span></span>
        <span>行：<span class="row-no">{{ currentRow }}</span></span>
        <span>列：<span class="col-no">{{ currentCol }}</span></span>
      </div>
      <div class="footer-divider"></div>
      <div class="scale-controls">
        <el-tooltip content="缩小 (Ctrl+-)" placement="top" effect="light">
          <div class="page-scale-minus" @click="handleScaleMinus"><i></i></div>
        </el-tooltip>
        <el-tooltip content="显示比例 (点击可复原 Ctrl+0)" placement="top" effect="light">
          <span class="page-scale-percentage" @click="handleScaleRecovery">
            {{ scalePercentage }}%
          </span>
        </el-tooltip>
        <el-tooltip content="放大 (Ctrl+=)" placement="top" effect="light">
          <div class="page-scale-add" @click="handleScaleAdd"><i></i></div>
        </el-tooltip>
      </div>
      <el-tooltip content="全屏显示" placement="top" effect="light">
        <div class="footer-item" @click="handleToggleFullscreen">
          <i class="icon-fullscreen-small"></i>
        </div>
      </el-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

import { ElMessageBox } from 'element-plus'
import type { DocumentMeta } from '@/types/document'
import MdiIcon from '@/components/common/MdiIcon.vue'

const props = defineProps<{
  documentMeta: DocumentMeta
}>()

// 事件触发
const emit = defineEmits(['command'])

const catalogVisible = ref(false)
const isContinuityMode = ref(false)
const isTrackChanges = ref(false)

// 纸张方向
const selectedPaperDirection = ref('vertical')
const selectedPaperDirectionName = computed(() => {
  return selectedPaperDirection.value === 'vertical' ? '纵向' : '横向'
})

const selectedPaperName = computed(() => {
  const item = paperSizeList.find(s => s.size === selectedPaperSize.value)
  return item ? item.name : 'A4'
})

// 纸张大小（像素值，基于96DPI，1mm≈3.78px）
const selectedPaperSize = ref('794*1123')
const paperSizeList = [
  { size: '794*1123', name: 'A4 (21×29.7cm)' },
  { size: '1587*2245', name: 'A2 (42×59.4cm)' },
  { size: '1123*1587', name: 'A3 (29.7×42cm)' },
  { size: '559*794', name: 'A5 (14.8×21cm)' },
  { size: '397*559', name: 'A6 (10.5×14.8cm)' },
  { size: '945*1334', name: 'B4 (25×35.3cm)' },
  { size: '665*945', name: 'B5 (17.6×25cm)' },
  { size: '816*1054', name: 'Letter (21.6×27.9cm)' },
  { size: '816*1346', name: 'Legal (21.6×35.6cm)' },
  { size: '696*1009', name: 'Executive (18.4×26.7cm)' },
  { size: '696*983', name: '16开 (18.4×26cm)' },
  { size: '553*737', name: '32开 (14.6×19.5cm)' },
  { size: 'custom', name: '其他页面大小...' }
]

// 编辑器状态
const visiblePages = ref('1')
const currentPage = ref(1)
const totalPages = ref(1)
const wordCount = ref(0)
const currentRow = ref(0)
const currentCol = ref(0)
const currentMode = ref(props.documentMeta?.status === 'view' ? '只读模式' : '常规模式')
const scalePercentage = ref(100)


// 处理目录切换
const handleToggleCatalog = () => {
  emit('command', 'toggleCatalog', catalogVisible.value)
}

// 处理页面模式选择
const handlePageModeChange = (val: any) => {
  const mode = val ? 'continuity' : 'paging'
  emit('command', 'pageMode', mode)
}

// 处理纸张方向选择
const _handlePaperDirectionSelect = (command: string) => {
  selectedPaperDirection.value = command
  emit('command', 'paperDirection', command)
}

// 处理纸张方向切换
const handleTogglePaperDirection = () => {
  const newDirection = selectedPaperDirection.value === 'vertical' ? 'horizontal' : 'vertical'
  selectedPaperDirection.value = newDirection
  emit('command', 'paperDirection', newDirection)
}

// 处理纸张大小选择
const handlePaperSizeSelect = (size: string) => {
  if (size === 'custom') {
    // 打开自定义纸张大小对话框
    emit('command', 'customPaperSizeDialog')
  } else if (size) {
    const [width, height] = size.split('*').map(Number)
    emit('command', 'paperSize', width, height)
    selectedPaperSize.value = size
  }
}

// 处理全屏切换
const handleToggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
  } else {
    document.exitFullscreen()
  }
}


// 模式列表
const modeList = [
  { value: 'edit', label: '常规模式', icon: 'pencil', title: '常规编辑模式，可自由编辑文档内容' },
  { value: 'revision', label: '修订模式', icon: 'pencil-plus', title: '修订模式，所有编辑操作将记录为修订' },
  { value: 'readonly', label: '只读模式', icon: 'eye-outline', title: '只读模式，仅可查看文档不可编辑' },
  { value: 'clean', label: '清洁模式', icon: 'eye-off-outline', title: '清洁模式，隐藏所有标记和批注' },
  { value: 'form', label: '表单模式', icon: 'form-select', title: '表单模式，仅可编辑表单域' }
]
const currentModeValue = ref(props.documentMeta?.status === 'view' ? 'readonly' : 'edit')

const currentModeIcon = computed(() => {
  const mode = modeList.find(m => m.value === currentModeValue.value)
  return mode?.icon || 'pencil'
})

const currentModeTitle = computed(() => {
  const mode = modeList.find(m => m.value === currentModeValue.value)
  return mode?.title || ''
})

const isModeLocked = computed(() => {
  return props.documentMeta?.status === 'lock' || props.documentMeta?.status === 'view'
})

// 处理模式切换
const handleModeSelect = async (modeValue: string) => {

  if (isModeLocked.value) return
  
  // 如果当前是修订模式，切换到其他模式时需要确认
  if (currentModeValue.value === 'revision' && modeValue !== 'revision') {
    const targetMode = modeList.find(m => m.value === modeValue)
    try {
      await ElMessageBox.confirm(
        `当前是修订模式，是否切换为${targetMode?.label}？`,
        '提示',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
    } catch {
      return
    }
  }
  
  const newMode = modeList.find(m => m.value === modeValue)
  if (!newMode) return
  
  currentModeValue.value = modeValue
  currentMode.value = newMode.label
  
  if (modeValue === 'revision') {
    isTrackChanges.value = true
    emit('command', 'toggleTrackChanges', true)
  } else {
    isTrackChanges.value = false

    emit('command', 'toggleTrackChanges', false)
  }
  emit('command', 'mode', modeValue === 'revision' ? 'edit' : modeValue)
}

// 处理缩放减少
const handleScaleMinus = () => {
  emit('command', 'pageScaleMinus')
}

// 处理缩放增加
const handleScaleAdd = () => {
  emit('command', 'pageScaleAdd')
}

// 处理缩放恢复
const handleScaleRecovery = () => {
  emit('command', 'pageScaleRecovery')
}

// 更新编辑器状态
defineExpose({
  updateEditorStatus: (status: any) => {
    if (status.visiblePages !== undefined) visiblePages.value = status.visiblePages
    if (status.currentPage !== undefined) currentPage.value = status.currentPage
    if (status.totalPages !== undefined) totalPages.value = status.totalPages
    if (status.wordCount !== undefined) wordCount.value = status.wordCount
    if (status.currentRow !== undefined) currentRow.value = status.currentRow
    if (status.currentCol !== undefined) currentCol.value = status.currentCol
    if (status.currentMode !== undefined) currentMode.value = status.currentMode
    if (status.scalePercentage !== undefined) scalePercentage.value = status.scalePercentage
  },
  setCatalogVisible: (visible: boolean) => {
    catalogVisible.value = visible
  }
})
</script>

<style scoped>
.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 40px;
  background-color: #f2f4f7;
  padding: 0 12px;
  font-size: 12px;
  color: #606266;
  border-top: 1px solid #e2e6ed;
  position: relative;
}

.footer-left, .footer-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.footer-item {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 0 4px;
  border-radius: 3px;
  transition: background 0.2s;
  position: relative;
}

.footer-item.editor-mode {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
}

.footer-item.editor-mode .el-dropdown-link {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #606266;
  font-size: 12px;
  outline: none;
}

.footer-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.el-dropdown-link {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  color: #606266;
  font-size: 12px;
  outline: none;
}

.paper-size-dropdown {
  max-height: 300px;
  overflow-y: auto;
}

.footer-item:hover {
  background-color: #e2e6ed;
}

.footer-divider {
  width: 1px;
  height: 14px;
  background-color: #dcdfe6;
}

.footer-info {
  display: flex;
  gap: 12px;
  white-space: nowrap;
}

.footer-switch {
  width: 32px;
  height: 16px;
  appearance: none;
  background-color: #dcdfe6;
  border-radius: 10px;
  position: relative;
  cursor: pointer;
  transition: background 0.3s;
  outline: none;
}

.footer-switch:checked {
  background-color: #409eff;
}

.footer-switch::before {
  content: "";
  position: absolute;
  width: 12px;
  height: 12px;
  background-color: #fff;
  border-radius: 50%;
  top: 2px;
  left: 2px;
  transition: transform 0.3s;
}

.footer-switch:checked::before {
  transform: translateX(16px);
}

.scale-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-scale-minus, .page-scale-add {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.icon-theme::before { content: "🎨"; }
.icon-margin-small::before { content: "↔️"; }
.icon-paper-small::before { content: "📄"; }
.icon-fullscreen-small::before { content: "⛶"; }

.options {
  position: absolute;
  bottom: 100%;
  left: 0;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
  display: none;
  min-width: 100px;
  z-index: 1000;
  margin-bottom: 4px;
}

.options.visible {
  display: block;
}

.options li {
  padding: 6px 12px;
  cursor: pointer;
}

.options li:hover {
  background-color: #f5f7fa;
}

.options li.active {
  color: #409eff;
  font-weight: bold;
}

.mode-item-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mode-icon {
  font-size: 16px;
  flex-shrink: 0;
}

</style>
