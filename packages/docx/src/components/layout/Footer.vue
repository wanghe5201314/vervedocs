<template>
  <div class="footer" editor-component="footer">
    <div class="footer-left">

      <a-tooltip placement="top">
        <template #title><span style="font-size: 11px">显示/隐藏目录</span></template>
        <div class="footer-item">
          <a-checkbox v-model:checked="tocVisible" @change="handleToggleToc">显示导航窗格</a-checkbox>
        </div>
      </a-tooltip>
      <div class="footer-divider"></div>

      <!-- 纸张方向 -->
      <a-tooltip placement="top">
        <template #title><span style="font-size: 11px">切换纸张方向</span></template>
        <div class="footer-item" @click="handleTogglePaperDirection">
          <VdIcon name="page-layout-header-footer" />
          {{ selectedPaperDirectionName }}
        </div>
      </a-tooltip>

      <!-- 纸张大小 -->
      <div class="footer-item">
        <a-dropdown :trigger="['click']">
          <span class="dropdown-link">
             <VdIcon name="crop-portrait" />
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


    <div class="footer-center" role="status">修订模式：{{ isTrackChanges ? '开' : '关' }}</div>

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
import { PAPER_SIZE_LIST, PaperDirection } from '@vervedoc/core'


import type { DocumentMeta } from '@/types/document'
import { VdIcon } from '@vervedoc/ui'

const props = defineProps<{
  documentMeta: DocumentMeta
  isTrackChanges?: boolean
}>()

// 事件触发
const emit = defineEmits(['command'])

/** 目录是否可见 */
const tocVisible = ref(true)


/** 选中的纸张方向 */
const selectedPaperDirection = ref<typeof PaperDirection[keyof typeof PaperDirection]>(PaperDirection.VERTICAL)
/** 选中纸张方向的中文名称 */
const selectedPaperDirectionName = computed(() => {
  return selectedPaperDirection.value === PaperDirection.VERTICAL ? '纵向' : '横向'
})

/** 选中纸张大小的名称 */
const selectedPaperName = computed(() => {
  const item = paperSizeList.find(s => s.size === selectedPaperSize.value)
  return item ? item.name : 'A4'
})

/** 选中的纸张大小尺寸字符串 */
const selectedPaperSize = ref('794*1123')
/** 纸张大小选项列表 */
const paperSizeList = [
  ...PAPER_SIZE_LIST.map(p => ({ size: `${p.width}*${p.height}`, name: p.label })),
  { size: 'custom', name: '其他页面大小...' }
]

/** 可见页码范围 */
const visiblePages = ref('1')
/** 当前页码 */
const currentPage = ref(1)
/** 总页数 */
const totalPages = ref(1)
/** 字数统计 */
const wordCount = ref(0)
/** 当前行号 */
const currentRow = ref(0)
/** 当前列号 */
const currentCol = ref(0)
/** 当前编辑器模式文本 */
const currentMode = ref(props.documentMeta?.status === 'view' ? '只读模式' : '常规模式')
/** 缩放百分比 */
const scalePercentage = ref(100)


/** 处理目录可见性切换 */
const handleToggleToc = () => {
  emit('command', 'toggleToc', tocVisible.value)
}

/** 处理纸张方向切换：纵向与横向互切 */
const handleTogglePaperDirection = () => {
  const newDirection = selectedPaperDirection.value === PaperDirection.VERTICAL ? PaperDirection.HORIZONTAL : PaperDirection.VERTICAL
  selectedPaperDirection.value = newDirection
  emit('command', 'paperDirection', newDirection)
}

/**
 * 处理纸张大小选择，自定义尺寸时打开对话框
 * @param size - 纸张尺寸字符串或 'custom'
 */
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

/** 处理全屏切换 */
const handleToggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
  } else {
    document.exitFullscreen()
  }
}



/** 处理缩小缩放 */
const handleScaleMinus = () => {
  emit('command', 'pageScaleMinus')
}

/** 处理放大缩放 */
const handleScaleAdd = () => {
  emit('command', 'pageScaleAdd')
}

/** 处理缩放恢复 */
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
  setTocVisible: (visible: boolean) => {
    tocVisible.value = visible
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
  gap: 6px;
}

.footer-center {
  flex: 1;
  padding: 0 12px;
  text-align: center;
  white-space: nowrap;
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


.icon-fullscreen-small::before { content: "⛶"; }
.icon-zoom-out::before { content: "−"; }
.icon-zoom-in::before { content: "+"; }




</style>
