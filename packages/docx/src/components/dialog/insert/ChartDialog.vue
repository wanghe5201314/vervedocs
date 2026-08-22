<template>
  <a-modal
    v-model:open="visible"
    title="插入图表"
    width="1000px"
    class="app-dialog chart-insert-dialog"
    :destroyOnClose="true"
    @cancel="handleClose"
  >
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
          <div class="chart-type-tree">
            <div class="tree-title">选择图表类型</div>
            <div style="overflow-y:auto;height:380px">
              <div class="tree-list">
                <div
                  v-for="category in chartCategories"
                  :key="category.name"
                  class="tree-category"
                >
                  <div
                    class="category-header"
                    :class="{ active: selectedCategory === category.name }"
                    @click="selectCategory(category.name as ChartType)"
                  >
                    <component :is="category.icon" />
                    <span>{{ category.label }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="chart-preview-config-container">
            <div class="collapse-panel">
              <div
                class="collapse-panel-header"
                :class="{ active: showPreviewPanel }"
                @click="togglePreviewPanel"
              >
                <div class="collapse-panel-title">
                  <component :is="showPreviewPanel ? 'ArrowDownOutlined' : 'RightOutlined'" />
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
              <div v-show="showPreviewPanel" class="collapse-panel-content">
                <div style="overflow-y:auto;max-height:300px">
                  <div class="preview-container">
                    <button
                      v-for="preview in currentPreviews"
                      :key="preview.id"
                      class="preview-item"
                      :class="{ selected: selectedPreview === preview.id }"
                      @click="selectedPreview = preview.id"
                      type="button"
                    >
                      <a-image :src="getPreviewImage(preview)" style="width:100%;height:132px" :fallback="''">
                        <template #previewPlaceholder>
                          <div class="preview-fallback">{{ preview.name }}</div>
                        </template>
                      </a-image>
                      <div class="preview-name">{{ preview.name }}</div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="collapse-panel">
              <div
                class="collapse-panel-header"
                :class="{ active: showConfigPanel }"
                @click="toggleConfigPanel"
              >
                <div class="collapse-panel-title">
                  <component :is="showConfigPanel ? 'ArrowDownOutlined' : 'RightOutlined'" />
                  <span>图表配置</span>
                </div>
              </div>
              <div v-show="showConfigPanel" class="collapse-panel-content">
                <div style="overflow-y:auto;max-height:300px">
                  <a-form :model="chartConfig" :label-col="{ style: { width: '100px' } }" class="config-form-compact">
                    <a-form-item label="显示标题">
                      <a-switch v-model:checked="chartConfig.showTitle" />
                    </a-form-item>
                    <a-form-item v-if="chartConfig.showTitle" label="标题名称">
                      <a-input v-model:value="chartConfig.title" placeholder="请输入图表标题" />
                    </a-form-item>
                    <a-form-item v-if="chartConfig.showTitle" label="标题位置">
                      <a-radio-group v-model:value="chartConfig.titlePosition">
                        <a-radio-button value="left">左</a-radio-button>
                        <a-radio-button value="center">中</a-radio-button>
                        <a-radio-button value="right">右</a-radio-button>
                      </a-radio-group>
                    </a-form-item>
                    <a-divider class="config-divider" />

                    <a-form-item label="显示图例">
                      <a-switch v-model:checked="chartConfig.showLegend" />
                    </a-form-item>
                    <a-form-item v-if="chartConfig.showLegend" label="图例位置">
                      <a-select v-model:value="chartConfig.legendPosition">
                        <a-select-option label="上" value="top" />
                        <a-select-option label="下" value="bottom" />
                        <a-select-option label="左" value="left" />
                        <a-select-option label="右" value="right" />
                      </a-select>
                    </a-form-item>
                    <a-divider class="config-divider" />

                    <a-form-item label="X轴标题">
                      <a-input v-model:value="chartConfig.xAxisLabel" placeholder="请输入X轴标题" />
                    </a-form-item>
                    <a-form-item label="Y轴标题">
                      <a-input v-model:value="chartConfig.yAxisLabel" placeholder="请输入Y轴标题" />
                    </a-form-item>
                    <a-form-item label="显示网格线">
                      <a-switch v-model:checked="chartConfig.showYAxisSplitLine" />
                    </a-form-item>
                    <a-divider class="config-divider" />

                    <a-form-item label="显示数据标签">
                      <a-switch v-model:checked="chartConfig.showDataLabel" />
                    </a-form-item>
                    <a-divider class="config-divider" />

                    <a-form-item label="配色方案">
                      <a-select v-model:value="chartConfig.colorScheme">
                        <a-select-option label="默认" value="default" />
                        <a-select-option label="暖色调" value="warm" />
                        <a-select-option label="冷色调" value="cool" />
                        <a-select-option label="自然色" value="nature" />
                      </a-select>
                    </a-form-item>
                  </a-form>
                </div>
              </div>
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
      <a-button @click="visible = false">取消</a-button>
      <a-button
        type="primary"
        :disabled="!selectedPreview"
        @click="handleConfirm"
      >
        确定
      </a-button>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { BarChartOutlined, LineChartOutlined, PieChartOutlined, DotChartOutlined } from '@ant-design/icons-vue'
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
const showPreviewPanel = ref(true)
const showConfigPanel = ref(false)
let spreadsheetInstance: any = null

const togglePreviewPanel = () => {
  showPreviewPanel.value = !showPreviewPanel.value
  if (showPreviewPanel.value) {
    showConfigPanel.value = false
  }
}

const toggleConfigPanel = () => {
  showConfigPanel.value = !showConfigPanel.value
  if (showConfigPanel.value) {
    showPreviewPanel.value = false
  }
}

const chartConfig = ref<IChartConfig>({
  title: '',
  titlePosition: 'center',
  titleFontSize: 16,
  showTitle: true,

  showLegend: true,
  legendPosition: 'bottom',
  legendOrient: 'horizontal',

  xAxisLabel: '',
  yAxisLabel: '',
  showXAxisLine: true,
  showYAxisLine: true,
  showXAxisSplitLine: false,
  showYAxisSplitLine: true,
  xAxisLabelRotate: 0,

  showDataLabel: false,
  dataLabelPosition: 'top',

  colorScheme: 'default',

  showTooltip: true,
  animation: true
})

const colorSchemeMap: Record<string, string[]> = {
  default: ['#1890ff', '#67c23a', '#e6a23c', '#f56c6c', '#909399'],
  warm: ['#f56c6c', '#e6a23c', '#fac858', '#fda08b', '#ff9b7b'],
  cool: ['#1890ff', '#66b1ff', '#79bbff', '#909399', '#c0c4cc'],
  nature: ['#67c23a', '#85ce61', '#a0da39', '#b3e19d', '#d9ec34']
}

const initSpreadsheet = () => {
  if (!spreadsheetRef.value) return

  if (spreadsheetInstance) {
    spreadsheetInstance = null
  }
  while (spreadsheetRef.value.firstChild) {
    spreadsheetRef.value.removeChild(spreadsheetRef.value.firstChild)
  }

  spreadsheetInstance = new Spreadsheet(spreadsheetRef.value, {
    mode: 'edit',
    showToolbar: false,
    showGrid: true,
    showContextmenu: true,
    showBottomBar: false,
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
        name: 'normal' as any,
        size: 12,
        bold: false,
        italic: false,
      },
    },
  })

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

