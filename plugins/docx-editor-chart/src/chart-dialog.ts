/**
 * ChartDialog —— 插入图表对话框（纯 DOM，参照 view widget 模式）
 *
 * 结构在 chart-dialog.html，样式在 chart-dialog.css，
 * 本模块负责注入资源、填充类型/预览/配置、绑定事件、确认插入。
 */
import './assets/css/chart-dialog.css'
import dialogHtml from './assets/components/chart-dialog.html?raw'
import Chart from './chart-lib'
import { generateChartOption } from './chart-data-extractor'
import type { IChartConfig, IChartTableData, PluginHost } from '@vervedoc/docx-editor-schema'

/** 图表类型分类 */
interface ChartCategory { name: string; label: string }

/** 预览项 */
interface PreviewItem { id: string; name: string; subtype: string }

/** 配色方案 */
const colorSchemeMap: Record<string, string[]> = {
  default: ['#4472c4', '#ed7d31', '#a5a5a5', '#ffc000', '#5b9bd5'],
  warm: ['#ed7d31', '#ffc000', '#fac858', '#fda08b', '#ff9b7b'],
  cool: ['#4472c4', '#5b9bd5', '#70ad47', '#8eaadb', '#a5d8a6'],
  nature: ['#70ad47', '#85ce61', '#a0da39', '#b3e19d', '#d9ec34']
}

/** 数据表格常量 */
const CELL_WIDTH = 70
const CELL_HEIGHT = 24
const DATA_ROWS = 31
const DATA_COLS = 15

/** 图表类型分类列表 */
const chartCategories: ChartCategory[] = [
  { name: 'bar', label: '柱形图' },
  { name: 'line', label: '折线图' },
  { name: 'pie', label: '饼图' },
  { name: 'scatter', label: '散点图' },
  { name: 'radar', label: '雷达图' },
  { name: 'mixed', label: '混合图表' }
]

/** 各图表类型对应的预览项列表 */
const previewData: Record<string, PreviewItem[]> = {
  bar: [
    { id: 'bar-basic', name: '基础柱状图', subtype: 'bar-basic' },
    { id: 'bar-stacked', name: '堆叠柱状图', subtype: 'bar-stacked' },
    { id: 'bar-horizontal', name: '横向柱状图', subtype: 'bar-horizontal' }
  ],
  line: [
    { id: 'line-basic', name: '基础折线图', subtype: 'line-basic' },
    { id: 'line-smooth', name: '平滑折线图', subtype: 'line-smooth' },
    { id: 'line-stacked', name: '堆叠折线图', subtype: 'line-stacked' },
    { id: 'line-area', name: '堆叠面积图', subtype: 'line-area' },
    { id: 'line-step', name: '阶梯折线图', subtype: 'line-step' },
    { id: 'line-dashed', name: '虚线折线图', subtype: 'line-dashed' }
  ],
  pie: [
    { id: 'pie-basic', name: '基础饼图', subtype: 'pie-basic' },
    { id: 'pie-doughnut', name: '环形图', subtype: 'pie-doughnut' }
  ],
  scatter: [
    { id: 'scatter-basic', name: '基础散点图', subtype: 'scatter-basic' }
  ],
  radar: [
    { id: 'radar-basic', name: '基础雷达图', subtype: 'radar-basic' },
    { id: 'radar-filled', name: '填充雷达图', subtype: 'radar-filled' }
  ],
  mixed: [
    { id: 'mixed-line-bar', name: '折柱混合', subtype: 'mixed-line-bar' }
  ]
}

/** 默认示例数据 */
const defaultTableData: IChartTableData = {
  headers: ['', '系列1', '系列2', '系列3'],
  rows: [
    ['类别1', '4.3', '2.4', '2'],
    ['类别2', '2.5', '2.1', '1.5'],
    ['类别3', '3.5', '3.2', '3'],
    ['类别4', '4.1', '3.5', '3.8']
  ]
}

/**
 * 插入图表对话框
 */
export class ChartDialog {
  private root: HTMLElement | null = null
  private host: PluginHost | null = null
  private selectedCategory = 'bar'
  private selectedPreview = 'bar-basic'
  /** 编辑模式：正在编辑的图表 ID（null=新建模式） */
  private editChartId: string | null = null

