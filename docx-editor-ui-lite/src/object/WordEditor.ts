import type DocxEditor from '@wanghe1995/docx-editor-core'
import type { App } from 'vue'
import { createApp } from 'vue'
import LiteEditorShell from '../ui/LiteEditorShell.vue'
import type { LiteEditorShellExposed, WordEditorOptions } from './word-editor.types'

const resolveTarget = (target: string | HTMLElement): HTMLDivElement => {
  if (typeof target === 'string') {
    const el = document.querySelector<HTMLDivElement>(target)
    if (!el) throw new Error(`Mount target not found: ${target}`)
    return el
  }
  if (!target) throw new Error('Mount target is required')
  return target as HTMLDivElement
}

export type { SaveSnapshot, WordEditorOptions } from './word-editor.types'

export class WordEditor {
  private host: HTMLDivElement
  private app: App<Element> | null = null
  private shell: LiteEditorShellExposed | null = null

  constructor(config: WordEditorOptions) {
    this.host = resolveTarget(config.container)
    this.host.innerHTML = ''

    const app = createApp(LiteEditorShell, {
      title: config.title,
      data: config.data,
      options: config.options,
      onReady: config.onReady,
      onChange: config.onChange,
      onPageChange: config.onPageChange,
      onScaleChange: config.onScaleChange,
      onSave: config.onSave
    })

    this.app = app
    this.shell = app.mount(this.host) as unknown as LiteEditorShellExposed
  }

  get instance(): DocxEditor | null {
    return this.shell?.getInstance() || null
  }

  get command() {
    return this.shell?.getCommand()
  }

  get listener() {
    return this.shell?.getListener()
  }

  get container() {
    return this.host
  }

  executeCommand(command: string, ...args: any[]) {
    return this.shell?.executeCommand(command, ...args)
  }

  setTitle(title: string) {
    this.shell?.setTitle(title)
  }

  destroy() {
    this.shell?.destroyShell()
    this.shell = null
    this.app?.unmount()
    this.app = null
    this.host.innerHTML = ''
  }
}
