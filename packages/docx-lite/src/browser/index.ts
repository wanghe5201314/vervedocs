import { WordEditor, type WordEditorOptions } from '../object/WordEditor'

export type { SaveSnapshot, WordEditorOptions } from '../object/WordEditor'

export const version = String(__APP_VERSION__ || '')

export const createEditor = (options: WordEditorOptions) => new WordEditor(options)

export const DocxEditorLite = {
  version,
  WordEditor,
  createEditor
}

declare global {
  interface Window {
    DocxEditorLite?: typeof DocxEditorLite
  }
}

if (typeof window !== 'undefined') {
  window.DocxEditorLite = DocxEditorLite
}
