interface EditorInstance {
  command: any
}

export function useEditorBarcode(options: {
  getEditorInstance: () => EditorInstance | null
}) {
  const { getEditorInstance } = options

  function barcode(content: string) {
    const instance = getEditorInstance()
    if (!instance) return
    instance.command.execute('barcode', content)
  }

  async function qrcode(content: string) {
    const instance = getEditorInstance()
    if (!instance) return
    await instance.command.execute('qrcode', content)
  }

  return { barcode, qrcode }
}