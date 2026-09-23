import { ref, computed } from 'vue'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import zhTW from 'ant-design-vue/es/locale/zh_TW'
import jaJP from 'ant-design-vue/es/locale/ja_JP'
import koKR from 'ant-design-vue/es/locale/ko_KR'
import enUS from 'ant-design-vue/es/locale/en_US'
import zhCNMessages from './zh-cn'
import zhTWMessages from './zh-tw'
import jaJPMessages from './ja-jp'
import koKRMessages from './ko-kr'
import enUSMessages from './en-us'
import type { DocxLocale, DocxMessages } from './types'

/** 全部语言消息包 */
const messages: Record<DocxLocale, DocxMessages> = {
  zhCN: zhCNMessages,
  zhTW: zhTWMessages,
  jaJP: jaJPMessages,
  koKR: koKRMessages,
  enUS: enUSMessages
}

/** ant-design-vue 语言包映射 */
const antLocales: Record<DocxLocale, any> = {
  zhCN,
  zhTW,
  jaJP,
  koKR,
  enUS
}

/** localStorage 存储语言偏好的 key */
const LOCALE_STORAGE_KEY = 'docx-editor-locale'

/** 合法的语言代码集合，用于校验 localStorage 读取值 */
const validLocales = new Set<string>(Object.keys(messages))

/**
 * 从 localStorage 读取已保存的语言偏好
 * @returns 已保存的语言代码，不存在或无效则返回 null
 */
const getStoredLocale = (): DocxLocale | null => {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (stored && validLocales.has(stored)) return stored as DocxLocale
  } catch {
    // localStorage 不可用时静默降级
  }
  return null
}

/** 当前语言（响应式，优先从 localStorage 读取，否则默认 zhCN） */
const currentLocale = ref<DocxLocale>(getStoredLocale() || 'zhCN')

/** ant-design-vue 当前 locale（响应式，供 ConfigProvider 使用） */
const antLocale = computed(() => antLocales[currentLocale.value])

/**
 * 深合并两个消息对象，source 中的值覆盖 target 中的同名 key
 * @param target - 基础消息对象
 * @param source - 覆盖消息对象
 * @returns 合并后的新对象
 */
const mergeDeep = (target: Record<string, any>, source: Record<string, any>): Record<string, any> => {
  const out = { ...target }
  for (const key of Object.keys(source || {})) {
    const sourceValue = source[key]
    const targetValue = out[key]
    if (
      sourceValue &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      out[key] = mergeDeep(targetValue, sourceValue)
      continue
    }
    out[key] = sourceValue
  }
  return out
}

/**
 * 按点分路径从对象中取值
 * @param obj - 消息对象
 * @param path - 点分路径，如 'footer.page'
 * @returns 路径对应的值，不存在则返回 undefined
 */
const getByPath = (obj: Record<string, any>, path: string): any => {
  const nodes = String(path || '').split('.').filter(Boolean)
  let current: any = obj
  for (const node of nodes) {
    if (!current || typeof current !== 'object') return undefined
    current = current[node]
  }
  return current
}

/**
 * 用 params 替换 message 中的 {param} 占位符
 * @param message - 含 {param} 占位符的消息模板
 * @param params - 参数键值对
 * @returns 替换后的字符串
 */
const formatMessage = (message: string, params?: Record<string, string | number>): string => {
  return String(message || '').replace(/\{(\w+)\}/g, (_, key) => String(params?.[key] ?? ''))
}

/** 覆盖消息包（用户自定义消息合并） */
let overrides: DocxMessages = {}

/**
 * 翻译函数，按点分路径从当前语言消息包中取值并插值
 *
 * 内部读取响应式 currentLocale，在 Vue template 中调用时会建立响应式依赖，
 * 切换语言时自动触发组件重新渲染。
 * @param path - 消息路径，如 'footer.page'
 * @param params - 插值参数，如 { current: 1, total: 3 }
 * @returns 翻译后的字符串，未命中则回退到中文，仍未命中则返回 path
 */
export const t = (path: string, params?: Record<string, string | number>): string => {
  const bundle = mergeDeep(messages[currentLocale.value] || messages.zhCN, overrides)
  const hit = getByPath(bundle, path)
  if (typeof hit === 'string') return formatMessage(hit, params)
  const fallback = getByPath(messages.zhCN, path)
  if (typeof fallback === 'string') return formatMessage(fallback, params)
  return path
}

/**
 * 初始化语言偏好，仅在 localStorage 无保存值时使用传入的 locale
 *
 * 优先级：localStorage 已保存值 > options.locale > 默认 zhCN。
 * 用于 `new WordEditor({ locale: 'enUS' })` 指定初始语言，但用户手动切换后以 localStorage 为准。
 * @param locale - 默认语言代码（来自 Options.locale）
 */
export const initLocale = (locale?: DocxLocale): void => {
  const stored = getStoredLocale()
  if (stored) {
    currentLocale.value = stored
  } else if (locale) {
    currentLocale.value = locale
  }
}

/**
 * 切换当前语言并持久化到 localStorage
 * @param locale - 目标语言代码
 */
export const setLocale = (locale: DocxLocale): void => {
  currentLocale.value = locale
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // localStorage 不可用时静默降级
  }
}

/**
 * 获取当前语言代码
 * @returns 当前语言代码
 */
export const getLocale = (): DocxLocale => {
  return currentLocale.value
}

/**
 * 设置消息覆盖包（用于用户自定义消息）
 * @param nextOverrides - 覆盖消息对象
 */
export const setOverrides = (nextOverrides?: Partial<DocxMessages>): void => {
  overrides = (nextOverrides || {}) as DocxMessages
}

/**
 * 注册或合并指定语言的消息包
 * @param locale - 语言代码
 * @param pack - 消息包
 */
export const registerLangMap = (locale: DocxLocale, pack: DocxMessages): void => {
  messages[locale] = mergeDeep(messages[locale] || {}, pack || {}) as DocxMessages
}

export { currentLocale, antLocale }
export type { DocxLocale, DocxMessages } from './types'