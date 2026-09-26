import '../../assets/css/hyperlink-widget.css'
import panelHtml from '../../assets/components/hyperlink-widget.html?raw'
import { translatePanel, viewTranslate } from '../../view-i18n'
import type { ViewTranslate } from '../../view-i18n'
import type { HyperlinkInsertionError } from '@vervedoc/docx-editor-transform'

export class HyperlinkWidget {
  private root: HTMLElement | null = null
  private translate?: ViewTranslate
  setTranslate(translate?: ViewTranslate): void {
    this.translate = translate
  }

  private t(key: string): string {
    return viewTranslate(this.translate, key)
  }

  show(text: string, onConfirm: (text: string, url: string) => boolean | HyperlinkInsertionError, onSuccess?: () => void): void {
    this.hide()
    const container = document.createElement('div')
    container.innerHTML = panelHtml
    this.root = container.firstElementChild as HTMLElement
    translatePanel(this.root, this.translate, 'view.')
    document.body.appendChild(this.root)

    const root = this.root
    const textInput = root.querySelector<HTMLInputElement>('#hw-text')!
    const urlInput = root.querySelector<HTMLInputElement>('#hw-url')!
    const error = root.querySelector<HTMLElement>('#hw-error')!
    const controls: HTMLElement[] = [textInput, urlInput, root.querySelector<HTMLButtonElement>('#hw-cancel')!, root.querySelector<HTMLButtonElement>('#hw-ok')!]
    const setError = (key: string, control: HTMLElement): void => {
      error.dataset.i18nKey = key
      error.textContent = this.t(key)
      control.focus()
    }
    textInput.value = text
    textInput.focus()
    root.querySelector('#hw-cancel')!.addEventListener('click', () => this.hide())
    root.querySelector('#hw-ok')!.addEventListener('click', () => {
      const value = textInput.value
      const url = urlInput.value.trim()
      if (!value.trim()) return setError('view.hyperlink.textRequired', textInput)
      if (!url) return setError('view.hyperlink.addressRequired', urlInput)
      try {
        if (/[\u0000-\u0020\u007F]/.test(url)) return setError('view.hyperlink.addressInvalid', urlInput)
        const protocol = new URL(url).protocol
        if (!['http:', 'https:', 'mailto:', 'tel:', 'ftp:'].includes(protocol)) return setError('view.hyperlink.addressInvalid', urlInput)
      } catch {
        return setError('view.hyperlink.addressInvalid', urlInput)
      }
      const result = onConfirm(value, url)
      if (result === true) {
        this.hide()
        onSuccess?.()
      } else setError(`view.hyperlink.${typeof result === 'string' ? result : 'unsupported'}`, urlInput)
    })
    root.addEventListener('keyup', event => event.stopPropagation())
    root.addEventListener('keypress', event => event.stopPropagation())
    root.addEventListener('keydown', event => {
      event.stopPropagation()
      if (event.key === 'Escape') {
        event.preventDefault()
        this.hide()
      } else if (event.key === 'Enter' && !event.isComposing) {
        event.preventDefault()
        root.querySelector<HTMLButtonElement>('#hw-ok')?.click()
      } else if (event.key === 'Tab') {
        event.preventDefault()
        const index = controls.indexOf(document.activeElement as HTMLElement)
        controls[(index + (event.shiftKey ? controls.length - 1 : 1)) % controls.length].focus()
      }
    })
  }

  refreshTranslations(): void {
    if (this.root) translatePanel(this.root, this.translate, 'view.')
  }

  hide(): void {
    this.root?.remove()
    this.root = null
  }
}
