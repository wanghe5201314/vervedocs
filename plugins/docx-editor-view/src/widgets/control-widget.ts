import type { BlockNode, DocumentLayout, InlineBox } from '../layout-types'
import type { IControlElement, ControlDataValue, IPosition } from '@vervedoc/docx-editor-schema'
import { isControl } from '@vervedoc/docx-editor-schema'
import { viewTranslate, type ViewTranslate } from '../view-i18n'

export interface ControlWidgetDeps {
  getContainer: () => HTMLElement
  getLayout: () => DocumentLayout | null
  getContainerRect: () => DOMRect
  getScrollY: () => number
  getPageOffsetX: () => number
  getZone?: () => 'main' | 'header' | 'footer'
  onCommand: (cmd: string, ...args: any[]) => void
  isReadonly: () => boolean
  translate?: ViewTranslate
  onActivate?: (position: IPosition) => void
  focusEditor?: () => void
}

interface ControlActivation {
  element: IControlElement
  inline: InlineBox
  x: number
  y: number
  width: number
  height: number
}

export class ControlWidget {
  private overlay: HTMLDivElement | null = null
  private floatEl: HTMLElement | null = null
  private activation: ControlActivation | null = null
  private dropdown = false
  private refreshLabels: (() => void) | null = null

  constructor(private deps: ControlWidgetDeps) {}

  create(): void {
    this.overlay = document.createElement('div')
    this.overlay.className = 'vervedocs-control-overlay'
    this.overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:200;'
    for (const event of ['mousedown', 'click', 'dblclick', 'keydown', 'keyup', 'wheel']) {
      this.overlay.addEventListener(event, e => e.stopPropagation())
    }
    this.deps.getContainer().appendChild(this.overlay)
  }

  private readonly onOutsideMouseDown = (e: MouseEvent): void => {
    if (this.floatEl?.contains(e.target as Node)) return
    if (this.floatEl instanceof HTMLInputElement) this.commitInput()
    else this.deactivate()
  }

  handleMouseDown(e: MouseEvent): boolean {
    if (e.button !== 0 || this.deps.isReadonly() || e.shiftKey) return false
    const rect = this.deps.getContainerRect()
    const { scaleX, scaleY } = this.getScale()
    const x = (e.clientX - rect.left) / scaleX
    const y = (e.clientY - rect.top) / scaleY
    for (const hit of this.getActivations()) {
      if (x < hit.x || x > hit.x + hit.width || y < hit.y || y > hit.y + hit.height) continue
      e.preventDefault()
      e.stopPropagation()
      this.deactivate()
      this.deps.onActivate?.({ path: hit.inline.path, offset: 1 })
      if (hit.element.control.readOnly) return true
      this.activation = hit
      const kind = hit.element.control.kind
      if (kind === 'checkbox') {
        this.submit(hit.element.dataValue !== true)
      } else if (kind === 'radioGroup' && hit.inline.controlOptionValue !== undefined) {
        this.submit(hit.inline.controlOptionValue)
      } else if (kind === 'select' || kind === 'multiSelect') {
        this.activateDropdown(hit, kind === 'multiSelect')
      } else if (kind !== 'radioGroup') {
        this.activateInput(hit)
      }
      if (this.floatEl) document.addEventListener('mousedown', this.onOutsideMouseDown, true)
      return true
    }
    this.deactivate()
    return false
  }

  private getScale(): { scaleX: number; scaleY: number } {
    const container = this.deps.getContainer()
    const rect = this.deps.getContainerRect()
    return {
      scaleX: container.offsetWidth ? rect.width / container.offsetWidth : 1,
      scaleY: container.offsetHeight ? rect.height / container.offsetHeight : 1
    }
  }

  // Coordinates remain local to the canvas host, including nested table content.
  private *getActivations(): Generator<ControlActivation> {
    const layout = this.deps.getLayout()
    if (!layout) return
    const zone = this.deps.getZone?.() ?? 'main'
    for (const page of layout.pages) {
      const rect = zone === 'header' ? page.headerRect : zone === 'footer' ? page.footerRect : page.contentRect
      const blocks = zone === 'header' ? page.headerBlocks : zone === 'footer' ? page.footerBlocks : page.blocks
      if (rect && blocks) {
        yield* this.getBlockActivations(blocks, this.deps.getPageOffsetX() + rect.x, rect.y - this.deps.getScrollY())
      }
    }
  }

