/**
 * ParagraphLayoutWidget —— 段落设置弹出面板（对齐 Word 标准）
 *
 * 结构在 paragraph-layout-widget.html，样式在 paragraph-layout-widget.css，
 * 本模块负责注入资源、填充当前值、绑定事件、应用命令。
 * CSS 由 cssInjectedByJsPlugin 自动注入，HTML 通过 ?raw 导入字符串。
 */
import '../../assets/css/paragraph-layout-widget.css'
import panelHtml from '../../assets/components/paragraph-layout-widget.html?raw'

/** 每厘米对应的像素数（96 DPI） */
const PX_PER_CM = 96 / 2.54

/** 命令调用签名：可返回值（用于 getter） */
type CommandFn = (cmd: string, ...args: any[]) => any

/** 段落设置弹出面板依赖 */
export interface ParagraphLayoutWidgetDeps {
  /** 触发编辑器命令 / 读取状态 */
  onCommand: CommandFn
}

/**
 * 段落设置弹出面板。
 *
 * show() 显示面板并填充当前段落值，hide() 关闭。
 * 确定按钮应用缩进、行距、对齐、大纲级别等命令。
 */
export class ParagraphLayoutWidget {
  /** 面板根元素（.pw-panel-mask） */
  private root: HTMLElement | null = null
  /** 命令回调 */
  private onCommand: CommandFn | null = null

  /** 注入依赖 */
  setDeps(deps: ParagraphLayoutWidgetDeps): void {
    this.onCommand = deps.onCommand
  }

  /**
   * 显示段落设置面板。
   */
  show(): void {
    this.hide()

    const container = document.createElement('div')
    container.innerHTML = panelHtml
    this.root = container.firstElementChild as HTMLElement
    document.body.appendChild(this.root)

    this.bindTabs()
    this.bindIndentSpacing()
    this.fillValues()
    this.root.querySelector('#pw-cancel')!.addEventListener('click', () => this.hide())
    this.root.querySelector('#pw-ok')!.addEventListener('click', () => {
      this.apply()
      this.hide()
    })
  }

  /**
   * 关闭面板。
   */
  hide(): void {
    if (this.root) { this.root.remove(); this.root = null }
  }

