/**
 * SelectionToolbarWidget —— 悬浮选区工具栏 widget
 *
 * 选区非折叠时在选区起点上方显示悬浮工具栏，提供字体/字号/B/I/U/S/颜色/高亮/对齐/清除格式等操作。
 */

import type { DocumentLayout } from '../layout-types'
import type { RangeManager } from '@vervedoc/docx-editor-state'
import type { IDocxDocumentMeta } from '@vervedoc/docx-editor-schema'
import { getByPath, FONT_FAMILY_LIST, FONT_FAMILY_VALUE, FONT_FAMILY_LABEL, FONT_SIZE, FONT_SIZE_LIST } from '@vervedoc/docx-editor-schema'
import { locateCaret } from '../caret-rect'
import type { Zone } from './header-footer-widget'

/**
 * SelectionToolbarWidget 的依赖注入接口
 *
 * 由外部宿主提供，用于获取编辑器布局、选区、容器信息以及触发命令等。
 */
export interface SelectionToolbarWidgetDeps {
  /** 获取当前文档布局，可能为 null */
  getLayout: () => DocumentLayout | null
  /** 获取当前选区管理器，可能为 null */
  getRange: () => RangeManager | null
  /** 获取当前文档元数据 */
  getDocument: () => IDocxDocumentMeta
  /** 获取当前编辑区域 */
  getZone: () => Zone
  /** 获取当前垂直滚动偏移量（像素） */
  getScrollY: () => number
  /** 获取页面水平偏移量（像素） */
  getPageOffsetX: () => number
  /** 获取视口宽度（像素） */
  getViewportWidth: () => number
  /** 获取外层容器 DOM */
  getContainer: () => HTMLDivElement
  /** 触发编辑器命令的回调 */
  onCommand: (cmd: string, ...args: any[]) => void
  /** 查询是否抑制下一次工具栏显示 */
  isSuppressToolbar: () => boolean
  /** 消费（重置）抑制标志 */
  consumeSuppressToolbar: () => void
}

/**
 * 悬浮选区工具栏 widget
 *
 * 在选区起点上方显示工具栏，回显光标所在 run 的格式状态，
 * 点击按钮触发对应命令。
 */
export class SelectionToolbarWidget {
  /** 工具栏 DOM 元素 */
  private toolbar: HTMLDivElement | null = null

  /**
   * 构造 SelectionToolbarWidget 实例
   *
   * @param deps 依赖注入对象
   */
  constructor(private deps: SelectionToolbarWidgetDeps) {}

