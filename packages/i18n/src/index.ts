import zhCN from './zh-cn.js'
import zhTW from './zh-tw.js'
import enUS from './en-us.js'
import jaJP from './ja-jp.js'
import koKR from './ko-kr.js'

export const builtinMessages = { zhCN, zhTW, enUS, jaJP, koKR }
export type BuiltinLocale = keyof typeof builtinMessages
export type EditorI18n = I18n<BuiltinLocale>

export function createEditorI18n(locale: BuiltinLocale = 'zhCN'): EditorI18n {
  return createI18n(builtinMessages, locale, 'zhCN')
}

export type Messages = { [key: string]: string | Messages }
export type Translate = (key: string, params?: Record<string, string | number>) => string

export interface I18n<Locale extends string> {
  readonly locale: Locale
  t: Translate
  setLocale(locale: Locale): void
  subscribe(listener: () => void): () => void
}

function lookup(messages: Messages | undefined, key: string): string | undefined {
  let value: string | Messages | undefined = messages
  for (const segment of key.split('.')) {
    if (typeof value !== 'object' || value === null) return undefined
    value = value[segment]
  }
  return typeof value === 'string' ? value : undefined
}

export function createI18n<Locale extends string>(
  bundles: Record<Locale, Messages>,
  initialLocale: Locale,
  fallbackLocale: Locale = initialLocale
): I18n<Locale> {
  let locale = initialLocale
  const listeners = new Set<() => void>()

  return {
    get locale() { return locale },
    t(key, params) {
      const message = lookup(bundles[locale], key) ?? lookup(bundles[fallbackLocale], key) ?? key
      return message.replace(/\{(\w+)\}/g, (_, name: string) => String(params?.[name] ?? ''))
    },
    setLocale(nextLocale) {
      if (locale === nextLocale) return
      locale = nextLocale
      listeners.forEach(listener => listener())
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    }
  }
}
