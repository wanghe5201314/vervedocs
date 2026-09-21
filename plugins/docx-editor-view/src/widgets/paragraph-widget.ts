/**
 * ParagraphWidget —— 段落格式悬浮 widget
 *
 * 光标在段落中或鼠标悬浮在段落上时，在首行左侧显示小图标，
 * 点击弹出菜单可修改标题类型、对齐方式。
 */

import type { DocumentLayout, ParagraphBlock, BlockNode } from '../layout-types'
import type { RangeManager } from '@vervedoc/docx-editor-state'
import type { IPosition, IRangeStyle } from '@vervedoc/docx-editor-schema'
import { TITLE_LEVEL, ROW_FLEX, comparePosition } from '@vervedoc/docx-editor-schema'
import { ContextMenu, type MenuItem } from '../context-menu'
import { ParagraphLayoutWidget } from './layout/paragraph-layout-widget'
import { FontLayoutWidget } from './layout/font-layout-widget'
import { positionHandle } from './handle-position'
import '../assets/css/paragraph-handle-menu.css'


/**
 * ParagraphWidget 的依赖注入接口
 *
 * 由外部宿主提供，用于获取编辑器布局、选区、容器信息以及触发命令等。
 */
export interface ParagraphWidgetDeps {
  /** Whether editing interactions are currently allowed. */
  canEdit: () => boolean
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
  onCommand: (cmd: string, ...args: any[]) => any
  /** 根据客户端坐标命中测试，返回位置信息或 null */
  hit: (clientX: number, clientY: number) => IPosition | null
  /** 临时抑制工具栏显示 */
  suppressToolbar: () => void
  /** 让隐藏输入区获焦，以接收后续键盘事件 */
  focusInput: () => void
}

/**
 * 段落格式悬浮 widget
 *
 * 在段落首行左侧显示拖拽手柄，点击后弹出两行格式菜单，可修改标题级别和对齐方式。
 */
export class ParagraphWidget {
  /** 段落左侧的拖拽手柄 DOM 元素 */
  private handle: HTMLDivElement | null = null
  /** 当前关联的段落块 */
  private currentBlock: ParagraphBlock | null = null
  /** 段落右键菜单控制器 */
  private contextMenu = new ContextMenu()
  /** 段落设置弹出面板 */
  private panel = new ParagraphLayoutWidget()
  /** 字体设置弹出面板 */
  private fontPanel = new FontLayoutWidget()

  /**
   * 构造 ParagraphWidget 实例
   *
   * @param deps 依赖注入对象
   */
  constructor(private deps: ParagraphWidgetDeps) {
    const onCommand = (cmd: string, ...args: any[]) => {
      if (this.deps.canEdit()) return this.deps.onCommand(cmd, ...args)
    }
    this.panel.setDeps({ onCommand })
    this.fontPanel.setDeps({ onCommand })
  }

  /**
   * 创建手柄 DOM 并挂载到 document.body
   *
   * 手柄包含一个 drag_indicator 图标，并绑定鼠标悬停、点击等事件。
   */
  create(): void {
    this.handle = document.createElement('div')
    this.handle.className = 'vervedocs-paragraph-handle'
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
    icon.className = 'material-symbols-outlined'
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
    if (!this.deps.canEdit()) {
      this.hide()
      this.panel.hide()
      this.fontPanel.hide()
      this.currentBlock = null
      return
    }
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
    if (!positionHandle(this.handle, bx - 34, by + (firstLine.height - 22) / 2, 22, rect)) {
      this.hide()
    }
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
    if (!this.deps.canEdit()) return
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
   * 在手柄下方弹出格式菜单
   *
   * 第一行为正文和 H1-H4，第二行为五种对齐方式。
   * 同时绑定滚动隐藏和点击外部关闭逻辑。
   */
  private showMenu(): void {
    this.hideMenu()
    if (!this.deps.canEdit()) return
    if (!this.handle || !this.currentBlock) return

    const style: Partial<IRangeStyle> = this.deps.onCommand('getRangeStyle') ?? {}
    const alignment = style.rowFlex === ROW_FLEX.ALIGNMENT ? ROW_FLEX.JUSTIFY : (style.rowFlex || ROW_FLEX.LEFT)
    const menu = document.createElement('div')
    menu.className = 'ce-paragraph-handle-menu'
    menu.setAttribute('role', 'toolbar')
    menu.setAttribute('aria-label', '段落格式')
    menu.addEventListener('mousedown', e => e.preventDefault())
    menu.addEventListener('keydown', e => {
      e.stopPropagation()
      if (e.key === 'Escape') {
        this.hideMenu()
        this.deps.focusInput()
      }
    })

    const addButton = (label: string, active: boolean, command: string, value: unknown) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.title = label
      button.setAttribute('aria-label', label)
      button.setAttribute('aria-pressed', String(active))
      button.addEventListener('click', () => {
        this.hideMenu()
        if (!this.deps.canEdit()) return
        this.deps.onCommand(command, value)
        this.deps.focusInput()
      })
      menu.appendChild(button)
      return button
    }

    const levels = [null, TITLE_LEVEL.FIRST, TITLE_LEVEL.SECOND, TITLE_LEVEL.THIRD, TITLE_LEVEL.FOURTH]
    const labels = ['正文', '一级标题', '二级标题', '三级标题', '四级标题']
    levels.forEach((level, index) => {
      const button = addButton(labels[index], (style.level ?? null) === level, 'executeTitle', level)
      button.className = 'ce-paragraph-handle-menu__heading'
      button.append(index === 0 ? 'T' : 'H')
      if (index > 0) {
        const sub = document.createElement('sub')
        sub.textContent = String(index)
        button.appendChild(sub)
      }
    })

    const alignments = [
      { label: '左对齐', value: ROW_FLEX.LEFT, path: 'M4 5H19M4 12H12M4 19H19' },
      { label: '居中', value: ROW_FLEX.CENTER, path: 'M4 5H19M8 12H15M4 19H19' },
      { label: '右对齐', value: ROW_FLEX.RIGHT, path: 'M4 5H19M11 12H19M4 19H19' },
      { label: '两端对齐', value: ROW_FLEX.JUSTIFY, path: 'M4 5H19M4 12H19M4 19H19' },
      { label: '分散对齐', value: ROW_FLEX.DISTRIBUTE, path: 'M3 4V20M21 4V20M7 13H17M7 19H17' }
    ]
    for (const item of alignments) {
      const button = addButton(item.label, alignment === item.value, 'executeRowFlex', item.value)
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.setAttribute('viewBox', '0 0 24 24')
      svg.setAttribute('aria-hidden', 'true')
      const path = document.createElementNS(svg.namespaceURI, 'path')
      path.setAttribute('d', item.path)
      svg.appendChild(path)
      if (item.value === ROW_FLEX.DISTRIBUTE) {
        const arrows = document.createElementNS(svg.namespaceURI, 'path')
        arrows.setAttribute('d', 'M9 4L7 6L9 8M15 4L17 6L15 8')
        arrows.setAttribute('stroke', '#527bb5')
        svg.appendChild(arrows)
      }
      button.appendChild(svg)
    }

    const hx = parseFloat(this.handle.style.left)
    const hy = parseFloat(this.handle.style.top)
    this.contextMenu.showContent(hx, hy + 22, menu)
  }