  /** 创建工具栏 DOM 并挂载到容器 */
  create(): void {
    const tb = document.createElement('div')
    tb.className = 'vervedocs-selection-toolbar'
    Object.assign(tb.style, {
      position: 'absolute',
      display: 'none',
      zIndex: '100',
      background: '#fff',
      borderRadius: '0',
      boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
      padding: '8px 10px',
      gap: '6px',
      alignItems: 'center',
      fontSize: '14px',
      userSelect: 'none',
      whiteSpace: 'nowrap',
      fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif',
    } as CSSStyleDeclaration)

    const fire = (cmd: string, ...args: any[]) => { this.deps.onCommand?.(cmd, ...args) }


    const mkBtn = (icon: string, cmd: string, args: any[] = [], title = ''): HTMLButtonElement => {
      const el = document.createElement('button')
      el.title = title
      el.dataset.cmd = cmd
      el.dataset.args = JSON.stringify(args)
      Object.assign(el.style, {
        border: 'none', background: 'transparent', borderRadius: '4px',
        padding: '4px', cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center', lineHeight: '0',
      } as CSSStyleDeclaration)
      const sp = document.createElement('span')
      sp.className = 'material-icons'
      sp.textContent = icon
      sp.style.cssText = 'font-size:18px;color:#3D4757;'
      el.appendChild(sp)
      el.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation() })
      el.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); fire(cmd, ...args) })
      return el
    }

    const mkSep = (): HTMLSpanElement => {
      const sep = document.createElement('span')
      Object.assign(sep.style, {
        display: 'inline-block', width: '1px', height: '24px',
        background: '#e0e0e0', margin: '0 3px',
      } as CSSStyleDeclaration)
      return sep
    }

    // 字体下拉
    const fontSel = document.createElement('select')
    Object.assign(fontSel.style, {
      border: '1px solid #ddd', borderRadius: '4px', padding: '4px 6px',
      fontSize: '13px', background: '#fff', cursor: 'pointer', maxWidth: '110px',
    } as CSSStyleDeclaration)
    for (const f of FONT_FAMILY_LIST) {
      const opt = document.createElement('option')
      opt.value = FONT_FAMILY_VALUE[f] ?? f; opt.textContent = f
      fontSel.appendChild(opt)
    }
    fontSel.addEventListener('mousedown', (e) => e.stopPropagation())
    fontSel.addEventListener('change', () => fire('executeFont', fontSel.value))
    tb.appendChild(fontSel)

    // 字号下拉
    const sizeSel = document.createElement('select')
    Object.assign(sizeSel.style, {
      border: '1px solid #ddd', borderRadius: '4px', padding: '4px 6px',
      fontSize: '13px', background: '#fff', cursor: 'pointer', width: '68px',
    } as CSSStyleDeclaration)
    for (const s of FONT_SIZE_LIST) {
      const opt = document.createElement('option')
      const pt = FONT_SIZE[s] ?? Number(s)
      opt.value = String(pt); opt.textContent = s
      sizeSel.appendChild(opt)
    }
    sizeSel.value = '14'
    sizeSel.addEventListener('mousedown', (e) => e.stopPropagation())
    sizeSel.addEventListener('change', () => fire('executeSize', Number(sizeSel.value)))
    tb.appendChild(sizeSel)

    tb.appendChild(mkSep())

    // B I U S
    tb.appendChild(mkBtn('format_bold', 'executeBold', [], '加粗'))
    tb.appendChild(mkBtn('format_italic', 'executeItalic', [], '斜体'))
    tb.appendChild(mkBtn('format_underlined', 'executeUnderline', [], '下划线'))
    tb.appendChild(mkBtn('format_strikethrough', 'executeStrikeout', [], '删除线'))

    tb.appendChild(mkSep())

    // 颜色
    const colorBtn = document.createElement('input')
    colorBtn.type = 'color'
    colorBtn.value = '#000000'
    Object.assign(colorBtn.style, {
      width: '32px', height: '28px', border: '1px solid #ddd',
      borderRadius: '4px', cursor: 'pointer', padding: '0', background: 'transparent',
    } as CSSStyleDeclaration)
    colorBtn.title = '字体颜色'
    colorBtn.addEventListener('mousedown', (e) => e.stopPropagation())
    colorBtn.addEventListener('input', () => fire('executeColor', colorBtn.value))
    tb.appendChild(colorBtn)

    // 高亮
    const hlBtn = document.createElement('input')
    hlBtn.type = 'color'
    hlBtn.value = '#ffff00'
    Object.assign(hlBtn.style, {
      width: '32px', height: '28px', border: '1px solid #ddd',
      borderRadius: '4px', cursor: 'pointer', padding: '0', background: 'transparent',
    } as CSSStyleDeclaration)
    hlBtn.title = '高亮颜色'
    hlBtn.addEventListener('mousedown', (e) => e.stopPropagation())
    hlBtn.addEventListener('input', () => fire('executeHighlight', hlBtn.value))
    tb.appendChild(hlBtn)

    tb.appendChild(mkSep())

    // 对齐
    tb.appendChild(mkBtn('format_align_left', 'executeRowFlex', ['left'], '左对齐'))
    tb.appendChild(mkBtn('format_align_center', 'executeRowFlex', ['center'], '居中'))
    tb.appendChild(mkBtn('format_align_right', 'executeRowFlex', ['right'], '右对齐'))
    tb.appendChild(mkBtn('format_align_justify', 'executeRowFlex', ['justify'], '两端对齐'))

    tb.appendChild(mkSep())

    // 清除格式
    tb.appendChild(mkBtn('format_clear', 'executeFormat', [], '清除格式'))

    this.deps.getContainer().appendChild(tb)
    this.toolbar = tb
  }

  /** 更新工具栏：折叠选区/表格内选区时隐藏，否则定位到选区起点上方并回显格式状态。 */
  update(): void {
    const layout = this.deps.getLayout()
    const range = this.deps.getRange()
    if (!this.toolbar || !layout || !range) return
    const tb = this.toolbar
    if (this.deps.isSuppressToolbar()) { tb.style.display = 'none'; this.deps.consumeSuppressToolbar(); return }
    if (range.isCollapsed()) {
      tb.style.display = 'none'
      return
    }
    const ordered = range.getOrdered()
    if (!ordered) { tb.style.display = 'none'; return }
    // 表格内选区不显示段落悬浮工具栏
    if (ordered.start.path.length >= 2 && ordered.start.path[1] === 'trList') {
      tb.style.display = 'none'
      return
    }
    const rect = locateCaret(layout, ordered.start, this.deps.getZone())
    if (!rect) { tb.style.display = 'none'; return }
    const pageOffsetX = this.deps.getPageOffsetX()
    const x = Math.round(rect.x + pageOffsetX)
    const y = Math.round(rect.y - this.deps.getScrollY()) - rect.height - 8
    tb.style.display = 'flex'
    tb.style.left = `${Math.max(4, Math.min(x, this.deps.getViewportWidth() - tb.offsetWidth - 4))}px`
    tb.style.top = `${Math.max(4, y)}px`

    this.syncToolbarState(tb)
  }

  /** 读取光标所在 run 的格式状态，回显到工具栏控件 */
  private syncToolbarState(tb: HTMLDivElement): void {
    const range = this.deps.getRange()
    if (!range) return
    const pos = range.getFocus()
    if (!pos) return
    const node = getByPath(this.deps.getDocument().elements, pos.path)
    if (!node || node.type !== 'text') return
    const run = node as unknown as Record<string, unknown>

    const fontSel = tb.querySelector('select:nth-of-type(1)') as HTMLSelectElement | null
    const sizeSel = tb.querySelector('select:nth-of-type(2)') as HTMLSelectElement | null

    // 回显字体
    if (fontSel) {
      const font = String(run.font ?? '')
      const label = FONT_FAMILY_LABEL[font] ?? font
      for (let i = 0; i < fontSel.options.length; i++) {
        const opt = fontSel.options[i]
        opt.selected = opt.value === font || opt.textContent === label
      }
    }

    // 回显字号
    if (sizeSel) {
      const size = String(run.size ?? '')
      for (let i = 0; i < sizeSel.options.length; i++) {
        if (sizeSel.options[i].value === size) { sizeSel.options[i].selected = true; break }
      }
    }

    // 回显 B/I/U/S 高亮
    const btns = tb.querySelectorAll<HTMLButtonElement>('button[data-cmd]')
    for (let i = 0; i < btns.length; i++) {
      const btn = btns[i]
      const cmd = btn.dataset.cmd
      let active = false
      if (cmd === 'executeBold') active = !!run.bold
      else if (cmd === 'executeItalic') active = !!run.italic
      else if (cmd === 'executeUnderline') active = !!run.underline
      else if (cmd === 'executeStrikeout') active = !!run.strikeout
      else if (cmd === 'executeRowFlex') {
        const args = JSON.parse(btn.dataset.args || '[]')
        active = String(run.rowFlex ?? 'left') === args[0]
      }
      btn.style.background = active ? '#e8eaf6' : 'transparent'
    }
  }

  /** 销毁工具栏：从容器移除 DOM */
  destroy(): void {
    if (this.toolbar && this.toolbar.parentElement) {
      this.toolbar.parentElement.removeChild(this.toolbar)
    }
    this.toolbar = null
  }
}