  /** 绑定 Tab 切换 */
  private bindTabs(): void {
    const tabs = this.root!.querySelectorAll<HTMLElement>('.pw-tab')
    const panes = this.root!.querySelectorAll<HTMLElement>('.pw-pane')
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const key = tab.dataset.tab
        tabs.forEach(t => t.classList.toggle('pw-tab-active', t === tab))
        panes.forEach(p => p.classList.toggle('pw-pane-active', p.dataset.pane === key))
      })
    })
  }

  /** 绑定缩进和间距 Tab 的联动交互 */
  private bindIndentSpacing(): void {
    const lhType = this.root!.querySelector<HTMLSelectElement>('#pw-lh-type')!
    const lhValue = this.root!.querySelector<HTMLInputElement>('#pw-lh-value')!
    const lhUnit = this.root!.querySelector<HTMLElement>('#pw-lh-unit')!
    const special = this.root!.querySelector<HTMLSelectElement>('#pw-special')!
    const specialValue = this.root!.querySelector<HTMLInputElement>('#pw-special-value')!

    const updateLh = () => {
      const t = lhType.value
      const fixed = t === 'single' || t === '1.5' || t === 'double'
      lhValue.disabled = fixed
      if (t === 'single') { lhValue.value = '1' }
      else if (t === '1.5') { lhValue.value = '1.5' }
      else if (t === 'double') { lhValue.value = '2' }
      lhUnit.textContent = (t === 'atLeast' || t === 'exact') ? '磅' : '倍'
      this.updatePreview()
    }

    const updateSpecial = () => {
      const s = special.value
      specialValue.disabled = s === 'none'
      if (s === 'none') { specialValue.value = '0' }
      this.updatePreview()
    }

    lhType.addEventListener('change', updateLh)
    special.addEventListener('change', updateSpecial)
    lhValue.addEventListener('input', () => this.updatePreview())
    specialValue.addEventListener('input', () => this.updatePreview())

    const align = this.root!.querySelector<HTMLSelectElement>('#pw-align')!
    align.addEventListener('change', () => this.updatePreview())
  }

  /** 从编辑器读取当前段落状态并填充表单 */
  private fillValues(): void {
    if (!this.onCommand) return
    const cmd = this.onCommand

    let style: any = null
    try { style = cmd('getRangeStyle') } catch { /* noop */ }
    if (!style) return

    const align = this.root!.querySelector<HTMLSelectElement>('#pw-align')!
    const rowFlex = style.rowFlex === 'alignment' ? 'justify' : (style.rowFlex || 'left')
    align.value = rowFlex

    const outline = this.root!.querySelector<HTMLSelectElement>('#pw-outline')!
    outline.value = style.level || ''

    const lhType = this.root!.querySelector<HTMLSelectElement>('#pw-lh-type')!
    const lhValue = this.root!.querySelector<HTMLInputElement>('#pw-lh-value')!
    const lh = Number(style.lineHeight ?? 1.5)
    const rule: string = style.lineHeightRule || 'auto'
    if (rule === 'exact') { lhType.value = 'exact'; lhValue.value = String(Math.round(lh * 72 / 96 * 100) / 100) }
    else if (rule === 'atLeast') { lhType.value = 'atLeast'; lhValue.value = String(Math.round(lh * 72 / 96 * 100) / 100) }
    else if (lh === 1) { lhType.value = 'single' }
    else if (lh === 1.5) { lhType.value = '1.5' }
    else if (lh === 2) { lhType.value = 'double' }
    else { lhType.value = 'multiple'; lhValue.value = String(lh) }
    this.syncLhDisabled()

    const spacingAfter = this.root!.querySelector<HTMLInputElement>('#pw-spacing-after')!
    let spAfter = 0
    try { spAfter = Number(cmd('getParagraphSpacingAfter')) || 0 } catch { spAfter = Number(style.rowMargin ?? 0) }
    spacingAfter.value = String(spAfter)

    const spacingBefore = this.root!.querySelector<HTMLInputElement>('#pw-spacing-before')!
    try { spacingBefore.value = String(Number(cmd('getParagraphSpacingBefore')) || 0) } catch { /* noop */ }

    const indentLeft = this.root!.querySelector<HTMLInputElement>('#pw-indent-left')!
    const indentRight = this.root!.querySelector<HTMLInputElement>('#pw-indent-right')!
    try { indentLeft.value = String((Number(cmd('getParagraphIndentLeft')) || 0) / PX_PER_CM) } catch { /* noop */ }
    try { indentRight.value = String((Number(cmd('getParagraphIndentRight')) || 0) / PX_PER_CM) } catch { /* noop */ }

    let indentPx = 0
    try { indentPx = Number(cmd('getFirstLineIndent')) || 0 } catch { /* noop */ }
    const special = this.root!.querySelector<HTMLSelectElement>('#pw-special')!
    const specialValue = this.root!.querySelector<HTMLInputElement>('#pw-special-value')!
    if (indentPx === 0) {
      special.value = 'none'; specialValue.value = '0'
    } else if (indentPx > 0) {
      special.value = 'firstLine'; specialValue.value = (Math.round((indentPx / PX_PER_CM) * 100) / 100).toFixed(2)
    } else {
      special.value = 'hanging'; specialValue.value = (Math.round((Math.abs(indentPx) / PX_PER_CM) * 100) / 100).toFixed(2)
    }
    this.syncSpecialDisabled()

    this.updatePreview()
  }

  /** 同步行距设置值禁用态 */
  private syncLhDisabled(): void {
    const lhType = this.root!.querySelector<HTMLSelectElement>('#pw-lh-type')!
    const lhValue = this.root!.querySelector<HTMLInputElement>('#pw-lh-value')!
    const lhUnit = this.root!.querySelector<HTMLElement>('#pw-lh-unit')!
    const t = lhType.value
    const fixed = t === 'single' || t === '1.5' || t === 'double'
    lhValue.disabled = fixed
    lhUnit.textContent = (t === 'atLeast' || t === 'exact') ? '磅' : '倍'
  }

  /** 同步特殊格式度量值禁用态 */
  private syncSpecialDisabled(): void {
    const special = this.root!.querySelector<HTMLSelectElement>('#pw-special')!
    const specialValue = this.root!.querySelector<HTMLInputElement>('#pw-special-value')!
    specialValue.disabled = special.value === 'none'
  }

  /** 实时更新预览区 */
  private updatePreview(): void {
    const preview = this.root!.querySelector<HTMLElement>('#pw-preview')!
    if (!preview) return

    const align = this.root!.querySelector<HTMLSelectElement>('#pw-align')!.value
    const lhType = this.root!.querySelector<HTMLSelectElement>('#pw-lh-type')!.value
    const lhValue = this.root!.querySelector<HTMLInputElement>('#pw-lh-value')!.value
    const special = this.root!.querySelector<HTMLSelectElement>('#pw-special')!.value
    const specialValue = this.root!.querySelector<HTMLInputElement>('#pw-special-value')!.value

    const alignMap: Record<string, string> = {
      left: 'left', center: 'center', right: 'right',
      justify: 'justify', distribute: 'justify'
    }
    preview.style.textAlign = alignMap[align] || 'left'

    let lh = 1.5
    if (lhType === 'single') lh = 1
    else if (lhType === '1.5') lh = 1.5
    else if (lhType === 'double') lh = 2
    else lh = Number(lhValue) || 1.5
    if (lhType === 'atLeast' || lhType === 'exact') {
      preview.style.lineHeight = `${lh * 96 / 72}px`
    } else {
      preview.style.lineHeight = String(lh)
    }

    let indent = 0
    if (special === 'firstLine') indent = Number(specialValue) || 0
    else if (special === 'hanging') indent = -(Number(specialValue) || 0)
    preview.style.textIndent = `${indent * PX_PER_CM}px`

    preview.textContent = '段落预览文本'
  }

  /** 确定按钮：应用所有设置到编辑器 */
  private apply(): void {
    if (!this.onCommand) return
    const cmd = this.onCommand

    const align = this.root!.querySelector<HTMLSelectElement>('#pw-align')!.value
    cmd('executeSetRowFlex', align)

    const outline = this.root!.querySelector<HTMLSelectElement>('#pw-outline')!.value
    cmd('executeSetTitle', outline || null)

    const lhType = this.root!.querySelector<HTMLSelectElement>('#pw-lh-type')!.value
    const lhValue = this.root!.querySelector<HTMLInputElement>('#pw-lh-value')!.value
    let lh = 1.5
    let rule: 'auto' | 'exact' | 'atLeast' = 'auto'
    if (lhType === 'single') { lh = 1; rule = 'auto' }
    else if (lhType === '1.5') { lh = 1.5; rule = 'auto' }
    else if (lhType === 'double') { lh = 2; rule = 'auto' }
    else if (lhType === 'atLeast') { lh = (Number(lhValue) || 1) * 96 / 72; rule = 'atLeast' }
    else if (lhType === 'exact') { lh = (Number(lhValue) || 1) * 96 / 72; rule = 'exact' }
    else { lh = Number(lhValue) || 1; rule = 'auto' }
    cmd('executeSetLineHeight', lh, rule)

    const spacingBefore = this.root!.querySelector<HTMLInputElement>('#pw-spacing-before')!.value
    cmd('executeSetParagraphSpacingBefore', Number(spacingBefore) || 0)

    const spacingAfter = this.root!.querySelector<HTMLInputElement>('#pw-spacing-after')!.value
    cmd('executeSetParagraphSpacingAfter', Number(spacingAfter) || 0)

    const indentLeft = this.root!.querySelector<HTMLInputElement>('#pw-indent-left')!.value
    const indentRight = this.root!.querySelector<HTMLInputElement>('#pw-indent-right')!.value
    cmd('executeSetParagraphIndentLeft', (Number(indentLeft) || 0) * PX_PER_CM)
    cmd('executeSetParagraphIndentRight', (Number(indentRight) || 0) * PX_PER_CM)

    const special = this.root!.querySelector<HTMLSelectElement>('#pw-special')!.value
    const specialValue = this.root!.querySelector<HTMLInputElement>('#pw-special-value')!.value
    let indentPx = 0
    if (special === 'firstLine') indentPx = (Number(specialValue) || 0) * PX_PER_CM
    else if (special === 'hanging') indentPx = -(Number(specialValue) || 0) * PX_PER_CM
    cmd('executeSetFirstLineIndent', indentPx)
  }
}
