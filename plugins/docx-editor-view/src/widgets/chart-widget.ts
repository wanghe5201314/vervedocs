/**
 * ChartWidget —— 图表交互 widget
 *
 * 图表以 canvas drawImage 方式渲染（同图片），交互层独立：
 *  - 点击图表选中（高亮边框 + 八方向缩放手柄）
 *  - 拖拽手柄缩放图表
 *  - 悬浮工具栏（编辑图表、删除）
 *  - 点击或"编辑"按钮 → emit chartClick 事件 → 弹出编辑面板
 */

import type { DocumentLayout, ChartBlock } from '../layout-types'
import type { EventBus } from '@vervedoc/docx-editor-state'
import type { Path } from '@vervedoc/docx-editor-schema'
import { createSelectionLayer, positionSelectionToolbar, updateSelectionLayer } from './selection-layer'


/** ChartWidget 的依赖注入接口 */
export interface ChartWidgetDeps {
  /** 选框裁剪层的挂载容器 */
  getContainer: () => HTMLElement
  /** 获取当前文档布局 */
  getLayout: () => DocumentLayout | null
  /** 获取编辑器容器在视口中的矩形位置 */
  getContainerRect: () => DOMRect
  /** 获取当前垂直滚动偏移量 */
  getScrollY: () => number
  /** 获取页面水平偏移量 */
  getPageOffsetX: () => number
  /** 触发编辑器命令的回调 */
  onCommand: (cmd: string, ...args: any[]) => void
  /** 拖拽过程中实时更新图表尺寸（不写入文档，仅刷新显示） */
  onUpdateChartSizeLive: (path: Path, width: number, height: number) => void
  /** 获取事件总线（用于发射 chartClick 事件） */
  getEventBus: () => EventBus | undefined
}

/** 当前选中的图表信息 */
interface ChartSelection {
  /** 图表在文档中的路径 */
  path: Path
  /** 图表块数据 */
  block: ChartBlock
  /** 图表所在页面的屏幕起点横坐标 */
  pageOriginX: number
  /** 图表所在页面的屏幕起点纵坐标 */
  pageOriginY: number
}

/** 缩放手柄边长 */
const HANDLE_SIZE = 8
/** 缩放手柄中心偏移量 */
const HANDLE_OFFSET = HANDLE_SIZE / 2
/** 八方向缩放手柄定义 */
const HANDLES = [
  { dir: 'nw', x: 0, y: 0 },
  { dir: 'n', x: 0.5, y: 0 },
  { dir: 'ne', x: 1, y: 0 },
  { dir: 'e', x: 1, y: 0.5 },
  { dir: 'se', x: 1, y: 1 },
  { dir: 's', x: 0.5, y: 1 },
  { dir: 'sw', x: 0, y: 1 },
  { dir: 'w', x: 0, y: 0.5 },
] as const

/**
 * 图表交互 widget
 *
 * 提供图表选中高亮、八方向缩放手柄、悬浮工具栏（编辑、删除）以及拖拽缩放功能。
 */
export class ChartWidget {
  private selectionLayer: HTMLDivElement | null = null
  /** 选中高亮边框 DOM */
  private selectionBox: HTMLDivElement | null = null
  /** 缩放手柄 DOM 数组 */
  private handleEls: HTMLDivElement[] = []
  /** 悬浮工具栏 DOM */
  private toolbar: HTMLDivElement | null = null
  /** 当前选中的图表信息 */
  private selection: ChartSelection | null = null
  /** 拖拽缩放状态 */
  private dragging: { dir: string; startX: number; startY: number; origW: number; origH: number; lastW: number; lastH: number } | null = null

  /**
   * 创建 ChartWidget 实例
   * @param deps 依赖注入对象
   */
  constructor(private deps: ChartWidgetDeps) {}

  /**
   * 创建选中框、缩放手柄和工具栏，统一挂载到编辑区裁剪层
   */
  create(): void {
    this.selectionLayer = createSelectionLayer(this.deps.getContainer(), 'chart')
    this.selectionBox = document.createElement('div')
    this.selectionBox.style.cssText = 'position:absolute;border:1.5px solid #409eff;pointer-events:none;z-index:100;box-sizing:border-box;'
    this.selectionLayer.appendChild(this.selectionBox)

    for (const h of HANDLES) {
      const el = document.createElement('div')
      el.dataset.dir = h.dir
      el.style.cssText = `position:absolute;pointer-events:auto;width:${HANDLE_SIZE}px;height:${HANDLE_SIZE}px;background:#fff;border:1.5px solid #409eff;border-radius:50%;z-index:101;cursor:${this.cursorFor(h.dir)};box-sizing:border-box;`
      el.addEventListener('mousedown', (e) => this.onHandleMouseDown(e, h.dir))
      this.selectionLayer.appendChild(el)
      this.handleEls.push(el)
    }

    this.toolbar = this.createToolbar()
    this.selectionLayer.appendChild(this.toolbar)
  }

