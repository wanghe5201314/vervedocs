import { ref, computed } from 'vue'
import { createI18n } from '@vervedoc/i18n'
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

/** 从 localStorage 读取已保存的语言偏好 */
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

const mergeDeep = (target: DocxMessages, source: DocxMessages): DocxMessages => {
  const out = { ...target }
  for (const key of Object.keys(source)) {
    const sourceValue = source[key]
    const targetValue = out[key]
    if (sourceValue && typeof sourceValue === 'object' && targetValue && typeof targetValue === 'object') {
      out[key] = mergeDeep(targetValue, sourceValue)
    } else {
      out[key] = sourceValue
    }
  }
  return out
}

let overrides: DocxMessages = {}
const bundles: Record<DocxLocale | 'fallback', DocxMessages> = { ...messages, fallback: messages.zhCN }
const i18n = createI18n(bundles, currentLocale.value, 'fallback')

/** 翻译当前语言的消息；在 Vue 渲染中读取 currentLocale 以保持响应式刷新。 */
export const t = (path: string, params?: Record<string, string | number>): string => {
  i18n.setLocale(currentLocale.value)
  return i18n.t(path, params)
}

/** 初始化语言偏好：localStorage 已保存值 > options.locale > 默认 zhCN。 */
export const initLocale = (locale?: DocxLocale): void => {
  const stored = getStoredLocale()
  if (stored) {
    currentLocale.value = stored
  } else if (locale) {
    currentLocale.value = locale
  }
}

/** 切换当前语言并持久化到 localStorage。 */
export const setLocale = (locale: DocxLocale): void => {
  currentLocale.value = locale
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // localStorage 不可用时静默降级
  }
}

/** 获取当前语言代码。 */
export const getLocale = (): DocxLocale => currentLocale.value

/** 设置消息覆盖包（用于用户自定义消息）。 */
export const setOverrides = (nextOverrides?: Partial<DocxMessages>): void => {
  overrides = (nextOverrides || {}) as DocxMessages
  for (const locale of Object.keys(messages) as DocxLocale[]) {
    bundles[locale] = mergeDeep(messages[locale], overrides)
  }
}

/** 注册或合并指定语言的消息包。 */
export const registerLangMap = (locale: DocxLocale, pack: DocxMessages): void => {
  messages[locale] = mergeDeep(messages[locale] || {}, pack || {})
  bundles[locale] = mergeDeep(messages[locale], overrides)
  if (locale === 'zhCN') bundles.fallback = messages.zhCN
}

export { currentLocale, antLocale }
export type { DocxLocale, DocxMessages } from './types'
