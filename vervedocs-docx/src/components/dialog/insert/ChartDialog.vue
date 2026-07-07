<template>
  <el-dialog
    v-model="visible"
    title="插入图表"
    width="1000px"
    class="app-dialog chart-insert-dialog"
    destroy-on-close
    @close="handleClose"
  >
    <!-- 自定义选项卡 -->
    <div class="custom-tabs">
      <div class="tab-header">
        <div
          class="tab-item"
          :class="{ active: activeTab === 'settings' }"
          @click="activeTab = 'settings'"
        >
          设置
        </div>
        <div
          class="tab-item"
          :class="{ active: activeTab === 'data' }"
          @click="activeTab = 'data'"
        >
          数据
        </div>
      </div>
      <div class="tab-content">
        <div v-show="activeTab === 'settings'" class="tab-pane">
          <div class="chart-dialog-layout">
          <!-- 左侧图表类型 -->
          <div class="chart-type-tree">
            <div class="tree-title">选择图表类型</div>
            <el-scrollbar>
              <div class="tree-list">
                <div
                  v-for="category in chartCategories"
                  :key="category.name"
                  class="tree-category"
                >
                  <div
                    class="category-header"
                    :class="{ active: selectedCategory === category.name }"
                    @click="selectCategory(category.name)"
                  >
                    <el-icon :size="16">
                      <component :is="category.icon" />
                    </el-icon>
                    <span>{{ category.label }}</span>
                  </div>
                </div>
              </div>
            </el-scrollbar>
          </div>

          <!-- 右侧预览和配置 -->
          <div class="chart-preview-config-container">
            <!-- 预览折叠面板 -->
            <div class="collapse-panel">
              <div
                class="collapse-panel-header"
                :class="{ active: showPreviewPanel }"
                @click="togglePreviewPanel"
              >
                <div class="collapse-panel-title">
                  <el-icon :size="16" class="collapse-icon">
                    <component :is="showPreviewPanel ? 'ArrowDown' : 'ArrowRight'" />
                  </el-icon>
                  <span>图表预览</span>
                </div>
                <a
                  v-if="showPreviewPanel"
                  class="preview-credit"
                  href="https://echarts.apache.org/examples/en/index.html"
                  target="_blank"
                  rel="noreferrer"
                  @click.stop
                >
                  预览图：Apache ECharts
                </a>
              </div>
              <el-collapse-transition>
                <div v-show="showPreviewPanel" class="collapse-panel-content">
                  <el-scrollbar>
                    <div class="preview-container">
                      <button
                        v-for="preview in currentPreviews"
                        :key="preview.id"
                        class="preview-item"
                        :class="{ selected: selectedPreview === preview.id }"
                        @click="selectedPreview = preview.id"
                        type="button"
                      >
                        <el-image :src="getPreviewImage(preview)" fit="contain" class="preview-thumb-image" loading="lazy">
                          <template #error>
                            <div class="preview-fallback">{{ preview.name }}</div>
                          </template>
                        </el-image>
                        <div class="preview-name">{{ preview.name }}</div>
                      </button>
                    </div>
                  </el-scrollbar>
                </div>
              </el-collapse-transition>
            </div>

            <!-- 配置折叠面板 -->
            <div class="collapse-panel">
              <div
                class="collapse-panel-header"
                :class="{ active: showConfigPanel }"
                @click="toggleConfigPanel"
              >
                <div class="collapse-panel-title">
                  <el-icon :size="16" class="collapse-icon">
                    <component :is="showConfigPanel ? 'ArrowDown' : 'ArrowRight'" />
                  </el-icon>
                  <span>图表配置</span>
                </div>
              </div>
              <el-collapse-transition>
                <div v-show="showConfigPanel" class="collapse-panel-content">
                  <el-scrollbar>
                    <el-form :model="chartConfig" label-width="100px" class="config-form-compact">
                      <!-- 标题配置 -->
                      <el-form-item label="显示标题">
                        <el-switch v-model="chartConfig.showTitle" />
                      </el-form-item>
                      <el-form-item v-if="chartConfig.showTitle" label="标题名称">
                        <el-input v-model="chartConfig.title" placeholder="请输入图表标题" />
                      </el-form-item>
                      <el-form-item v-if="chartConfig.showTitle" label="标题位置">
                        <el-radio-group v-model="chartConfig.titlePosition">
                          <el-radio-button value="left">左</el-radio-button>
                          <el-radio-button value="center">中</el-radio-button>
                          <el-radio-button value="right">右</el-radio-button>
                        </el-radio-group>
                      </el-form-item>
                      <el-divider class="config-divider" />

                      <!-- 图例配置 -->
                      <el-form-item label="显示图例">
                        <el-switch v-model="chartConfig.showLegend" />
                      </el-form-item>
                      <el-form-item v-if="chartConfig.showLegend" label="图例位置">
                        <el-select v-model="chartConfig.legendPosition">
                          <el-option label="上" value="top" />
                          <el-option label="下" value="bottom" />
                          <el-option label="左" value="left" />
                          <el-option label="右" value="right" />
                        </el-select>
                      </el-form-item>
                      <el-divider class="config-divider" />

                      <!-- 坐标轴配置 -->
                      <el-form-item label="X轴标题">
                        <el-input v-model="chartConfig.xAxisLabel" placeholder="请输入X轴标题" />
                      </el-form-item>
                      <el-form-item label="Y轴标题">
                        <el-input v-model="chartConfig.yAxisLabel" placeholder="请输入Y轴标题" />
                      </el-form-item>
                      <el-form-item label="显示网格线">
                        <el-switch v-model="chartConfig.showYAxisSplitLine" />
                      </el-form-item>
                      <el-divider class="config-divider" />

                      <!-- 数据标签配置 -->
                      <el-form-item label="显示数据标签">
                        <el-switch v-model="chartConfig.showDataLabel" />
                      </el-form-item>
                      <el-divider class="config-divider" />

                      <!-- 颜色配置 -->
                      <el-form-item label="配色方案">
                        <el-select v-model="chartConfig.colorScheme">
                          <el-option label="默认" value="default" />
                          <el-option label="暖色调" value="warm" />
                          <el-option label="冷色调" value="cool" />
                          <el-option label="自然色" value="nature" />
                        </el-select>
                      </el-form-item>
                    </el-form>
                  </el-scrollbar>
                </div>
              </el-collapse-transition>
            </div>
          </div>
        </div>
        </div>

        <div v-if="activeTab === 'data'" class="tab-pane">
          <div class="data-tab-content">
            <div class="spreadsheet-container">
              <div ref="spreadsheetRef" class="spreadsheet"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button
        type="primary"
        :disabled="!selectedPreview"
        @click="handleConfirm"
      >
        确定
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { Histogram, TrendCharts, PieChart, DataAnalysis } from '@element-plus/icons-vue'
import type { ChartType, ITableData, IChartConfig } from '@/types/chart'
import Spreadsheet from 'x-data-spreadsheet'
import 'x-data-spreadsheet/dist/xspreadsheet.css'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [data: { chartType: ChartType; subtype: string; tableData?: ITableData; config?: IChartConfig }]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const activeTab = ref<'settings' | 'data'>('settings')
const selectedCategory = ref<ChartType>('bar')
const selectedPreview = ref('bar-basic-1')
const spreadsheetRef = ref<HTMLElement | null>(null)
const showPreviewPanel = ref(true) // 默认展开预览
const showConfigPanel = ref(false) // 默认关闭配置
let spreadsheetInstance: any = null

