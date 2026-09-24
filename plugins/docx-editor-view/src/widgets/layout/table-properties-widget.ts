import '../../assets/css/paragraph-layout-widget.css'
import panelHtml from '../../assets/components/table-properties-widget.html?raw'
import type { IPosition } from '@vervedoc/docx-editor-schema'
import { translatePanel, viewTranslate, type ViewTranslate } from '../../view-i18n'

interface Deps {
  onCommand: (cmd: string, ...args: any[]) => any
  focusInput: () => void
  translate?: ViewTranslate
}

export class TablePropertiesWidget {
  private root: HTMLElement | null = null
  private initial: Record<string, string> = {}
  private target: IPosition | null = null

  constructor(private deps: Deps) {}

  show(target: IPosition): void {
    this.hide()
    this.target = { path: [...target.path], offset: target.offset }
    const cmd = this.deps.onCommand
    const selection = cmd('getRange')
    cmd('executeReplaceRange', { anchor: this.target, focus: this.target })
    const borders = cmd('getTableBorders')
    const cell = cmd('getCellProperties')
    cmd('executeReplaceRange', selection)
    if (!borders || !cell) return
    const container = document.createElement('div')
    container.innerHTML = panelHtml
    this.root = container.firstElementChild as HTMLElement
    translatePanel(this.root, this.deps.translate, 'view.tableDialog.')
    document.body.appendChild(this.root)
    this.initial = {}
    for (const [name, value] of Object.entries({ ...borders, ...cell })) {
      const input = this.root.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)!
      input.value = value === undefined ? '' : String(value)
      if (name === 'color' || name === 'backgroundColor') {
        input.value = input.value.replace(/^#([\da-f])([\da-f])([\da-f])$/i, '#$1$1$2$2$3$3')
      }
      this.initial[name] = input.value
    }
    this.root.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(tab => {
      tab.addEventListener('click', () => this.selectTab(tab.dataset.tab!))
      tab.addEventListener('keydown', event => {
        const tabs = Array.from(this.root!.querySelectorAll<HTMLButtonElement>('[data-tab]'))
        const index = tabs.indexOf(tab)
        let next: number
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length
        else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length
        else if (event.key === 'Home') next = 0
        else if (event.key === 'End') next = tabs.length - 1
        else return
        event.preventDefault()
        this.selectTab(tabs[next].dataset.tab!)
        tabs[next].focus()
      })
    })
    this.root.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach(button => {
      button.addEventListener('click', () => {
        this.root!.querySelector<HTMLSelectElement>('[name="type"]')!.value = button.dataset.preset!
        this.updatePreview()
      })
    })
    this.root.querySelectorAll<HTMLInputElement>('[data-color-picker]').forEach(picker => {
      const input = this.root!.querySelector<HTMLInputElement>(`[name="${picker.dataset.colorPicker}"]`)!
      const selectColor = () => {
        input.value = picker.value
        this.updatePreview()
      }
      picker.addEventListener('input', selectColor)
      picker.addEventListener('change', selectColor)
    })
    this.root.querySelector('[data-clear-background]')!.addEventListener('click', () => {
      const input = this.root!.querySelector<HTMLInputElement>('[name="backgroundColor"]')!
      input.value = ''
      this.updatePreview()
      input.focus()
    })
    this.root.addEventListener('input', () => this.updatePreview())
    this.root.addEventListener('change', () => this.updatePreview())
    this.updatePreview()
    this.root.querySelector('[data-cancel]')!.addEventListener('click', () => this.close())
    this.root.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); this.close() }
      if (event.key === 'Tab' && this.root) {
        const controls = Array.from(this.root.querySelectorAll<HTMLElement>('input, select, button'))
          .filter(control => control.tabIndex >= 0 && !control.closest('[hidden]'))
        const first = controls[0]
        const last = controls[controls.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
      event.stopPropagation()
    })
    this.root.querySelector('form')!.addEventListener('submit', event => {
      event.preventDefault()
      const invalid = Array.from(this.root!.querySelectorAll<HTMLInputElement>('input'))
        .find(input => !input.validity.valid)
      if (invalid) {
        this.selectTab(invalid.closest<HTMLElement>('[data-pane]')!.dataset.pane!)
        invalid.focus()
        invalid.reportValidity()
        return
      }
      this.apply()
      this.close()
    })
    this.root.querySelector<HTMLElement>('[data-tab="table"]')!.focus()
  }

  refreshTranslations(): void {
    if (!this.root) return
    translatePanel(this.root, this.deps.translate, 'view.tableDialog.')
    this.updatePreview()
  }

  private selectTab(name: string): void {
    this.root!.querySelectorAll<HTMLElement>('[data-tab]').forEach(tab => {
      const selected = tab.dataset.tab === name
      tab.setAttribute('aria-selected', String(selected))
      tab.tabIndex = selected ? 0 : -1
    })
    this.root!.querySelectorAll<HTMLElement>('[data-pane]').forEach(pane => {
      pane.hidden = pane.dataset.pane !== name
    })
  }

  private updatePreview(): void {
    const value = (name: string) => this.root!.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)!.value
    this.root!.querySelectorAll<HTMLInputElement>('[data-color-picker]').forEach(picker => {
      const color = value(picker.dataset.colorPicker!)
      const valid = /^#[\da-f]{6}$/i.test(color)
      picker.value = valid ? color : '#000000'
      picker.parentElement!.dataset.empty = String(color === '')
      const t = (key: string) => viewTranslate(this.deps.translate, `view.tableDialog.${key}`)
      const label = picker.dataset.colorPicker === 'color' ? t('borderColor') : t('cellColor')
      const state = color === '' ? (picker.dataset.colorPicker === 'color' ? t('unchanged') : t('noFill')) : (valid ? color : t('invalidColor'))
      picker.setAttribute('aria-label', viewTranslate(this.deps.translate, 'view.tableDialog.chooseColor', { label, state }))
    })
    const type = value('type')
    this.root!.querySelectorAll<HTMLElement>('[data-preset]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.preset === type))
    })
    const preview = this.root!.querySelector<HTMLElement>('[data-preview]')!
    preview.dataset.border = type || 'all'
    preview.style.setProperty('--tp-line-color', /^#[\da-f]{6}$/i.test(value('color')) ? value('color') : 'var(--tp-muted)')
    for (const [name, property] of [['width', '--tp-inner-width'], ['externalWidth', '--tp-outer-width']]) {
      const width = value(name)
      preview.style.setProperty(property, `${width === '' ? 1 : Math.min(8, Math.max(0, Number(width)))}px`)
    }
    this.root!.querySelector<HTMLElement>('[data-preview-caption]')!.textContent = viewTranslate(this.deps.translate,
      type ? 'view.tableDialog.presetPreview' : 'view.tableDialog.unchangedPreview')
  }

  private apply(): void {
    if (!this.root || !this.target) return
    const cmd = this.deps.onCommand
    cmd('executeReplaceRange', { anchor: this.target, focus: this.target })
    const patch: Record<string, string | number> = {}
    for (const name of ['type', 'color', 'width', 'externalWidth']) {
      const value = this.root.querySelector<HTMLInputElement>(`[name="${name}"]`)!.value
      if (value !== '' && value !== this.initial[name]) {
        patch[name] = name === 'width' || name === 'externalWidth' ? Number(value) : value
      }
    }
    if (Object.keys(patch).length) cmd('executeSetTableBorders', patch)
    for (const [name, command] of [['verticalAlign', 'executeSetCellVerticalAlign'], ['backgroundColor', 'executeSetCellBackground']]) {
      const value = this.root.querySelector<HTMLInputElement>(`[name="${name}"]`)!.value
      if (value !== this.initial[name]) cmd(command, value)
    }
  }

  private close(): void {
    this.hide()
    this.deps.focusInput()
  }

  hide(): void {
    this.root?.remove()
    this.root = null
    this.target = null
  }
}
