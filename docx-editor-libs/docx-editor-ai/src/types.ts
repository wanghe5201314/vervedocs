/**
 * DocxEditor AI 插件类型定义
 */

/**
 * AI 操作类型
 */
export enum AIAction {
  /** 润色/改写 */
  POLISH = 'polish',
  /** 翻译 */
  TRANSLATE = 'translate',
  /** 总结 */
  SUMMARIZE = 'summarize',
  /** 续写 */
  CONTINUE = 'continue',
  /** 扩展/详细化 */
  EXPAND = 'expand',
  /** 修正语法 */
  FIX_GRAMMAR = 'fix_grammar',
  /** 正式化 */
  FORMAL = 'formal',
  /** 轻松化 */
  CASUAL = 'casual',
  /** 自定义 */
  CUSTOM = 'custom'
}

/**
 * 翻译目标语言
 */
export enum TranslateLanguage {
  CHINESE = 'zh',
  ENGLISH = 'en',
  JAPANESE = 'ja',
  KOREAN = 'ko',
  FRENCH = 'fr',
  GERMAN = 'de',
  SPANISH = 'es',
  RUSSIAN = 'ru'
}

/**
 * AI 请求参数
 */
export interface AIRequest {
  /** 操作类型 */
  action: AIAction
  /** 选中的文本内容 */
  text: string
  /** 翻译目标语言（仅翻译操作） */
  targetLanguage?: TranslateLanguage
  /** 自定义提示词（仅自定义操作） */
  customPrompt?: string
  /** 上下文信息 */
  context?: {
    /** 前文 */
    before?: string
    /** 后文 */
    after?: string
  }
}

/**
 * AI 响应结果
 */
export interface AIResponse {
  /** 是否成功 */
  success: boolean
  /** 生成的结果 */
  result?: string
  /** 错误信息 */
  error?: string
}

/**
 * 流式响应回调
 */
export interface StreamCallbacks {
  /** 收到新内容 */
  onChunk?: (chunk: string) => void
  /** 完成 */
  onComplete?: (result: string) => void
  /** 错误 */
  onError?: (error: Error) => void
}

/**
 * AI 服务配置
 */
export interface AIServiceConfig {
  /** API 端点 */
  apiEndpoint: string
  /** 请求超时（毫秒） */
  timeout?: number
  /** 自定义请求头 */
  headers?: Record<string, string>
  /** 是否启用流式响应 */
  streaming?: boolean
}

/**
 * AI 插件配置
 */
export interface AIPluginConfig {
  /** AI 服务配置 */
  service: AIServiceConfig
  /** 启用的操作列表（默认全部启用） */
  enabledActions?: AIAction[]
  /** 翻译支持的语言（默认全部） */
  translateLanguages?: TranslateLanguage[]
  /** 悬浮工具栏显示延迟（毫秒） */
  toolbarDelay?: number
  /** 是否启用悬浮工具栏（默认 false） */
  floatingToolbar?: boolean
  /** 自定义操作项 */
  customActions?: CustomAction[]
  /** 国际化配置 */
  i18n?: Partial<I18nConfig>
}

/**
 * 自定义操作项
 */
export interface CustomAction {
  /** 操作 ID */
  id: string
  /** 显示名称 */
  name: string
  /** 图标（SVG 字符串或 URL） */
  icon?: string
  /** 提示词模板，{text} 会被替换为选中文本 */
  prompt: string
}

/**
 * 国际化配置
 */
export interface I18nConfig {
  polish: string
  translate: string
  summarize: string
  continue: string
  expand: string
  fixGrammar: string
  formal: string
  casual: string
  custom: string
  apply: string
  cancel: string
  regenerate: string
  loading: string
  error: string
  translateTo: string
  inputPrompt: string
  // 语言名称
  languages: {
    zh: string
    en: string
    ja: string
    ko: string
    fr: string
    de: string
    es: string
    ru: string
  }
}

/**
 * 默认中文国际化
 */
export const DEFAULT_I18N_ZH: I18nConfig = {
  polish: '润色',
  translate: '翻译',
  summarize: '总结',
  continue: '续写',
  expand: '扩展',
  fixGrammar: '修正语法',
  formal: '正式化',
  casual: '轻松化',
  custom: '自定义',
  apply: '应用',
  cancel: '取消',
  regenerate: '重新生成',
  loading: '生成中...',
  error: '生成失败',
  translateTo: '翻译为',
  inputPrompt: '请输入指令',
  languages: {
    zh: '中文',
    en: '英文',
    ja: '日文',
    ko: '韩文',
    fr: '法文',
    de: '德文',
    es: '西班牙文',
    ru: '俄文'
  }
}

/**
 * 默认英文国际化
 */
export const DEFAULT_I18N_EN: I18nConfig = {
  polish: 'Polish',
  translate: 'Translate',
  summarize: 'Summarize',
  continue: 'Continue',
  expand: 'Expand',
  fixGrammar: 'Fix Grammar',
  formal: 'Make Formal',
  casual: 'Make Casual',
  custom: 'Custom',
  apply: 'Apply',
  cancel: 'Cancel',
  regenerate: 'Regenerate',
  loading: 'Generating...',
  error: 'Generation failed',
  translateTo: 'Translate to',
  inputPrompt: 'Enter instruction',
  languages: {
    zh: 'Chinese',
    en: 'English',
    ja: 'Japanese',
    ko: 'Korean',
    fr: 'French',
    de: 'German',
    es: 'Spanish',
    ru: 'Russian'
  }
}

/**
 * 编辑器接口（与 DocxEditor 兼容）
 */
export interface EditorInterface {
  command: {
    getValue(): { data: { main: unknown[] } }
    setValue(payload: { main?: unknown[] }): void
    getRange(): { startIndex: number; endIndex: number } | null
    executeSetRange(startIndex: number, endIndex: number): void
    getRangeText(): string
    executeInsertElementList(elementList: unknown[]): void
    getContainer(): HTMLDivElement
  }
  listener: {
    rangeStyleChange?: (rangeStyle: unknown) => void
  }
  eventBus: {
    select(event: string): {
      subscribe(callback: (...args: unknown[]) => void): { unsubscribe: () => void }
    }
    on?(event: string, callback: (...args: unknown[]) => void): void
    off?(event: string, callback: (...args: unknown[]) => void): void
  }
}

/**
 * 插件事件
 */
export interface AIPluginEvents {
  /** AI 操作开始 */
  aiStart: (action: AIAction, text: string) => void
  /** AI 操作完成 */
  aiComplete: (action: AIAction, result: string) => void
  /** AI 操作失败 */
  aiError: (action: AIAction, error: Error) => void
  /** 结果被应用 */
  aiApplied: (action: AIAction, result: string) => void
  /** 结果被取消 */
  aiCancelled: (action: AIAction) => void
}
