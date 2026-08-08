import { TableBorder } from '@vervedoc/core'

interface EditorInstance {
  command: any
}

export function useEditorTable(options: { getEditorInstance: () => EditorInstance | null }) {
  const { getEditorInstance } = options

  function insertTable(payload: { rows: number, cols: number }) {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeInsertTable(payload.rows, payload.cols)
  }

  function tableBorderType(borderType: any) {
    const instance = getEditorInstance()
    if (!instance) return
    const t = String(borderType || '').trim().toLowerCase()
    const resolved =
      t === 'none' || t === 'empty' || t === 'no'
        ? (TableBorder as any).NONE ?? borderType
        : t === 'outside' || t === 'external' || t === 'box'
          ? (TableBorder as any).OUTSIDE ?? borderType
          : (TableBorder as any).ALL ?? borderType
    instance.command.executeTableBorderType(resolved)
  }

  function tableBorderColor(color: string) {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeTableBorderColor(color)
  }

  function tableBorderWidth(width: number) {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeTableBorderWidth(width)
  }

  function tableBorderExternalWidth(width: number) {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.executeTableBorderExternalWidth(width)
  }

  return {
    insertTable,
    tableBorderType,
    tableBorderColor,
    tableBorderWidth,
    tableBorderExternalWidth
  }
}