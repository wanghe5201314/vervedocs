/**
 * VerveDocs View —— 表格右键菜单
 *
 * 纯 DOM 实现，无框架依赖。支持子菜单、图标、快捷键、分隔线。
 */

const PREFIX = 'ce-table-context-menu'

let styleInjected = false
function injectStyle(): void {
  if (styleInjected) return
  styleInjected = true
  const css = `
.${PREFIX}{position:fixed;background:#fff;border:1px solid #e7e7e7;border-radius:0;box-shadow:0 10px 28px rgba(15,23,42,.12);padding:6px 0;min-width:176px;z-index:9999;font-family:"Microsoft YaHei","PingFang SC",sans-serif;font-size:13px;color:#303133;user-select:none;overflow:hidden}
.${PREFIX}__item{min-height:33px;padding:0 12px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:16px;line-height:1;white-space:nowrap;transition:background-color .15s ease}
.${PREFIX}__item:hover{background-color:#f5f7fa}
.${PREFIX}__item.disabled{opacity:.45;cursor:not-allowed;pointer-events:none}
.${PREFIX}__item.disabled:hover{background-color:transparent}
.${PREFIX}__item.danger .${PREFIX}__label,.${PREFIX}__item.danger .${PREFIX}__icon{color:#d14343}
.${PREFIX}__main,.${PREFIX}__meta{display:inline-flex;align-items:center}
.${PREFIX}__main{gap:10px;min-width:0;flex:1 1 auto}
.${PREFIX}__meta{gap:8px;flex:0 0 auto}
.${PREFIX}__icon{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;flex-shrink:0;font-size:16px;color:#646a73}
.${PREFIX}__item:hover .${PREFIX}__icon{color:#303133}
.${PREFIX}__label{font-size:12px;color:#303133;font-weight:400}
.${PREFIX}__shortcut{color:#909399;font-size:11px}
.${PREFIX}__arrow{color:#909399;font-size:14px;display:inline-flex;align-items:center}
.${PREFIX}__divider{height:1px;background-color:#ebeef5;margin:6px 0}
.${PREFIX}--sub{min-width:190px}
.${PREFIX}__input-wrap{display:inline-flex;align-items:center;gap:4px;flex:0 0 auto}
.${PREFIX}__input{width:42px;height:22px;border:1px solid #dcdfe6;border-radius:2px;text-align:center;font-size:12px;color:#303133;background:#fff;outline:none;cursor:default}
.${PREFIX}__input:focus{border-color:#409eff}
.${PREFIX}__input-unit{font-size:11px;color:#909399;white-space:nowrap}
.${PREFIX}__item--with-input{padding-right:8px}
.${PREFIX}__color-wrap{display:inline-flex;align-items:center;gap:6px;flex:0 0 auto}
.${PREFIX}__color-input{width:28px;height:22px;border:1px solid #dcdfe6;border-radius:2px;cursor:pointer;padding:0;background:#fff;overflow:hidden}
.${PREFIX}__color-input::-webkit-color-swatch-wrapper{padding:1px}
.${PREFIX}__color-input::-webkit-color-swatch{border:none;border-radius:1px}
.${PREFIX}__color-clear{font-size:11px;color:#909399;cursor:pointer;padding:2px 4px;border-radius:2px;white-space:nowrap}
.${PREFIX}__color-clear:hover{background:#f5f7fa;color:#303133}
`
  const el = document.createElement('style')
  el.textContent = css
  document.head.appendChild(el)
}

export interface MenuItemInput {
  defaultValue: number
  unit: string
  min?: number
  max?: number
}

export interface MenuItemColorPicker {
  defaultColor?: string
  allowClear?: boolean
}

export interface MenuItem {
  label: string
  icon?: string
  shortcut?: string
  danger?: boolean
  disabled?: boolean
  submenu?: MenuItem[]
  input?: MenuItemInput
  colorPicker?: MenuItemColorPicker
  onClick?: (value?: number | string) => void
}

