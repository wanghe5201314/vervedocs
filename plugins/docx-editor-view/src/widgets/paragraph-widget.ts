/**
 * ParagraphWidget —— 段落格式悬浮 widget
 *
 * 光标在段落中或鼠标悬浮在段落上时，在首行左侧显示小图标，
 * 点击弹出菜单可修改标题类型、对齐方式、列表。
 */

import type { DocumentLayout, ParagraphBlock, BlockNode } from '../layout-types'
import type { RangeManager } from '@vervedoc/docx-editor-state'
import type { IPosition } from '@vervedoc/docx-editor-schema'
import { TITLE_LEVEL, ROW_FLEX } from '@vervedoc/docx-editor-schema'


/**
 * ParagraphWidget 的依赖注入接口
 *
 * 由外部宿主提供，用于获取编辑器布局、选区、容器信息以及触发命令等。
 */
export interface ParagraphWidgetDeps {
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
  /** 临时抑制工具栏显示 */
  suppressToolbar: () => void
}

/**
 * 段落格式悬浮 widget
 *
 * 在段落首行左侧显示拖拽手柄，点击后弹出菜单可修改标题级别、对齐方式、
 * 列表，以及在当前段落下方插入图片、段落、表格等元素。
 */
export class ParagraphWidget {
  /** 段落左侧的拖拽手柄 DOM 元素 */
  private handle: HTMLDivElement | null = null
  /** 弹出的格式菜单 DOM 元素 */
  private menu: HTMLDivElement | null = null
  /** 当前关联的段落块 */
  private currentBlock: ParagraphBlock | null = null
  /** 滚动事件处理器引用，用于在销毁时移除监听 */
  private scrollHandler: (() => void) | null = null

  /**
   * 构造 ParagraphWidget 实例
   *
   * @param deps 依赖注入对象
   */
  constructor(private deps: ParagraphWidgetDeps) {}

