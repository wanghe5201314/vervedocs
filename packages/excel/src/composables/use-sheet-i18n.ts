import { watch } from 'vue'
import { createExcelI18n } from '@/i18n'
import type { ExcelI18nMessages, ExcelLocale } from '@/i18n'

interface SheetI18nProps {
  locale?: ExcelLocale
  i18n?: Partial<ExcelI18nMessages>
}

export function useSheetI18n(props: SheetI18nProps) {
  const excelI18n = createExcelI18n({
    locale: props.locale,
    overrides: props.i18n,
  })

  watch(() => props.locale, (locale) => {
    excelI18n.setLocale(locale || 'zhCN')
  }, { immediate: true })

  watch(() => props.i18n, (overrides) => {
    excelI18n.setOverrides(overrides)
  })

  const t = (key: string, params?: Record<string, string | number>) => excelI18n.t(key, params)

  return { t }
}