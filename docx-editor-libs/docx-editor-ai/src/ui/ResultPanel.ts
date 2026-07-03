/**
 * AI 结果预览面板
 */

import { I18nConfig, DEFAULT_I18N_ZH } from '../types'

/** 面板位置 */
interface Position {
  x: number
  y: number
}

/** 面板配置 */
export interface ResultPanelConfig {
  i18n: I18nConfig
}

/** 面板事件回调 */
export interface ResultPanelCallbacks {
  onApply: (result: string) => void
  onCancel: () => void
  onRegenerate: () => void
}

/** 面板状态 */
export enum PanelState {
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error',
  INPUT = 'input'
}

/**
 * 结果预览面板类
 */
export class ResultPanel {
  private container: HTMLElement
  private panelEl: HTMLDivElement | null = null
  private config: ResultPanelConfig
  private callbacks: ResultPanelCallbacks
  private state: PanelState = PanelState.LOADING
  private result = ''
  private streamContent = ''

  constructor(
    container: HTMLElement,
    config: Partial<ResultPanelConfig>,
    callbacks: ResultPanelCallbacks
  ) {
    this.container = container
    this.config = {
      i18n: { ...DEFAULT_I18N_ZH, ...config.i18n }
    }
    this.callbacks = callbacks
  }

  /**
   * 显示加载状态
   */
  showLoading(position: Position): void {
    this.state = PanelState.LOADING
    this.streamContent = ''
    this.result = ''
    this.renderPanel()
    this.updatePosition(position)
    this.showPanel()
  }

  /**
   * 显示自定义输入框
   */
  showInputPanel(position: Position, onSubmit: (prompt: string) => void): void {
    this.state = PanelState.INPUT
    this.renderInput(onSubmit)
    this.updatePosition(position)
    this.showPanel()
  }

  /**
   * 更新流式内容
   */
  appendStreamContent(chunk: string): void {
    this.streamContent += chunk
    this.updateStreamContent()
  }

  /**
   * 显示成功结果
   */
  showSuccess(result: string): void {
    this.state = PanelState.SUCCESS
    this.result = result
    this.streamContent = result
    this.renderPanel()
  }

  /**
   * 显示错误
   */
  showError(error: string): void {
    this.state = PanelState.ERROR
    this.result = error
    this.renderPanel()
  }

  /**
   * 隐藏面板
   */
  hidePanel(): void {
    if (this.panelEl) {
      this.panelEl.classList.remove('docx-ai-panel-visible')
    }
  }

  /**
   * 销毁面板
   */
  destroy(): void {
    this.hidePanel()
    if (this.panelEl) {
      this.panelEl.remove()
      this.panelEl = null
    }
  }

  /**
   * 获取当前结果
   */
  getResult(): string {
    return this.result || this.streamContent
  }

  /**
   * 显示面板
   */
  private showPanel(): void {
    if (this.panelEl) {
      this.panelEl.classList.add('docx-ai-panel-visible')
    }
  }

  /**
   * 渲染面板
   */
  private renderPanel(): void {
    if (!this.panelEl) {
      this.panelEl = document.createElement('div')
      this.panelEl.className = 'docx-ai-panel'
      this.container.appendChild(this.panelEl)
    }

    const { i18n } = this.config

    switch (this.state) {
      case PanelState.LOADING:
        this.panelEl.innerHTML = `
          <div class="docx-ai-panel-content">
            <div class="docx-ai-panel-stream">${this.streamContent || ''}</div>
            <div class="docx-ai-panel-loading">
              <div class="docx-ai-panel-spinner"></div>
              <span>${i18n.loading}</span>
            </div>
          </div>
        `
        break

      case PanelState.SUCCESS:
        this.panelEl.innerHTML = `
          <div class="docx-ai-panel-content">
            <div class="docx-ai-panel-result">${this.escapeHtml(this.result)}</div>
          </div>
          <div class="docx-ai-panel-actions">
            <button class="docx-ai-panel-btn docx-ai-panel-btn-primary" data-action="apply">
              ${i18n.apply}
            </button>
            <button class="docx-ai-panel-btn" data-action="regenerate">
              ${i18n.regenerate}
            </button>
            <button class="docx-ai-panel-btn" data-action="cancel">
              ${i18n.cancel}
            </button>
          </div>
        `
        this.bindActionEvents()
        break

      case PanelState.ERROR:
        this.panelEl.innerHTML = `
          <div class="docx-ai-panel-content docx-ai-panel-error">
            <div class="docx-ai-panel-error-icon">⚠️</div>
            <div class="docx-ai-panel-error-text">${this.escapeHtml(this.result)}</div>
          </div>
          <div class="docx-ai-panel-actions">
            <button class="docx-ai-panel-btn" data-action="regenerate">
              ${i18n.regenerate}
            </button>
            <button class="docx-ai-panel-btn" data-action="cancel">
              ${i18n.cancel}
            </button>
          </div>
        `
        this.bindActionEvents()
        break
    }
  }

