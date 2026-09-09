/**
 * AI 编辑器插件
 */

import {
  AIAction,
  AIPluginConfig,
  AIRequest,
  TranslateLanguage,
  DEFAULT_I18N_ZH,
  EditorInterface,
  CustomAction,
  I18nConfig
} from '../types'
import { AIService } from '../core/ai-service'
import { buildPrompt } from '../core/prompt-templates'
import { FloatingToolbar } from '../ui/floating-toolbar'
import { ResultPanel } from '../ui/result-panel'
import '../styles.css'

/** 选区位置信息 */
interface SelectionPosition {
  /** 选区所在视口横坐标 */
  x: number
  /** 选区所在视口纵坐标 */
  y: number
  /** 选区文本内容 */
  text: string
}

/** 插件状态 */
interface PluginState {
  /** 是否正在处理 AI 请求 */
  isProcessing: boolean
  /** 当前执行的 AI 操作类型，空闲时为 null */
  currentAction: AIAction | null
  /** 当前操作的源文本 */
  currentText: string
  /** 当前操作的可选参数 */
  currentOptions: {
    /** 翻译目标语言 */
    targetLanguage?: TranslateLanguage
    /** 自定义提示词 */
    customPrompt?: string
    /** 自定义操作 ID */
    customActionId?: string
  }
}

/**
 * AI 插件类
 *
 * 负责在编辑器中集成 AI 能力：监听选区变化、显示悬浮工具栏、
 * 调用 AIService 执行 AI 操作、并通过 ResultPanel 展示与应用结果。
 */
export class AIPlugin {
  /** 已安装的编辑器实例，未安装时为 null */
  private editor: EditorInterface | null = null
  /** UI 挂载容器元素 */
  private container: HTMLElement | null = null
  /** 合并默认值后的完整插件配置 */
  private config: Omit<Required<AIPluginConfig>, 'i18n'> & { i18n: I18nConfig }
  /** AI 服务实例，负责与后端通信 */
  private aiService: AIService
  /** 悬浮工具栏实例 */
  private toolbar: FloatingToolbar | null = null
  /** 结果预览面板实例 */
  private resultPanel: ResultPanel | null = null
  /** 当前插件运行状态 */
  private state: PluginState = {
    isProcessing: false,
    currentAction: null,
    currentText: '',
    currentOptions: {}
  }
  /** 最近一次选区位置信息，用于定位 UI */
  private selectionPosition: SelectionPosition | null = null
  /** 显示工具栏的延迟定时器句柄 */
  private showToolbarTimeout: ReturnType<typeof setTimeout> | null = null
  /** eventBus 订阅句柄列表，用于卸载时统一取消订阅 */
  private eventBusSubscriptions: Array<{ unsubscribe: () => void }> = []

  /**
   * 订阅编辑器 eventBus 事件，兼容 select().subscribe() 与 on()/off() 两种 API
   *
   * @param event 事件名称
   * @param handler 事件处理函数
   * @returns 包含 unsubscribe 方法的订阅句柄，无 eventBus 时返回空操作句柄
   */
  private subscribeEventBus(event: string, handler: (...args: unknown[]) => void) {
    if (!this.editor?.eventBus) return { unsubscribe: () => {} }
    const eventBus: any = this.editor.eventBus
    if (typeof eventBus.select === 'function') {
      return eventBus.select(event).subscribe(handler)
    }
    if (typeof eventBus.on === 'function') {
      eventBus.on(event, handler)
      return {
        unsubscribe: () => {
          if (typeof eventBus.off === 'function') {
            eventBus.off(event, handler)
          }
        }
      }
    }
    return { unsubscribe: () => {} }
  }

  /**
   * 创建 AI 插件实例，合并默认配置并初始化 AI 服务
   *
   * @param config 插件配置
   */
  constructor(config: AIPluginConfig) {
    // 合并配置
    this.config = {
      service: config.service,
      enabledActions: config.enabledActions || [
        AIAction.POLISH,
        AIAction.TRANSLATE,
        AIAction.SUMMARIZE,
        AIAction.CONTINUE,
        AIAction.EXPAND,
        AIAction.FIX_GRAMMAR,
        AIAction.FORMAL,
        AIAction.CASUAL,
        AIAction.CUSTOM
      ],
      translateLanguages: config.translateLanguages || Object.values(TranslateLanguage),
      toolbarDelay: config.toolbarDelay ?? 300,
      floatingToolbar: config.floatingToolbar ?? true,
      customActions: config.customActions || [],
      i18n: { ...DEFAULT_I18N_ZH, ...config.i18n }
    }

    // 初始化 AI 服务
    this.aiService = new AIService(this.config.service)
  }

  /**
   * 安装插件到编辑器
   */
  install(editor: EditorInterface): void {
    this.editor = editor

    // 使用编辑器自身的容器
    try {
      this.container = editor.command.getContainer() || document.body
    } catch {
      this.container = document.body
    }

    // 仅在启用悬浮工具栏时创建 UI 和监听选区
    if (this.config.floatingToolbar) {
      // 创建 UI 组件
      this.createUI()

      // 监听选区变化
      this.setupSelectionListener()
    }
  }

