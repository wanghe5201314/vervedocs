import { EDITOR_ELEMENT_STYLE_ATTR } from '@vervedoc/docx-editor-schema'
import { ElementType } from '@vervedoc/docx-editor-schema'
import { MoveDirection } from '@vervedoc/docx-editor-schema'
import { IElement } from '@vervedoc/docx-editor-schema'
import { pickObject } from '@vervedoc/docx-editor-schema'
import { formatElementContext } from '@vervedoc/docx-editor-schema'
import { CanvasEvent } from '../../CanvasEvent'

export function tab(evt: KeyboardEvent, host: CanvasEvent) {
  const draw = host.getDraw()
  const isReadonly = draw.isReadonly()
  if (isReadonly) return
  evt.preventDefault()
  // 在控件上下文时，tab键控制控件之间移动
  const control = draw.getControl()
  const activeControl = control.getActiveControl()
  if (activeControl && control.getIsRangeWithinControl()) {
    control.initNextControl({
      direction: evt.shiftKey ? MoveDirection.UP : MoveDirection.DOWN
    })
  } else {
    const rangeManager = draw.getRange()
    const elementList = draw.getElementList()
    const { startIndex, endIndex } = rangeManager.getRange()
    // 插入tab符
    const anchorStyle = rangeManager.getRangeAnchorStyle(elementList, endIndex)
    // 仅复制样式
    const copyStyle = anchorStyle
      ? pickObject(anchorStyle, EDITOR_ELEMENT_STYLE_ATTR)
      : null
    const tabElement: IElement = {
      ...copyStyle,
      type: ElementType.TAB,
      value: ''
    }
    formatElementContext(elementList, [tabElement], startIndex, {
      editorOptions: draw.getOptions()
    })
    draw.insertElementList([tabElement])
  }
}
