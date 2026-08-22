/**
 * AI 悬浮工具栏
 */

import {
  AIAction,
  TranslateLanguage,
  I18nConfig,
  CustomAction,
  DEFAULT_I18N_ZH
} from '../types'

/** 工具栏位置 */
interface Position {
  x: number
  y: number
}

/** 工具栏配置 */
export interface FloatingToolbarConfig {
  enabledActions: AIAction[]
  translateLanguages: TranslateLanguage[]
  customActions: CustomAction[]
  i18n: I18nConfig
}

/** 工具栏事件回调 */
export interface FloatingToolbarCallbacks {
  onAction: (action: AIAction, options?: {
    targetLanguage?: TranslateLanguage
    customPrompt?: string
    customActionId?: string
  }) => void
  onCustomInput: () => void
}

/** AI 图标 SVG */
const AI_ICON = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
</svg>`

/** 操作图标映射 */
const ACTION_ICONS: Record<AIAction, string> = {
  [AIAction.POLISH]: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`,
  [AIAction.TRANSLATE]: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 8 6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6"/></svg>`,
  [AIAction.SUMMARIZE]: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/></svg>`,
  [AIAction.CONTINUE]: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>`,
  [AIAction.EXPAND]: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" x2="14" y1="3" y2="10"/><line x1="3" x2="10" y1="21" y2="14"/></svg>`,
  [AIAction.FIX_GRAMMAR]: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/></svg>`,
  [AIAction.FORMAL]: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6"/><path d="M9 16h6"/></svg>`,
  [AIAction.CASUAL]: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>`,
  [AIAction.CUSTOM]: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`
}

/**
 * 悬浮工具栏类
 */
export class FloatingToolbar {
  private container: HTMLElement
  private toolbarEl: HTMLDivElement | null = null
  private subMenuEl: HTMLDivElement | null = null
  private config: FloatingToolbarConfig
  private callbacks: FloatingToolbarCallbacks
  private isVisible = false
  private hideTimeout: ReturnType<typeof setTimeout> | null = null

  constructor(
    container: HTMLElement,
    config: Partial<FloatingToolbarConfig>,
    callbacks: FloatingToolbarCallbacks
  ) {
    this.container = container
    this.config = {
      enabledActions: config.enabledActions || Object.values(AIAction),
      translateLanguages: config.translateLanguages || Object.values(TranslateLanguage),
      customActions: config.customActions || [],
      i18n: { ...DEFAULT_I18N_ZH, ...config.i18n }
    }
    this.callbacks = callbacks
  }