  /**
   * 卸载插件
   */
  uninstall(): void {
    // 取消正在进行的请求
    this.aiService.cancelCurrentRequest()

    // 清理超时
    if (this.showToolbarTimeout) {
      clearTimeout(this.showToolbarTimeout)
    }

    // 移除编辑器事件监听
    this.eventBusSubscriptions.forEach(subscription => subscription.unsubscribe())
    this.eventBusSubscriptions = []

    // 移除文档级事件监听（用于点击编辑器外部时隐藏工具栏）
    document.removeEventListener('mousedown', this.handleDocumentMouseDown)

    // 销毁 UI 组件
    this.toolbar?.destroy()
    this.resultPanel?.destroy()

    this.editor = null
    this.container = null
    this.toolbar = null
    this.resultPanel = null
  }

  /**
   * 创建 UI 组件
   */
  private createUI(): void {
    if (!this.container) return

    // 创建悬浮工具栏
    this.toolbar = new FloatingToolbar(
      this.container,
      {
        enabledActions: this.config.enabledActions,
        translateLanguages: this.config.translateLanguages,
        customActions: this.config.customActions,
        i18n: this.config.i18n
      },
      {
        onAction: (action, options) => {
          this.executeAIAction(action, options)
        },
        onCustomInput: () => {
          this.showCustomInput()
        }
      }
    )

    // 创建结果面板
    this.resultPanel = new ResultPanel(
      this.container,
      { i18n: this.config.i18n },
      {
        onApply: (result) => {
          this.applyResult(result)
        },
        onCancel: () => {
          this.cancelOperation()
        },
        onRegenerate: () => {
          this.regenerate()
        }
      }
    )
  }

  /**
   * 设置选区监听 - 使用编辑器自身的事件系统
   */
  private setupSelectionListener(): void {
    if (!this.editor) return

    // 交互事件（鼠标）通过 eventBus 订阅
    this.eventBusSubscriptions.push(
      this.subscribeEventBus('editorMouseup', this.handleEditorMouseUp as any),
      this.subscribeEventBus('editorMousedown', this.handleEditorMouseDown as any)
    )
    // 状态事件（选区样式变更）通过 listener 订阅
    if (this.editor?.listener?.range?.formatListener) {
      const unsub = this.editor.listener.range.formatListener(this.handleRangeStyleChange as any)
      this.eventBusSubscriptions.push({ unsubscribe: unsub })
    }

    // 文档级 mousedown 用于点击编辑器外部时隐藏工具栏
    document.addEventListener('mousedown', this.handleDocumentMouseDown)
  }

  /**
   * 处理编辑器内鼠标抬起（通过 eventBus）
   */
  private handleEditorMouseUp = (e: MouseEvent): void => {
    // 如果点击的是工具栏或面板，不处理
    const target = e.target as HTMLElement
    if (target.closest?.('.docx-ai-toolbar') || target.closest?.('.docx-ai-panel')) {
      return
    }

    this.checkSelection(e.clientX, e.clientY)
  }

  /**
   * 处理编辑器内鼠标按下（通过 eventBus）
   */
  private handleEditorMouseDown = (_e: MouseEvent): void => {
    // 延迟隐藏工具栏（用户可能在重新选择文字）
    this.toolbar?.delayHide()
  }

  /**
   * 处理选区样式变化（键盘选择等场景）
   */
  private handleRangeStyleChange = (): void => {
    if (!this.editor) return

    const text = this.editor.command.getRangeText()
    if (text && text.trim().length > 0) {
      // 有选区但没有鼠标位置，使用编辑器容器中心位置
      if (!this.selectionPosition) {
        const container = this.container || document.body
        const rect = container.getBoundingClientRect()
        this.selectionPosition = {
          x: rect.left + rect.width / 2,
          y: rect.top + 100,
          text: text.trim()
        }
        this.toolbar?.showToolbar(this.selectionPosition)
      }
    } else {
      // 无选区，隐藏工具栏
      if (!this.state.isProcessing) {
        this.selectionPosition = null
        this.toolbar?.hideToolbar()
      }
    }
  }

  /**
   * 处理文档级鼠标按下（点击编辑器外部时隐藏）
   */
  private handleDocumentMouseDown = (e: MouseEvent): void => {
    const target = e.target as HTMLElement

    // 如果点击的是工具栏或面板，不处理
    if (target.closest('.docx-ai-toolbar') || target.closest('.docx-ai-panel')) {
      return
    }

    // 如果点击在编辑器容器外部，隐藏工具栏
    if (this.container && !this.container.contains(target)) {
      this.toolbar?.hideToolbar()
    }
  }

