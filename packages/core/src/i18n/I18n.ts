type Draw = any
type ILang = any
type DeepPartial<T> = T

const zhCNLang: Record<string, any> = {
  datePicker: {
    now: '此刻',
    confirm: '确定',
    return: '返回',
    timeSelect: '选择时间',
    weeks: {
      sun: '日',
      mon: '一',
      tue: '二',
      wed: '三',
      thu: '四',
      fri: '五',
      sat: '六'
    },
    year: '年',
    month: '月',
    hour: '时',
    minute: '分',
    second: '秒'
  },
  pageBreak: {
    displayName: '分页符'
  },
  frame: {
    header: '页眉',
    footer: '页脚'
  }
}

const enUSLang: Record<string, any> = {
  datePicker: {
    now: 'Now',
    confirm: 'Confirm',
    return: 'Return',
    timeSelect: 'Select Time',
    weeks: {
      sun: 'Su',
      mon: 'Mo',
      tue: 'Tu',
      wed: 'We',
      thu: 'Th',
      fri: 'Fr',
      sat: 'Sa'
    },
    year: 'Year',
    month: 'Month',
    hour: 'H',
    minute: 'M',
    second: 'S'
  },
  pageBreak: {
    displayName: 'Page Break'
  },
  frame: {
    header: 'Header',
    footer: 'Footer'
  }
}

const langMap: Record<string, Record<string, any>> = {
  zhCN: zhCNLang,
  enUS: enUSLang
}

function deepGet(obj: Record<string, any>, path: string): string {
  const keys = path.split('.')
  let current: any = obj
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return path
    current = current[key]
  }
  return typeof current === 'string' ? current : path
}

export class I18n {
  private _locale: string
  private _lang: Record<string, any>

  constructor(locale: string = 'zhCN') {
    this._locale = locale
    this._lang = langMap[locale] || zhCNLang
  }

  public t(key: string, ..._args: any[]): string {
    const result = deepGet(this._lang, key)
    return result
  }

  public registerLangMap(locale: string, lang: DeepPartial<ILang>): void {
    if (locale === this._locale && lang) {
      this._lang = { ...this._lang, ...lang }
    }
    langMap[locale] = langMap[locale]
      ? { ...langMap[locale], ...lang }
      : lang
  }

  public destroy(): void {}

  public install(_draw: Draw): this {
    return this
  }

  public setLang(_locale: string, _lang: DeepPartial<ILang>): void {
    this._locale = _locale
    this._lang = langMap[_locale] || zhCNLang
  }
}
