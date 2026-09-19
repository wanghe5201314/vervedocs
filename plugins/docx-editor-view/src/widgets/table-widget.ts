/**
 * TableWidget —— 表格交互 widget
 *
 * 从 Draw 分离的表格 UI 交互逻辑：
 *  - 表格选择手柄（左上角全选按钮）
 *  - 表格添加列按钮（右侧中间 + 号）
 *  - 表格右键上下文菜单
 *
 * 生命周期：create() → update() / showContextMenu() → destroy()
 */

import type { BlockNode, DocumentLayout, TableBlock } from '../layout-types'
import type { RangeManager } from '@vervedoc/docx-editor-state'
import type { IPosition } from '@vervedoc/docx-editor-schema'
import { ContextMenu, type MenuItem } from '../context-menu'
import { positionHandle } from './handle-position'

/** 边框热区半宽（像素），鼠标距离边框小于该值时视为命中边框可拖拽 */
const BORDER_HOT = 4

/**
 * 表格边框拖拽状态
 *
 * 记录当前正在拖拽的列/行信息，用于拖拽过程中计算新尺寸。
 */
interface DragState {
  /** 拖拽类型：列或行 */
  type: 'col' | 'row'
  /** 表格在父节点中的索引 */
  tableIndex: number
  /** 被拖拽边框对应的列/行索引 */
  index: number
  /** 拖拽起始时的客户端坐标（clientX 或 clientY） */
  startClient: number
  /** 拖拽起始时该列/行的原始尺寸（像素） */
  origSize: number
}

/**
 * TableWidget 的依赖注入接口
 *
 * 由外部宿主提供，用于获取编辑器布局、选区、容器信息以及触发命令等。
 */
export interface TableWidgetDeps {
  /** 获取当前文档布局，可能为 null */
  getLayout: () => DocumentLayout | null
  /** 获取当前选区管理器，可能为 null */
  getRange: () => RangeManager | null
  /** 获取编辑器容器在视口中的矩形位置 */
  getContainerRect: () => DOMRect
  /** 获取当前垂直滚动偏移量（像素） */
  getScrollY: () => number
  /** 获取页面水平偏移量（像素） */
  getPageOffsetX: () => number
  /** 触发编辑器命令的回调 */
  onCommand: (cmd: string, ...args: any[]) => void
  /** 根据客户端坐标命中测试，返回位置信息或 null */
  hit: (clientX: number, clientY: number) => IPosition | null
  /** 让编辑器输入区获取焦点 */
  focusInput: () => void
  /** 设置鼠标光标样式 */
  setCursor: (cursor: string) => void
}

/**
 * 表格交互 widget
 *
 * 提供表格选择手柄、添加列/行按钮、右键上下文菜单以及边框拖拽调整列宽行高功能。
 */
export class TableWidget {
  /** 表格左上角的全选手柄 DOM 元素 */
  private handle: HTMLDivElement | null = null
  /** 表格右侧中间的添加列手柄 DOM 元素 */
  private addColHandle: HTMLDivElement | null = null
  /** 表格底部中间的添加行手柄 DOM 元素 */
  private addRowHandle: HTMLDivElement | null = null
  /** 右键上下文菜单实例 */
  private contextMenu = new ContextMenu()
  /** 当前边框拖拽状态，未拖拽时为 null */
  private dragState: DragState | null = null
  /** 标记光标样式是否已被修改，用于在离开边框时恢复 */
  private cursorChanged = false

  /**
   * 构造 TableWidget 实例
   *
   * @param deps 依赖注入对象
   */
  constructor(private deps: TableWidgetDeps) {}

  /* -------------------- 创建 -------------------- */

  /**
   * 创建表格交互所需的全部手柄 DOM 并挂载到 document.body
   */
  create(): void {
    this.handle = this.createHandle()
    this.addColHandle = this.createAddColHandle()
    this.addRowHandle = this.createAddRowHandle()
  }

