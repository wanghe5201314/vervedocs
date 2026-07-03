type Draw = any
type ILang = any
type DeepPartial<T> = T

export class I18n {
  public install(_draw: Draw): this {
    return this
  }

  public setLang(_locale: string, _lang: DeepPartial<ILang>): void {}
}