  private *getBlockActivations(blocks: BlockNode[], ox: number, oy: number): Generator<ControlActivation> {
    for (const block of blocks) {
      const x = ox + block.rect.x
      const y = oy + block.rect.y
      if (block.kind === 'paragraph') {
        for (const line of block.lines) {
          for (const inline of line.inlines) {
            if (!inline.controlId || !isControl(inline.run)) continue
            yield { element: inline.run, inline, x: x + inline.x, y: y + inline.y, width: inline.width, height: line.height }
          }
        }
      } else if (block.kind === 'table') {
        for (const row of block.rows) {
          for (const cell of row.cells) {
            yield* this.getBlockActivations(cell.content,
              x + cell.rect.x + cell.contentPaddingLeft,
              y + row.rect.y + cell.contentPaddingTop + cell.verticalOffset)
          }
        }
      }
    }
  }

  private activateInput(info: ControlActivation): void {
    if (!this.overlay) return
    const { control, dataValue } = info.element
    const input = document.createElement('input')
    input.type = control.kind === 'date'
      ? (control.dateMode === 'dateTime' ? 'datetime-local' : 'date')
      : control.kind === 'number' ? 'number' : 'text'
    input.value = dataValue == null ? '' : String(dataValue)
    input.setAttribute('aria-label', control.title || control.placeholder || control.kind)
    if (control.maxLength != null) input.maxLength = control.maxLength
    if (control.min != null) input.min = String(control.min)
    if (control.max != null) input.max = String(control.max)
    if (control.kind === 'number') input.step = control.precision == null ? 'any' : String(10 ** -control.precision)
    input.style.cssText = [
      'position:absolute', `width:${Math.max(info.width, 100)}px`, `height:${info.height}px`,
      `font:${this.fontOf(info.inline)}`, `color:${info.inline.color}`,
      'border:1px solid #409eff;border-radius:2px;background:#fff;outline:none',
      'padding:0 2px;margin:0;box-sizing:border-box;pointer-events:auto'
    ].join(';')
    this.floatEl = input
    this.overlay.appendChild(input)
    this.positionFloat()
    input.focus()
    if (input.type === 'text') input.select()
    input.addEventListener('blur', () => this.commitInput())
    input.addEventListener('keydown', e => {
      if (e.isComposing) return
      if (e.key === 'Enter') { e.preventDefault(); this.commitInput() }
      if (e.key === 'Escape') { e.preventDefault(); this.deactivate(); this.deps.focusEditor?.() }
    })
  }

  private fontOf(inline: InlineBox): string {
    return `${inline.italic ? 'italic ' : ''}${inline.bold ? '700' : '400'} ${inline.size}px ${inline.font}`
  }