const SVG = {
  insertRowAbove: 'table_rows',
  insertRowBelow: 'table_rows',
  insertColLeft: 'view_column',
  insertColRight: 'view_column',
  deleteRow: 'delete',
  deleteCol: 'delete',
  splitCell: 'split',
  selectAll: 'select_all',
  alignLeft: 'format_align_left',
  alignCenter: 'format_align_center',
  alignRight: 'format_align_right',
  link: 'link',
  tableProp: 'settings',
  mergeCell: 'merge',
  valignTop: 'vertical_align_top',
  valignMiddle: 'vertical_align_center',
  valignBottom: 'vertical_align_bottom',
  cellBackground: 'format_color_fill',
  repeatHeader: 'repeat',
  deleteTable: 'delete',
  arrow: 'chevron_right'
}

export class ContextMenu {
  private menuEl: HTMLDivElement | null = null
  private submenuEl: HTMLDivElement | null = null
  private hideTimer: number | null = null

  show(x: number, y: number, items: MenuItem[]): void {
    injectStyle()
    this.hide()
    this.menuEl = this.buildMenu(items, false)
    this.menuEl.style.left = `${x}px`
    this.menuEl.style.top = `${y}px`
    document.body.appendChild(this.menuEl)
    this.adjustPosition(this.menuEl, x, y)
    document.addEventListener('mousedown', this.onOutsideDown, { capture: true })
    document.addEventListener('scroll', this.onScroll, { capture: true })
  }

  hide(): void {
    if (this.menuEl) { this.menuEl.remove(); this.menuEl = null }
    if (this.submenuEl) { this.submenuEl.remove(); this.submenuEl = null }
    document.removeEventListener('mousedown', this.onOutsideDown, { capture: true })
    document.removeEventListener('scroll', this.onScroll, { capture: true })
  }

  private buildMenu(items: MenuItem[], isSub: boolean): HTMLDivElement {
    const el = document.createElement('div')
    el.className = PREFIX + (isSub ? ` ${PREFIX}--sub` : '')
    for (const item of items) {
      if (item.label === '---') {
        const div = document.createElement('div')
        div.className = `${PREFIX}__divider`
        el.appendChild(div)
        continue
      }
      el.appendChild(this.buildItem(item))
    }
    return el
  }

