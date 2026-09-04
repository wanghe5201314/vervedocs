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

import type { DocumentLayout, TableBlock } from '../layout-types'
import type { RangeManager } from '@vervedoc/docx-editor-state'
import type { IPosition } from '@vervedoc/docx-editor-schema'
import { ContextMenu, type MenuItem } from '../context-menu'

const BORDER_HOT = 4

interface DragState {
  type: 'col' | 'row'
  tableIndex: number
  index: number
  startClient: number
  origSize: number
}

export interface TableWidgetDeps {
  getLayout: () => DocumentLayout | null
  getRange: () => RangeManager | null
  getContainerRect: () => DOMRect
  getScrollY: () => number
  getPageOffsetX: () => number
  onCommand: (cmd: string, ...args: any[]) => void
  hit: (clientX: number, clientY: number) => IPosition | null
  focusInput: () => void
  setCursor: (cursor: string) => void
}

export class TableWidget {
  private handle: HTMLDivElement | null = null
  private addColHandle: HTMLDivElement | null = null
  private addRowHandle: HTMLDivElement | null = null
  private contextMenu = new ContextMenu()
  private dragState: DragState | null = null
  private cursorChanged = false

  constructor(private deps: TableWidgetDeps) {}

  /* -------------------- 创建 -------------------- */

  create(): void {
    this.handle = this.createHandle()
    this.addColHandle = this.createAddColHandle()
    this.addRowHandle = this.createAddRowHandle()
  }

  private createHandle(): HTMLDivElement {
    const el = document.createElement('div')
    el.className = 'vervedocs-table-handle'
    const icon = document.createElement('span')
    icon.className = 'material-icons'
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

  private createAddColHandle(): HTMLDivElement {
    const el = document.createElement('div')
    el.className = 'vervedocs-table-add-col'
    const icon = document.createElement('span')
    icon.className = 'material-icons'
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

  private createAddRowHandle(): HTMLDivElement {
    const el = document.createElement('div')
    el.className = 'vervedocs-table-add-row'
    const icon = document.createElement('span')
    icon.className = 'material-icons'
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

  update(): void {
    if (!this.handle) return
    const layout = this.deps.getLayout()
    const range = this.deps.getRange()
    if (!layout || !range) return

    const pos = range.getFocus()
    const isTable = pos && pos.path.length >= 5 && pos.path[1] === 'trList'
    if (!isTable) {
      this.hideHandles()
      return
    }

    const tableIndex = pos!.path[0] as number
    const page = layout.pages.find(p =>
      p.blocks.some(b => b.kind === 'table' && b.indexInParent === tableIndex)
    )
    if (!page) { this.hideHandles(); return }

    const block = page.blocks.find(b => b.kind === 'table' && b.indexInParent === tableIndex)
    if (!block || block.kind !== 'table') { this.hideHandles(); return }

    const rect = this.deps.getContainerRect()
    const pageOffsetX = this.deps.getPageOffsetX()
    const scrollY = this.deps.getScrollY()
    const sx = rect.left + pageOffsetX + page.contentRect.x + block.rect.x - 31
    const sy = rect.top - scrollY + page.contentRect.y + block.rect.y - 25
    this.handle.style.display = 'flex'
    this.handle.style.left = `${Math.round(sx)}px`
    this.handle.style.top = `${Math.round(sy)}px`

    if (this.addColHandle) {
      const colX = rect.left + pageOffsetX + page.contentRect.x + block.rect.x + block.rect.width + 4
      const colY = rect.top - scrollY + page.contentRect.y + block.rect.y + block.rect.height / 2 - 12
      this.addColHandle.style.display = 'flex'
      this.addColHandle.style.left = `${Math.round(colX)}px`
      this.addColHandle.style.top = `${Math.round(colY)}px`
    }

    if (this.addRowHandle) {
      const rowX = rect.left + pageOffsetX + page.contentRect.x + block.rect.x + block.rect.width / 2 - 12
      const rowY = rect.top - scrollY + page.contentRect.y + block.rect.y + block.rect.height + 4
      this.addRowHandle.style.display = 'flex'
      this.addRowHandle.style.left = `${Math.round(rowX)}px`
      this.addRowHandle.style.top = `${Math.round(rowY)}px`
    }
  }

  private hideHandles(): void {
    if (this.handle) this.handle.style.display = 'none'
    if (this.addColHandle) this.addColHandle.style.display = 'none'
    if (this.addRowHandle) this.addRowHandle.style.display = 'none'
  }

  /* -------------------- 右键菜单 -------------------- */

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

  hideContextMenu(): void {
    this.contextMenu.hide()
  }

  /* -------------------- 边框拖拽 -------------------- */

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

  handleMouseUp(_e: MouseEvent): void {
    if (!this.dragState) return
    this.dragState = null
    this.deps.setCursor('default')
    this.cursorChanged = false
  }

  /* -------------------- 销毁 -------------------- */

  destroy(): void {
    this.hideHandles()
    this.hideContextMenu()
    if (this.handle) { this.handle.remove(); this.handle = null }
    if (this.addColHandle) { this.addColHandle.remove(); this.addColHandle = null }
    if (this.addRowHandle) { this.addRowHandle.remove(); this.addRowHandle = null }
  }
}