  /**
   * 渲染输入框
   */
  private renderInput(onSubmit: (prompt: string) => void): void {
    if (!this.panelEl) {
      this.panelEl = document.createElement('div')
      this.panelEl.className = 'docx-ai-panel'
      this.container.appendChild(this.panelEl)
    }

    const { i18n } = this.config

    this.panelEl.innerHTML = `
      <div class="docx-ai-panel-content">
        <div class="docx-ai-panel-input-wrapper">
          <textarea class="docx-ai-panel-input" 
                    placeholder="${i18n.inputPrompt}"
                    rows="3"></textarea>
        </div>
      </div>
      <div class="docx-ai-panel-actions">
        <button class="docx-ai-panel-btn docx-ai-panel-btn-primary" data-action="submit">
          ${i18n.apply}
        </button>
        <button class="docx-ai-panel-btn" data-action="cancel">
          ${i18n.cancel}
        </button>
      </div>
    `

    // 绑定输入框事件
    const textarea = this.panelEl.querySelector('.docx-ai-panel-input') as HTMLTextAreaElement
    const submitBtn = this.panelEl.querySelector('[data-action="submit"]') as HTMLButtonElement
    const cancelBtn = this.panelEl.querySelector('[data-action="cancel"]') as HTMLButtonElement

    // 自动聚焦
    setTimeout(() => textarea.focus(), 100)

    // Ctrl+Enter 提交
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        const prompt = textarea.value.trim()
        if (prompt) {
          onSubmit(prompt)
        }
      }
    })

    submitBtn.addEventListener('click', () => {
      const prompt = textarea.value.trim()
      if (prompt) {
        onSubmit(prompt)
      }
    })

    cancelBtn.addEventListener('click', () => {
      this.callbacks.onCancel()
      this.hidePanel()
    })
  }

  /**
   * 更新流式内容
   */
  private updateStreamContent(): void {
    if (!this.panelEl) return
    const streamEl = this.panelEl.querySelector('.docx-ai-panel-stream')
    if (streamEl) {
      streamEl.textContent = this.streamContent
      // 滚动到底部
      streamEl.scrollTop = streamEl.scrollHeight
    }
  }

  /**
   * 绑定操作按钮事件
   */
  private bindActionEvents(): void {
    if (!this.panelEl) return

    const applyBtn = this.panelEl.querySelector('[data-action="apply"]')
    const regenerateBtn = this.panelEl.querySelector('[data-action="regenerate"]')
    const cancelBtn = this.panelEl.querySelector('[data-action="cancel"]')

    applyBtn?.addEventListener('click', () => {
      this.callbacks.onApply(this.getResult())
      this.hidePanel()
    })

    regenerateBtn?.addEventListener('click', () => {
      this.callbacks.onRegenerate()
    })

    cancelBtn?.addEventListener('click', () => {
      this.callbacks.onCancel()
      this.hidePanel()
    })
  }

  /**
   * 更新位置 - 使用 fixed 定位，直接基于视口坐标
   */
  private updatePosition(position: Position): void {
    if (!this.panelEl) return

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    
    // 在选区下方
    let x = position.x
    let y = position.y + 30

    // 确保面板不超出视口边界
    const panelWidth = 400
    const panelHeight = this.panelEl.offsetHeight || 200

    if (x + panelWidth > viewportWidth) {
      x = viewportWidth - panelWidth - 10
    }
    if (x < 10) x = 10

    if (y + panelHeight > viewportHeight) {
      y = position.y - panelHeight - 10
    }
    if (y < 10) y = 10

    this.panelEl.style.left = `${x}px`
    this.panelEl.style.top = `${y}px`
  }

  /**
   * 转义 HTML
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML.replace(/\n/g, '<br>')
  }
}