// 折叠面板互斥逻辑
const togglePreviewPanel = () => {
  showPreviewPanel.value = !showPreviewPanel.value
  if (showPreviewPanel.value) {
    showConfigPanel.value = false // 展开预览时关闭配置
  }
}

const toggleConfigPanel = () => {
  showConfigPanel.value = !showConfigPanel.value
  if (showConfigPanel.value) {
    showPreviewPanel.value = false // 展开配置时关闭预览
  }
}

// 图表配置
const chartConfig = ref<IChartConfig>({
  // 标题配置
  title: '',
  titlePosition: 'center',
  titleFontSize: 16,
  showTitle: true,

  // 图例配置
  showLegend: true,
  legendPosition: 'bottom',
  legendOrient: 'horizontal',

  // 坐标轴配置
  xAxisLabel: '',
  yAxisLabel: '',
  showXAxisLine: true,
  showYAxisLine: true,
  showXAxisSplitLine: false,
  showYAxisSplitLine: true,
  xAxisLabelRotate: 0,

  // 数据标签配置
  showDataLabel: false,
  dataLabelPosition: 'top',

  // 颜色配置
  colorScheme: 'default',

  // 其他配置
  showTooltip: true,
  animation: true
})

// 配色方案映射
const colorSchemeMap: Record<string, string[]> = {
  default: ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399'],
  warm: ['#f56c6c', '#e6a23c', '#fac858', '#fda08b', '#ff9b7b'],
  cool: ['#409eff', '#66b1ff', '#79bbff', '#909399', '#c0c4cc'],
  nature: ['#67c23a', '#85ce61', '#a0da39', '#b3e19d', '#d9ec34']
}

