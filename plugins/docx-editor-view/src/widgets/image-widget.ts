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
import { ContextMenu } from '../context-menu'

export interface ImageWidgetDeps {
  getLayout: () => DocumentLayout | null
  getRange: () => RangeManager | null
  getContainerRect: () => DOMRect
  getScrollY: () => number
  getPageOffsetX: () => number
  onCommand: (cmd: string, ...args: any[]) => void
  onUpdateImageSizeLive: (path: Path, width: number, height: number) => void
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
  private toolbar: HTMLDivElement | null = null
  private selection: ImageSelection | null = null
  private contextMenu = new ContextMenu()
  private dragging: { dir: string; startX: number; startY: number; origW: number; origH: number; lastW: number; lastH: number } | null = null

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

    this.toolbar = this.createToolbar()
    document.body.appendChild(this.toolbar)
  }

  private cursorFor(dir: string): string {
    const map: Record<string, string> = {
      nw: 'nwse-resize', n: 'ns-resize', ne: 'nesw-resize', e: 'ew-resize',
      se: 'nwse-resize', s: 'ns-resize', sw: 'nesw-resize', w: 'ew-resize',
    }
    return map[dir] || 'default'
  }

  private createToolbar(): HTMLDivElement {
    const bar = document.createElement('div')
    bar.style.cssText = 'position:fixed;display:none;z-index:102;background:#f5f5f5;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.15);padding:4px 6px;display:none;align-items:center;gap:2px;font-family:sans-serif;'

    const mkBtn = (icon: string, title: string, onClick: () => void): HTMLButtonElement => {
      const btn = document.createElement('button')
      btn.title = title
      btn.style.cssText = 'border:none;background:transparent;cursor:pointer;padding:5px;border-radius:4px;display:flex;align-items:center;justify-content:center;transition:background .15s;'
      const sp = document.createElement('span')
      sp.className = 'material-icons'
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

    bar.appendChild(mkBtn('restore', '重置大小', () => this.fire('executeResetImageSize')))
    bar.appendChild(mkBtn('rotate_right', '旋转 90°', () => this.fire('executeRotateImage')))
    bar.appendChild(mkBtn('zoom_in', '预览', () => this.showPreview()))
    bar.appendChild(mkSep())
    bar.appendChild(mkBtn('format_align_left', '左对齐', () => this.fire('executeImageAlign', 'left')))
    bar.appendChild(mkBtn('format_align_center', '居中对齐', () => this.fire('executeImageAlign', 'center')))
    bar.appendChild(mkBtn('format_align_right', '右对齐', () => this.fire('executeImageAlign', 'right')))
    bar.appendChild(mkSep())
    bar.appendChild(mkBtn('wrap_text', '文字环绕', () => this.fire('executeImageWrap', 'surround')))
    bar.appendChild(mkBtn('flip_to_front', '浮于文字上方', () => this.fire('executeImageWrap', 'floatTop')))
    bar.appendChild(mkBtn('flip_to_back', '浮于文字下方', () => this.fire('executeImageWrap', 'floatBottom')))
    bar.appendChild(mkSep())
    bar.appendChild(mkBtn('image', '替换图片', () => this.fire('executeReplaceImage')))
    bar.appendChild(mkBtn('download', '保存图片', () => this.fire('executeSaveImage')))
    const delBtn = mkBtn('delete', '删除图片', () => this.fire('executeDeleteImage'))
    const delIcon = delBtn.querySelector('.material-icons') as HTMLElement
    delBtn.addEventListener('mouseenter', () => { delIcon.style.color = '#e53935' })
    delBtn.addEventListener('mouseleave', () => { delIcon.style.color = '#333' })
    bar.appendChild(delBtn)

    return bar
  }

  private fire(cmd: string, ...args: any[]): void {
    if (!this.selection) return
    this.deps.onCommand(cmd, this.selection.path, ...args)
  }

  private showPreview(): void {
    if (!this.selection) return
    const src = String((this.selection.block.block as unknown as { value?: string }).value ?? '')
    if (!src) return
    const rotate = Number((this.selection.block.block as unknown as { rotate?: number }).rotate ?? 0) % 360

    const overlay = document.createElement('div')
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', zIndex: '10000',
      background: 'rgba(0,0,0,.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'zoom-out'
    } as CSSStyleDeclaration)

    const img = document.createElement('img')
    img.src = src
    Object.assign(img.style, {
      maxWidth: '90vw', maxHeight: '90vh',
      objectFit: 'contain',
      boxShadow: '0 8px 32px rgba(0,0,0,.5)',
      borderRadius: '4px',
      transform: `rotate(${rotate}deg)`
    } as CSSStyleDeclaration)
    overlay.appendChild(img)

    const close = () => overlay.remove()
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close() })
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey) } }
    document.addEventListener('keydown', onKey)
    document.body.appendChild(overlay)
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
        if (b.kind === 'image') {
          const bx = pageOriginX + b.rect.x
          const by = pageOriginY + b.rect.y
          if (clientX >= bx && clientX <= bx + b.rect.width && clientY >= by && clientY <= by + b.rect.height) {
            const path = [...b.parentPath, b.indexInParent] as Path
            return { path, block: b, pageOriginX, pageOriginY }
          }
        } else if (b.kind === 'paragraph' && b.surroundImage) {
          const si = b.surroundImage
          const bx = pageOriginX + b.rect.x + si.rect.x
          const by = pageOriginY + b.rect.y
          if (clientX >= bx && clientX <= bx + si.rect.width && clientY >= by && clientY <= by + si.rect.height) {
            const path = [...si.parentPath, si.indexInParent] as Path
            return { path, block: si, pageOriginX: pageOriginX + b.rect.x, pageOriginY: pageOriginY + b.rect.y }
          }
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
    if (this.toolbar) this.toolbar.style.display = 'none'
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
        if (b.kind === 'image') {
          const bp = [...b.parentPath, b.indexInParent] as Path
          if (bp.length === path.length && bp.every((seg, i) => seg === path[i])) {
            return { path, block: b, pageOriginX, pageOriginY }
          }
        } else if (b.kind === 'paragraph' && b.surroundImage) {
          const si = b.surroundImage
          const bp = [...si.parentPath, si.indexInParent] as Path
          if (bp.length === path.length && bp.every((seg, i) => seg === path[i])) {
            return { path, block: si, pageOriginX: pageOriginX + b.rect.x, pageOriginY: pageOriginY + b.rect.y }
          }
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

    // 悬浮工具栏：定位在图片上方居中，空间不足时放下方
    if (this.toolbar) {
      const barW = this.toolbar.offsetWidth || 280
      const barH = 36
      let barX = x + w / 2 - barW / 2
      barX = Math.max(4, Math.min(barX, window.innerWidth - barW - 4))
      let barY = y - barH - 6
      if (barY < 4) barY = y + h + 6
      this.toolbar.style.display = 'flex'
      this.toolbar.style.left = `${Math.round(barX)}px`
      this.toolbar.style.top = `${Math.round(barY)}px`
    }
  }

  private onHandleMouseDown(e: MouseEvent, dir: string): void {
    if (!this.selection) return
    e.preventDefault()
    e.stopPropagation()
    const { block } = this.selection
    this.dragging = { dir, startX: e.clientX, startY: e.clientY, origW: block.rect.width, origH: block.rect.height, lastW: block.rect.width, lastH: block.rect.height }
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
    this.dragging.lastW = w
    this.dragging.lastH = h
    this.deps.onUpdateImageSizeLive(this.selection.path, w, h)
  }

  private onDragEnd = (): void => {
    if (this.dragging && this.selection) {
      this.deps.onCommand('executeUpdateImageSize', this.selection.path, this.dragging.lastW, this.dragging.lastH)
    }
    this.dragging = null
    window.removeEventListener('mousemove', this.onDragMove)
    window.removeEventListener('mouseup', this.onDragEnd)
  }

  showContextMenu(_clientX: number, _clientY: number): boolean {
    // 图片不再使用右键菜单，改为点击时显示悬浮工具栏
    return false
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
    if (this.toolbar) { this.toolbar.remove(); this.toolbar = null }
  }
}