  /**
   * 创建表格左上角全选手柄
   *
   * @returns 创建并挂载好的手柄 DOM 元素
   */
  private createHandle(): HTMLDivElement {
    const el = document.createElement('div')
    el.className = 'vervedocs-table-handle'
    const icon = document.createElement('span')
    icon.className = 'material-symbols-outlined'
    icon.textContent = 'drag_indicator'
    icon.style.cssText = 'font-size:16px;color:#606266;'
    el.appendChild(icon)
    Object.assign(el.style, {
      position: 'fixed',
      width: '24px',
      height: '24px',
      background: '#fff',
      border: '1px solid #dcdfe6',
      borderRadius: '3px',
      display: 'none',
      zIndex: '100',
      cursor: 'pointer',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#606266',
      boxShadow: '0 1px 4px rgba(0,0,0,.15)'
    } as CSSStyleDeclaration)
    el.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      this.deps.onCommand('executeSelectTable')
    })
    document.body.appendChild(el)
    return el
  }

  /**
   * 创建表格右侧中间的添加列手柄
   *
   * @returns 创建并挂载好的手柄 DOM 元素
   */
  private createAddColHandle(): HTMLDivElement {
    const el = document.createElement('div')
    el.className = 'vervedocs-table-add-col'
    const icon = document.createElement('span')
    icon.className = 'material-symbols-outlined'
    icon.textContent = 'add'
    icon.style.cssText = 'font-size:16px;color:#606266;'
    el.appendChild(icon)
    Object.assign(el.style, {
      position: 'fixed',
      width: '24px',
      height: '24px',
      background: '#fff',
      border: '1px solid #dcdfe6',
      borderRadius: '3px',
      display: 'none',
      zIndex: '100',
      cursor: 'pointer',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#606266',
      boxShadow: '0 1px 4px rgba(0,0,0,.15)'
    } as CSSStyleDeclaration)
    el.addEventListener('mouseenter', () => {
      el.style.background = '#409eff'
      el.style.color = '#fff'
      el.style.borderColor = '#409eff'
    })
    el.addEventListener('mouseleave', () => {
      el.style.background = '#fff'
      el.style.color = '#606266'
      el.style.borderColor = '#dcdfe6'
    })
    el.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      this.deps.onCommand('executeInsertTableCol', 'right')
    })
    document.body.appendChild(el)
    return el
  }

  /**
   * 创建表格底部中间的添加行手柄
   *
   * @returns 创建并挂载好的手柄 DOM 元素
   */
  private createAddRowHandle(): HTMLDivElement {
    const el = document.createElement('div')
    el.className = 'vervedocs-table-add-row'
    const icon = document.createElement('span')
    icon.className = 'material-symbols-outlined'
    icon.textContent = 'add'
    icon.style.cssText = 'font-size:16px;color:#606266;'
    el.appendChild(icon)
    Object.assign(el.style, {
      position: 'fixed',
      width: '24px',
      height: '24px',
      background: '#fff',
      border: '1px solid #dcdfe6',
      borderRadius: '3px',
      display: 'none',
      zIndex: '100',
      cursor: 'pointer',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#606266',
      boxShadow: '0 1px 4px rgba(0,0,0,.15)'
    } as CSSStyleDeclaration)
    el.addEventListener('mouseenter', () => {
      el.style.background = '#409eff'
      el.style.color = '#fff'
      el.style.borderColor = '#409eff'
    })
    el.addEventListener('mouseleave', () => {
      el.style.background = '#fff'
      el.style.color = '#606266'
      el.style.borderColor = '#dcdfe6'
    })
    el.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      this.deps.onCommand('executeInsertTableRow', 'below')
    })
    document.body.appendChild(el)
    return el
  }

  /* -------------------- 更新手柄位置 -------------------- */

  /**
   * 根据当前选区更新手柄位置
   *
   * 当光标位于表格内时，显示全选、添加列、添加行手柄；否则隐藏全部手柄。
   */
  update(): void {
    if (!this.handle) return
    const layout = this.deps.getLayout()
    const range = this.deps.getRange()
    if (!layout || !range) { this.hideHandles(); return }

    const pos = range.getFocus()
    const isTable = pos && pos.path.length >= 5 && pos.path[1] === 'trList'
    if (!isTable) {
      this.hideHandles()
      return
    }

    const tableIndex = pos!.path[0] as number
    // Match the focused cell so a paginated table uses the correct fragment.
    const matchesTable = (b: BlockNode) =>
      b.kind === 'table' && b.indexInParent === tableIndex &&
      b.rows.some(row => row.cells.some(cell =>
        cell.cellPath.every((part, index) => part === pos!.path[index])))
    const page = layout.pages.find(p =>
      p.blocks.some(matchesTable)
    )
    if (!page) { this.hideHandles(); return }

    const block = page.blocks.find(matchesTable)
    if (!block || block.kind !== 'table') { this.hideHandles(); return }

    const rect = this.deps.getContainerRect()
    const pageOffsetX = this.deps.getPageOffsetX()
    const scrollY = this.deps.getScrollY()
    const tableX = rect.left + pageOffsetX + page.contentRect.x + block.rect.x
    const tableY = rect.top - scrollY + page.contentRect.y + block.rect.y
    if (tableX + block.rect.width <= rect.left || tableX >= rect.right ||
        tableY + block.rect.height <= rect.top || tableY >= rect.bottom) {
      this.hideHandles()
      return
    }
    positionHandle(this.handle, tableX - 31, tableY - 25, 24, rect)

    if (this.addColHandle) {
      const colX = tableX + block.rect.width + 4
      const colY = tableY + block.rect.height / 2 - 12
      positionHandle(this.addColHandle, colX, colY, 24, rect)
    }

    if (this.addRowHandle) {
      const rowX = tableX + block.rect.width / 2 - 12
      const rowY = tableY + block.rect.height + 4
      positionHandle(this.addRowHandle, rowX, rowY, 24, rect)
    }
  }

  /**
   * 隐藏全部手柄
   */
  private hideHandles(): void {
    if (this.handle) this.handle.style.display = 'none'
    if (this.addColHandle) this.addColHandle.style.display = 'none'
    if (this.addRowHandle) this.addRowHandle.style.display = 'none'
  }

  /* -------------------- 右键菜单 -------------------- */

  /**
   * 在指定客户端坐标处显示表格右键上下文菜单
   *
   * 菜单包含插入、拆分/合并单元格、删除、对齐方式、底纹颜色、表格属性等操作。
   *
   * @param clientX 客户端横坐标
   * @param clientY 客户端纵坐标
   * @returns 命中表格并显示菜单返回 true，否则返回 false
   */
  showContextMenu(clientX: number, clientY: number): boolean {
    const layout = this.deps.getLayout()
    const range = this.deps.getRange()
    if (!layout || !range) return false

    const pos = this.deps.hit(clientX, clientY)
    if (!pos) return false

    const isTable = pos.path.length >= 5 && pos.path[1] === 'trList'
    if (!isTable) return false

    range.setCaret(pos)
    this.deps.focusInput()

    const icons = ContextMenu.getIcons()
    const fire = (cmd: string, ...args: any[]) => { this.deps.onCommand(cmd, ...args) }

    const items: MenuItem[] = [
      {
        label: '插入',
        icon: icons.insertRowAbove,
        submenu: [
          { label: '在左侧插入', icon: icons.insertColLeft, input: { defaultValue: 1, unit: '列', min: 1, max: 50 }, onClick: (v) => fire('executeInsertTableCol', 'left', v ?? 1) },
          { label: '在右侧插入', icon: icons.insertColRight, input: { defaultValue: 1, unit: '列', min: 1, max: 50 }, onClick: (v) => fire('executeInsertTableCol', 'right', v ?? 1) },
          { label: '在上方插入', icon: icons.insertRowAbove, input: { defaultValue: 1, unit: '行', min: 1, max: 50 }, onClick: (v) => fire('executeInsertTableRow', 'above', v ?? 1) },
          { label: '在下方插入', icon: icons.insertRowBelow, input: { defaultValue: 1, unit: '行', min: 1, max: 50 }, onClick: (v) => fire('executeInsertTableRow', 'below', v ?? 1) },
          { label: '---' },
          { label: '单元格(E)...', onClick: () => fire('executeInsertTableCell') },
        ]
      },
      { label: '拆分单元格', icon: icons.splitCell, onClick: () => fire('executeSplitTableCell') },
      { label: '合并单元格', icon: icons.mergeCell, onClick: () => fire('executeMergeTableCells') },
      {
        label: '删除',
        icon: icons.deleteRow,
        danger: true,
        submenu: [
          { label: '删除行', icon: icons.deleteRow, danger: true, onClick: () => fire('executeDeleteTableRow') },
          { label: '删除列', icon: icons.deleteCol, danger: true, onClick: () => fire('executeDeleteTableCol') },
          { label: '---' },
          { label: '删除整个表格', icon: icons.deleteTable, danger: true, onClick: () => fire('executeDeleteTable') },
        ]
      },
      { label: '---' },
      { label: '全选表格', icon: icons.selectAll, onClick: () => fire('executeSelectTable') },
      { label: '---' },
      {
        label: '水平对齐方式',
        icon: icons.alignLeft,
        submenu: [
          { label: '左对齐', icon: icons.alignLeft, onClick: () => fire('executeRowFlex', 'left') },
          { label: '居中对齐', icon: icons.alignCenter, onClick: () => fire('executeRowFlex', 'center') },
          { label: '右对齐', icon: icons.alignRight, onClick: () => fire('executeRowFlex', 'right') },
        ]
      },
      {
        label: '垂直对齐方式',
        icon: icons.valignMiddle,
        submenu: [
          { label: '顶端对齐', icon: icons.valignTop, onClick: () => fire('executeSetCellVerticalAlign', 'top') },
          { label: '垂直居中', icon: icons.valignMiddle, onClick: () => fire('executeSetCellVerticalAlign', 'middle') },
          { label: '底端对齐', icon: icons.valignBottom, onClick: () => fire('executeSetCellVerticalAlign', 'bottom') },
        ]
      },
      {
        label: '底纹颜色',
        icon: icons.cellBackground,
        colorPicker: { defaultColor: '#ffffff', allowClear: true },
        onClick: (v) => fire('executeSetCellBackground', String(v ?? ''))
      },
      { label: '重复表头行', icon: icons.repeatHeader, onClick: () => fire('executeToggleRepeatHeader') },
      { label: '---' },
      { label: '超链接', icon: icons.link, shortcut: 'Ctrl+K', onClick: () => fire('executeHyperlink') },
      { label: '表格属性', icon: icons.tableProp, onClick: () => fire('executeTableProperty') },
    ]

    this.contextMenu.show(clientX, clientY, items)
    return true
  }

  /**
   * 隐藏右键上下文菜单
   */
  hideContextMenu(): void {
    this.contextMenu.hide()
  }

  /* -------------------- 边框拖拽 -------------------- */

  /**
   * 根据屏幕坐标查找命中的表格块
   *
   * @param clientX 客户端横坐标
   * @param clientY 客户端纵坐标
   * @returns 命中的表格块及其屏幕起点坐标，未命中返回 null
   */
  private findTableAtScreen(clientX: number, clientY: number): { block: TableBlock; screenX: number; screenY: number } | null {
    const layout = this.deps.getLayout()
    if (!layout) return null
    const rect = this.deps.getContainerRect()
    const scrollY = this.deps.getScrollY()
    const pageOffsetX = this.deps.getPageOffsetX()

    for (const page of layout.pages) {
      for (const b of page.blocks) {
        if (b.kind !== 'table') continue
        const sx = rect.left + pageOffsetX + page.contentRect.x + b.rect.x
        const sy = rect.top - scrollY + page.contentRect.y + b.rect.y
        if (clientX >= sx && clientX <= sx + b.rect.width && clientY >= sy && clientY <= sy + b.rect.height) {
          return { block: b, screenX: sx, screenY: sy }
        }
      }
    }
    return null
  }

  /**
   * 检测指定坐标是否命中表格边框（列边框或行边框）
   *
   * @param clientX 客户端横坐标
   * @param clientY 客户端纵坐标
   * @returns 命中边框时返回类型、索引、原始尺寸和表格索引，否则返回 null
   */
  private detectBorder(clientX: number, clientY: number): { type: 'col' | 'row'; index: number; origSize: number; tableIndex: number } | null {
    const info = this.findTableAtScreen(clientX, clientY)
    if (!info) return null
    const { block, screenX, screenY } = info

    for (let i = 0; i < block.colWidths.length; i++) {
      const borderX = screenX + block.colWidths.slice(0, i + 1).reduce((a, b) => a + b, 0)
      if (Math.abs(clientX - borderX) <= BORDER_HOT) {
        return { type: 'col', index: i, origSize: block.colWidths[i], tableIndex: block.indexInParent }
      }
    }

    for (let i = 0; i < block.rows.length; i++) {
      const row = block.rows[i]
      const borderY = screenY + row.rect.y + row.rect.height
      if (Math.abs(clientY - borderY) <= BORDER_HOT) {
        return { type: 'row', index: i, origSize: row.rect.height, tableIndex: block.indexInParent }
      }
    }

    return null
  }

  /**
   * 处理鼠标按下事件，若命中表格边框则进入拖拽状态
   *
   * @param e 鼠标事件
   * @returns 命中边框并进入拖拽返回 true，否则返回 false
   */
  handleMouseDown(e: MouseEvent): boolean {
    if (this.dragState) return true
    const border = this.detectBorder(e.clientX, e.clientY)
    if (!border) return false
    e.preventDefault()
    e.stopPropagation()
    this.dragState = {
      type: border.type,
      tableIndex: border.tableIndex,
      index: border.index,
      startClient: border.type === 'col' ? e.clientX : e.clientY,
      origSize: border.origSize
    }
    this.deps.setCursor(border.type === 'col' ? 'col-resize' : 'row-resize')
    return true
  }

  /**
   * 处理鼠标移动事件
   *
   * 拖拽中：根据偏移量计算并应用新的列宽/行高；
   * 非拖拽：检测是否悬停在边框上以更新光标样式。
   *
   * @param e 鼠标事件
   */
  handleMouseMove(e: MouseEvent): void {
    if (this.dragState) {
      e.preventDefault()
      const delta = this.dragState.type === 'col' ? e.clientX - this.dragState.startClient : e.clientY - this.dragState.startClient
      const newSize = Math.max(20, this.dragState.origSize + delta)
      if (this.dragState.type === 'col') {
        this.deps.onCommand('executeSetTableColWidth', this.dragState.tableIndex, this.dragState.index, newSize)
      } else {
        this.deps.onCommand('executeSetTableRowHeight', this.dragState.tableIndex, this.dragState.index, newSize)
      }
      return
    }

    const border = this.detectBorder(e.clientX, e.clientY)
    if (border) {
      this.deps.setCursor(border.type === 'col' ? 'col-resize' : 'row-resize')
      this.cursorChanged = true
    } else if (this.cursorChanged) {
      this.deps.setCursor('default')
      this.cursorChanged = false
    }
  }

  /**
   * 处理鼠标释放事件，结束边框拖拽并恢复光标
   *
   * @param _e 鼠标事件（未使用）
   */
  handleMouseUp(_e: MouseEvent): void {
    if (!this.dragState) return
    this.dragState = null
    this.deps.setCursor('default')
    this.cursorChanged = false
  }

  /* -------------------- 销毁 -------------------- */

  /**
   * 销毁 widget，隐藏手柄和菜单并移除所有手柄 DOM
   */
  destroy(): void {
    this.hideHandles()
    this.hideContextMenu()
    if (this.handle) { this.handle.remove(); this.handle = null }
    if (this.addColHandle) { this.addColHandle.remove(); this.addColHandle = null }
    if (this.addRowHandle) { this.addRowHandle.remove(); this.addRowHandle = null }
  }
}
