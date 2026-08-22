import { IRegisterShortcut } from '@vervedoc/docx-editor-schema'
import { Shortcut, I18n } from '../plugin-stubs'
import { ILang } from '@vervedoc/docx-editor-schema'
import { DeepPartial } from '@vervedoc/docx-editor-schema'
import { IChartRenderer } from '@vervedoc/docx-editor-schema'

interface IRegisterPayload {
  shortcut: Shortcut
  i18n: I18n
}

export class Register {
  public shortcutList: (payload: IRegisterShortcut[]) => void
  public langMap: (locale: string, lang: DeepPartial<ILang>) => void

  private chartRenderer: IChartRenderer | null = null

  constructor(payload: IRegisterPayload) {
    const { shortcut, i18n } = payload
    this.shortcutList = shortcut.registerShortcutList.bind(shortcut)
    this.langMap = i18n.registerLangMap.bind(i18n)
  }

  /**
   * 注册图表渲染器
   * @param renderer 图表渲染器实例
   */
  public registerChartRenderer(renderer: IChartRenderer): void {
    this.chartRenderer = renderer
  }

  /**
   * 获取图表渲染器
   * @returns 图表渲染器实例或 null
   */
  public getChartRenderer(): IChartRenderer | null {
    return this.chartRenderer
  }

  /**
   * 检查是否已注册图表渲染器
   * @returns 是否已注册
   */
  public hasChartRenderer(): boolean {
    return this.chartRenderer !== null
  }
}