  /**
   * 根据手柄方向返回对应的鼠标光标样式
   */
  private cursorFor(dir: string): string {
    const map: Record<string, string> = {
      nw: 'nwse-resize', n: 'ns-resize', ne: 'nesw-resize', e: 'ew-resize',
      se: 'nwse-resize', s: 'ns-resize', sw: 'nesw-resize', w: 'ew-resize',
    }
    return map[dir] || 'default'
  }

  /**
   * 创建图表悬浮工具栏（编辑图表、删除）
   */
  private createToolbar(): HTMLDivElement {
    const bar = document.createElement('div')
    bar.style.cssText = 'position:absolute;pointer-events:auto;box-sizing:border-box;overflow-x:auto;display:none;z-index:102;background:#f5f5f5;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.15);padding:4px 6px;align-items:center;gap:2px;font-family:sans-serif;'

    const mkBtn = (icon: string, title: string, onClick: () => void): HTMLButtonElement => {
      const btn = document.createElement('button')
      btn.title = title
      btn.style.cssText = 'border:none;background:transparent;cursor:pointer;padding:5px;border-radius:4px;display:flex;align-items:center;justify-content:center;transition:background .15s;'
      const sp = document.createElement('span')
      sp.className = 'material-symbols-outlined'
      sp.textContent = icon
      sp.style.cssText = 'font-size:18px;color:#333;'
      btn.appendChild(sp)
      btn.addEventListener('mouseenter', () => { btn.style.background = '#e0e0e0' })
      btn.addEventListener('mouseleave', () => { btn.style.background = 'transparent' })
      btn.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation() })
      btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); onClick() })
      return btn
    }
    const mkSep = (): HTMLDivElement => {
      const sep = document.createElement('div')
      sep.style.cssText = 'width:1px;height:20px;background:#ccc;margin:0 3px;'
      return sep
    }

    bar.appendChild(mkBtn('edit', '编辑图表', () => this.editChart()))
    bar.appendChild(mkSep())
    const delBtn = mkBtn('delete', '删除图表', () => this.deleteChart())
    const delIcon = delBtn.querySelector('.material-symbols-outlined') as HTMLElement
    delBtn.addEventListener('mouseenter', () => { delIcon.style.color = '#e53935' })
    delBtn.addEventListener('mouseleave', () => { delIcon.style.color = '#333' })
    bar.appendChild(delBtn)

    return bar
  }

  /**
   * 编辑当前选中的图表：emit chartClick 事件
   */
  private editChart(): void {
    if (!this.selection) return
    const el = this.selection.block.block as unknown as {
      id?: string
      block?: { chartBlock?: Record<string, unknown> }
    }
    const chartBlock = el.block?.chartBlock
    this.deps.getEventBus()?.emit('chartClick', {
      chartId: el.id ?? '',
      chartType: String(chartBlock?.chartType ?? ''),
      dataSource: chartBlock?.dataSource,
      config: chartBlock?.config,
      subtype: String(chartBlock?.subtype ?? '')
    })
  }

  /**
   * 删除当前选中的图表
   */
  private deleteChart(): void {
    if (!this.selection) return
    this.deps.onCommand('executeDeleteBlock', this.selection.path)
    this.clearSelection()
  }

  /**
   * 处理 mousedown，返回 true 表示点击了图表（已拦截）
   */
  handleMouseDown(e: MouseEvent): boolean {
    this.clearSelection()
    const hit = this.findChartAt(e.clientX, e.clientY)
    if (!hit) return false

    e.preventDefault()
    e.stopPropagation()
    this.selectChart(hit)
    return true
  }

  /**
   * 根据屏幕坐标查找命中的图表
   */
  private findChartAt(clientX: number, clientY: number): ChartSelection | null {
    const layout = this.deps.getLayout()
    if (!layout) return null
    const rect = this.deps.getContainerRect()
    const scrollY = this.deps.getScrollY()
    const pageOffsetX = this.deps.getPageOffsetX()

    for (const page of layout.pages) {
      const pageOriginX = rect.left + pageOffsetX + page.contentRect.x
      const pageOriginY = rect.top - scrollY + page.contentRect.y
      for (const b of page.blocks) {
        if (b.kind === 'chart') {
          const bx = pageOriginX + b.rect.x
          const by = pageOriginY + b.rect.y
          if (clientX >= bx && clientX <= bx + b.rect.width && clientY >= by && clientY <= by + b.rect.height) {
            const path = [...b.parentPath, b.indexInParent] as Path
            return { path, block: b, pageOriginX, pageOriginY }
          }
        }
      }
    }
    return null
  }

  /**
   * 选中指定图表并刷新选中 UI
   */
  private selectChart(sel: ChartSelection): void {
    this.selection = sel
    this.updateSelectionUI()
  }

  /**
   * 清除当前选中状态
   */
  private clearSelection(): void {
    this.selection = null
    if (this.selectionLayer) this.selectionLayer.style.display = 'none'
  }

  /**
   * 刷新选中状态：按当前 path 重新查找图表块
   */
  update(): void {
    if (!this.selection) return
    const hit = this.findChartByPath(this.selection.path)
    if (!hit) { this.clearSelection(); return }
    this.selection = hit
    this.updateSelectionUI()
  }

  /**
   * 根据路径查找图表块
   */
  private findChartByPath(path: Path): ChartSelection | null {
    const layout = this.deps.getLayout()
    if (!layout) return null
    const rect = this.deps.getContainerRect()
    const scrollY = this.deps.getScrollY()
    const pageOffsetX = this.deps.getPageOffsetX()

    for (const page of layout.pages) {
      const pageOriginX = rect.left + pageOffsetX + page.contentRect.x
      const pageOriginY = rect.top - scrollY + page.contentRect.y
      for (const b of page.blocks) {
        if (b.kind === 'chart') {
          const bp = [...b.parentPath, b.indexInParent] as Path
          if (bp.length === path.length && bp.every((seg, i) => seg === path[i])) {
            return { path, block: b, pageOriginX, pageOriginY }
          }
        }
      }
    }
    return null
  }

  /**
   * 更新选中框、手柄和工具栏的位置
   */
  private updateSelectionUI(): void {
    if (!this.selection || !this.selectionBox || !this.selectionLayer) return
    const { block, pageOriginX, pageOriginY } = this.selection
    const viewport = this.deps.getContainerRect()
    const x = pageOriginX + block.rect.x - viewport.left
    const y = pageOriginY + block.rect.y - viewport.top
    const w = block.rect.width
    const h = block.rect.height
    const bounds = { x, y, width: w, height: h }
    if (!updateSelectionLayer(this.selectionLayer, bounds, viewport)) return
    this.selectionBox.style.left = `${Math.round(x)}px`
    this.selectionBox.style.top = `${Math.round(y)}px`
    this.selectionBox.style.width = `${Math.round(w)}px`
    this.selectionBox.style.height = `${Math.round(h)}px`

    for (let i = 0; i < this.handleEls.length; i++) {
      const el = this.handleEls[i]
      const hd = HANDLES[i]
      el.style.left = `${Math.round(x + w * hd.x - HANDLE_OFFSET)}px`
      el.style.top = `${Math.round(y + h * hd.y - HANDLE_OFFSET)}px`
    }

    if (this.toolbar) {
      positionSelectionToolbar(this.toolbar, bounds, this.selectionLayer)
    }
  }

  /**
   * 处理缩放手柄的 mousedown 事件
   */
  private onHandleMouseDown(e: MouseEvent, dir: string): void {
    if (!this.selection) return
    e.preventDefault()
    e.stopPropagation()
    const { block } = this.selection
    this.dragging = { dir, startX: e.clientX, startY: e.clientY, origW: block.rect.width, origH: block.rect.height, lastW: block.rect.width, lastH: block.rect.height }
    window.addEventListener('mousemove', this.onDragMove)
    window.addEventListener('mouseup', this.onDragEnd)
  }

  /**
   * 拖拽缩放过程中的 mousemove 处理
   */
  private onDragMove = (e: MouseEvent): void => {
    if (!this.dragging || !this.selection) return
    const dx = e.clientX - this.dragging.startX
    const dy = e.clientY - this.dragging.startY
    const { dir, origW, origH } = this.dragging
    let w = origW
    let h = origH
    const ratio = origW / origH
    if (dir.includes('e')) w = Math.max(20, origW + dx)
    if (dir.includes('w')) w = Math.max(20, origW - dx)
    if (dir.includes('s')) h = Math.max(20, origH + dy)
    if (dir.includes('n')) h = Math.max(20, origH - dy)
    if (dir === 'n' || dir === 's') w = h * ratio
    if (dir === 'e' || dir === 'w') h = w / ratio
    this.dragging.lastW = w
    this.dragging.lastH = h
    this.deps.onUpdateChartSizeLive(this.selection.path, w, h)
  }

  /**
   * 拖拽缩放结束的 mouseup 处理
   */
  private onDragEnd = (): void => {
    if (this.dragging && this.selection) {
      this.deps.onCommand('executeUpdateChartSize', this.selection.path, this.dragging.lastW, this.dragging.lastH)
    }
    this.dragging = null
    window.removeEventListener('mousemove', this.onDragMove)
    window.removeEventListener('mouseup', this.onDragEnd)
  }

  /**
   * 销毁 widget，清除选中、移除事件监听并清理所有 DOM
   */
  destroy(): void {
    this.clearSelection()
    window.removeEventListener('mousemove', this.onDragMove)
    window.removeEventListener('mouseup', this.onDragEnd)
    if (this.selectionLayer) { this.selectionLayer.remove(); this.selectionLayer = null }
    this.selectionBox = null
    this.handleEls = []
    this.toolbar = null
    this.dragging = null
  }
}