  /**
   * 显示工具栏
   */
  showToolbar(position: Position): void {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout)
      this.hideTimeout = null
    }

    if (!this.toolbarEl) {
      this.createToolbarElement()
    }

    this.updatePosition(position)
    this.toolbarEl!.classList.add('docx-ai-toolbar-visible')
    this.isVisible = true
  }

  /**
   * 隐藏工具栏
   */
  hideToolbar(): void {
    if (this.toolbarEl) {
      this.toolbarEl.classList.remove('docx-ai-toolbar-visible')
    }
    this.hideSubMenu()
    this.isVisible = false
  }

  /**
   * 延迟隐藏
   */
  delayHide(delay = 150): void {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout)
    }
    this.hideTimeout = setTimeout(() => {
      this.hideToolbar()
    }, delay)
  }

  /**
   * 取消延迟隐藏
   */
  cancelDelayHide(): void {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout)
      this.hideTimeout = null
    }
  }

  /**
   * 是否可见
   */
  getIsVisible(): boolean {
    return this.isVisible
  }

  /**
   * 销毁工具栏
   */
  destroy(): void {
    this.hideToolbar()
    if (this.toolbarEl) {
      this.toolbarEl.remove()
      this.toolbarEl = null
    }
    if (this.subMenuEl) {
      this.subMenuEl.remove()
      this.subMenuEl = null
    }
  }

  /**
   * 创建工具栏 DOM
   */
  private createToolbarElement(): void {
    this.toolbarEl = document.createElement('div')
    this.toolbarEl.className = 'docx-ai-toolbar'
    this.toolbarEl.innerHTML = this.renderContent()

    // 绑定事件
    this.bindEvents()

    // 添加到容器
    this.container.appendChild(this.toolbarEl)
  }

  /**
   * 渲染工具栏内容
   */
  private renderContent(): string {
    const { enabledActions, customActions, i18n } = this.config

    const items: string[] = []

    // AI 图标
    items.push(`<div class="docx-ai-toolbar-icon">${AI_ICON}</div>`)

    // 内置操作
    const actionLabels: Record<AIAction, string> = {
      [AIAction.POLISH]: i18n.polish,
      [AIAction.TRANSLATE]: i18n.translate,
      [AIAction.SUMMARIZE]: i18n.summarize,
      [AIAction.CONTINUE]: i18n.continue,
      [AIAction.EXPAND]: i18n.expand,
      [AIAction.FIX_GRAMMAR]: i18n.fixGrammar,
      [AIAction.FORMAL]: i18n.formal,
      [AIAction.CASUAL]: i18n.casual,
      [AIAction.CUSTOM]: i18n.custom
    }

    for (const action of enabledActions) {
      const label = actionLabels[action]
      const icon = ACTION_ICONS[action]
      const hasSubMenu = action === AIAction.TRANSLATE

      items.push(`
        <div class="docx-ai-toolbar-item${hasSubMenu ? ' has-submenu' : ''}" 
             data-action="${action}" 
             title="${label}">
          <span class="docx-ai-toolbar-item-icon">${icon}</span>
          <span class="docx-ai-toolbar-item-label">${label}</span>
          ${hasSubMenu ? '<span class="docx-ai-toolbar-arrow">▸</span>' : ''}
        </div>
      `)
    }

    // 自定义操作
    for (const custom of customActions) {
      items.push(`
        <div class="docx-ai-toolbar-item" 
             data-action="custom" 
             data-custom-id="${custom.id}"
             title="${custom.name}">
          ${custom.icon ? `<span class="docx-ai-toolbar-item-icon">${custom.icon}</span>` : ''}
          <span class="docx-ai-toolbar-item-label">${custom.name}</span>
        </div>
      `)
    }

    return items.join('')
  }

  /**
   * 绑定事件
   */
  private bindEvents(): void {
    if (!this.toolbarEl) return

    // 鼠标进入工具栏时取消延迟隐藏
    this.toolbarEl.addEventListener('mouseenter', () => {
      this.cancelDelayHide()
    })

    // 鼠标离开工具栏时延迟隐藏
    this.toolbarEl.addEventListener('mouseleave', () => {
      this.delayHide()
    })

    // 点击工具栏项
    this.toolbarEl.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      const item = target.closest('.docx-ai-toolbar-item') as HTMLElement
      if (!item) return

      const action = item.dataset.action as AIAction
      const customId = item.dataset.customId

      // 翻译有子菜单
      if (action === AIAction.TRANSLATE) {
        return
      }

      // 自定义操作
      if (action === AIAction.CUSTOM) {
        if (customId) {
          this.callbacks.onAction(AIAction.CUSTOM, { customActionId: customId })
        } else {
          this.callbacks.onCustomInput()
        }
        this.hideToolbar()
        return
      }

      // 其他操作
      this.callbacks.onAction(action)
      this.hideToolbar()
    })

    // 鼠标悬停显示子菜单
    this.toolbarEl.addEventListener('mouseover', (e) => {
      const target = e.target as HTMLElement
      const item = target.closest('.docx-ai-toolbar-item.has-submenu') as HTMLElement
      if (item && item.dataset.action === AIAction.TRANSLATE) {
        this.showTranslateSubMenu(item)
      }
    })
  }

  /**
   * 显示翻译子菜单
   */
  private showTranslateSubMenu(anchor: HTMLElement): void {
    this.hideSubMenu()

    const { translateLanguages, i18n } = this.config

    this.subMenuEl = document.createElement('div')
    this.subMenuEl.className = 'docx-ai-submenu'

    const items = translateLanguages.map(lang => {
      const langName = i18n.languages[lang as keyof typeof i18n.languages]
      return `
        <div class="docx-ai-submenu-item" data-lang="${lang}">
          ${langName}
        </div>
      `
    }).join('')

    this.subMenuEl.innerHTML = `
      <div class="docx-ai-submenu-title">${i18n.translateTo}</div>
      ${items}
    `

    // 定位子菜单
    const rect = anchor.getBoundingClientRect()
    const toolbarRect = this.toolbarEl!.getBoundingClientRect()
    
    this.subMenuEl.style.left = `${rect.right - toolbarRect.left + 4}px`
    this.subMenuEl.style.top = `${rect.top - toolbarRect.top}px`

    // 绑定子菜单事件
    this.subMenuEl.addEventListener('mouseenter', () => {
      this.cancelDelayHide()
    })

    this.subMenuEl.addEventListener('mouseleave', () => {
      this.delayHide()
    })

    this.subMenuEl.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      const item = target.closest('.docx-ai-submenu-item') as HTMLElement
      if (!item) return

      const lang = item.dataset.lang as TranslateLanguage
      this.callbacks.onAction(AIAction.TRANSLATE, { targetLanguage: lang })
      this.hideToolbar()
    })

    this.toolbarEl!.appendChild(this.subMenuEl)
  }

  /**
   * 隐藏子菜单
   */
  private hideSubMenu(): void {
    if (this.subMenuEl) {
      this.subMenuEl.remove()
      this.subMenuEl = null
    }
  }

  /**
   * 更新位置 - 使用 fixed 定位，直接基于视口坐标
   */
  private updatePosition(position: Position): void {
    if (!this.toolbarEl) return

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    
    // 显示在选区下方，留出间距
    let x = position.x
    let y = position.y + 30

    // 确保工具栏不超出视口边界
    const toolbarWidth = this.toolbarEl.offsetWidth || 400

    if (x + toolbarWidth > viewportWidth) {
      x = viewportWidth - toolbarWidth - 10
    }
    if (x < 10) x = 10

    // 如果下方超出视口底部，则显示在上方
    const toolbarHeight = this.toolbarEl.offsetHeight || 40
    if (y + toolbarHeight > viewportHeight) {
      y = position.y - toolbarHeight - 10
    }
    if (y < 10) y = 10

    this.toolbarEl.style.left = `${x}px`
    this.toolbarEl.style.top = `${y}px`
  }
}
