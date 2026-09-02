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
.${PREFIX}__item.danger .${PREFIX}__label,.${PREFIX}__item.danger .${PREFIX}__icon svg{color:#d14343}
.${PREFIX}__main,.${PREFIX}__meta{display:inline-flex;align-items:center}
.${PREFIX}__main{gap:10px;min-width:0;flex:1 1 auto}
.${PREFIX}__meta{gap:8px;flex:0 0 auto}
.${PREFIX}__icon{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;flex-shrink:0}
.${PREFIX}__icon svg{width:16px;height:16px;color:#646a73}
.${PREFIX}__item:hover .${PREFIX}__icon svg{color:#303133}
.${PREFIX}__label{font-size:12px;color:#303133;font-weight:400}
.${PREFIX}__shortcut{color:#909399;font-size:11px}
.${PREFIX}__arrow{color:#909399;font-size:12px;display:inline-flex;align-items:center}
.${PREFIX}__arrow svg{width:14px;height:14px}
.${PREFIX}__divider{height:1px;background-color:#ebeef5;margin:6px 0}
.${PREFIX}--sub{min-width:190px}
`
  const el = document.createElement('style')
  el.textContent = css
  document.head.appendChild(el)
}

export interface MenuItem {
  label: string
  icon?: string
  shortcut?: string
  danger?: boolean
  disabled?: boolean
  submenu?: MenuItem[]
  onClick?: () => void
}

const SVG = {
  insertRowAbove: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="2" y="6" width="12" height="8" rx="1"/><line x1="2" y1="10" x2="14" y2="10"/><path d="M8 1v4M6 3l2-2 2 2" stroke-linecap="round"/></svg>',
  insertRowBelow: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="2" y="2" width="12" height="8" rx="1"/><line x1="2" y1="6" x2="14" y2="6"/><path d="M8 11v4M6 13l2 2 2-2" stroke-linecap="round"/></svg>',
  insertColLeft: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="6" y="2" width="8" height="12" rx="1"/><line x1="10" y1="2" x2="10" y2="14"/><path d="M1 8h4M3 6l-2 2 2 2" stroke-linecap="round"/></svg>',
  insertColRight: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="2" y="2" width="8" height="12" rx="1"/><line x1="6" y1="2" x2="6" y2="14"/><path d="M11 8h4M13 6l2 2-2 2" stroke-linecap="round"/></svg>',
  deleteRow: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="2" y="5" width="12" height="6" rx="1"/><line x1="4" y1="8" x2="12" y2="8" stroke-dasharray="2 1.5"/></svg>',
  deleteCol: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="5" y="2" width="6" height="12" rx="1"/><line x1="8" y1="4" x2="8" y2="12" stroke-dasharray="2 1.5"/></svg>',
  splitCell: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="2" y="2" width="12" height="12" rx="1"/><line x1="8" y1="2" x2="8" y2="14" stroke-dasharray="2 1.5"/></svg>',
  selectAll: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="2" y="2" width="12" height="12" rx="1"/><line x1="2" y1="6" x2="14" y2="6"/><line x1="2" y1="10" x2="14" y2="10"/><line x1="6" y1="2" x2="6" y2="14"/><line x1="10" y1="2" x2="10" y2="14"/></svg>',
  alignLeft: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><line x1="2" y1="4" x2="14" y2="4"/><line x1="2" y1="8" x2="10" y2="8"/><line x1="2" y1="12" x2="12" y2="12"/></svg>',
  alignCenter: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><line x1="2" y1="4" x2="14" y2="4"/><line x1="4" y1="8" x2="12" y2="8"/><line x1="3" y1="12" x2="13" y2="12"/></svg>',
  alignRight: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><line x1="2" y1="4" x2="14" y2="4"/><line x1="6" y1="8" x2="14" y2="8"/><line x1="4" y1="12" x2="14" y2="12"/></svg>',
  link: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M6 10l4-4M4 8a2 2 0 012-2h2M12 8a2 2 0 01-2 2H8" stroke-linecap="round"/></svg>',
  tableProp: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="2" y="2" width="12" height="12" rx="1"/><line x1="2" y1="6" x2="14" y2="6"/><line x1="2" y1="10" x2="14" y2="10"/><line x1="6" y1="2" x2="6" y2="14"/><line x1="10" y1="2" x2="10" y2="14"/></svg>',
  arrow: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M6 4l4 4-4 4z"/></svg>'
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
    el.className = `${PREFIX}__item${item.danger ? ' danger' : ''}${item.disabled ? ' disabled' : ''}`

    const main = document.createElement('span')
    main.className = `${PREFIX}__main`

    if (item.icon) {
      const icon = document.createElement('span')
      icon.className = `${PREFIX}__icon`
      icon.innerHTML = item.icon
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
      arrow.className = `${PREFIX}__arrow`
      arrow.innerHTML = SVG.arrow
      meta.appendChild(arrow)
    }

    el.appendChild(meta)

    if (!item.disabled && item.onClick) {
      el.addEventListener('click', () => {
        item.onClick!()
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