// 初始化电子表格
const initSpreadsheet = () => {
  if (!spreadsheetRef.value) return

  // 销毁旧实例并清除DOM
  if (spreadsheetInstance) {
    spreadsheetInstance = null
  }
  // 清除spreadsheet容器内的所有子元素，防止重复渲染
  while (spreadsheetRef.value.firstChild) {
    spreadsheetRef.value.removeChild(spreadsheetRef.value.firstChild)
  }

  // 创建新实例
  spreadsheetInstance = new Spreadsheet(spreadsheetRef.value, {
    mode: 'edit',
    showToolbar: false,
    showGrid: true,
    showContextmenu: true,
    showBottomBar: false, // 隐藏底部sheet栏
    view: {
      height: () => spreadsheetRef.value?.clientHeight || 500,
      width: () => spreadsheetRef.value?.clientWidth || 800,
    },
    row: {
      len: 20,
      height: 28,
    },
    col: {
      len: 10,
      width: Math.floor(((spreadsheetRef.value?.clientWidth || 800) - 60) / 10),
      indexWidth: 60,
      minWidth: 80,
    },
    style: {
      bgcolor: '#ffffff',
      align: 'center',
      valign: 'middle',
      textwrap: false,
      strike: false,
      underline: false,
      color: '#0a0a0a',
      font: {
        name: 'normal',
        size: 12,
        bold: false,
        italic: false,
      },
    },
  })

  // 设置初始数据
  // 第一行：A1为空，B1=系列1, C1=系列2, D1=系列3
  // 第一列：A2=类别1, A3=类别2, A4=类别3, A5=类别4
  // 数据区域：B2-D5为数值
  const initialData = {
    name: 'sheet1',
    rows: {
      len: 20,
      0: { cells: { 0: { text: '' }, 1: { text: '系列1' }, 2: { text: '系列2' }, 3: { text: '系列3' } } },
      1: { cells: { 0: { text: '类别1' }, 1: { text: '4.3' }, 2: { text: '2.4' }, 3: { text: '2' } } },
      2: { cells: { 0: { text: '类别2' }, 1: { text: '2.5' }, 2: { text: '2.1' }, 3: { text: '1.5' } } },
      3: { cells: { 0: { text: '类别3' }, 1: { text: '3.5' }, 2: { text: '3.2' }, 3: { text: '3' } } },
      4: { cells: { 0: { text: '类别4' }, 1: { text: '4.1' }, 2: { text: '3.5' }, 3: { text: '3.8' } } },
    },
    cols: {
      len: 10,
    }
  }

  spreadsheetInstance.loadData(initialData)
}

// 监听对话框打开时初始化表格
watch(visible, (isVisible) => {
  if (isVisible) {
    // 对话框打开时，如果当前是数据选项卡，初始化表格
    if (activeTab.value === 'data') {
      nextTick(() => {
        initSpreadsheet()
      })
    }
  }
})

// 监听数据选项卡显示时初始化表格
watch(activeTab, (tab) => {
  if (tab === 'data') {
    nextTick(() => {
      initSpreadsheet()
    })
  }
})

