<template>
  <div class="footer" editor-component="footer">
    <div class="footer-left">

      <a-tooltip placement="top">
        <template #title><span style="font-size: 11px">显示/隐藏目录</span></template>
        <div class="footer-item">
          <a-checkbox v-model:checked="catalogVisible" @change="handleToggleCatalog">显示导航窗格</a-checkbox>
        </div>
      </a-tooltip>
      <a-tooltip placement="top">
        <template #title><span style="font-size: 11px">连页模式下，编辑器将不会显示分页</span></template>
        <div class="footer-item">
          <a-checkbox v-model:checked="isContinuityMode" @change="handlePageModeChange">连页模式</a-checkbox>
        </div>
      </a-tooltip>
      <div class="footer-divider"></div>

      <!-- 纸张方向 -->
      <a-tooltip placement="top">
        <template #title><span style="font-size: 11px">切换纸张方向</span></template>
        <div class="footer-item" @click="handleTogglePaperDirection">
          <VIcon name="page-layout-header-footer" />
          {{ selectedPaperDirectionName }}
        </div>
      </a-tooltip>

      <!-- 纸张大小 -->
      <div class="footer-item">
        <a-dropdown :trigger="['click']">
          <span class="dropdown-link">
             <VIcon name="crop-portrait" />
            {{ selectedPaperName }}
          </span>
          <template #overlay>
            <a-menu class="paper-size-dropdown" @click="({ key }: any) => handlePaperSizeSelect(key as string)">
              <a-menu-item
                v-for="size in paperSizeList"
                :key="size.size"
                :disabled="selectedPaperSize === size.size"
              >
                {{ size.name }}
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </div>
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
        <a-tooltip placement="top">
          <template #title>缩小 (Ctrl+-)</template>
          <div class="page-scale-minus" @click="handleScaleMinus"><i class="icon-zoom-out"></i></div>
        </a-tooltip>
        <a-tooltip placement="top">
          <template #title>显示比例 (点击可复原 Ctrl+0)</template>
          <span class="page-scale-percentage" @click="handleScaleRecovery">
            {{ scalePercentage }}%
          </span>
        </a-tooltip>
        <a-tooltip placement="top">
          <template #title>放大 (Ctrl+=)</template>
          <div class="page-scale-add" @click="handleScaleAdd"><i class="icon-zoom-in"></i></div>
        </a-tooltip>
      </div>
      <a-tooltip placement="top">
        <template #title>全屏显示</template>
        <div class="footer-item" @click="handleToggleFullscreen">
          <i class="icon-fullscreen-small"></i>
        </div>
      </a-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'


import type { DocumentMeta } from '@/types/document'
import { VIcon } from '@vervedoc/icons'

const props = defineProps<{
  documentMeta: DocumentMeta
}>()

// 事件触发
const emit = defineEmits(['command'])

const catalogVisible = ref(false)
const isContinuityMode = ref(false)


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

.footer :deep(.ant-checkbox-wrapper) {
  font-size: 12px;
}

.footer :deep(.ant-checkbox) {
  transform: scale(0.85);
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
  background-color: #1890ff;
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
  font-size: 12px;
}

.page-scale-percentage {
  font-size: 12px;
  cursor: pointer;
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
.icon-zoom-out::before { content: "−"; }
.icon-zoom-in::before { content: "+"; }

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
  color: #1890ff;
  font-weight: bold;
}


</style>