  private activateDropdown(info: ControlActivation, multi: boolean): void {
    if (!this.overlay) return
    this.dropdown = true
    const panel = document.createElement('div')
    panel.setAttribute('role', 'dialog')
    panel.setAttribute('aria-label', info.element.control.title || info.element.control.placeholder || info.element.control.kind)
    panel.style.cssText = [
      'position:absolute', `width:${Math.min(320, Math.max(info.width, 220))}px`,
      'font:normal 400 14px/1.5 system-ui, sans-serif', 'color:#333',
      'border:1px solid #d9d9d9;border-radius:4px;background:#fff',
      'box-shadow:0 2px 8px rgba(0,0,0,.15);pointer-events:auto;box-sizing:border-box',
      'padding:8px;display:flex;flex-direction:column;gap:6px;overflow:auto'
    ].join(';')
    const search = document.createElement('input')
    search.type = 'search'
    search.style.cssText = 'width:100%;box-sizing:border-box;padding:4px 6px;font:inherit;border:1px solid #ddd;'
    const list = document.createElement('div')
    list.style.cssText = 'max-height:200px;overflow:auto;flex-shrink:0;'
    const footer = document.createElement('div')
    footer.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;'
    panel.append(search, list, footer)
    const value = info.element.dataValue
    const selected = new Set(Array.isArray(value) ? value : typeof value === 'string' && value !== '' ? [value] : [])
    const options = info.element.control.options ?? []
    const renderList = (): void => {
      list.replaceChildren()
      const query = search.value.toLocaleLowerCase()
      for (const option of options) {
        if (!option.label.toLocaleLowerCase().includes(query) && !option.value.toLocaleLowerCase().includes(query)) continue
        const row = document.createElement('label')
        row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:5px 4px;cursor:pointer;overflow-wrap:anywhere;'
        const input = document.createElement('input')
        input.type = multi ? 'checkbox' : 'radio'
        input.checked = selected.has(option.value)
        input.style.cssText = 'flex-shrink:0;margin:0;accent-color:#409eff;'
        const label = document.createElement('span')
        label.textContent = option.label
        row.append(input, label)
        input.addEventListener('change', () => {
          if (!multi) { this.submit(option.value); return }
          if (input.checked) selected.add(option.value)
          else selected.delete(option.value)
        })
        list.appendChild(row)
      }
      if (!list.childElementCount) {
        const empty = document.createElement('div')
        empty.textContent = this.t('view.control.noResults')
        empty.style.cssText = 'padding:8px;color:#999;'
        list.appendChild(empty)
      }
      this.positionFloat()
    }
    const button = (key: string, action: () => void): HTMLButtonElement => {
      const el = document.createElement('button')
      el.type = 'button'
      el.dataset.i18nKey = key
      el.style.cssText = 'font:inherit;cursor:pointer;border:1px solid #ddd;border-radius:3px;background:#fff;padding:3px 8px;'
      el.addEventListener('click', action)
      footer.appendChild(el)
      return el
    }
    button('view.control.clear', () => {
      if (!multi) { this.submit(null); return }
      selected.clear()
      renderList()
    })
    if (multi) {
      button('view.common.cancel', () => { this.deactivate(); this.deps.focusEditor?.() })
      button('view.common.confirm', () => {
        const ordered = options.filter(option => selected.has(option.value)).map(option => option.value)
        // Preserve unknown imported values so a filtered list cannot silently erase them.
        this.submit([...new Set([...ordered, ...selected])])
      })
    }
    this.refreshLabels = () => {
      search.placeholder = this.t('view.control.search')
      search.setAttribute('aria-label', search.placeholder)
      for (const el of Array.from(footer.querySelectorAll<HTMLElement>('[data-i18n-key]'))) {
        el.textContent = this.t(el.dataset.i18nKey!)
      }
      renderList()
    }
    this.floatEl = panel
    this.overlay.appendChild(panel)
    this.refreshLabels()
    search.addEventListener('input', renderList)
    panel.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); this.deactivate(); this.deps.focusEditor?.() }
    })
    search.focus()
  }

  private t(key: string): string {
    return viewTranslate(this.deps.translate, key)
  }

  refreshLocale(): void {
    this.refreshLabels?.()
  }

  private positionFloat(): void {
    if (!this.floatEl || !this.activation || !this.overlay) return
    const info = this.activation
    const rect = this.deps.getContainerRect()
    const { scaleX, scaleY } = this.getScale()
    const left = Math.max(0, -rect.left / scaleX) + 4
    const top = Math.max(0, -rect.top / scaleY) + 4
    const right = Math.min(this.overlay.clientWidth, (window.innerWidth - rect.left) / scaleX) - 4
    const bottom = Math.min(this.overlay.clientHeight, (window.innerHeight - rect.top) / scaleY) - 4
    this.floatEl.style.maxWidth = `${Math.max(0, right - left)}px`
    this.floatEl.style.maxHeight = `${Math.max(0, bottom - top)}px`
    const width = this.floatEl.offsetWidth
    const height = this.floatEl.offsetHeight
    let y = this.dropdown ? info.y + info.height + 2 : info.y
    if (this.dropdown && y + height > bottom) y = info.y - height - 2
    this.floatEl.style.left = `${Math.max(left, Math.min(info.x, right - width))}px`
    this.floatEl.style.top = `${Math.max(top, Math.min(y, bottom - height))}px`
  }

  private submit(value: ControlDataValue): void {
    const id = this.activation?.element.id
    const readOnly = this.deps.isReadonly() || this.activation?.element.control.readOnly
    this.deactivate()
    if (id && !readOnly) this.deps.onCommand('executeUpdateControlValue', id, value)
    this.deps.focusEditor?.()
  }

  private commitInput(): void {
    if (!this.activation || !(this.floatEl instanceof HTMLInputElement)) return
    const raw = this.floatEl.value
    const kind = this.activation.element.control.kind
    const value = kind === 'number' ? (raw === '' ? null : Number(raw)) : raw || null
    if (typeof value === 'number' && !Number.isFinite(value)) return
    this.submit(value)
  }

  deactivate(): void {
    document.removeEventListener('mousedown', this.onOutsideMouseDown, true)
    const el = this.floatEl
    this.floatEl = null
    this.activation = null
    this.refreshLabels = null
    this.dropdown = false
    el?.remove()
  }

  update(): void {
    if (!this.activation) return
    if (this.deps.isReadonly()) { this.deactivate(); return }
    const current = this.activation
    let fallback: ControlActivation | undefined
    for (const info of this.getActivations()) {
      if (info.element.id !== current.element.id) continue
      fallback ??= info
      if (info.inline.controlTextOffset === current.inline.controlTextOffset &&
          info.inline.controlOptionValue === current.inline.controlOptionValue) {
        fallback = info
        break
      }
    }
    if (!fallback || fallback.element.control.readOnly ||
        fallback.element.control.kind !== current.element.control.kind) {
      this.deactivate()
      return
    }
    this.activation = fallback
    this.positionFloat()
  }

  destroy(): void {
    this.deactivate()
    this.overlay?.remove()
    this.overlay = null
  }
}