// 获取表格数据
// 数据格式说明：
// headers: ['', '系列1', '系列2', '系列3'] - 第一行，第一个为空，后续为系列名称(Y轴)
// rows: [['类别1', '4.3', '2.4', '2'], ...] - 每行第一列为类别(X轴)，后续为数值(Y轴数据)
const getTableData = (): ITableData => {
  if (!spreadsheetInstance) {
    return {
      headers: ['', '系列1', '系列2', '系列3'],
      rows: [
        ['类别1', '4.3', '2.4', '2'],
        ['类别2', '2.5', '2.1', '1.5'],
        ['类别3', '3.5', '3.2', '3'],
        ['类别4', '4.1', '3.5', '3.8'],
      ]
    }
  }

  // 转换数据格式
  const headers: string[] = [''] // 第一个为空，对应第一列的类别标题
  const rows: string[][] = []

  // 获取第一行作为表头（从第2列开始，即col index 1）
  for (let col = 1; col <= 26; col++) {
    const cell = spreadsheetInstance.cell(0, col)
    if (cell && cell.text) {
      headers.push(cell.text)
    } else {
      break
    }
  }

  // 获取数据行（从第2行开始，即row index 1）
  for (let row = 1; row <= 100; row++) {
    const rowData: string[] = []
    let hasData = false

    // 获取第一列作为类别名称（X轴）
    const categoryCell = spreadsheetInstance.cell(row, 0)
    if (categoryCell && categoryCell.text) {
      rowData.push(categoryCell.text)
      hasData = true
    } else {
      break // 没有类别名称则停止
    }

    // 获取数据列（Y轴数据）
    for (let col = 1; col < headers.length; col++) {
      const cell = spreadsheetInstance.cell(row, col)
      if (cell && cell.text) {
        rowData.push(cell.text)
        hasData = true
      } else {
        rowData.push('0')
      }
    }

    if (hasData) {
      rows.push(rowData)
    }
  }

  return { headers, rows }
}

const echartsThumbIdMap: Record<string, string> = {
  'bar-basic-1': 'bar-simple',
  'bar-stacked-1': 'bar-stack',
  'bar-horizontal-1': 'bar-y-category',
  'bar-negative-1': 'bar-negative',
  'bar-waterfall-1': 'bar-waterfall',
  'bar-3d-1': 'bar-simple', // 使用带阴影的柱状图
  'bar-gradient-1': 'bar-gradient',
  'bar-polar-1': 'bar-polar',
  'line-basic-1': 'line-simple',
  'line-smooth-1': 'line-smooth',
  'line-stacked-1': 'line-stack',
  'line-area-1': 'area-stack',
  'line-step-1': 'line-step',
  'line-dashed-1': 'line-dashed',
  'line-mark-1': 'line-mark',
  'line-radar-1': 'radar',
  'pie-basic-1': 'pie-simple',
  'pie-doughnut-1': 'pie-doughnut',
  'pie-rose-1': 'pie-roseType',
  'pie-nested-1': 'pie-nest',
  'pie-nightingale-1': 'pie-roseType', // 南丁格尔玫瑰图
  'pie-label-1': 'pie-label',
  'pie-custom-1': 'pie-simple', // 自定义配色
  'scatter-basic-1': 'scatter-simple',
  'scatter-bubble-1': 'bubble-gradient',
  'scatter-cluster-1': 'scatter-clustering-process',
  'radar-basic-1': 'radar',
  'radar-filled-1': 'radar',
  'mixed-line-bar-1': 'mix-line-bar',
  'mixed-dual-axis-1': 'multiple-y-axis'
}

const localThumbs = import.meta.glob('../../../assets/echarts/thumb/*.png', {
  eager: true,
  import: 'default'
}) as Record<string, string>

// 图表分类配置
const chartCategories = [
  {
    name: 'bar',
    label: '柱形图',
    icon: Histogram
  },
  {
    name: 'line',
    label: '折线图',
    icon: TrendCharts
  },
  {
    name: 'pie',
    label: '饼图',
    icon: PieChart
  },
  {
    name: 'scatter',
    label: '散点图',
    icon: DataAnalysis
  },
  {
    name: 'radar',
    label: '雷达图',
    icon: DataAnalysis
  },
  {
    name: 'mixed',
    label: '混合图表',
    icon: TrendCharts
  }
]

type PreviewItem = { id: string; name: string; subtype: string }

