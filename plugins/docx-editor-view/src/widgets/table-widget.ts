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

import type { DocumentLayout } from '../layout-types'
import type { RangeManager } from '@vervedoc/docx-editor-state'
import type { IPosition } from '@vervedoc/docx-editor-schema'
import { ContextMenu, type MenuItem } from '../context-menu'

export interface TableWidgetDeps {
  getLayout: () => DocumentLayout | null
  getRange: () => RangeManager | null
  getContainerRect: () => DOMRect
  getScrollY: () => number
  getPageOffsetX: () => number
  onCommand: (cmd: string, ...args: any[]) => void
  hit: (clientX: number, clientY: number) => IPosition | null
  focusInput: () => void
}

export class TableWidget {
  private handle: HTMLDivElement | null = null
  private addColHandle: HTMLDivElement | null = null
  private contextMenu = new ContextMenu()

  constructor(private deps: TableWidgetDeps) {}

  /* -------------------- 创建 -------------------- */

  create(): void {
    this.handle = this.createHandle()
    this.addColHandle = this.createAddColHandle()
  }

  private createHandle(): HTMLDivElement {
    const el = document.createElement('div')
    el.className = 'vervedocs-table-handle'
    el.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="1.5" y="1.5" width="13" height="13" rx="1"/><line x1="1.5" y1="5.8" x2="14.5" y2="5.8"/><line x1="1.5" y1="10.2" x2="14.5" y2="10.2"/><line x1="5.8" y1="1.5" x2="5.8" y2="14.5"/><line x1="10.2" y1="1.5" x2="10.2" y2="14.5"/></svg>'
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
    el.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="8" y1="3" x2="8" y2="13" stroke-linecap="round"/><line x1="3" y1="8" x2="13" y2="8" stroke-linecap="round"/></svg>'
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
    const sx = rect.left + pageOffsetX + page.contentRect.x + block.rect.x - 25
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
  }

  private hideHandles(): void {
    if (this.handle) this.handle.style.display = 'none'
    if (this.addColHandle) this.addColHandle.style.display = 'none'
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
          { label: '在上方插入行', icon: icons.insertRowAbove, onClick: () => fire('executeInsertTableRow', 'above') },
          { label: '在下方插入行', icon: icons.insertRowBelow, onClick: () => fire('executeInsertTableRow', 'below') },
          { label: '在左侧插入列', icon: icons.insertColLeft, onClick: () => fire('executeInsertTableCol', 'left') },
          { label: '在右侧插入列', icon: icons.insertColRight, onClick: () => fire('executeInsertTableCol', 'right') },
        ]
      },
      { label: '拆分单元格', icon: icons.splitCell, onClick: () => fire('executeSplitTableCell') },
      {
        label: '删除',
        icon: icons.deleteRow,
        danger: true,
        submenu: [
          { label: '删除行', icon: icons.deleteRow, danger: true, onClick: () => fire('executeDeleteTableRow') },
          { label: '删除列', icon: icons.deleteCol, danger: true, onClick: () => fire('executeDeleteTableCol') },
        ]
      },
      { label: '---' },
      { label: '全选表格', icon: icons.selectAll, onClick: () => fire('executeSelectTable') },
      { label: '---' },
      {
        label: '单元格对齐方式',
        icon: icons.alignLeft,
        submenu: [
          { label: '左对齐', icon: icons.alignLeft, onClick: () => fire('executeRowFlex', 'left') },
          { label: '居中对齐', icon: icons.alignCenter, onClick: () => fire('executeRowFlex', 'center') },
          { label: '右对齐', icon: icons.alignRight, onClick: () => fire('executeRowFlex', 'right') },
        ]
      },
      { label: '超链接', icon: icons.link, shortcut: 'Ctrl+K', onClick: () => fire('executeHyperlink') },
      { label: '表格属性', icon: icons.tableProp, onClick: () => fire('executeTableProperty') },
    ]

    this.contextMenu.show(clientX, clientY, items)
    return true
  }

  hideContextMenu(): void {
    this.contextMenu.hide()
  }

  /* -------------------- 销毁 -------------------- */

  destroy(): void {
    this.hideHandles()
    this.hideContextMenu()
    if (this.handle) { this.handle.remove(); this.handle = null }
    if (this.addColHandle) { this.addColHandle.remove(); this.addColHandle = null }
  }
}