export interface IDatePickerLang {
  now: string
  confirm: string
  return: string
  timeSelect: string
  weeks: {
    sun: string
    mon: string
    tue: string
    wed: string
    thu: string
    fri: string
    sat: string
  }
  year: string
  month: string
  hour: string
  minute: string
  second: string
}

export interface ILang {
  datePicker: IDatePickerLang
}
