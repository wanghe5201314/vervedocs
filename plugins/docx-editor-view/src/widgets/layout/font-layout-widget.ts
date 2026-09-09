/**
 * FontLayoutWidget —— 字体设置弹出面板（对齐 Word 标准）
 *
 * 结构在 font-layout-widget.html，样式在 font-layout-widget.css，
 * 本模块负责注入资源、填充当前值、绑定事件、应用命令。
 */
import '../../assets/css/font-layout-widget.css'
import panelHtml from '../../assets/components/font-layout-widget.html?raw'
import {
  FONT_FAMILY_MAP,
  FONT_FAMILY_LABEL,
  FONT_SIZE,
  FONT_SIZE_LIST
} from '@vervedoc/docx-editor-schema'

/** 命令调用签名：可返回值（用于 getter） */
type CommandFn = (cmd: string, ...args: any[]) => any

/** 字体设置弹出面板依赖 */
export interface FontLayoutWidgetDeps {
  /** 触发编辑器命令 / 读取状态 */
  onCommand: CommandFn
}

/**
 * 字体设置弹出面板。
 *
 * show() 显示面板并填充当前字体值，hide() 关闭。
 * 确定按钮应用字体、字号、字形、颜色、效果等命令。
 */
export class FontLayoutWidget {
  /** 面板根元素 */
  private root: HTMLElement | null = null
  /** 命令回调 */
  private onCommand: CommandFn | null = null

  /** 注入依赖 */
  setDeps(deps: FontLayoutWidgetDeps): void {
    this.onCommand = deps.onCommand
  }

  /** 显示字体设置面板 */
  show(): void {
    this.hide()

    const container = document.createElement('div')
    container.innerHTML = panelHtml
    this.root = container.firstElementChild as HTMLElement
    document.body.appendChild(this.root)

    this.fillFontOptions()
    this.fillSizeOptions()
    this.bindTabs()
    this.bindPreview()
    this.fillValues()
    this.root.querySelector('#fw-cancel')!.addEventListener('click', () => this.hide())
    this.root.querySelector('#fw-ok')!.addEventListener('click', () => {
      this.apply()
      this.hide()
    })
  }

  /** 关闭面板 */
  hide(): void {
    if (this.root) { this.root.remove(); this.root = null }
  }

  /** 填充中文字体下拉选项 */
  private fillFontOptions(): void {
    const cjk = this.root!.querySelector<HTMLSelectElement>('#fw-font-cjk')!
    const opts = FONT_FAMILY_MAP.map(e => {
      const o = document.createElement('option')
      o.value = e.value
      o.textContent = e.label
      return o
    })
    cjk.append(...opts)
  }

  /** 填充字号下拉选项 */
  private fillSizeOptions(): void {
    const size = this.root!.querySelector<HTMLSelectElement>('#fw-size')!
    for (const item of FONT_SIZE_LIST) {
      const o = document.createElement('option')
      o.value = String(item)
      o.textContent = String(item)
      size.appendChild(o)
    }
  }

