import type { IElement } from '@vervedoc/docx-editor-schema'
import { getByPath } from '@vervedoc/docx-editor-schema'
import type { RangeManager } from '@vervedoc/docx-editor-state'
import type { Draw } from '@vervedoc/docx-editor-view'
import type { IElementPosition } from './constants'
import { DatePicker } from './date-picker'

/** 日期粒子管理器，负责 date 元素的日期选择器挂载与值写回 */
export class DateParticle {
  /** 编辑器绘制实例 */
  private draw: Draw
  /** 选区管理器 */
  private range: RangeManager | null
  /** 日期选择器实例 */
  private datePicker: DatePicker

  /**
   * 创建日期粒子管理器
   * @param draw 编辑器绘制实例
   */
  constructor(draw: Draw) {
    this.draw = draw
    this.range = draw.getRange()
    this.datePicker = new DatePicker(draw, {
      onSubmit: this._setValue.bind(this)
    })
  }

  /**
   * 获取当前光标所在的 date 元素（基于路径寻址）
   * @returns date 元素或 null
   */
  private getDateElement(): IElement | null {
    if (!this.range) return null
    const focus = this.range.getFocus()
    if (!focus) return null
    const elementList = this.draw.getElementList()
    return getByPath(elementList, focus.path)
  }

  /**
   * 用户选择日期后写回：直接修改 date 元素的 valueList[0].value，再刷新文档
   * @param date 用户选定的日期字符串
   */
  private _setValue(date: string) {
    if (!date) return
    const element = this.getDateElement()
    if (!element || element.type !== 'date') return
    const el = element as IElement & { valueList?: { value: string }[]; dateFormat?: string }
    if (!el.valueList) {
      el.valueList = [{ value: date }]
    } else {
      el.valueList[0] = { value: date }
    }
    // 刷新文档渲染
    this.draw.setDocument(this.draw.getDocument())
  }

  /** 关闭日期选择器面板 */
  public clearDatePicker() {
    this.datePicker.dispose()
  }

  /**
   * 渲染日期选择器面板
   * @param element date 元素
   * @param position 元素位置信息
   */
  public renderDatePicker(element: IElement, position: IElementPosition) {
    const el = element as IElement & { valueList?: { value: string }[]; dateFormat?: string }
    const value = el.valueList?.[0]?.value ?? ''
    this.datePicker.render({
      value,
      position,
      dateFormat: el.dateFormat
    })
  }
}