watch(visible, (isVisible) => {
  if (isVisible) {
    if (activeTab.value === 'data') {
      nextTick(() => {
        initSpreadsheet()
      })
    }
  }
})

watch(activeTab, (tab) => {
  if (tab === 'data') {
    nextTick(() => {
      initSpreadsheet()
    })
  }
})

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

  const headers: string[] = ['']
  const rows: string[][] = []

  for (let col = 1; col <= 26; col++) {
    const cell = spreadsheetInstance.cell(0, col)
    if (cell && cell.text) {
      headers.push(cell.text)
    } else {
      break
    }
  }

  for (let row = 1; row <= 100; row++) {
    const rowData: string[] = []

    const categoryCell = spreadsheetInstance.cell(row, 0)
    if (categoryCell && categoryCell.text) {
      rowData.push(categoryCell.text)
    } else {
      break
    }

    for (let col = 1; col < headers.length; col++) {
      const cell = spreadsheetInstance.cell(row, col)
      if (cell && cell.text) {
        rowData.push(cell.text)
      } else {
        rowData.push('0')
      }
    }

    rows.push(rowData)

  }

  return { headers, rows }
}

const echartsThumbIdMap: Record<string, string> = {
  'bar-basic-1': 'bar-simple',
  'bar-stacked-1': 'bar-stack',
  'bar-horizontal-1': 'bar-y-category',
  'bar-negative-1': 'bar-negative',
  'bar-waterfall-1': 'bar-waterfall',
  'bar-3d-1': 'bar-simple',
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
  'pie-nightingale-1': 'pie-roseType',
  'pie-label-1': 'pie-label',
  'pie-custom-1': 'pie-simple',
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

const chartCategories = [
  {
    name: 'bar',
    label: '柱形图',
    icon: BarChartOutlined
  },
  {
    name: 'line',
    label: '折线图',
    icon: LineChartOutlined
  },
  {
    name: 'pie',
    label: '饼图',
    icon: PieChartOutlined
  },
  {
    name: 'scatter',
    label: '散点图',
    icon: DotChartOutlined
  },
  {
    name: 'radar',
    label: '雷达图',
    icon: DotChartOutlined
  },
  {
    name: 'mixed',
    label: '混合图表',
    icon: LineChartOutlined
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
  showPreviewPanel.value = true
  showConfigPanel.value = false
}

const handleConfirm = () => {
  if (!selectedPreview.value) return
  const chosen = currentPreviews.value.find(p => p.id === selectedPreview.value)
  if (!chosen) return

  const finalConfig = { ...chartConfig.value }
  if (finalConfig.colorScheme && colorSchemeMap[finalConfig.colorScheme]) {
    finalConfig.colors = colorSchemeMap[finalConfig.colorScheme]
  }

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
.chart-insert-dialog :deep(.ant-modal-body) {
  height: 450px;
  overflow: hidden;
}

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
  background: #e6f7ff;
}

.category-header span {
  flex: 1;
  font-size: 13px;
  color: #303133;
}


.chart-preview-config-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}

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
  background: #e6f7ff;
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


.collapse-panel-content {
  max-height: 340px;
  overflow-y: auto;
  overflow-x: hidden;
}

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

.preview-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  padding: 12px;
}

.config-form-compact {
  padding: 12px;
}

.config-divider {
  margin: 8px 0;
}


.preview-credit {
  font-size: 12px;
  color: #1890ff;
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
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
}

.preview-item.selected {
  border-color: #1890ff;
  background: #e6f7ff;
  box-shadow: 0 2px 12px rgba(24, 144, 255, 0.3);
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

.spreadsheet :deep(.x-spreadsheet-bottombar) {
  display: none !important;
}

.spreadsheet :deep(.x-spreadsheet) {
  height: 100% !important;
}
</style>
