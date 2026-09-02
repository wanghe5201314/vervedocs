/**
 * ImageWidget —— 图片交互 widget
 *
 * 从 Draw 分离的图片 UI 交互逻辑：
 *  - 点击图片选中（高亮边框 + 八方向缩放手柄）
 *  - 拖拽手柄缩放图片
 *  - 右键菜单（删除、重置大小、对齐方式、替换图片）
 *
 * 生命周期：create() → handleMouseDown() / showContextMenu() → destroy()
 */

import type { DocumentLayout, ImageBlock } from '../layout-types'
import type { RangeManager } from '@vervedoc/docx-editor-state'
import type { IPosition, Path } from '@vervedoc/docx-editor-schema'
import { ContextMenu, type MenuItem } from '../context-menu'

export interface ImageWidgetDeps {
  getLayout: () => DocumentLayout | null
  getRange: () => RangeManager | null
  getContainerRect: () => DOMRect
  getScrollY: () => number
  getPageOffsetX: () => number
  onCommand: (cmd: string, ...args: any[]) => void
  hit: (clientX: number, clientY: number) => IPosition | null
  focusInput: () => void
}

interface ImageSelection {
  path: Path
  block: ImageBlock
  pageOriginX: number
  pageOriginY: number
}

const HANDLE_SIZE = 8
const HANDLE_OFFSET = HANDLE_SIZE / 2
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

export class ImageWidget {
  private selectionBox: HTMLDivElement | null = null
  private handleEls: HTMLDivElement[] = []
  private selection: ImageSelection | null = null
  private contextMenu = new ContextMenu()
  private dragging: { dir: string; startX: number; startY: number; origW: number; origH: number } | null = null

  constructor(private deps: ImageWidgetDeps) {}

  create(): void {
    this.selectionBox = document.createElement('div')
    this.selectionBox.style.cssText = 'position:fixed;border:1.5px solid #409eff;pointer-events:none;display:none;z-index:100;box-sizing:border-box;'
    document.body.appendChild(this.selectionBox)

    for (const h of HANDLES) {
      const el = document.createElement('div')
      el.dataset.dir = h.dir
      el.style.cssText = `position:fixed;width:${HANDLE_SIZE}px;height:${HANDLE_SIZE}px;background:#fff;border:1.5px solid #409eff;border-radius:50%;display:none;z-index:101;cursor:${this.cursorFor(h.dir)};box-sizing:border-box;`
      el.addEventListener('mousedown', (e) => this.onHandleMouseDown(e, h.dir))
      document.body.appendChild(el)
      this.handleEls.push(el)
    }
  }

  private cursorFor(dir: string): string {
    const map: Record<string, string> = {
      nw: 'nwse-resize', n: 'ns-resize', ne: 'nesw-resize', e: 'ew-resize',
      se: 'nwse-resize', s: 'ns-resize', sw: 'nesw-resize', w: 'ew-resize',
    }
    return map[dir] || 'default'
  }

  /** 处理 mousedown，返回 true 表示点击了图片（已拦截），false 表示未处理 */
  handleMouseDown(e: MouseEvent): boolean {
    this.clearSelection()
    const layout = this.deps.getLayout()
    if (!layout) return false

    const hit = this.findImageAt(e.clientX, e.clientY)
    if (!hit) return false

    e.preventDefault()
    e.stopPropagation()
    this.selectImage(hit)
    return true
  }

  private findImageAt(clientX: number, clientY: number): ImageSelection | null {
    const layout = this.deps.getLayout()
    if (!layout) return null
    const rect = this.deps.getContainerRect()
    const scrollY = this.deps.getScrollY()
    const pageOffsetX = this.deps.getPageOffsetX()

    for (const page of layout.pages) {
      const pageOriginX = rect.left + pageOffsetX + page.contentRect.x
      const pageOriginY = rect.top - scrollY + page.contentRect.y
      for (const b of page.blocks) {
        if (b.kind !== 'image') continue
        const bx = pageOriginX + b.rect.x
        const by = pageOriginY + b.rect.y
        if (clientX >= bx && clientX <= bx + b.rect.width && clientY >= by && clientY <= by + b.rect.height) {
          const path = [...b.parentPath, b.indexInParent] as Path
          return { path, block: b, pageOriginX, pageOriginY }
        }
      }
    }
    return null
  }

  private selectImage(sel: ImageSelection): void {
    this.selection = sel
    this.updateSelectionUI()
  }

  private clearSelection(): void {
    this.selection = null
    if (this.selectionBox) this.selectionBox.style.display = 'none'
    for (const el of this.handleEls) el.style.display = 'none'
  }