  /**
   * 检查选区
   */
  private checkSelection(x: number, y: number): void {
    if (!this.editor) return

    // 延迟检查，避免与编辑器的选区更新冲突
    if (this.showToolbarTimeout) {
      clearTimeout(this.showToolbarTimeout)
    }

    this.showToolbarTimeout = setTimeout(() => {
      const text = this.editor?.command.getRangeText()

      if (text && text.trim().length > 0) {
        this.selectionPosition = { x, y, text: text.trim() }
        this.toolbar?.showToolbar({ x, y })
      } else {
        this.selectionPosition = null
        this.toolbar?.hideToolbar()
      }
    }, this.config.toolbarDelay)
  }

  /**
   * 处理 AI 操作
   */
  private async executeAIAction(
    action: AIAction,
    options?: {
      targetLanguage?: TranslateLanguage
      customPrompt?: string
      customActionId?: string
    }
  ): Promise<void> {
    if (!this.selectionPosition || this.state.isProcessing) return

    const text = this.selectionPosition.text

    // 保存当前状态
    this.state = {
      isProcessing: true,
      currentAction: action,
      currentText: text,
      currentOptions: options || {}
    }

    // 隐藏工具栏，显示结果面板
    this.toolbar?.hideToolbar()
    this.resultPanel?.showLoading(this.selectionPosition)

    try {
      // 构建提示词
      let prompt: string

      if (action === AIAction.CUSTOM && options?.customActionId) {
        // 自定义操作
        const customAction = this.config.customActions.find(
          (a: CustomAction) => a.id === options.customActionId
        )
        if (customAction) {
          prompt = customAction.prompt.replace('{text}', text)
        } else {
          throw new Error('自定义操作不存在')
        }
      } else {
        prompt = buildPrompt(action, text, {
          targetLanguage: options?.targetLanguage,
          customPrompt: options?.customPrompt
        })
      }

      // 构建请求
      const request: AIRequest = {
        action,
        text,
        targetLanguage: options?.targetLanguage,
        customPrompt: action === AIAction.CUSTOM ? prompt : undefined
      }

      // 发送请求
      if (this.config.service.streaming) {
        await this.aiService.requestStream(request, {
          onChunk: (chunk) => {
            this.resultPanel?.appendStreamContent(chunk)
          },
          onComplete: (result) => {
            this.state.isProcessing = false
            this.resultPanel?.showSuccess(result)
          },
          onError: (error) => {
            this.state.isProcessing = false
            this.resultPanel?.showError(error.message)
          }
        })
      } else {
        const response = await this.aiService.sendAIRequest(request)
        this.state.isProcessing = false

        if (response.success && response.result) {
          this.resultPanel?.showSuccess(response.result)
        } else {
          this.resultPanel?.showError(response.error || '未知错误')
        }
      }
    } catch (error) {
      this.state.isProcessing = false
      this.resultPanel?.showError(
        error instanceof Error ? error.message : '未知错误'
      )
    }
  }

  /**
   * 显示自定义输入框
   */
  private showCustomInput(): void {
    if (!this.selectionPosition) return

    this.toolbar?.hideToolbar()
    this.resultPanel?.showInputPanel(this.selectionPosition, (prompt) => {
      this.executeAIAction(AIAction.CUSTOM, { customPrompt: prompt })
    })
  }

  /**
   * 应用结果
   */
  private applyResult(result: string): void {
    if (!this.editor) return

    // 将结果转换为元素列表并插入
    const elementList = result.split('').map(char => ({
      value: char
    }))

    this.editor.command.executeInsertElementList(elementList)

    // 重置状态
    this.resetState()
  }

  /**
   * 取消操作
   */
  private cancelOperation(): void {
    this.aiService.cancelCurrentRequest()
    this.resultPanel?.hidePanel()
    this.resetState()
  }

  /**
   * 重新生成
   */
  private regenerate(): void {
    if (!this.state.currentAction) return

    this.executeAIAction(this.state.currentAction, this.state.currentOptions)
  }

  /**
   * 重置状态
   */
  private resetState(): void {
    this.state = {
      isProcessing: false,
      currentAction: null,
      currentText: '',
      currentOptions: {}
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<AIPluginConfig>): void {
    if (config.service) {
      this.aiService.updateConfig(config.service)
    }
    if (config.i18n) {
      this.config.i18n = { ...this.config.i18n, ...config.i18n }
    }
    if (config.enabledActions) {
      this.config.enabledActions = config.enabledActions
    }
    if (config.translateLanguages) {
      this.config.translateLanguages = config.translateLanguages
    }
    if (config.customActions) {
      this.config.customActions = config.customActions
    }
  }
}

/**
 * 创建 AI 插件工厂函数
 */
export function createAIPlugin(config: AIPluginConfig) {
  const plugin = new AIPlugin(config)

  // 返回符合 PluginFunction 签名的函数，适配 editor.use() 调用
  const pluginFunction = (editor: any) => {
    plugin.install(editor as EditorInterface)
  }

  // 附加额外方法到函数对象上
  ;(pluginFunction as any).uninstall = () => {
    plugin.uninstall()
  }
  ;(pluginFunction as any).updateConfig = (newConfig: Partial<AIPluginConfig>) => {
    plugin.updateConfig(newConfig)
  }

  return pluginFunction
}
