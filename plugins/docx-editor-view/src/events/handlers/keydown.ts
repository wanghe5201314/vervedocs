import { EditorZone } from '@vervedoc/docx-editor-schema'
import { KeyMap } from '@vervedoc/docx-editor-schema'
import { CanvasEvent } from '../canvas-event'
import { backspace } from './keydown-backspace'
import { del } from './keydown-delete'
import { enter } from './keydown-enter'
import { left } from './keydown-left'
import { right } from './keydown-right'
import { tab } from './keydown-tab'
import { updown } from './keydown-updown'

export function keydown(evt: KeyboardEvent, host: CanvasEvent) {
  if (host.isComposing) return
  const draw = host.getDraw()
  if (evt.key === KeyMap.Backspace) {
    backspace(evt, host)
  } else if (evt.key === KeyMap.Delete) {
    del(evt, host)
  } else if (evt.key === KeyMap.Enter) {
    enter(evt, host)
  } else if (evt.key === KeyMap.Left) {
    left(evt, host)
  } else if (evt.key === KeyMap.Right) {
    right(evt, host)
  } else if (evt.key === KeyMap.Up || evt.key === KeyMap.Down) {
    updown(evt, host)
  } else if (evt.key === KeyMap.ESC) {
    host.clearPainterStyle()
    const zoneManager = draw.getZone()
    if (!zoneManager.isMainActive()) {
      zoneManager.setZone(EditorZone.MAIN)
    }
    evt.preventDefault()
  } else if (evt.key === KeyMap.TAB) {
    tab(evt, host)
  }
}
