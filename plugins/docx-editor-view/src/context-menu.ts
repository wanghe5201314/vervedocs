/**
 * VerveDocs View —— 表格右键菜单
 *
 * 纯 DOM 实现，无框架依赖。支持子菜单、图标、快捷键、分隔线。
 */

import './assets/css/context-menu.css'
import { viewTranslate, type ViewTranslate } from './view-i18n'

/** CSS 类名前缀，所有菜单相关样式均以此为前缀 */
const PREFIX = 'ce-table-context-menu'

/**
 * 菜单项内嵌数字输入框配置。
 * 用于在菜单项右侧展示一个带单位的数字输入控件（如行高、列宽）。
 */
export interface MenuItemInput {
  /** 输入框初始值 */
  defaultValue: number
  /** 单位文本（如 "px"、"%"） */
  unit: string
  /** 允许的最小值，默认 1 */
  min?: number
  /** 允许的最大值，默认 99 */
  max?: number
}

/**
 * 菜单项内嵌颜色选择器配置。
 * 用于在菜单项右侧展示一个原生 color input 及可选的"无"清除按钮。
 */
export interface MenuItemColorPicker {
  /** 初始颜色值（如 "#ffffff"），默认白色 */
  defaultColor?: string
  /** 是否展示"无"清除按钮，点击后以空字符串触发 onClick */
  allowClear?: boolean
}

/**
 * 右键菜单项描述。
 * 支持图标、快捷键、子菜单、内嵌输入框、内嵌颜色选择器、危险态、禁用态等。
 */
export interface MenuItem {
  /** 显示文本；值为 "---" 时渲染为分隔线 */
  label: string
  /** material-symbols-outlined 图标名，可选 */
  icon?: string
  /** 快捷键提示文本（仅展示，不绑定按键），可选 */
  shortcut?: string
  /** 是否为危险操作（红色高亮），可选 */
  danger?: boolean
  /** 是否禁用该项，可选 */
  disabled?: boolean
  /** 子菜单项数组，存在时显示右箭头并悬停展开 */
  submenu?: MenuItem[]
  /** 内嵌数字输入框配置，可选 */
  input?: MenuItemInput
  /** 内嵌颜色选择器配置，可选 */
  colorPicker?: MenuItemColorPicker
  /** 点击回调；参数为输入框/颜色选择器的当前值（无控件时为 undefined） */
  onClick?: (value?: number | string) => void
}

/** material-symbols-outlined 图标名映射表，供外部通过 getIcons() 引用 */
const SVG = {
  insertRowAbove: 'table_rows',
  insertRowBelow: 'table_rows',
  insertColLeft: 'view_column',
  insertColRight: 'view_column',
  deleteRow: 'delete',
  deleteCol: 'delete',
  splitCell: 'splitscreen',
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

/**
 * 表格右键菜单控制器。
 * 纯 DOM 实现，负责菜单/子菜单的构建、定位、显隐与外部点击关闭。
 */
export class ContextMenu {
  /** 主菜单根元素 */
  private menuEl: HTMLDivElement | null = null
  /** 子菜单根元素 */
  private submenuEl: HTMLDivElement | null = null
  /** 子菜单延迟隐藏定时器句柄 */
  private hideTimer: number | null = null

  constructor(private translate?: ViewTranslate) {}

  /**
   * 在指定坐标显示主菜单。
   * @param x - 菜单左上角横坐标（px）
   * @param y - 菜单左上角纵坐标（px）
   * @param items - 菜单项描述数组
   * @returns 无返回值
   */
  show(x: number, y: number, items: MenuItem[]): void {
    this.showContent(x, y, this.buildMenu(items, false))
  }

  /** Display custom menu content with the same positioning and dismissal lifecycle. */
  showContent(x: number, y: number, content: HTMLDivElement): void {
    this.hide()
    this.menuEl = content
    this.menuEl.style.left = `${x}px`
    this.menuEl.style.top = `${y}px`
    document.body.appendChild(this.menuEl)
    this.adjustPosition(this.menuEl, x, y)
    document.addEventListener('mousedown', this.onOutsideDown, { capture: true })
    document.addEventListener('scroll', this.onScroll, { capture: true })
  }

  /**
   * 关闭并销毁主菜单与子菜单，移除所有全局事件监听。
   * @returns 无返回值
   */
  hide(): void {
    if (this.menuEl) { this.menuEl.remove(); this.menuEl = null }
    if (this.submenuEl) { this.submenuEl.remove(); this.submenuEl = null }
    document.removeEventListener('mousedown', this.onOutsideDown, { capture: true })
    document.removeEventListener('scroll', this.onScroll, { capture: true })
  }

  /**
   * 根据菜单项描述构建菜单根 div。
   * @param items - 菜单项描述数组
   * @param isSub - 是否为子菜单（影响是否追加子菜单修饰类）
   * @returns 构建完成的菜单根 HTMLDivElement
   */
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

  /**
   * 构建单个菜单项元素，包含图标、文本、快捷键、子菜单箭头、输入框、颜色选择器等。
   * @param item - 菜单项描述
   * @returns 构建完成的菜单项 HTMLDivElement
   */
  private buildItem(item: MenuItem): HTMLDivElement {
    const el = document.createElement('div')
    el.className = `${PREFIX}__item${item.danger ? ' danger' : ''}${item.disabled ? ' disabled' : ''}${item.input ? ` ${PREFIX}__item--with-input` : ''}`

    const main = document.createElement('span')
    main.className = `${PREFIX}__main`

    if (item.icon) {
      const icon = document.createElement('span')
      icon.className = `material-symbols-outlined ${PREFIX}__icon`
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
      arrow.className = `material-symbols-outlined ${PREFIX}__arrow`
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
      input.setAttribute('aria-label', item.label)
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
      colorInput.setAttribute('aria-label', item.label)
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
        clear.textContent = viewTranslate(this.translate, 'view.common.none')
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

  /**
   * 在指定父菜单项右侧展开其子菜单，并绑定悬停保持/离开延迟隐藏。
   * @param parentEl - 触发展开的父菜单项元素
   * @param items - 子菜单项描述数组
   * @returns 无返回值
   */
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

  /**
   * 校正菜单位置，避免其超出视口右边界或下边界。
   * @param el - 待校正的菜单元素
   * @param x - 期望的横坐标（px）
   * @param y - 期望的纵坐标（px）
   * @returns 无返回值
   */
  private adjustPosition(el: HTMLDivElement, x: number, y: number): void {
    const rect = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    if (x + rect.width > vw || x < 4) {
      el.style.left = `${Math.max(4, Math.min(vw - rect.width - 4, x < 4 ? 4 : vw - rect.width - 4))}px`
    }
    if (y + rect.height > vh || y < 4) {
      el.style.top = `${Math.max(4, Math.min(vh - rect.height - 4, y < 4 ? 4 : vh - rect.height - 4))}px`
    }
  }

  /** 全局 mousedown 监听器：点击发生在菜单外部时关闭菜单 */
  private onOutsideDown = (e: MouseEvent): void => {
    const target = e.target as Node
    if (this.menuEl?.contains(target)) return
    if (this.submenuEl?.contains(target)) return
    this.hide()
  }

  /** 全局 scroll 监听器：页面滚动时关闭菜单，避免错位 */
  private onScroll = (): void => {
    this.hide()
  }

  /**
   * 获取内置 material-symbols-outlined 图标名映射表。
   * @returns 图标名映射对象
   */
  static getIcons() { return SVG }
}
