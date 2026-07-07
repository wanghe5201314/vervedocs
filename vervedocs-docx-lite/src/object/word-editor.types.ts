import type { IEditorData, IEditorOption, IElement } from '@vervedoc/core'

export type ImportMode = 'overwrite' | 'append' | 'cancel'

export interface SaveSnapshot {
  meta: {
    id: string
    name: string
    createdAt: string
    submittedAt: string
  }
  content: any
}

export interface WordEditorOptions {
  container: string | HTMLElement
  title?: string
  data?: IEditorData | IElement[]
  options?: IEditorOption
  onReady?: (editor: any) => void
  onChange?: () => void
  onPageChange?: (pageNo: number) => void
  onScaleChange?: (scale: number) => void
  onSave?: (snapshot: SaveSnapshot) => void
}

export interface LiteEditorShellExposed {
  getInstance: () => any
  getCommand: () => any
  getListener: () => any
  executeCommand: (command: string, ...args: any[]) => any
  setTitle: (title: string) => void
  destroyShell: () => void
}