  /**
   * 创建手柄 DOM 并挂载到 document.body
   *
   * 手柄包含一个 drag_indicator 图标，并绑定鼠标悬停、点击等事件。
   */
  create(): void {
    this.handle = document.createElement('div')
    Object.assign(this.handle.style, {
      position: 'fixed',
      width: '22px',
      height: '22px',
      background: '#fff',
      border: '1px solid #dcdfe6',
      borderRadius: '4px',
      display: 'none',
      zIndex: '99',
      cursor: 'pointer',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 1px 3px rgba(0,0,0,.12)',
      transition: 'background .15s'
    } as CSSStyleDeclaration)
    const icon = document.createElement('span')
    icon.className = 'material-icons'
    icon.textContent = 'drag_indicator'
    icon.style.cssText = 'font-size:14px;color:#606266;'
    this.handle.appendChild(icon)
    this.handle.addEventListener('mouseenter', () => { this.handle!.style.background = '#f0f0f0' })
    this.handle.addEventListener('mouseleave', () => { this.handle!.style.background = '#fff' })
    this.handle.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation() })
    this.handle.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); this.selectParagraph(); this.showMenu() })
    this.handle.addEventListener('dblclick', (e) => { e.preventDefault(); e.stopPropagation() })
    document.body.appendChild(this.handle)
  }

  /**
   * 根据当前选区更新手柄位置
   *
   * 当光标位于段落中时，将手柄定位到段落首行左侧；否则隐藏手柄。
   */
  update(): void {
    if (!this.handle) return
    const layout = this.deps.getLayout()
    const range = this.deps.getRange()
    if (!layout || !range) { this.hide(); return }

    const pos = range.getFocus()
    if (!pos) { this.hide(); return }

    const block = this.findParagraphBlock(layout, pos)
    if (!block) { this.hide(); return }

    this.currentBlock = block
    const rect = this.deps.getContainerRect()
    const pageOffsetX = this.deps.getPageOffsetX()
    const scrollY = this.deps.getScrollY()

    const page = layout.pages.find(p => p.blocks.includes(block as BlockNode))
    if (!page) { this.hide(); return }

    const firstLine = block.lines[0]
    if (!firstLine) { this.hide(); return }

    const bx = rect.left + pageOffsetX + page.contentRect.x + block.rect.x
    const by = rect.top - scrollY + page.contentRect.y + block.rect.y + firstLine.y
    this.handle.style.display = 'flex'
    this.handle.style.left = `${Math.round(bx - 34)}px`
    this.handle.style.top = `${Math.round(by + (firstLine.height - 22) / 2)}px`
  }

  /**
   * 隐藏手柄和菜单
   */
  private hide(): void {
    if (this.handle) this.handle.style.display = 'none'
    this.hideMenu()
  }

  /**
   * 选中当前段落的所有内容
   *
   * 根据段落首行第一个 inline 和末行最后一个 inline 设置选区范围。
   */
  private selectParagraph(): void {
    const range = this.deps.getRange()
    if (!range || !this.currentBlock) return
    const lines = this.currentBlock.lines
    if (!lines.length) return
    const firstLine = lines[0]
    const lastLine = lines[lines.length - 1]
    const firstInline = firstLine.inlines[0]
    const lastInline = lastLine.inlines[lastLine.inlines.length - 1]
    if (!firstInline || !lastInline) return
    this.deps.suppressToolbar()
    range.setRange({
      anchor: { path: firstInline.path, offset: firstInline.startOffset },
      focus: { path: lastInline.path, offset: lastInline.endOffset }
    })
  }

  /**
   * 在文档布局中查找包含指定位置的段落块
   *
   * @param layout 文档布局
   * @param pos 位置信息
   * @returns 命中的段落块，未找到返回 null
   */
  private findParagraphBlock(layout: DocumentLayout, pos: IPosition): ParagraphBlock | null {
    for (const page of layout.pages) {
      const r = this.findParagraphInBlocks(page.blocks, pos)
      if (r) return r
    }
    return null
  }

  /**
   * 在块列表中递归查找包含指定位置的段落块
   *
   * 支持在表格单元格内继续递归查找。
   *
   * @param blocks 块列表
   * @param pos 位置信息
   * @returns 命中的段落块，未找到返回 null
   */
  private findParagraphInBlocks(blocks: BlockNode[], pos: IPosition): ParagraphBlock | null {
    for (const b of blocks) {
      if (b.kind === 'paragraph') {
        for (const line of b.lines) {
          for (const inl of line.inlines) {
            if (this.pathContains(inl.path, pos.path)) return b
          }
        }
      } else if (b.kind === 'table') {
        for (const row of b.rows) {
          for (const cell of row.cells) {
            const r = this.findParagraphInBlocks(cell.content, pos)
            if (r) return r
          }
        }
      }
    }
    return null
  }

  /**
   * 判断 parent 路径是否为 child 路径的前缀
   *
   * @param parent 父路径
   * @param child 子路径
   * @returns 是前缀返回 true，否则返回 false
   */
  private pathContains(parent: IPosition['path'], child: IPosition['path']): boolean {
    if (parent.length > child.length) return false
    for (let i = 0; i < parent.length; i++) {
      if (parent[i] !== child[i]) return false
    }
    return true
  }

  /**
   * 在手柄左侧弹出格式菜单
   *
   * 菜单包含标题级别、对齐方式以及"在下方插入"子菜单（图片、段落、表格等）。
   * 同时绑定滚动隐藏和点击外部关闭逻辑。
   */
  private showMenu(): void {
    this.hideMenu()
    if (!this.handle || !this.currentBlock) return

    const menu = document.createElement('div')
    Object.assign(menu.style, {
      position: 'fixed',
      background: '#fff',
      border: '1px solid #dcdfe6',
      borderRadius: '6px',
      boxShadow: '0 4px 16px rgba(0,0,0,.12)',
      padding: '4px 0',
      zIndex: '101',
      fontSize: '13px',
      fontFamily: '"Microsoft YaHei","PingFang SC",sans-serif',
      color: '#333',
      userSelect: 'none',
      minWidth: '120px'
    } as CSSStyleDeclaration)

    const mkBtn = (label: string, onClick: () => void, opts?: { icon?: string; active?: boolean }): HTMLDivElement => {
      const btn = document.createElement('div')
      Object.assign(btn.style, {
        padding: '6px 14px',
        cursor: 'pointer',
        background: opts?.active ? '#f0f0f0' : 'transparent',
        transition: 'background .12s',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontWeight: '400'
      } as CSSStyleDeclaration)
      if (opts?.icon) {
        const sp = document.createElement('span')
        sp.className = 'material-icons'
        sp.textContent = opts.icon
        sp.style.cssText = 'font-size:16px;color:#555;'
        btn.appendChild(sp)
      }
      if (label) {
        const txt = document.createElement('span')
        txt.textContent = label
        btn.appendChild(txt)
      }
      btn.addEventListener('mouseenter', () => { if (!opts?.active) btn.style.background = '#f0f0f0' })
      btn.addEventListener('mouseleave', () => { if (!opts?.active) btn.style.background = 'transparent' })
      btn.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation() })
      btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); onClick(); this.hideMenu() })
      return btn
    }

    const mkBtnWithSub = (label: string, icon: string, subItems: { label: string; icon: string; onClick: () => void }[]): HTMLDivElement => {
      const btn = document.createElement('div')
      Object.assign(btn.style, {
        padding: '6px 14px',
        cursor: 'pointer',
        background: 'transparent',
        transition: 'background .12s',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      } as CSSStyleDeclaration)
      const sp = document.createElement('span')
      sp.className = 'material-icons'
      sp.textContent = icon
      sp.style.cssText = 'font-size:16px;color:#555;'
      btn.appendChild(sp)
      const txt = document.createElement('span')
      txt.textContent = label
      txt.style.cssText = 'font-size:13px;font-weight:600;'
      btn.appendChild(txt)
      const arrow = document.createElement('span')
      arrow.className = 'material-icons'
      arrow.textContent = 'chevron_right'
      arrow.style.cssText = 'font-size:14px;color:#999;margin-left:auto;'
      btn.appendChild(arrow)

      let subMenu: HTMLDivElement | null = null
      let hideTimer: number | null = null

      const showSub = () => {
        if (hideTimer) { window.clearTimeout(hideTimer); hideTimer = null }
        document.querySelectorAll('.pw-sub-menu').forEach(el => el.remove())
        subMenu = document.createElement('div')
        subMenu.className = 'pw-sub-menu'
        Object.assign(subMenu.style, {
          position: 'fixed',
          background: '#fff',
          border: '1px solid #dcdfe6',
          borderRadius: '6px',
          boxShadow: '0 4px 16px rgba(0,0,0,.12)',
      padding: '6px 8px',
          zIndex: '102',
          fontSize: '13px',
          fontFamily: '"Microsoft YaHei","PingFang SC",sans-serif',
          color: '#333',
          userSelect: 'none',
          minWidth: '120px'
        } as CSSStyleDeclaration)
        for (const si of subItems) {
          const siEl = document.createElement('div')
          Object.assign(siEl.style, {
            padding: '6px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background .12s'
          } as CSSStyleDeclaration)
          const siSp = document.createElement('span')
          siSp.className = 'material-icons'
          siSp.textContent = si.icon
          siSp.style.cssText = 'font-size:16px;color:#555;'
          siEl.appendChild(siSp)
          const siTxt = document.createElement('span')
          siTxt.textContent = si.label
          siEl.appendChild(siTxt)
          siEl.addEventListener('mouseenter', () => { siEl.style.background = '#f5f7fa'; if (hideTimer) { window.clearTimeout(hideTimer); hideTimer = null } })
          siEl.addEventListener('mouseleave', () => { siEl.style.background = 'transparent' })
          siEl.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation() })
          siEl.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); si.onClick(); this.hideMenu() })
          subMenu!.appendChild(siEl)
        }
        const ir = btn.getBoundingClientRect()
        subMenu.style.left = `${Math.round(ir.right)}px`
        subMenu.style.top = `${Math.round(ir.top)}px`
        document.body.appendChild(subMenu)
        const smH = subMenu.offsetHeight
        if (ir.top + smH > window.innerHeight) {
          subMenu.style.top = `${Math.round(Math.max(4, window.innerHeight - smH - 4))}px`
        }
      }
      const hideSub = () => {
        hideTimer = window.setTimeout(() => { if (subMenu) { subMenu.remove(); subMenu = null } }, 200)
      }

      btn.addEventListener('mouseenter', () => { btn.style.background = '#f0f0f0'; showSub() })
      btn.addEventListener('mouseleave', () => { btn.style.background = 'transparent'; hideSub() })
      btn.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation() })
      return btn
    }

    const fire = (cmd: string, ...args: any[]) => { this.deps.onCommand(cmd, ...args) }

    const insertBelow = (cmd: string, ...args: any[]) => {
      if (!this.currentBlock) return
      const { parentPath, endIndex } = this.currentBlock
      const caretPath = [...parentPath, Math.max(0, endIndex - 1)] as IPosition['path']
      fire('executeSetCaret', caretPath, 0)
      fire(cmd, ...args)
    }

    menu.appendChild(mkBtn('正文', () => fire('executeTitle', null), { icon: 'title' }))
    menu.appendChild(mkBtn('一级标题', () => fire('executeTitle', TITLE_LEVEL.FIRST), { icon: 'title' }))
    menu.appendChild(mkBtn('二级标题', () => fire('executeTitle', TITLE_LEVEL.SECOND), { icon: 'title' }))
    menu.appendChild(mkBtn('三级标题', () => fire('executeTitle', TITLE_LEVEL.THIRD), { icon: 'title' }))
    menu.appendChild(mkBtn('四级标题', () => fire('executeTitle', TITLE_LEVEL.FOURTH), { icon: 'title' }))
    menu.appendChild(mkBtn('五级标题', () => fire('executeTitle', TITLE_LEVEL.FIFTH), { icon: 'title' }))
    menu.appendChild(mkBtn('六级标题', () => fire('executeTitle', TITLE_LEVEL.SIXTH), { icon: 'title' }))
    menu.appendChild(mkBtn('左对齐', () => fire('executeRowFlex', ROW_FLEX.LEFT), { icon: 'format_align_left' }))
    menu.appendChild(mkBtn('居中', () => fire('executeRowFlex', ROW_FLEX.CENTER), { icon: 'format_align_center' }))
    menu.appendChild(mkBtn('右对齐', () => fire('executeRowFlex', ROW_FLEX.RIGHT), { icon: 'format_align_right' }))
    menu.appendChild(mkBtn('两端对齐', () => fire('executeRowFlex', ROW_FLEX.JUSTIFY), { icon: 'format_align_justify' }))

    const sep = document.createElement('div')
    sep.style.cssText = 'height:1px;background:#e0e0e0;margin:4px 0;'
    menu.appendChild(sep)

    menu.appendChild(mkBtnWithSub('在下方插入', 'add', [
      { label: '图片', icon: 'image', onClick: () => insertBelow('requestInsertImage') },
      { label: '段落', icon: 'text_fields', onClick: () => insertBelow('executeSplitParagraph') },
      { label: '表格', icon: 'table_chart', onClick: () => insertBelow('executeInsertTable', 3, 4) },
      { label: '分割线', icon: 'horizontal_rule', onClick: () => insertBelow('executeSeparator') },
      { label: '超链接', icon: 'link', onClick: () => insertBelow('requestInsertHyperlink') },
      { label: '公式', icon: 'functions', onClick: () => insertBelow('requestInsertFormula') }
    ]))



    const hx = parseFloat(this.handle.style.left)
    const hy = parseFloat(this.handle.style.top)
    document.body.appendChild(menu)
    const menuW = menu.offsetWidth
    const menuH = menu.offsetHeight
    menu.style.left = `${Math.round(Math.max(4, hx - menuW - 4))}px`
    menu.style.top = `${Math.round(hy)}px`
    if (hy + menuH > window.innerHeight) {
      menu.style.top = `${Math.round(Math.max(4, window.innerHeight - menuH - 4))}px`
    }
    this.menu = menu

    this.scrollHandler = () => this.hideMenu()
    document.addEventListener('scroll', this.scrollHandler, { capture: true })

    const onDown = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) { this.hideMenu(); document.removeEventListener('mousedown', onDown, true) }
    }
    setTimeout(() => document.addEventListener('mousedown', onDown, true), 0)
  }

  /**
   * 隐藏格式菜单及其所有子菜单，并移除滚动监听
   */
  private hideMenu(): void {
    if (this.menu) { this.menu.remove(); this.menu = null }
    document.querySelectorAll('.pw-sub-menu').forEach(el => el.remove())
    if (this.scrollHandler) { document.removeEventListener('scroll', this.scrollHandler, { capture: true }); this.scrollHandler = null }
  }

  /**
   * 销毁 widget，移除菜单和手柄 DOM 及相关事件监听
   */
  destroy(): void {
    this.hideMenu()
    if (this.handle) { this.handle.remove(); this.handle = null }
  }
}