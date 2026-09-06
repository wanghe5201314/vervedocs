/**
 * DocxEditor AI 插件类型定义
 */

import type { AIServiceConfig } from '@vervedoc/docx-editor-schema'

// 重新导出迁移至 schema 的跨包共享类型，保持 ai 包 API 兼容
export type { AIServiceConfig } from '@vervedoc/docx-editor-schema'

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
  /** 中文 */
  CHINESE = 'zh',
  /** 英文 */
  ENGLISH = 'en',
  /** 日文 */
  JAPANESE = 'ja',
  /** 韩文 */
  KOREAN = 'ko',
  /** 法文 */
  FRENCH = 'fr',
  /** 德文 */
  GERMAN = 'de',
  /** 西班牙文 */
  SPANISH = 'es',
  /** 俄文 */
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
  /** 润色操作文案 */
  polish: string
  /** 翻译操作文案 */
  translate: string
  /** 总结操作文案 */
  summarize: string
  /** 续写操作文案 */
  continue: string
  /** 扩展操作文案 */
  expand: string
  /** 修正语法操作文案 */
  fixGrammar: string
  /** 正式化操作文案 */
  formal: string
  /** 轻松化操作文案 */
  casual: string
  /** 自定义操作文案 */
  custom: string
  /** 应用按钮文案 */
  apply: string
  /** 取消按钮文案 */
  cancel: string
  /** 重新生成按钮文案 */
  regenerate: string
  /** 加载中文案 */
  loading: string
  /** 错误文案 */
  error: string
  /** 翻译目标语言前缀文案 */
  translateTo: string
  /** 自定义指令输入框占位文案 */
  inputPrompt: string
  // 语言名称
  /** 各翻译目标语言的显示名称 */
  languages: {
    /** 中文显示名 */
    zh: string
    /** 英文显示名 */
    en: string
    /** 日文显示名 */
    ja: string
    /** 韩文显示名 */
    ko: string
    /** 法文显示名 */
    fr: string
    /** 德文显示名 */
    de: string
    /** 西班牙文显示名 */
    es: string
    /** 俄文显示名 */
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
  /** 编辑器命令对象，提供取值、选区、插入等命令 */
  command: {
    /** 获取编辑器当前文档数据 */
    getValue(): { data: { main: unknown[] } }
    /** 设置编辑器文档数据 */
    setValue(payload: { main?: unknown[] }): void
    /** 获取当前选区起止索引，无选区时返回 null */
    getRange(): { startIndex: number; endIndex: number } | null
    /** 设置选区范围 */
    executeSetRange(startIndex: number, endIndex: number): void
    /** 获取选区文本内容 */
    getRangeText(): string
    /** 在选区位置插入元素列表 */
    executeInsertElementList(elementList: unknown[]): void
    /** 获取编辑器容器 DOM */
    getContainer(): HTMLDivElement
  }
  /** 编辑器监听器钩子 */
  listener: {
    /** 选区样式变化回调 */
    rangeStyleChange?: (rangeStyle: unknown) => void
  }
  /** 编辑器事件总线，支持 select().subscribe() 与 on()/off() 两种用法 */
  eventBus: {
    /** 选择事件并返回可订阅对象 */
    select(event: string): {
      /** 订阅事件，返回包含 unsubscribe 的句柄 */
      subscribe(callback: (...args: unknown[]) => void): { unsubscribe: () => void }
    }
    /** 注册事件监听（可选） */
    on?(event: string, callback: (...args: unknown[]) => void): void
    /** 取消事件监听（可选） */
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