  /**
   * 隐藏格式菜单及其所有子菜单
   */
  private hideMenu(): void {
    this.contextMenu.hide()
  }

  /**
   * 显示段落右键菜单。
   *
   * 参照 Word 段落右键菜单，覆盖剪切/复制/粘贴、样式、对齐、缩进、行距、
   * 项目符号/编号、超链接、清除格式、段落对话框等常用功能。
   * 复用 ContextMenu 类，样式与表格右键菜单一致（紧凑）。
   *
   * @param clientX 右键横坐标（视口）
   * @param clientY 右键纵坐标（视口）
   * @returns 命中段落并显示菜单返回 true，否则 false
   */
  showContextMenu(clientX: number, clientY: number): boolean {
    if (!this.deps.canEdit()) return false
    const layout = this.deps.getLayout()
    const range = this.deps.getRange()
    if (!layout || !range) return false

    const pos = this.deps.hit(clientX, clientY)
    if (!pos) return false

    // 表格内选区由 tableWidget 处理，此处跳过
    if (pos.path.length >= 5 && pos.path[1] === 'trList') return false

    const block = this.findParagraphBlock(layout, pos)
    if (!block) return false

    const ordered = range.getOrdered()
    if (!ordered || range.isCollapsed() ||
        comparePosition(pos, ordered.start) < 0 || comparePosition(pos, ordered.end) > 0) {
      range.setCaret(pos)
    }
    this.deps.focusInput()

    const icons = ContextMenu.getIcons()
    const fire = (cmd: string, ...args: any[]) => {
      if (this.deps.canEdit()) this.deps.onCommand(cmd, ...args)
    }

    const items: MenuItem[] = [
      { label: '剪切', icon: 'content_cut', shortcut: 'Ctrl+X', onClick: () => fire('executeCut') },
      { label: '复制', icon: 'content_copy', shortcut: 'Ctrl+C', onClick: () => fire('executeCopy') },
      { label: '粘贴', icon: 'content_paste', shortcut: 'Ctrl+V', onClick: () => fire('executePaste') },
      { label: '---' },
      { label: '字体...', icon: 'format_size', onClick: () => { if (this.deps.canEdit()) this.fontPanel.show() } },
      { label: '段落高级设置', icon: 'subject', onClick: () => { if (this.deps.canEdit()) this.panel.show() } },
      { label: '---' },
      { label: '超链接', icon: icons.link, shortcut: 'Ctrl+K', onClick: () => fire('requestInsertHyperlink') },
      { label: '插入批注', icon: 'comment', onClick: () => fire('requestInsertComment') },

    ]

    this.contextMenu.show(clientX, clientY, items)
    return true
  }

  /**
   * 隐藏段落右键菜单。
   */
  hideContextMenu(): void {
    this.contextMenu.hide()
  }

  /**
   * 销毁 widget，移除菜单和手柄 DOM 及相关事件监听
   */
  destroy(): void {
    this.hideMenu()
    this.hideContextMenu()
    this.panel.hide()
    this.fontPanel.hide()
    if (this.handle) { this.handle.remove(); this.handle = null }
  }
}
