/** Body-mounted handles must stay inside both the editor and the browser viewport. */
export function positionHandle(
  handle: HTMLElement,
  x: number,
  y: number,
  size: number,
  viewport: DOMRect
): boolean {
  const left = Math.round(x)
  const top = Math.round(y)
  const visible = left >= Math.max(0, viewport.left) &&
    top >= Math.max(0, viewport.top) &&
    left + size <= Math.min(window.innerWidth, viewport.right) &&
    top + size <= Math.min(window.innerHeight, viewport.bottom)

  handle.style.boxSizing = 'border-box'
  handle.style.left = `${left}px`
  handle.style.top = `${top}px`
  handle.style.display = visible ? 'flex' : 'none'
  return visible
}