  private showPreviewPanel = true
  private showConfigPanel = false
  private previewCharts: Chart[] = []
  private selectedRange: [number, number] = [4, 5]
  private focusCell: [number, number] | null = null

  /** 注入宿主契约 */
  setHost(host: PluginHost): void {
    this.host = host
  }

  /** 显示对话框（传入 chartData 时为编辑模式，预填现有数据） */
  show(chartData?: { chartId: string; chartType: string; subtype?: string; dataSource?: any; config?: any }): void {
    this.hide()
    if (chartData) {
      this.editChartId = chartData.chartId
      this.selectedCategory = chartData.chartType
      this.selectedPreview = chartData.subtype ?? ''
    } else {
      this.editChartId = null
      this.selectedCategory = 'bar'
      this.selectedPreview = 'bar-basic'
    }
    const container = document.createElement('div')
    container.innerHTML = dialogHtml
    this.root = container.firstElementChild as HTMLElement
    document.body.appendChild(this.root)

    this.renderCategories()
    this.renderPreviews()
    this.renderDataTable(chartData?.dataSource?.manualData)
    this.bindTabs()
    this.bindCollapsePanels()
    this.bindConfig()
    this.bindRangeDrag()
    this.bindDataKeyboard()
    this.bindActions()
  }

  /** 隐藏对话框 */
  hide(): void {
    this.previewCharts.forEach(c => c.destroy())
    this.previewCharts = []
    this.root?.remove()
    this.root = null
  }

  /** 渲染图表类型分类列表 */
  private renderCategories(): void {
    const list = this.root!.querySelector('#cd-category-list')!
    list.innerHTML = ''
    for (const cat of chartCategories) {
      const el = document.createElement('div')
      el.className = 'cd-category' + (cat.name === this.selectedCategory ? ' cd-category-active' : '')
      el.textContent = cat.label
      el.addEventListener('click', () => {
        this.selectedCategory = cat.name
        const previews = previewData[cat.name] || []
        this.selectedPreview = previews[0]?.id || ''
        this.renderCategories()
        this.renderPreviews()
      })
      list.appendChild(el)
    }
  }

  /** 渲染预览项（Chart.js 实时小图） */
  private renderPreviews(): void {
    const grid = this.root!.querySelector('#cd-preview-grid')!
    grid.innerHTML = ''
    this.previewCharts.forEach(c => c.destroy())
    this.previewCharts = []

    const previews = previewData[this.selectedCategory] || []
    for (const p of previews) {
      const item = document.createElement('div')
      item.className = 'cd-preview-item' + (p.id === this.selectedPreview ? ' cd-preview-selected' : '')

      const canvas = document.createElement('canvas')
      canvas.className = 'cd-preview-canvas'
      canvas.width = 200
      canvas.height = 100
      item.appendChild(canvas)

      const name = document.createElement('div')
      name.className = 'cd-preview-name'
      name.textContent = p.name
      item.appendChild(name)

      item.addEventListener('click', () => {
        this.selectedPreview = p.id
        this.renderPreviews()
      })
      grid.appendChild(item)

      this.renderPreviewChart(canvas, p.subtype)
    }
  }

  /** 用 Chart.js 渲染预览小图 */
  private renderPreviewChart(canvas: HTMLCanvasElement, subtype: string): void {
    const chartType = subtype.split('-')[0]
    const config = generateChartOption(chartType, defaultTableData, {
      showTitle: false, showLegend: false, animation: false
    } as IChartConfig, subtype)
    try {
      const chart = new Chart(canvas, {
        ...config,
        options: {
          ...config.options,
          responsive: false,
          animation: false,
          plugins: { ...(config.options?.plugins || {}), legend: { display: false }, title: { display: false } }
        }
      })
      this.previewCharts.push(chart)
    } catch { /* ignore preview errors */ }
  }

