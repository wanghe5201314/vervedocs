import type { IElement } from '@vervedoc/docx-editor-schema'
import { getByPath } from '@vervedoc/docx-editor-schema'
import type { RangeManager } from '@vervedoc/docx-editor-state'
import type { Draw } from '@vervedoc/docx-editor-view'
import type { IElementPosition } from '../../constants'
import { DatePicker } from './date-picker'

export class DateParticle {
  private draw: Draw
  private range: RangeManager | null
  private datePicker: DatePicker

  constructor(draw: Draw) {
    this.draw = draw
    this.range = draw.getRange()
    this.datePicker = new DatePicker(draw, {
      onSubmit: this._setValue.bind(this)
    })
  }

  /**
   * 获取当前光标所在的 date 元素（基于路径寻址）
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

  public clearDatePicker() {
    this.datePicker.dispose()
  }

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