const previewData: Record<ChartType, PreviewItem[]> = {
  bar: [
    { id: 'bar-basic-1', name: '基础柱状图', subtype: 'bar-basic' },
    { id: 'bar-stacked-1', name: '堆叠柱状图', subtype: 'bar-stacked' },
    { id: 'bar-horizontal-1', name: '横向柱状图', subtype: 'bar-horizontal' },
    { id: 'bar-negative-1', name: '正负条形图', subtype: 'bar-negative' },
    { id: 'bar-waterfall-1', name: '瀑布图', subtype: 'bar-waterfall' },
    { id: 'bar-3d-1', name: '3D 柱状图', subtype: 'bar-3d' },
    { id: 'bar-gradient-1', name: '渐变柱状图', subtype: 'bar-gradient' },
    { id: 'bar-polar-1', name: '极坐标柱状图', subtype: 'bar-polar' }
  ],
  line: [
    { id: 'line-basic-1', name: '基础折线图', subtype: 'line-basic' },
    { id: 'line-smooth-1', name: '平滑折线图', subtype: 'line-smooth' },
    { id: 'line-stacked-1', name: '堆叠折线图', subtype: 'line-stacked' },
    { id: 'line-area-1', name: '堆叠面积图', subtype: 'line-area' },
    { id: 'line-step-1', name: '阶梯折线图', subtype: 'line-step' },
    { id: 'line-dashed-1', name: '虚线折线图', subtype: 'line-dashed' },
    { id: 'line-mark-1', name: '标记折线图', subtype: 'line-mark' },
    { id: 'line-radar-1', name: '雷达折线图', subtype: 'line-radar' }
  ],
  pie: [
    { id: 'pie-basic-1', name: '基础饼图', subtype: 'pie-basic' },
    { id: 'pie-doughnut-1', name: '环形图', subtype: 'pie-doughnut' },
    { id: 'pie-rose-1', name: '玫瑰图', subtype: 'pie-rose' },
    { id: 'pie-nested-1', name: '嵌套饼图', subtype: 'pie-nested' },
    { id: 'pie-nightingale-1', name: '南丁格尔玫瑰图', subtype: 'pie-nightingale' },
    { id: 'pie-label-1', name: '标签饼图', subtype: 'pie-label' },
    { id: 'pie-custom-1', name: '自定义配色饼图', subtype: 'pie-custom' }
  ],
  scatter: [
    { id: 'scatter-basic-1', name: '基础散点图', subtype: 'scatter-basic' },
    { id: 'scatter-bubble-1', name: '气泡图', subtype: 'scatter-bubble' },
    { id: 'scatter-cluster-1', name: '聚类散点图', subtype: 'scatter-cluster' }
  ],
  radar: [
    { id: 'radar-basic-1', name: '基础雷达图', subtype: 'radar-basic' },
    { id: 'radar-filled-1', name: '填充雷达图', subtype: 'radar-filled' }
  ],
  candlestick: [],
  gauge: [],
  mixed: [
    { id: 'mixed-line-bar-1', name: '折柱混合', subtype: 'mixed-line-bar' },
    { id: 'mixed-dual-axis-1', name: '双数值轴', subtype: 'mixed-dual-axis' }
  ]
}

const currentPreviews = computed(() => {
  return previewData[selectedCategory.value] || []
})

const getPreviewImage = (preview: { id: string }) => {
  const thumbId = echartsThumbIdMap[preview.id]
  const local = thumbId ? localThumbs[`../../../assets/echarts/thumb/${thumbId}.png`] : ''
  return local || ''
}

const selectCategory = (name: ChartType) => {
  selectedCategory.value = name
  const previews = previewData[name] || []
  selectedPreview.value = previews[0]?.id || ''
  // 切换图表类型时，默认展开预览折叠面板
  showPreviewPanel.value = true
  showConfigPanel.value = false
}

const handleConfirm = () => {
  if (!selectedPreview.value) return
  const chosen = currentPreviews.value.find(p => p.id === selectedPreview.value)
  if (!chosen) return

  // 应用配色方案
  const finalConfig = { ...chartConfig.value }
  if (finalConfig.colorScheme && colorSchemeMap[finalConfig.colorScheme]) {
    finalConfig.colors = colorSchemeMap[finalConfig.colorScheme]
  }

  // 如果不显示标题，清空标题文本
  if (!finalConfig.showTitle) {
    finalConfig.title = ''
  }

  visible.value = false
  emit('confirm', {
    chartType: selectedCategory.value,
    subtype: chosen.subtype,
    tableData: getTableData(),
    config: finalConfig
  })
}

const handleClose = () => {
  visible.value = false
}
</script>

<style scoped>
/* 固定dialog高度，防止切换选项卡时抖动 */
.chart-insert-dialog :deep(.el-dialog__body) {
  height: 450px;
  overflow: hidden;
}

/* 自定义选项卡样式 - 紧密相连的选项卡 */
.custom-tabs {
  margin-bottom: 20px;
}

.tab-header {
  display: flex;
  background: #f5f5f5;
  padding: 4px;
  border-radius: 0;
}

