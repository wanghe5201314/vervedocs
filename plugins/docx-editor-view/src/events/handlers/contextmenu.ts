import { ElementType } from '@vervedoc/docx-editor-schema'
import type { Draw } from '../../renders/engine'

export function contextmenu(evt: MouseEvent, draw: Draw) {
  const position = draw.getPosition()
  const positionContext = position.getPositionContext()

  if (!positionContext.isTable) {
    return
  }

  const elementList = draw.getOriginalElementList()
  const { index } = positionContext
  let tableElement = null
  for (let i = index!; i >= 0; i--) {
    const el = elementList[i]
    if (el && el.type === ElementType.TABLE) {
      tableElement = el
      break
    }
  }

  if (!tableElement) {
    return
  }

  evt.preventDefault()
  evt.stopPropagation()

  const tableContextMenu = (draw as any).__tableContextMenu
  if (tableContextMenu) {
    tableContextMenu.show(evt.clientX, evt.clientY, tableElement)
  }
}
