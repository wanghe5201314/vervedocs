import zhCN from './zhCN'
import enUS from './enUS'
import type { PptI18nMessages, PptLocale } from './types'

const messages: Record<PptLocale, PptI18nMessages> = {
  zhCN,
  enUS,
}

const mergeDeep = (target: Record<string, any>, source: Record<string, any>) => {
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

const getByPath = (obj: Record<string, any>, path: string) => {
  const nodes = String(path || '').split('.').filter(Boolean)
  let current: any = obj
  for (const node of nodes) {
    if (!current || typeof current !== 'object') return undefined
    current = current[node]
  }
  return current
}

const formatMessage = (message: string, params?: Record<string, string | number>) => {
  return String(message || '').replace(/\{(\w+)\}/g, (_, key) => String(params?.[key] ?? ''))
}

export const registerLangMap = (locale: PptLocale, pack: PptI18nMessages) => {
  messages[locale] = mergeDeep(messages[locale] || {}, pack || {})
}

export const createPptI18n = (options?: {
  locale?: PptLocale
  overrides?: Partial<PptI18nMessages>
}) => {
  let currentLocale: PptLocale = options?.locale || 'zhCN'
  let overrides: PptI18nMessages = (options?.overrides || {}) as PptI18nMessages

  const getMessageBundle = () => mergeDeep(messages[currentLocale] || messages.zhCN, overrides)

  const t = (path: string, params?: Record<string, string | number>) => {
    const bundle = getMessageBundle()
    const hit = getByPath(bundle, path)
    if (typeof hit === 'string') return formatMessage(hit, params)
    const fallback = getByPath(messages.zhCN, path)
    if (typeof fallback === 'string') return formatMessage(fallback, params)
    return path
  }

  const setLocale = (locale: PptLocale) => {
    currentLocale = locale
  }

  const setOverrides = (nextOverrides?: Partial<PptI18nMessages>) => {
    overrides = (nextOverrides || {}) as PptI18nMessages
  }

  return {
    t,
    setLocale,
    setOverrides,
  }
}

export type { PptLocale, PptI18nMessages } from './types'
export { zhCN, enUS }