.tab-item {
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  background: #f0f0f0;
  border: none;
  transition: all 0.2s;
  user-select: none;
  flex: 1;
  text-align: center;
}

.tab-item:hover {
  background: #e8e8e8;
}

.tab-item.active {
  background: #fff;
  border: 1px solid #d9d9d9;
  font-weight: 500;
}

.tab-content {
  padding-top: 20px;
  height: 410px;
  overflow: hidden;
}

.tab-pane {
  height: 100%;
}

.chart-dialog-layout {
  display: flex;
  gap: 16px;
  height: 100%;
}

/* 左侧树形列表 */
.chart-type-tree {
  width: 200px;
  border-right: 1px solid #e4e7ed;
  padding-right: 16px;
}

.tree-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.tree-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tree-category {
  margin-bottom: 4px;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
}

.category-header:hover {
  background: #f5f7fa;
}

.category-header.active {
  background: #ecf5ff;
}

.category-header span {
  flex: 1;
  font-size: 13px;
  color: #303133;
}

/* 右侧预览网格 */
.chart-preview-grid {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

/* 右侧预览和配置容器 */
.chart-preview-config-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}

/* 折叠面板样式 */
.collapse-panel {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  background: #fff;
  overflow: hidden;
}

.collapse-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #f5f7fa;
  border-bottom: 1px solid transparent;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s;
}

.collapse-panel-header:hover {
  background: #ecf5ff;
}

.collapse-panel-header.active {
  border-bottom-color: #e4e7ed;
}

.collapse-panel-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.collapse-icon {
  transition: transform 0.2s;
}

.collapse-panel-content {
  max-height: 340px;
  overflow-y: auto;
  overflow-x: hidden;
}

/* 折叠面板内部滚动条样式 */
.collapse-panel-content::-webkit-scrollbar {
  width: 6px;
}

.collapse-panel-content::-webkit-scrollbar-thumb {
  background-color: rgba(144, 147, 153, 0.3);
  border-radius: 3px;
}

.collapse-panel-content::-webkit-scrollbar-thumb:hover {
  background-color: rgba(144, 147, 153, 0.5);
}

.collapse-panel-content::-webkit-scrollbar-track {
  background-color: transparent;
}

/* 预览容器样式调整 */
.preview-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  padding: 12px;
}

.config-form-compact {
  padding: 12px;
}

.config-form-compact :deep(.el-form-item) {
  margin-bottom: 12px;
}

.config-form-compact :deep(.el-form-item__label) {
  font-size: 13px;
  padding-right: 8px;
  text-align: center;
  justify-content: center;
}

.config-form-compact :deep(.el-input__inner) {
  font-size: 13px;
}

.config-form-compact :deep(.el-select) {
  width: 100%;
}

.config-divider {
  margin: 8px 0;
}

.config-divider :deep(.el-divider__text) {
  font-size: 12px;
  color: #909399;
}

.preview-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e4e7ed;
}

.preview-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.preview-credit {
  font-size: 12px;
  color: #409eff;
  text-decoration: none;
  width: fit-content;
}

.preview-credit:hover {
  text-decoration: underline;
}

.preview-item {
  appearance: none;
  border: 2px solid #e4e7ed;
  background: #fff;
  border-radius: 10px;
  padding: 10px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: left;
}

.preview-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.preview-item.selected {
  border-color: #409eff;
  background: #ecf5ff;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.3);
}

.preview-thumb-image {
  width: 100%;
  height: 132px;
}

.preview-fallback {
  width: 100%;
  height: 88px;
  border-radius: 8px;
  background: #f5f7fa;
  color: #909399;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  padding: 8px;
  text-align: center;
}

.preview-name {
  font-size: 12px;
  color: #303133;
  line-height: 1.2;
  height: 2.4em;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* 数据选项卡样式 */
.data-tab-content {
  padding: 0;
  height: 100%;
  overflow: hidden;
}

.spreadsheet-container {
  width: 100%;
  height: 100%;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
  background: #fff;
}

.spreadsheet {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* 隐藏x-data-spreadsheet的底部sheet栏 */
.spreadsheet :deep(.x-spreadsheet-bottombar) {
  display: none !important;
}

/* 确保spreadsheet内部元素撑满高度 */
.spreadsheet :deep(.x-spreadsheet) {
  height: 100% !important;
}
</style>