  private buildItem(item: MenuItem): HTMLDivElement {
    const el = document.createElement('div')
    el.className = `${PREFIX}__item${item.danger ? ' danger' : ''}${item.disabled ? ' disabled' : ''}${item.input ? ` ${PREFIX}__item--with-input` : ''}`

    const main = document.createElement('span')
    main.className = `${PREFIX}__main`

    if (item.icon) {
      const icon = document.createElement('span')
      icon.className = `material-icons ${PREFIX}__icon`
      icon.textContent = item.icon
      main.appendChild(icon)
    }

    const label = document.createElement('span')
    label.className = `${PREFIX}__label`
    label.textContent = item.label
    main.appendChild(label)
    el.appendChild(main)

    const meta = document.createElement('span')
    meta.className = `${PREFIX}__meta`

    if (item.shortcut) {
      const sc = document.createElement('span')
      sc.className = `${PREFIX}__shortcut`
      sc.textContent = item.shortcut
      meta.appendChild(sc)
    }

    if (item.submenu) {
      const arrow = document.createElement('span')
      arrow.className = `material-icons ${PREFIX}__arrow`
      arrow.textContent = SVG.arrow
      meta.appendChild(arrow)
    }

    el.appendChild(meta)

    let inputValue: number | undefined

    if (item.input) {
      const wrap = document.createElement('span')
      wrap.className = `${PREFIX}__input-wrap`

      const input = document.createElement('input')
      input.type = 'number'
      input.className = `${PREFIX}__input`
      input.value = String(item.input.defaultValue)
      const min = item.input.min ?? 1
      const max = item.input.max ?? 99
      input.min = String(min)
      input.max = String(max)
      inputValue = item.input.defaultValue

      input.addEventListener('mousedown', (e) => {
        e.stopPropagation()
      })
      input.addEventListener('click', (e) => {
        e.stopPropagation()
      })
      input.addEventListener('input', () => {
        const v = parseInt(input.value, 10)
        inputValue = isNaN(v) ? item.input!.defaultValue : Math.max(min, Math.min(max, v))
      })
      input.addEventListener('keydown', (e) => {
        e.stopPropagation()
        if (e.key === 'Enter') {
          if (!item.disabled && item.onClick) {
            item.onClick(inputValue)
            this.hide()
          }
        }
      })

      wrap.appendChild(input)

      const unit = document.createElement('span')
      unit.className = `${PREFIX}__input-unit`
      unit.textContent = item.input.unit
      wrap.appendChild(unit)

      meta.appendChild(wrap)
    }

    let colorValue: string | undefined

    if (item.colorPicker) {
      const wrap = document.createElement('span')
      wrap.className = `${PREFIX}__color-wrap`

      const colorInput = document.createElement('input')
      colorInput.type = 'color'
      colorInput.className = `${PREFIX}__color-input`
      colorInput.value = item.colorPicker.defaultColor ?? '#ffffff'
      colorValue = colorInput.value

      colorInput.addEventListener('mousedown', (e) => { e.stopPropagation() })
      colorInput.addEventListener('click', (e) => { e.stopPropagation() })
      colorInput.addEventListener('input', () => { colorValue = colorInput.value })
      colorInput.addEventListener('change', () => {
        if (!item.disabled && item.onClick) {
          item.onClick(colorValue)
          this.hide()
        }
      })
      wrap.appendChild(colorInput)

      if (item.colorPicker.allowClear) {
        const clear = document.createElement('span')
        clear.className = `${PREFIX}__color-clear`
        clear.textContent = '无'
        clear.addEventListener('mousedown', (e) => { e.stopPropagation() })
        clear.addEventListener('click', (e) => {
          e.stopPropagation()
          if (!item.disabled && item.onClick) {
            item.onClick('')
            this.hide()
          }
        })
        wrap.appendChild(clear)
      }

      meta.appendChild(wrap)
    }

    if (!item.disabled && item.onClick && !item.colorPicker) {
      el.addEventListener('click', () => {
        item.onClick!(inputValue ?? colorValue)
        this.hide()
      })
    }

    if (!item.disabled && item.submenu) {
      el.addEventListener('mouseenter', () => {
        if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null }
        this.showSubmenu(el, item.submenu!)
      })
      el.addEventListener('mouseleave', () => {
        this.hideTimer = window.setTimeout(() => {
          if (this.submenuEl) { this.submenuEl.remove(); this.submenuEl = null }
        }, 200)
      })
    }

    return el
  }

  private showSubmenu(parentEl: HTMLDivElement, items: MenuItem[]): void {
    if (this.submenuEl) { this.submenuEl.remove(); this.submenuEl = null }
    this.submenuEl = this.buildMenu(items, true)
    this.submenuEl.addEventListener('mouseenter', () => {
      if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null }
    })
    this.submenuEl.addEventListener('mouseleave', () => {
      this.hideTimer = window.setTimeout(() => {
        if (this.submenuEl) { this.submenuEl.remove(); this.submenuEl = null }
      }, 200)
    })
    const rect = parentEl.getBoundingClientRect()
    const x = rect.right
    const y = rect.top
    this.submenuEl.style.left = `${x}px`
    this.submenuEl.style.top = `${y}px`
    document.body.appendChild(this.submenuEl)
    this.adjustPosition(this.submenuEl, x, y)
  }

  private adjustPosition(el: HTMLDivElement, x: number, y: number): void {
    const rect = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    if (x + rect.width > vw) {
      el.style.left = `${Math.max(4, vw - rect.width - 4)}px`
    }
    if (y + rect.height > vh) {
      el.style.top = `${Math.max(4, vh - rect.height - 4)}px`
    }
  }

  private onOutsideDown = (e: MouseEvent): void => {
    const target = e.target as Node
    if (this.menuEl?.contains(target)) return
    if (this.submenuEl?.contains(target)) return
    this.hide()
  }

  private onScroll = (): void => {
    this.hide()
  }

  static getIcons() { return SVG }
}