  /** 绑定 Tab 切换 */
  private bindTabs(): void {
    const tabs = this.root!.querySelectorAll<HTMLElement>('.fw-tab')
    const panes = this.root!.querySelectorAll<HTMLElement>('.fw-pane')
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const key = tab.dataset.tab
        tabs.forEach(t => t.classList.toggle('fw-tab-active', t === tab))
        panes.forEach(p => p.classList.toggle('fw-pane-active', p.dataset.pane === key))
      })
    })
  }

  /** 绑定实时预览 */
  private bindPreview(): void {
    const ids = [
      '#fw-font-cjk', '#fw-style', '#fw-size', '#fw-color',
      '#fw-strikeout', '#fw-underline'
    ]
    for (const id of ids) {
      const el = this.root!.querySelector<HTMLElement>(id)!
      el.addEventListener('input', () => this.updatePreview())
      el.addEventListener('change', () => this.updatePreview())
    }
    const scale = this.root!.querySelector<HTMLElement>('#fw-scale')!
    scale.addEventListener('change', () => this.updatePreviewSpacing())
  }

  /** 从编辑器读取当前字体状态并填充表单 */
  private fillValues(): void {
    if (!this.onCommand) return
    let style: any = null
    try { style = this.onCommand('getRangeStyle') } catch { /* noop */ }
    if (!style) return

    const fontValue = style.font || 'SimSun'
    const fontLabel = FONT_FAMILY_LABEL[fontValue] || fontValue
    const fontEntry = FONT_FAMILY_MAP.find(e => e.label === fontLabel)

    const cjk = this.root!.querySelector<HTMLSelectElement>('#fw-font-cjk')!
    if (fontEntry) {
      cjk.value = fontEntry.value
    }

    const styleSel = this.root!.querySelector<HTMLSelectElement>('#fw-style')!
    const bold = !!style.bold
    const italic = !!style.italic
    styleSel.value = bold && italic ? 'bold-italic' : bold ? 'bold' : italic ? 'italic' : 'regular'

    const sizeSel = this.root!.querySelector<HTMLSelectElement>('#fw-size')!
    const pt = Number(style.size) || 10.5
    const cnName = Object.keys(FONT_SIZE).find(k => FONT_SIZE[k] === pt)
    sizeSel.value = cnName ? cnName : String(pt)
    if (!sizeSel.value) sizeSel.value = '五号'

    const color = this.root!.querySelector<HTMLInputElement>('#fw-color')!
    color.value = style.color || '#000000'

    const strikeout = this.root!.querySelector<HTMLInputElement>('#fw-strikeout')!
    strikeout.checked = !!style.strikeout
    const underline = this.root!.querySelector<HTMLInputElement>('#fw-underline')!
    underline.checked = !!style.underline

    const doubleStrikeout = this.root!.querySelector<HTMLInputElement>('#fw-double-strikeout')!
    doubleStrikeout.checked = !!style.doubleStrikeout
    const hidden = this.root!.querySelector<HTMLInputElement>('#fw-hidden')!
    hidden.checked = !!style.hidden
    const superscript = this.root!.querySelector<HTMLInputElement>('#fw-superscript')!
    superscript.checked = !!style.superscript
    const subscript = this.root!.querySelector<HTMLInputElement>('#fw-subscript')!
    subscript.checked = !!style.subscript

    const scale = this.root!.querySelector<HTMLSelectElement>('#fw-scale')!
    scale.value = String(style.characterScale || 100)

    this.updatePreview()
    this.updatePreviewSpacing()
  }

  /** 实时更新字体预览 */
  private updatePreview(): void {
    const preview = this.root!.querySelector<HTMLElement>('#fw-preview')!
    const cjk = this.root!.querySelector<HTMLSelectElement>('#fw-font-cjk')!.value
    const styleVal = this.root!.querySelector<HTMLSelectElement>('#fw-style')!.value
    const sizeVal = this.root!.querySelector<HTMLSelectElement>('#fw-size')!.value
    const color = this.root!.querySelector<HTMLInputElement>('#fw-color')!.value
    const strikeout = this.root!.querySelector<HTMLInputElement>('#fw-strikeout')!.checked
    const underline = this.root!.querySelector<HTMLInputElement>('#fw-underline')!.checked

    const entry = FONT_FAMILY_MAP.find(e => e.value === cjk)
    preview.style.fontFamily = entry ? entry.css : cjk
    const pt = FONT_SIZE[sizeVal] ?? Number(sizeVal) ?? 14
    preview.style.fontSize = `${pt * 1.5}px`
    preview.style.color = color
    preview.style.fontWeight = (styleVal === 'bold' || styleVal === 'bold-italic') ? 'bold' : 'normal'
    preview.style.fontStyle = (styleVal === 'italic' || styleVal === 'bold-italic') ? 'italic' : 'normal'
    preview.style.textDecoration = [
      underline ? 'underline' : '',
      strikeout ? 'line-through' : ''
    ].filter(Boolean).join(' ') || 'none'
  }

  /** 实时更新字符间距预览 */
  private updatePreviewSpacing(): void {
    const preview = this.root!.querySelector<HTMLElement>('#fw-preview-spacing')!
    const scale = this.root!.querySelector<HTMLSelectElement>('#fw-scale')!.value
    preview.style.transform = `scaleX(${Number(scale) / 100})`
    preview.style.transformOrigin = 'center'
  }

  /** 确定按钮：应用所有设置到编辑器 */
  private apply(): void {
    if (!this.onCommand) return
    const cmd = this.onCommand

    const cjk = this.root!.querySelector<HTMLSelectElement>('#fw-font-cjk')!.value
    cmd('executeSetFont', cjk)

    const styleVal = this.root!.querySelector<HTMLSelectElement>('#fw-style')!.value
    const bold = styleVal === 'bold' || styleVal === 'bold-italic'
    const italic = styleVal === 'italic' || styleVal === 'bold-italic'
    cmd('executeSetBold', bold)
    cmd('executeSetItalic', italic)

    const sizeVal = this.root!.querySelector<HTMLSelectElement>('#fw-size')!.value
    const pt = FONT_SIZE[sizeVal] ?? Number(sizeVal)
    if (pt) cmd('executeSetSize', pt)

    const color = this.root!.querySelector<HTMLInputElement>('#fw-color')!.value
    if (color) cmd('executeSetColor', color)

    const strikeout = this.root!.querySelector<HTMLInputElement>('#fw-strikeout')!.checked
    cmd('executeSetStrikeout', strikeout)

    const doubleStrikeout = this.root!.querySelector<HTMLInputElement>('#fw-double-strikeout')!.checked
    cmd('executeSetDoubleStrikeout', doubleStrikeout)

    const hidden = this.root!.querySelector<HTMLInputElement>('#fw-hidden')!.checked
    cmd('executeSetHidden', hidden)

    const underline = this.root!.querySelector<HTMLInputElement>('#fw-underline')!.checked
    cmd('executeSetUnderline', underline)

    const superscript = this.root!.querySelector<HTMLInputElement>('#fw-superscript')!.checked
    if (superscript) cmd('executeSetSuperscript')

    const subscript = this.root!.querySelector<HTMLInputElement>('#fw-subscript')!.checked
    if (subscript) cmd('executeSetSubscript')

    const scale = this.root!.querySelector<HTMLSelectElement>('#fw-scale')!.value
    cmd('executeSetCharacterScale', Number(scale))
  }
}
