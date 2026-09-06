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

/**
 * ImageWidget 的依赖注入接口
 *
 * 由外部宿主提供，用于获取编辑器布局、选区、容器信息以及触发命令等。
 */
export interface ImageWidgetDeps {
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
  /** 拖拽过程中实时更新图片尺寸的回调（不写入文档，仅刷新显示） */
  onUpdateImageSizeLive: (path: Path, width: number, height: number) => void
  /** 根据客户端坐标命中测试，返回位置信息或 null */
  hit: (clientX: number, clientY: number) => IPosition | null
  /** 让编辑器输入区获取焦点 */
  focusInput: () => void
}

/**
 * 当前选中的图片信息
 *
 * 记录选中图片的路径、块数据以及所在页面的屏幕起点坐标，用于定位选中框和手柄。
 */
interface ImageSelection {
  /** 图片在文档中的路径 */
  path: Path
  /** 图片块数据 */
  block: ImageBlock
  /** 图片所在页面的屏幕起点横坐标（像素） */
  pageOriginX: number
  /** 图片所在页面的屏幕起点纵坐标（像素） */
  pageOriginY: number
}

/** 缩放手柄边长（像素） */
const HANDLE_SIZE = 8
/** 缩放手柄中心偏移量（像素），用于将手柄中心对齐到图片边缘 */
const HANDLE_OFFSET = HANDLE_SIZE / 2
/** 八方向缩放手柄的位置定义，x/y 为 0~1 的比例坐标 */
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
 * 图片交互 widget
 *
 * 提供图片选中高亮、八方向缩放手柄、悬浮工具栏（重置大小、旋转、对齐、
 * 环绕方式、替换、保存、删除等）以及拖拽缩放功能。
 */
export class ImageWidget {
  /** 选中高亮边框 DOM 元素 */
  private selectionBox: HTMLDivElement | null = null
  /** 八方向缩放手柄 DOM 元素数组 */
  private handleEls: HTMLDivElement[] = []
  /** 悬浮工具栏 DOM 元素 */
  private toolbar: HTMLDivElement | null = null
  /** 当前选中的图片信息，未选中时为 null */
  private selection: ImageSelection | null = null
  /** 右键上下文菜单实例（当前未使用，保留以备扩展） */
  private contextMenu = new ContextMenu()
  /** 拖拽缩放状态，未拖拽时为 null */
  private dragging: { dir: string; startX: number; startY: number; origW: number; origH: number; lastW: number; lastH: number } | null = null

  /**
   * 构造 ImageWidget 实例
   *
   * @param deps 依赖注入对象
   */
  constructor(private deps: ImageWidgetDeps) {}

  /**
   * 创建选中框、八方向缩放手柄和悬浮工具栏 DOM 并挂载到 document.body
   */
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

  /**
   * 根据手柄方向返回对应的鼠标光标样式
   *
   * @param dir 手柄方向（nw/n/ne/e/se/s/sw/w）
   * @returns 对应的 CSS 光标样式
   */
  private cursorFor(dir: string): string {
    const map: Record<string, string> = {
      nw: 'nwse-resize', n: 'ns-resize', ne: 'nesw-resize', e: 'ew-resize',
      se: 'nwse-resize', s: 'ns-resize', sw: 'nesw-resize', w: 'ew-resize',
    }
    return map[dir] || 'default'
  }

  /**
   * 创建图片悬浮工具栏
   *
   * 工具栏包含重置大小、旋转、预览、对齐方式、环绕方式、替换、保存、删除等按钮。
   *
   * @returns 创建好的工具栏 DOM 元素
   */
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

  /**
   * 触发针对当前选中图片的编辑器命令
   *
   * @param cmd 命令名称
   * @param args 命令参数
   */
  private fire(cmd: string, ...args: any[]): void {
    if (!this.selection) return
    this.deps.onCommand(cmd, this.selection.path, ...args)
  }

  /**
   * 显示图片预览遮罩层
   *
   * 创建全屏黑色遮罩并居中展示当前选中图片的原始大小，支持点击遮罩或按 Esc 关闭。
   */
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


  /**
   * 处理 mousedown，返回 true 表示点击了图片（已拦截），false 表示未处理
   *
   * @param e 鼠标事件
   * @returns 点击命中图片返回 true，否则返回 false
   */
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

  /**
   * 根据屏幕坐标查找命中的图片
   *
   * 同时支持独立图片块和段落环绕图片。
   *
   * @param clientX 客户端横坐标
   * @param clientY 客户端纵坐标
   * @returns 命中的图片选中信息，未命中返回 null
   */
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

  /**
   * 选中指定图片并刷新选中 UI
   *
   * @param sel 图片选中信息
   */
  private selectImage(sel: ImageSelection): void {
    this.selection = sel
    this.updateSelectionUI()
  }

  /**
   * 清除当前选中状态，隐藏选中框、手柄和工具栏
   */
  private clearSelection(): void {
    this.selection = null
    if (this.selectionBox) this.selectionBox.style.display = 'none'
    for (const el of this.handleEls) el.style.display = 'none'
    if (this.toolbar) this.toolbar.style.display = 'none'
  }

  /**
   * 刷新选中状态
   *
   * 根据当前选中图片路径重新查找布局中的图片块，若已不存在则清除选中。
   */
  update(): void {
    if (!this.selection) return
    const layout = this.deps.getLayout()
    if (!layout) { this.clearSelection(); return }
    const hit = this.findImageByPath(this.selection.path)
    if (!hit) { this.clearSelection(); return }
    this.selection = hit
    this.updateSelectionUI()
  }

  /**
   * 根据路径查找图片块
   *
   * @param path 图片路径
   * @returns 命中的图片选中信息，未找到返回 null
   */
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

  /**
   * 更新选中框、八方向手柄和悬浮工具栏的位置与显示状态
   */
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

  /**
   * 处理缩放手柄的 mousedown 事件，进入拖拽缩放状态
   *
   * @param e 鼠标事件
   * @param dir 手柄方向
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
   * 拖拽缩放过程中的 mousemove 处理（箭头函数绑定）
   *
   * 根据手柄方向和鼠标偏移量按图片原始宽高比计算新的宽高，并实时刷新显示。
   *
   * @param e 鼠标事件
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
    this.deps.onUpdateImageSizeLive(this.selection.path, w, h)
  }

  /**
   * 拖拽缩放结束的 mouseup 处理（箭头函数绑定）
   *
   * 将最终尺寸写入文档并清理拖拽状态和事件监听。
   */
  private onDragEnd = (): void => {
    if (this.dragging && this.selection) {
      this.deps.onCommand('executeUpdateImageSize', this.selection.path, this.dragging.lastW, this.dragging.lastH)
    }
    this.dragging = null
    window.removeEventListener('mousemove', this.onDragMove)
    window.removeEventListener('mouseup', this.onDragEnd)
  }

  /**
   * 显示右键上下文菜单（当前图片改为点击显示悬浮工具栏，此方法保留并返回 false）
   *
   * @param _clientX 客户端横坐标（未使用）
   * @param _clientY 客户端纵坐标（未使用）
   * @returns 始终返回 false，表示未显示菜单
   */
  showContextMenu(_clientX: number, _clientY: number): boolean {
    // 图片不再使用右键菜单，改为点击时显示悬浮工具栏
    return false
  }

  /**
   * 隐藏右键上下文菜单
   */
  hideContextMenu(): void {
    this.contextMenu.hide()
  }

  /**
   * 销毁 widget，清除选中、隐藏菜单、移除事件监听并清理所有 DOM
   */
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
