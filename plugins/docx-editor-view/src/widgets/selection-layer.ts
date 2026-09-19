import type { Rect } from '../layout-types'

/** Keep selection chrome clipped to the same viewport as the document canvas. */
export function createSelectionLayer(container: HTMLElement, name: string): HTMLDivElement {
  const layer = document.createElement('div')
  layer.className = `vervedocs-${name}-selection-layer`
  layer.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:100;display:none;'
  container.appendChild(layer)
  return layer
}

export function updateSelectionLayer(
  layer: HTMLElement,
  bounds: Rect,
  viewport: Pick<Rect, 'width' | 'height'>
): boolean {
  const visible = bounds.x < viewport.width && bounds.y < viewport.height &&
    bounds.x + bounds.width > 0 && bounds.y + bounds.height > 0
  layer.style.display = visible ? 'block' : 'none'
  return visible
}

/** Place the toolbar beside the object only when it fits inside the editor. */
export function positionSelectionToolbar(toolbar: HTMLElement, bounds: Rect, layer: HTMLElement): void {
  const padding = 4
  const gap = 6
  toolbar.style.display = 'flex'
  toolbar.style.maxWidth = `${Math.max(0, layer.clientWidth - padding * 2)}px`
  const width = toolbar.offsetWidth
  const height = toolbar.offsetHeight
  const x = Math.max(padding, Math.min(
    bounds.x + bounds.width / 2 - width / 2,
    layer.clientWidth - width - padding
  ))
  let y = bounds.y - height - gap
  if (y < padding) y = bounds.y + bounds.height + gap
  if (y < padding || y + height > layer.clientHeight - padding) {
    toolbar.style.display = 'none'
    return
  }
  toolbar.style.left = `${Math.round(x)}px`
  toolbar.style.top = `${Math.round(y)}px`
}