  update(): void {
    if (!this.selection) return
    const layout = this.deps.getLayout()
    if (!layout) { this.clearSelection(); return }
    const hit = this.findImageByPath(this.selection.path)
    if (!hit) { this.clearSelection(); return }
    this.selection = hit
    this.updateSelectionUI()
  }

  private findImageByPath(path: Path): ImageSelection | null {
    const layout = this.deps.getLayout()
    if (!layout) return null
    const rect = this.deps.getContainerRect()
    const scrollY = this.deps.getScrollY()
    const pageOffsetX = this.deps.getPageOffsetX()

    for (const page of layout.pages) {
      const pageOriginX = rect.left + pageOffsetX + page.contentRect.x
      const pageOriginY = rect.top - scrollY + page.contentRect.y
      for (const b of page.blocks) {
        if (b.kind !== 'image') continue
        const bp = [...b.parentPath, b.indexInParent] as Path
        if (bp.length === path.length && bp.every((seg, i) => seg === path[i])) {
          return { path, block: b, pageOriginX, pageOriginY }
        }
      }
    }
    return null
  }

  private updateSelectionUI(): void {
    if (!this.selection || !this.selectionBox) return
    const { block, pageOriginX, pageOriginY } = this.selection
    const x = pageOriginX + block.rect.x
    const y = pageOriginY + block.rect.y
    const w = block.rect.width
    const h = block.rect.height
    this.selectionBox.style.display = 'block'
    this.selectionBox.style.left = `${Math.round(x)}px`
    this.selectionBox.style.top = `${Math.round(y)}px`
    this.selectionBox.style.width = `${Math.round(w)}px`
    this.selectionBox.style.height = `${Math.round(h)}px`

    for (let i = 0; i < this.handleEls.length; i++) {
      const el = this.handleEls[i]
      const hd = HANDLES[i]
      el.style.display = 'block'
      el.style.left = `${Math.round(x + w * hd.x - HANDLE_OFFSET)}px`
      el.style.top = `${Math.round(y + h * hd.y - HANDLE_OFFSET)}px`
    }
  }

  private onHandleMouseDown(e: MouseEvent, dir: string): void {
    if (!this.selection) return
    e.preventDefault()
    e.stopPropagation()
    const { block } = this.selection
    this.dragging = { dir, startX: e.clientX, startY: e.clientY, origW: block.rect.width, origH: block.rect.height }
    window.addEventListener('mousemove', this.onDragMove)
    window.addEventListener('mouseup', this.onDragEnd)
  }

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
    this.deps.onCommand('executeUpdateImageSize', this.selection.path, w, h)
  }

  private onDragEnd = (): void => {
    this.dragging = null
    window.removeEventListener('mousemove', this.onDragMove)
    window.removeEventListener('mouseup', this.onDragEnd)
  }

  showContextMenu(clientX: number, clientY: number): boolean {
    const hit = this.findImageAt(clientX, clientY)
    if (!hit) return false
    this.selectImage(hit)

    const icons = ContextMenu.getIcons()
    const fire = (cmd: string, ...args: any[]) => { this.deps.onCommand(cmd, ...args) }
    const path = hit.path

    const items: MenuItem[] = [
      { label: '重置大小', icon: icons.selectAll, onClick: () => fire('executeResetImageSize', path) },
      {
        label: '对齐方式',
        icon: icons.alignLeft,
        submenu: [
          { label: '左对齐', icon: icons.alignLeft, onClick: () => fire('executeImageAlign', path, 'left') },
          { label: '居中对齐', icon: icons.alignCenter, onClick: () => fire('executeImageAlign', path, 'center') },
          { label: '右对齐', icon: icons.alignRight, onClick: () => fire('executeImageAlign', path, 'right') },
        ]
      },
      { label: '---' },
      { label: '替换图片', icon: icons.link, onClick: () => fire('executeReplaceImage', path) },
      { label: '删除图片', icon: icons.deleteRow, danger: true, onClick: () => fire('executeDeleteImage', path) },
    ]

    this.contextMenu.show(clientX, clientY, items)
    return true
  }

  hideContextMenu(): void {
    this.contextMenu.hide()
  }

  destroy(): void {
    this.clearSelection()
    this.hideContextMenu()
    window.removeEventListener('mousemove', this.onDragMove)
    window.removeEventListener('mouseup', this.onDragEnd)
    if (this.selectionBox) { this.selectionBox.remove(); this.selectionBox = null }
    for (const el of this.handleEls) el.remove()
    this.handleEls = []
  }
}