  /** 渲染数据表格（31×7 固定网格 + 拖拽选区） */
  private renderDataTable(tableData?: IChartTableData): void {
    const table = this.root!.querySelector('#cd-data-table') as HTMLTableElement
    table.innerHTML = ''

    for (let r = 0; r < DATA_ROWS; r++) {
      const tr = document.createElement('tr')
      for (let c = 0; c < DATA_COLS; c++) {
        const td = document.createElement('td')
        if (c === 0 || r === 0) {
          td.classList.add('cd-data-head')
        }
        const input = document.createElement('input')
        input.className = 'cd-data-input'
        if (r < this.selectedRange[1] && c < this.selectedRange[0]) {
          input.classList.add('cd-data-selected')
        }
        input.id = `cd-cell-${r}-${c}`
        input.autocomplete = 'off'
        input.addEventListener('focus', () => { this.focusCell = [r, c] })
        input.addEventListener('paste', (e: ClipboardEvent) => this.handlePaste(e, r, c))
        td.appendChild(input)
        tr.appendChild(td)
      }
      table.appendChild(tr)
    }

    this.initData(tableData)
    this.updateRangeUI()
  }

  /** 用指定数据或默认数据填充网格 */
  private initData(tableData?: IChartTableData): void {
    const data = tableData ?? defaultTableData
    const { headers, rows } = data
    for (let c = 0; c < headers.length; c++) {
      const input = this.root!.querySelector(`#cd-cell-0-${c}`) as HTMLInputElement
      if (input) input.value = headers[c]
    }
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < rows[r].length; c++) {
        const input = this.root!.querySelector(`#cd-cell-${r + 1}-${c}`) as HTMLInputElement
        if (input) input.value = rows[r][c]
      }
    }
    this.selectedRange = [headers.length, rows.length + 1]
    this.updateRangeUI()
    this.updateHeadClass()
  }

  /** 更新选区边框和缩放点位置 */
  private updateRangeUI(): void {
    const [col, row] = this.selectedRange
    const width = col * CELL_WIDTH
    const height = row * CELL_HEIGHT

    const tempRange = this.root!.querySelector('#cd-temp-range') as HTMLElement
    tempRange.style.width = '0'
    tempRange.style.height = '0'

    const t = this.root!.querySelector('#cd-range-t') as HTMLElement
    t.style.width = width + 'px'

    const b = this.root!.querySelector('#cd-range-b') as HTMLElement
    b.style.top = height + 'px'
    b.style.width = width + 'px'

    const l = this.root!.querySelector('#cd-range-l') as HTMLElement
    l.style.height = height + 'px'

    const r = this.root!.querySelector('#cd-range-r') as HTMLElement
    r.style.left = width + 'px'
    r.style.height = height + 'px'

    const resizable = this.root!.querySelector('#cd-resizable') as HTMLElement
    resizable.style.left = width + 'px'
    resizable.style.top = height + 'px'
  }

  /** 更新表头/选中单元格样式 */
  private updateHeadClass(): void {
    const [col, row] = this.selectedRange
    const table = this.root!.querySelector('#cd-data-table') as HTMLTableElement
    for (let r = 0; r < DATA_ROWS; r++) {
      for (let c = 0; c < DATA_COLS; c++) {
        const td = table.rows[r].cells[c]
        td.classList.toggle('cd-data-head', c === 0 || r === 0)
        const input = td.querySelector('input')!
        input.classList.toggle('cd-data-selected', r < row && c < col)
      }
    }
  }

  /** 绑定拖拽选区 */
  private bindRangeDrag(): void {
    const resizable = this.root!.querySelector('#cd-resizable') as HTMLElement
    resizable.addEventListener('mousedown', (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      let isMouseDown = true
      const startPageX = e.pageX
      const startPageY = e.pageY
      const originWidth = this.selectedRange[0] * CELL_WIDTH
      const originHeight = this.selectedRange[1] * CELL_HEIGHT
      const tempRange = this.root!.querySelector('#cd-temp-range') as HTMLElement

      const onMouseMove = (ev: MouseEvent) => {
        if (!isMouseDown) return
        const x = ev.pageX - startPageX
        const y = ev.pageY - startPageY
        tempRange.style.width = (originWidth + x) + 'px'
        tempRange.style.height = (originHeight + y) + 'px'
      }

      const onMouseUp = (ev: MouseEvent) => {
        isMouseDown = false
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)

        if (startPageX === ev.pageX && startPageY === ev.pageY) return

        let width = parseFloat(tempRange.style.width) || 0
        let height = parseFloat(tempRange.style.height) || 0

        if (width % CELL_WIDTH > CELL_WIDTH * 0.5) width = width + (CELL_WIDTH - width % CELL_WIDTH)
        if (height % CELL_HEIGHT > CELL_HEIGHT * 0.5) height = height + (CELL_HEIGHT - height % CELL_HEIGHT)

        let row = Math.round(height / CELL_HEIGHT)
        let col = Math.round(width / CELL_WIDTH)

        if (row < 3) row = 3
        if (col < 2) col = 2

        this.selectedRange = [col, row]
        this.updateRangeUI()
        this.updateHeadClass()
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    })
  }

  /** 绑定数据表格键盘事件（回车跳下一行） */
  private bindDataKeyboard(): void {
    this.root!.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || !this.focusCell) return
      const [r, c] = this.focusCell
      const next = this.root!.querySelector(`#cd-cell-${r + 1}-${c}`) as HTMLInputElement
      if (next) next.focus()
    })
  }

  /** 粘贴 Excel 数据 */
  private handlePaste(e: ClipboardEvent, rowIndex: number, colIndex: number): void {
    e.preventDefault()
    if (!e.clipboardData) return

    const item = e.clipboardData.items[0]
    if (!item || item.kind !== 'string' || item.type !== 'text/plain') return

    item.getAsString(text => {
      const lines = text.split('\r\n')
      if (lines[lines.length - 1] === '') lines.pop()

      const data: string[][] = []
      for (const line of lines) {
        const cells = line.split('\t')
        if (cells.length === 1) return
        data.push(cells)
      }
      if (data.length === 0) return

      const colCount = data[0].length
      if (!data.every(row => row.length === colCount)) return

      for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data[i].length; j++) {
          const r = rowIndex + i
          const c = colIndex + j
          if (r >= DATA_ROWS || c >= DATA_COLS) continue
          const input = this.root!.querySelector(`#cd-cell-${r}-${c}`) as HTMLInputElement
          if (input) input.value = data[i][j]
        }
      }
    })
  }

  /** 清空表格数据 */
  private clearData(): void {
    for (let r = 0; r < DATA_ROWS; r++) {
      for (let c = 0; c < DATA_COLS; c++) {
        const input = this.root!.querySelector(`#cd-cell-${r}-${c}`) as HTMLInputElement
        if (input) input.value = ''
      }
    }
  }

  /** 从选区提取表格数据 */
  private getTableData(): IChartTableData {
    const [col, row] = this.selectedRange
    const headers: string[] = []
    const rows: string[][] = []

    for (let c = 0; c < col; c++) {
      const input = this.root!.querySelector(`#cd-cell-0-${c}`) as HTMLInputElement
      headers.push(input?.value ?? '')
    }
    for (let r = 1; r < row; r++) {
      const rowData: string[] = []
      for (let c = 0; c < col; c++) {
        const input = this.root!.querySelector(`#cd-cell-${r}-${c}`) as HTMLInputElement
        rowData.push(input?.value ?? '')
      }
      rows.push(rowData)
    }
    return { headers, rows }
  }

  /** 绑定 Tab 切换 */
  private bindTabs(): void {
    const tabs = this.root!.querySelectorAll('.cd-tab')
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = (tab as HTMLElement).dataset.tab!

        tabs.forEach(t => t.classList.remove('cd-tab-active'))
        tab.classList.add('cd-tab-active')
        this.root!.querySelectorAll('.cd-pane').forEach(p => p.classList.remove('cd-pane-active'))
        this.root!.querySelector(`.cd-pane[data-pane="${tabName}"]`)!.classList.add('cd-pane-active')
      })
    })
  }

  /** 绑定折叠面板 */
  private bindCollapsePanels(): void {
    const previewHeader = this.root!.querySelector('#cd-preview-header')!
    const previewContent = this.root!.querySelector('#cd-preview-content')! as HTMLElement
    const configHeader = this.root!.querySelector('#cd-config-header')!
    const configContent = this.root!.querySelector('#cd-config-content')! as HTMLElement

    previewHeader.addEventListener('click', () => {
      this.showPreviewPanel = !this.showPreviewPanel
      if (this.showPreviewPanel) this.showConfigPanel = false
      this.updateCollapseUI(previewHeader, previewContent, this.showPreviewPanel)
      this.updateCollapseUI(configHeader, configContent, this.showConfigPanel)
    })
    configHeader.addEventListener('click', () => {
      this.showConfigPanel = !this.showConfigPanel
      if (this.showConfigPanel) this.showPreviewPanel = false
      this.updateCollapseUI(previewHeader, previewContent, this.showPreviewPanel)
      this.updateCollapseUI(configHeader, configContent, this.showConfigPanel)
    })
  }

  /** 更新折叠面板 UI */
  private updateCollapseUI(header: Element, content: HTMLElement, active: boolean): void {
    header.classList.toggle('cd-collapse-active', active)
    content.style.display = active ? '' : 'none'
    const arrow = header.querySelector('.cd-collapse-arrow')!
    arrow.textContent = active ? '▼' : '▶'
  }

  /** 绑定配置表单（标题开关联动） */
  private bindConfig(): void {
    const showTitle = this.root!.querySelector('#cd-show-title') as HTMLInputElement
    const titleRow = this.root!.querySelector('#cd-title-row') as HTMLElement
    const titlePosRow = this.root!.querySelector('#cd-title-pos-row') as HTMLElement
    const updateTitleVisibility = () => {
      titleRow.style.display = showTitle.checked ? '' : 'none'
      titlePosRow.style.display = showTitle.checked ? '' : 'none'
    }
    showTitle.addEventListener('change', updateTitleVisibility)
    updateTitleVisibility()

    const showLegend = this.root!.querySelector('#cd-show-legend') as HTMLInputElement
    const legendRow = this.root!.querySelector('#cd-legend-row') as HTMLElement
    showLegend.addEventListener('change', () => {
      legendRow.style.display = showLegend.checked ? '' : 'none'
    })
  }

  /** 收集配置表单数据 */
  private getConfig(): IChartConfig {
    const get = (id: string) => (this.root!.querySelector(id) as HTMLInputElement)
    const getVal = (id: string) => get(id).value
    const getChecked = (id: string) => get(id).checked
    const scheme = getVal('#cd-color-scheme')
    return {
      showTitle: getChecked('#cd-show-title'),
      title: getVal('#cd-title'),
      titlePosition: getVal('#cd-title-position'),
      showLegend: getChecked('#cd-show-legend'),
      legendPosition: getVal('#cd-legend-position'),
      xAxisLabel: getVal('#cd-xaxis-label'),
      yAxisLabel: getVal('#cd-yaxis-label'),
      showYAxisSplitLine: getChecked('#cd-show-grid'),
      showDataLabel: getChecked('#cd-show-datalabel'),
      colorScheme: scheme,
      colors: colorSchemeMap[scheme],
      showTooltip: true,
      animation: false
    }
  }

  /** 绑定确认/取消按钮 */
  private bindActions(): void {
    this.root!.querySelector('#cd-cancel')!.addEventListener('click', () => this.hide())
    this.root!.querySelector('#cd-clear-data')!.addEventListener('click', () => this.clearData())
    this.root!.querySelector('#cd-ok')!.addEventListener('click', () => {
      const previews = previewData[this.selectedCategory] || []
      const chosen = previews.find(p => p.id === this.selectedPreview)
      if (!chosen) return

      const config = this.getConfig()
      const tableData = this.getTableData()
      const payload = {
        chartType: this.selectedCategory,
        subtype: chosen.subtype,
        dataSource: { type: 'manual', manualData: tableData },
        config,
        width: 420,
        height: 320
      }
      if (this.editChartId) {
        this.host?.executeUpdateChart(this.editChartId, payload)
      } else {
        this.host?.executeInsertChart(payload)
      }
      this.hide()
    })
  }
}
