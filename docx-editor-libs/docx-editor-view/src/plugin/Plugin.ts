import { PluginFunction } from '@wanghe1995/docx-editor-schema'

export type Editor = any

export class Plugin {
  private editor: Editor

  constructor(editor: Editor) {
    this.editor = editor
  }

  public use<Options>(
    pluginFunction: PluginFunction<Options>,
    options?: Options
  ) {
    pluginFunction(this.editor, options)
  }
}
